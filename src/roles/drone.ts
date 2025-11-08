/**
 * Drone role: Static source harvesters that mine directly into containers or links.
 *
 * Behavior:
 * - Claims a source and harvests continuously
 * - Deposits energy into adjacent containers or links
 * - Sits on container to prevent decay damage
 * - Falls back to dropping or transferring to spawn if no infrastructure present
 *
 * Drones are the backbone of energy production, designed for maximum efficiency
 * when paired with source containers and optional links.
 */

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

        const container = this.resolveContainer(creep, source);
        const link = this.resolveLink(creep, source);

        if (creep.store.getFreeCapacity() > 0) {
            const harvestResult = creep.harvest(source);
            if (harvestResult === ERR_NOT_IN_RANGE) {
                creep.moveTo(source, { reusePath: 3, visualizePathStyle: { stroke: "#ffaa00" } });
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
     * Drops energy if container is full, or transfers to spawn as last resort.
     */
    deposit(creep: Creep, container: StructureContainer | null, link: StructureLink | null): void {
        if (link && link.store.getFreeCapacity(RESOURCE_ENERGY) >= creep.store.getUsedCapacity(RESOURCE_ENERGY)) {
            const result = creep.transfer(link, RESOURCE_ENERGY);
            if (result === ERR_NOT_IN_RANGE) {
                creep.moveTo(link, { reusePath: 3, range: 1, visualizePathStyle: { stroke: "#ffffff" } });
            }
            return;
        }

        if (container) {
            const result = creep.transfer(container, RESOURCE_ENERGY);
            if (result === ERR_NOT_IN_RANGE) {
                creep.moveTo(container, { reusePath: 3, range: 1, visualizePathStyle: { stroke: "#ffffff" } });
            } else if (result === ERR_FULL) {
                creep.drop(RESOURCE_ENERGY);
            }
            return;
        }

        const spawn = creep.room.find(FIND_MY_SPAWNS)[0];
        if (spawn) {
            if (creep.transfer(spawn, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                creep.moveTo(spawn, { reusePath: 3, range: 1, visualizePathStyle: { stroke: "#ffffff" } });
            }
            return;
        }

        creep.drop(RESOURCE_ENERGY);
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
