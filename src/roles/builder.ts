import { hasNearbyEnemies } from "../utils/roomUtils";
import { SPAWN_ENERGY_RESERVE } from "../constants";

export const BUILDER_ROLE = "builder";
export const BUILDER_BODY: BodyPartConstant[] = [WORK, WORK, CARRY, MOVE];

export function runBuilder(creep: Creep): void {
    // If we have energy, try to build nearest construction site
    if (creep.store.getUsedCapacity(RESOURCE_ENERGY) > 0) {
        const site = creep.pos.findClosestByPath(FIND_CONSTRUCTION_SITES);
        if (site) {
            if (creep.build(site) === ERR_NOT_IN_RANGE) {
                creep.moveTo(site, { visualizePathStyle: { stroke: "#ffffff" }, reusePath: 5 });
            }
            return;
        }

        // No sites: help upgrade controller or transfer to storage
        const storage = creep.room.storage;
        if (storage && storage.store.getFreeCapacity(RESOURCE_ENERGY) > 0) {
            if (creep.transfer(storage, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                creep.moveTo(storage, { visualizePathStyle: { stroke: "#ffffff" }, reusePath: 5 });
            }
            return;
        }

        if (creep.room.controller) {
            if (creep.upgradeController(creep.room.controller) === ERR_NOT_IN_RANGE) {
                creep.moveTo(creep.room.controller, { visualizePathStyle: { stroke: "#99c1f1" } });
            }
        }
        return;
    }

    // If empty, try to pick up nearby dropped energy first
    const droppedResources = creep.room.find(FIND_DROPPED_RESOURCES, {
        filter: r => r.resourceType === RESOURCE_ENERGY && r.amount > 10 && !hasNearbyEnemies(r.pos, creep.room)
    });

    if (droppedResources.length > 0) {
        const closest = creep.pos.findClosestByPath(droppedResources);
        if (closest) {
            if (creep.pickup(closest) === ERR_NOT_IN_RANGE) {
                creep.moveTo(closest, { visualizePathStyle: { stroke: "#a4f6a5" }, reusePath: 3 });
            }
            return;
        }
    }

    // Try to withdraw from structures with energy (spawn, storage, containers)
    // Reserve energy in spawns for emergency harvester respawning
    const energySources = creep.room.find(FIND_STRUCTURES, {
        filter: structure => {
            if (structure.structureType === STRUCTURE_SPAWN) {
                if ("store" in structure) {
                    const store = (structure as AnyStoreStructure).store;
                    // Only withdraw from spawn if it has more than reserve threshold
                    return store.getUsedCapacity(RESOURCE_ENERGY) > SPAWN_ENERGY_RESERVE;
                }
            } else if (
                structure.structureType === STRUCTURE_STORAGE ||
                structure.structureType === STRUCTURE_CONTAINER
            ) {
                if ("store" in structure) {
                    const store = (structure as AnyStoreStructure).store;
                    return store.getUsedCapacity(RESOURCE_ENERGY) > 0;
                }
            }
            return false;
        }
    });

    if (energySources.length > 0) {
        const closest = creep.pos.findClosestByPath(energySources);
        if (closest && "store" in closest) {
            if (creep.withdraw(closest as AnyStoreStructure, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                creep.moveTo(closest, { visualizePathStyle: { stroke: "#00ff00" }, reusePath: 5 });
            }
            return;
        }
    }

    // Otherwise harvest from safe sources
    const safeSources = creep.room.find(FIND_SOURCES_ACTIVE, {
        filter: source => !hasNearbyEnemies(source.pos, creep.room)
    });

    if (safeSources.length > 0) {
        const source = creep.pos.findClosestByPath(safeSources);
        if (source) {
            if (creep.harvest(source) === ERR_NOT_IN_RANGE) {
                creep.moveTo(source, { visualizePathStyle: { stroke: "#ffaa00" }, reusePath: 5 });
            }
        }
    }
}
