/**
 * Upgrader role: Dedicated controller upgrading units for RCL progression.
 *
 * Behavior:
 * - Refills from storage, containers, nearby upgrade links, or sources
 * - Upgrades controller continuously
 * - Typically operates near the controller for efficiency
 *
 * Upgraders are spawned in quantities based on available energy and RCL needs.
 * RCL 8 setups maximize work parts to maintain 15 upgrade power.
 */

import { CreepRoles } from "../creeps/setups";

export const UPGRADER_ROLE = CreepRoles.upgrader;

/**
 * Upgrader behavior implementation.
 * Manages refilling and controller upgrading.
 */
export const UpgraderBehavior = {
    /**
     * Main execution method called each tick.
     * Toggles between refilling and upgrading modes.
     */
    run(creep: Creep): void {
        if (creep.memory.working === undefined) {
            creep.memory.working = false;
        }

        if (!creep.memory.working && creep.store.getFreeCapacity(RESOURCE_ENERGY) === 0) {
            creep.memory.working = true;
        }
        if (creep.memory.working && creep.store.getUsedCapacity(RESOURCE_ENERGY) === 0) {
            creep.memory.working = false;
        }

        if (creep.memory.working) {
            this.upgrade(creep);
        } else {
            this.refill(creep);
        }
    },

    /**
     * Upgrades the room controller.
     */
    upgrade(creep: Creep): void {
        const controller = creep.room.controller;
        if (!controller) {
            return;
        }
        if (creep.upgradeController(controller) === ERR_NOT_IN_RANGE) {
            creep.moveTo(controller, { reusePath: 3, visualizePathStyle: { stroke: "#99c1f1" } });
        }
    },

    /**
     * Refills energy from available sources with priority:
     * storage → containers → upgrade link → active sources
     */
    refill(creep: Creep): void {
        const storage = creep.room.storage;
        if (storage && storage.store[RESOURCE_ENERGY] > 0) {
            if (creep.withdraw(storage, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                creep.moveTo(storage, { reusePath: 3, range: 1, visualizePathStyle: { stroke: "#ffaa00" } });
            }
            return;
        }

        const container = creep.pos.findClosestByPath(FIND_STRUCTURES, {
            filter: (structure): structure is StructureContainer =>
                structure.structureType === STRUCTURE_CONTAINER && structure.store[RESOURCE_ENERGY] > 0
        });
        if (container) {
            if (creep.withdraw(container, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                creep.moveTo(container, { reusePath: 3, range: 1, visualizePathStyle: { stroke: "#ffaa00" } });
            }
            return;
        }

        const link = this.getUpgradeLink(creep);
        if (link && link.store[RESOURCE_ENERGY] > 0) {
            if (creep.withdraw(link, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                creep.moveTo(link, { reusePath: 3, range: 1, visualizePathStyle: { stroke: "#ffaa00" } });
            }
            return;
        }

        const source = creep.pos.findClosestByPath(FIND_SOURCES_ACTIVE);
        if (source && creep.harvest(source) === ERR_NOT_IN_RANGE) {
            creep.moveTo(source, { reusePath: 3, visualizePathStyle: { stroke: "#ffaa00" } });
        }
    },

    /**
     * Finds a link within range 3 of the controller for efficient refilling.
     * Typically paired with manager delivering energy to this link.
     */
    getUpgradeLink(creep: Creep): StructureLink | null {
        const controller = creep.room.controller;
        if (!controller) {
            return null;
        }
        const link = controller.pos.findInRange(FIND_MY_STRUCTURES, 3, {
            filter: structure => structure.structureType === STRUCTURE_LINK
        })[0] as StructureLink | undefined;
        return link ?? null;
    }
};
