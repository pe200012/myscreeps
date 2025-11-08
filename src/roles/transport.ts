import { SPAWN_ENERGY_RESERVE } from "../constants";
import { CreepRoles } from "../creeps/setups";
import { getHatcheryInfo, shouldProtectHatchery, storageLink } from "../utils/logistics";

export const TRANSPORT_ROLE = CreepRoles.transport;

export interface TransportBehaviorOptions {
    preferStorage?: boolean;
}

export const TransportBehavior = {
    run(creep: Creep, options: TransportBehaviorOptions = {}): void {
        if (creep.memory.hauling === undefined) {
            creep.memory.hauling = false;
        }

        if (!creep.memory.hauling && creep.store.getFreeCapacity(RESOURCE_ENERGY) === 0) {
            creep.memory.hauling = true;
        } else if (creep.memory.hauling && creep.store.getUsedCapacity(RESOURCE_ENERGY) === 0) {
            creep.memory.hauling = false;
        }

        if (creep.memory.hauling) {
            this.deliver(creep, options);
        } else {
            this.collect(creep);
        }
    },

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

        const dropped = creep.pos.findClosestByPath(FIND_DROPPED_RESOURCES, {
            filter: resource => resource.resourceType === RESOURCE_ENERGY && resource.amount >= 50
        });
        if (dropped) {
            if (creep.pickup(dropped) === ERR_NOT_IN_RANGE) {
                creep.moveTo(dropped, { reusePath: 2, range: 1, visualizePathStyle: { stroke: "#ffcc66" } });
            }
        }
    },

    deliver(creep: Creep, { preferStorage = false }: TransportBehaviorOptions): void {
        const room = creep.room;
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
            if (creep.transfer(priorityTarget, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                creep.moveTo(priorityTarget, { reusePath: 3, range: 1, visualizePathStyle: { stroke: "#ffffff" } });
            }
            return;
        }

        const storage = room.storage ?? null;
        const terminal = room.terminal ?? null;
        const battery = hatchery.batteries.find(candidate => candidate.store.getFreeCapacity(RESOURCE_ENERGY) > 0) ?? null;
        const hatcheryNeedsEnergy = hatchery.spawnEnergy < SPAWN_ENERGY_RESERVE;

        if (battery && (hatcheryNeedsEnergy || battery.store.getUsedCapacity(RESOURCE_ENERGY) < battery.store.getCapacity(RESOURCE_ENERGY) * 0.75)) {
            if (creep.transfer(battery, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                creep.moveTo(battery, { reusePath: 2, range: 1, visualizePathStyle: { stroke: "#ffffff" } });
            }
            return;
        }

        const storageLinkTarget = storageLink(room);
        if (storageLinkTarget && storageLinkTarget.store.getFreeCapacity(RESOURCE_ENERGY) > 0) {
            if (creep.transfer(storageLinkTarget, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                creep.moveTo(storageLinkTarget, { reusePath: 2, range: 1, visualizePathStyle: { stroke: "#ffffff" } });
            }
            return;
        }

        if (storage && (!terminal || preferStorage)) {
            if (creep.transfer(storage, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                creep.moveTo(storage, { reusePath: 3, range: 1, visualizePathStyle: { stroke: "#ffffff" } });
            }
            return;
        }

        if (terminal) {
            if (creep.transfer(terminal, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                creep.moveTo(terminal, { reusePath: 3, range: 1, visualizePathStyle: { stroke: "#ffffff" } });
            }
            return;
        }

        if (room.storage) {
            if (creep.transfer(room.storage, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                creep.moveTo(room.storage, { reusePath: 3, range: 1, visualizePathStyle: { stroke: "#ffffff" } });
            }
            return;
        }

        creep.drop(RESOURCE_ENERGY);
    }
};
