/**
 * Transport role: Dedicated haulers for moving energy throughout the base.
 *
 * Behavior:
 * - Collects energy from storage, links, containers, and dropped resources
 * - Delivers energy to spawns, extensions, towers, and storage/terminal
 * - Prioritizes spawn structures, then batteries, then bulk storage
 * - Respects spawn energy reserves during collection
 * - Can prefer storage over terminal based on configuration
 *
 * Transports form the logistics backbone, complementing queens by handling
 * bulk energy movement and feeding the production chain.
 */

import { SPAWN_ENERGY_RESERVE } from "../constants";
import { CreepRoles } from "../creeps/setups";
import { getHatcheryInfo, shouldProtectHatchery, storageLink } from "../utils/logistics";

export const TRANSPORT_ROLE = CreepRoles.transport;

/**
 * Configuration options for transport behavior.
 */
export interface TransportBehaviorOptions {
    /** Whether to prefer depositing to storage over terminal */
    preferStorage?: boolean;
}

/**
 * Transport behavior implementation.
 * Manages the hauling cycle and energy distribution logic.
 */
export const TransportBehavior = {
    /**
     * Main execution method called each tick.
     * Toggles between collecting and delivering energy.
     */
    run(creep: Creep, options: TransportBehaviorOptions = {}): void {
        if (creep.memory.hauling === undefined) {
            creep.memory.hauling = false;
        }

        if (!creep.memory.hauling && creep.store.getFreeCapacity(RESOURCE_ENERGY) === 0) {
            creep.memory.hauling = true;
        } else if (creep.memory.hauling && creep.store.getUsedCapacity(RESOURCE_ENERGY) === 0) {
            creep.memory.hauling = false;
        }

        // drop your energy when above half of the capacity
        if (!creep.memory.hauling && creep.store.getUsedCapacity(RESOURCE_ENERGY) > creep.store.getCapacity(RESOURCE_ENERGY) / 2) {
            creep.memory.hauling = true;
        }

        if (creep.memory.hauling) {
            this.deliver(creep, options);
        } else {
            this.collect(creep);
        }
    },

    /**
     * Collects energy from various sources with intelligent prioritization.
     * Prefers storage link, then storage itself, then containers, then dropped resources.
     * Avoids depleting hatchery batteries when reserve protection is active.
     * Only withdraws from containers if spawn/extension capacity exists.
     */
    collect(creep: Creep): void {
        const room = creep.room;
        const hatchery = getHatcheryInfo(room);
        const protectReserve = shouldProtectHatchery(room);
        const storageTarget = room.storage;
        const storageLinkTarget = storageLink(room);

        if (storageLinkTarget && storageLinkTarget.store.getUsedCapacity(RESOURCE_ENERGY) >= creep.store.getCapacity() / 2) {
            if (creep.withdraw(storageLinkTarget, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                creep.moveTo(storageLinkTarget, { reusePath: 2, range: 1, visualizePathStyle: { stroke: "#ffaa00" } });
            }
            return;
        }

        if (storageTarget && storageTarget.store.getUsedCapacity(RESOURCE_ENERGY) > 2000) {
            if (creep.withdraw(storageTarget, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                creep.moveTo(storageTarget, { reusePath: 3, range: 1, visualizePathStyle: { stroke: "#ffaa00" } });
            }
            return;
        }

        // Check if there's demand for energy in spawns/extensions or workers/upgraders
        const spawnDemand = room.find(FIND_MY_SPAWNS).some(s => s.store.getFreeCapacity(RESOURCE_ENERGY) > 0);
        const extensionDemand = room.find(FIND_MY_STRUCTURES, {
            filter: s => s.structureType === STRUCTURE_EXTENSION &&
                (s as StructureExtension).store.getFreeCapacity(RESOURCE_ENERGY) > 0
        }).length > 0;
        const workerDemand = room.find(FIND_MY_CREEPS, {
            filter: c => (c.memory.role === CreepRoles.worker || c.memory.role === CreepRoles.upgrader) &&
                c.store.getFreeCapacity(RESOURCE_ENERGY) > 0
        }).length > 0;
        const hasEnergyDemand = spawnDemand || extensionDemand || workerDemand;

        // Collect from containers if there's any energy demand
        if (hasEnergyDemand) {
            const batteryIds = new Set(hatchery.batteries.map(battery => battery.id));
            const containerCandidates = room.find(FIND_STRUCTURES, {
                filter: (structure): structure is StructureContainer => {
                    if (structure.structureType !== STRUCTURE_CONTAINER) {
                        return false;
                    }
                    if (protectReserve && batteryIds.has(structure.id)) {
                        return false;
                    }
                    return structure.store.getUsedCapacity(RESOURCE_ENERGY) > 100;
                }
            });

            if (!protectReserve) {
                for (const battery of hatchery.batteries) {
                    if (battery.store.getUsedCapacity(RESOURCE_ENERGY) > 200) {
                        containerCandidates.push(battery);
                    }
                }
            }

            if (containerCandidates.length > 0) {
                const target = containerCandidates.reduce((best, current) => {
                    const bestScore = best.store.getUsedCapacity(RESOURCE_ENERGY) - creep.pos.getRangeTo(best) * 10;
                    const currentScore = current.store.getUsedCapacity(RESOURCE_ENERGY) - creep.pos.getRangeTo(current) * 10;
                    return currentScore > bestScore ? current : best;
                });
                if (creep.withdraw(target, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(target, { reusePath: 3, range: 1, visualizePathStyle: { stroke: "#ffaa00" } });
                }
                return;
            }
        }

        const dropped = creep.pos.findClosestByPath(FIND_DROPPED_RESOURCES, {
            filter: resource => resource.resourceType === RESOURCE_ENERGY && resource.amount >= 50
        });
        if (dropped) {
            if (creep.pickup(dropped) === ERR_NOT_IN_RANGE) {
                creep.moveTo(dropped, { reusePath: 2, range: 1, visualizePathStyle: { stroke: "#ffcc66" } });
            }
        }
    },

    /**
     * Delivers energy to structures based on priority.
     * Order: spawns/extensions/towers → batteries (if needed) → storage link → storage/terminal
     * Continues delivering until all energy is distributed or moving to target.
     * Falls back to dropping energy if no valid targets exist.
     */
    deliver(creep: Creep, { preferStorage = false }: TransportBehaviorOptions): void {
        // If no energy left, stop delivering
        if (creep.store.getUsedCapacity(RESOURCE_ENERGY) === 0) {
            return;
        }

        const room = creep.room;
        const adjacentWorkers = creep.pos.findInRange(FIND_MY_CREEPS, 20, {
            filter: c => c.memory.role === CreepRoles.worker && c.store.getFreeCapacity(RESOURCE_ENERGY) > 0
        });
        if (adjacentWorkers.length > 0) {
            const worker = adjacentWorkers[0];
            const transferResult = creep.transfer(worker, RESOURCE_ENERGY);
            if (transferResult === ERR_NOT_IN_RANGE) {
                creep.moveTo(worker, { reusePath: 2, range: 1, visualizePathStyle: { stroke: "#ffffff" } });
            }
            else if (transferResult === OK && creep.store.getUsedCapacity(RESOURCE_ENERGY) === 0) {
                return;
            }
        }

        const hatchery = getHatcheryInfo(room);
        const targets: AnyStoreStructure[] = [];
        const spawns = room.find(FIND_MY_SPAWNS);
        const extensions = room.find(FIND_MY_STRUCTURES, {
            filter: structure => structure.structureType === STRUCTURE_EXTENSION
        }) as StructureExtension[];
        const towers = room.find(FIND_MY_STRUCTURES, {
            filter: structure => structure.structureType === STRUCTURE_TOWER
        }) as StructureTower[];

        targets.push(...spawns, ...extensions, ...towers);

        const priorityTarget = targets
            .filter(structure => structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0)
            .sort((a, b) => a.store.getFreeCapacity(RESOURCE_ENERGY) - b.store.getFreeCapacity(RESOURCE_ENERGY))[0];

        if (priorityTarget) {
            const result = creep.transfer(priorityTarget, RESOURCE_ENERGY);
            if (result === ERR_NOT_IN_RANGE) {
                creep.moveTo(priorityTarget, { reusePath: 3, range: 1, visualizePathStyle: { stroke: "#ffffff" } });
                return;
            }
            return;
        }

        const storage = room.storage ?? null;
        const terminal = room.terminal ?? null;
        const battery = hatchery.batteries.find(candidate => candidate.store.getFreeCapacity(RESOURCE_ENERGY) > 0) ?? null;
        const hatcheryNeedsEnergy = hatchery.spawnEnergy < SPAWN_ENERGY_RESERVE;

        if (battery && (hatcheryNeedsEnergy || battery.store.getUsedCapacity(RESOURCE_ENERGY) < battery.store.getCapacity(RESOURCE_ENERGY) * 0.75)) {
            const result = creep.transfer(battery, RESOURCE_ENERGY);
            if (result === ERR_NOT_IN_RANGE) {
                creep.moveTo(battery, { reusePath: 2, range: 1, visualizePathStyle: { stroke: "#ffffff" } });
                return;
            }
            return;
        }

        const storageLinkTarget = storageLink(room);
        if (storageLinkTarget && storageLinkTarget.store.getFreeCapacity(RESOURCE_ENERGY) > 0) {
            const result = creep.transfer(storageLinkTarget, RESOURCE_ENERGY);
            if (result === ERR_NOT_IN_RANGE) {
                creep.moveTo(storageLinkTarget, { reusePath: 2, range: 1, visualizePathStyle: { stroke: "#ffffff" } });
                return;
            }
            return;
        }

        if (storage && (!terminal || preferStorage)) {
            const result = creep.transfer(storage, RESOURCE_ENERGY);
            if (result === ERR_NOT_IN_RANGE) {
                creep.moveTo(storage, { reusePath: 3, range: 1, visualizePathStyle: { stroke: "#ffffff" } });
                return;
            }
            return;
        }

        if (terminal) {
            const result = creep.transfer(terminal, RESOURCE_ENERGY);
            if (result === ERR_NOT_IN_RANGE) {
                creep.moveTo(terminal, { reusePath: 3, range: 1, visualizePathStyle: { stroke: "#ffffff" } });
                return;
            }
            return;
        }

        if (room.storage) {
            const result = creep.transfer(room.storage, RESOURCE_ENERGY);
            if (result === ERR_NOT_IN_RANGE) {
                creep.moveTo(room.storage, { reusePath: 3, range: 1, visualizePathStyle: { stroke: "#ffffff" } });
                return;
            }
            return;
        }

        creep.drop(RESOURCE_ENERGY);
    }
};
