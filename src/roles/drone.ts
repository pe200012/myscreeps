/**
 * Drone role: Static source harvesters that mine directly into containers or links.
 *
 * Behavior:
 * - Claims a source and harvests continuously
 * - Deposits energy into adjacent containers or links
 * - Sits on container to prevent decay damage
 * - Falls back to dropping or transferring to spawn if no infrastructure present
 * - Avoids sources with nearby enemies
 *
 * Drones are the backbone of energy production, designed for maximum efficiency
 * when paired with source containers and optional links.
 */

import { ALLY_USERNAMES, ENEMY_DANGER_RANGE } from "../constants";
import { CreepRoles } from "../creeps/setups";

export const DRONE_ROLE = CreepRoles.drone;

/**
 * Drone behavior implementation.
 * Manages source assignment, harvesting, and energy transfer.
 */
export const DroneBehavior = {
    /**
     * Main execution method called each tick.
     * Handles source assignment, harvesting, and depositing.
     */
    run(creep: Creep): void {
        if (!creep.memory.sourceId) {
            const source = this.findSource(creep);
            if (source) {
                creep.memory.sourceId = source.id;
            } else {
                creep.say("?src");
                return;
            }
        }

        const source = Game.getObjectById(creep.memory.sourceId as Id<Source>);
        if (!source) {
            delete creep.memory.sourceId;
            return;
        }

        // Check for nearby enemies and flee if necessary
        if (this.hasNearbyEnemies(source)) {
            creep.say("⚠️");
            // Try to find a safer source
            const safeSource = this.findSafeSource(creep);
            if (safeSource && safeSource.id !== source.id) {
                creep.memory.sourceId = safeSource.id;
                return;
            }
            // If no safe source, move away from current position toward spawn
            const spawn = creep.room.find(FIND_MY_SPAWNS)[0];
            if (spawn && creep.pos.getRangeTo(spawn) > 3) {
                creep.moveTo(spawn, { reusePath: 3, visualizePathStyle: { stroke: "#ff0000" } });
                return;
            }
            // Stay put if already at spawn
            return;
        }

        const container = this.resolveContainer(creep, source);
        const link = this.resolveLink(creep, source);

        if (creep.store.getFreeCapacity() > 0) {
            const harvestResult = creep.harvest(source);
            if (harvestResult === ERR_NOT_IN_RANGE) {
                creep.moveTo(source, { reusePath: 6, visualizePathStyle: { stroke: "#ffaa00" } });
            }
            if (harvestResult === ERR_NOT_ENOUGH_RESOURCES && container && creep.store.getUsedCapacity() > 0) {
                this.deposit(creep, container, link ?? null);
            }
            return;
        }

        this.deposit(creep, container, link ?? null);
    },

    /**
     * Deposits harvested energy, prioritizing link over container.
     * If primary targets are full, finds alternative structures (extensions, storage, etc).
     * Continues depositing until all energy is transferred or moving to target.
     * Drops energy as last resort.
     */
    deposit(creep: Creep, container: StructureContainer | null, link: StructureLink | null): void {
        // Priority 1: Link (if has space)
        if (link && link.store.getFreeCapacity(RESOURCE_ENERGY) > 0) {
            const result = creep.transfer(link, RESOURCE_ENERGY);
            if (result === ERR_NOT_IN_RANGE) {
                creep.moveTo(link, { reusePath: 3, range: 1, visualizePathStyle: { stroke: "#ffffff" } });
                return;
            }
            if (result === OK && creep.store.getUsedCapacity(RESOURCE_ENERGY) > 0) {
                // Continue depositing if still have energy
                this.deposit(creep, container, link);
                return;
            }
            return;
        }

        // Priority 2: Container (if has space)
        if (container && container.store.getFreeCapacity(RESOURCE_ENERGY) > 0) {
            const result = creep.transfer(container, RESOURCE_ENERGY);
            if (result === ERR_NOT_IN_RANGE) {
                creep.moveTo(container, { reusePath: 3, range: 1, visualizePathStyle: { stroke: "#ffffff" } });
                return;
            }
            if (result === OK && creep.store.getUsedCapacity(RESOURCE_ENERGY) > 0) {
                // Continue depositing if still have energy
                this.deposit(creep, container, link);
                return;
            }
            return;
        }

        // Priority 3: Find alternative nearby structures that need energy
        const alternativeTarget = creep.pos.findClosestByRange(FIND_STRUCTURES, {
            filter: (structure) => {
                if (structure.structureType === STRUCTURE_EXTENSION ||
                    structure.structureType === STRUCTURE_SPAWN) {
                    return (structure as StructureExtension | StructureSpawn).store.getFreeCapacity(RESOURCE_ENERGY) > 0;
                }
                if (structure.structureType === STRUCTURE_STORAGE ||
                    structure.structureType === STRUCTURE_CONTAINER) {
                    return (structure as StructureStorage | StructureContainer).store.getFreeCapacity(RESOURCE_ENERGY) > 0;
                }
                if (structure.structureType === STRUCTURE_TOWER) {
                    return (structure as StructureTower).store.getFreeCapacity(RESOURCE_ENERGY) > 200;
                }
                return false;
            }
        }) as StructureExtension | StructureSpawn | StructureStorage | StructureContainer | StructureTower | null;

        if (alternativeTarget) {
            const result = creep.transfer(alternativeTarget, RESOURCE_ENERGY);
            if (result === ERR_NOT_IN_RANGE) {
                creep.moveTo(alternativeTarget, { reusePath: 3, range: 1, visualizePathStyle: { stroke: "#ffaa00" } });
                return;
            }
            if (result === OK && creep.store.getUsedCapacity(RESOURCE_ENERGY) > 0) {
                // Continue depositing if still have energy
                this.deposit(creep, container, link);
                return;
            }
            return;
        }

        // Last resort: Drop energy on the ground
        if (creep.store.getUsedCapacity(RESOURCE_ENERGY) > 0) {
            // Before dropping, try to give energy to nearby workers or upgraders
            const nearbyCreep = creep.pos.findClosestByRange(FIND_MY_CREEPS, {
                filter: (c) =>
                    (c.memory.role === CreepRoles.worker || c.memory.role === CreepRoles.upgrader) &&
                    c.store.getFreeCapacity(RESOURCE_ENERGY) > 0
            });

            if (nearbyCreep) {
                const result = creep.transfer(nearbyCreep, RESOURCE_ENERGY);
                if (result === ERR_NOT_IN_RANGE) {
                    creep.moveTo(nearbyCreep, { reusePath: 3, range: 1, visualizePathStyle: { stroke: "#00ff00" } });
                    return;
                }
                if (result === OK && creep.store.getUsedCapacity(RESOURCE_ENERGY) > 0) {
                    // Continue depositing if still have energy
                    this.deposit(creep, container, link);
                    return;
                }
                return;
            }

            // Truly last resort: drop it
            creep.drop(RESOURCE_ENERGY);
        }
    },

    /**
     * Finds an available source for this drone to harvest.
     * Attempts to avoid sources already assigned to other drones.
     */
    findSource(creep: Creep): Source | null {
        const assigned = new Set(Object.values(Game.creeps)
            .filter(c => c !== creep && c.memory.role === DRONE_ROLE && c.memory.sourceId)
            .map(c => c.memory.sourceId as string));
        const available = creep.room.find(FIND_SOURCES, {
            filter: source => !assigned.has(source.id)
        });
        return available[0] ?? creep.room.find(FIND_SOURCES)[0] ?? null;
    },

    /**
     * Finds a source that doesn't have nearby enemies.
     * Prioritizes unassigned sources, but will use any safe source if needed.
     */
    findSafeSource(creep: Creep): Source | null {
        const assigned = new Set(Object.values(Game.creeps)
            .filter(c => c !== creep && c.memory.role === DRONE_ROLE && c.memory.sourceId)
            .map(c => c.memory.sourceId as string));

        // First try to find an unassigned safe source
        const unassignedSafe = creep.room.find(FIND_SOURCES, {
            filter: source => !assigned.has(source.id) && !this.hasNearbyEnemies(source)
        });
        if (unassignedSafe.length > 0) {
            return unassignedSafe[0];
        }

        // Fall back to any safe source
        const anySafe = creep.room.find(FIND_SOURCES, {
            filter: source => !this.hasNearbyEnemies(source)
        });
        return anySafe[0] ?? null;
    },

    /**
     * Checks if there are hostile creeps near a source.
     */
    hasNearbyEnemies(source: Source): boolean {
        const hostiles = source.pos.findInRange(FIND_HOSTILE_CREEPS, ENEMY_DANGER_RANGE, {
            filter: hostile => !ALLY_USERNAMES.includes(hostile.owner.username)
        });
        return hostiles.length > 0;
    },

    /**
     * Locates and caches the container adjacent to the assigned source.
     * Stores container ID in memory for future ticks.
     */
    resolveContainer(creep: Creep, source: Source): StructureContainer | null {
        if (creep.memory.containerId) {
            const container = Game.getObjectById(creep.memory.containerId as Id<StructureContainer>);
            if (container) {
                return container;
            }
            delete creep.memory.containerId;
        }
        const container = source.pos.findInRange(FIND_STRUCTURES, 1, {
            filter: structure => structure.structureType === STRUCTURE_CONTAINER
        })[0] as StructureContainer | undefined;
        if (container) {
            creep.memory.containerId = container.id;
        }
        return container ?? null;
    },

    /**
     * Locates and caches the link near the assigned source.
     * Stores link ID in memory for future ticks.
     */
    resolveLink(creep: Creep, source: Source): StructureLink | null {
        if (creep.memory.linkId) {
            const link = Game.getObjectById(creep.memory.linkId as Id<StructureLink>);
            if (link) {
                return link;
            }
            delete creep.memory.linkId;
        }
        const link = source.pos.findInRange(FIND_STRUCTURES, 2, {
            filter: structure => structure.structureType === STRUCTURE_LINK
        })[0] as StructureLink | undefined;
        if (link) {
            creep.memory.linkId = link.id;
        }
        return link ?? null;
    }
};
