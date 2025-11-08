import { CreepRoles } from "../creeps/setups";

export const WORKER_ROLE = CreepRoles.worker;

export interface WorkerBehaviorOptions {
    repairThreshold: number;
    wallTarget: number;
}

export const WorkerBehavior = {
    run(creep: Creep, options: WorkerBehaviorOptions): void {
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
            if (this.tryBuild(creep)) {
                return;
            }
            if (this.tryRepair(creep, options)) {
                return;
            }
            this.upgrade(creep);
        } else {
            this.gather(creep);
        }
    },

    gather(creep: Creep): void {
        const storage = creep.room.storage;
        if (storage && storage.store.getUsedCapacity(RESOURCE_ENERGY) > 5000) {
            if (creep.withdraw(storage, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                creep.moveTo(storage, { reusePath: 3, range: 1, visualizePathStyle: { stroke: "#ffaa00" } });
            }
            return;
        }

        const container = creep.pos.findClosestByPath(FIND_STRUCTURES, {
            filter: (structure): structure is StructureContainer =>
                structure.structureType === STRUCTURE_CONTAINER && structure.store[RESOURCE_ENERGY] > 100
        });
        if (container) {
            if (creep.withdraw(container, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                creep.moveTo(container, { reusePath: 3, range: 1, visualizePathStyle: { stroke: "#ffaa00" } });
            }
            return;
        }

        const dropped = creep.pos.findClosestByPath(FIND_DROPPED_RESOURCES, {
            filter: resource => resource.resourceType === RESOURCE_ENERGY && resource.amount >= 50
        });
        if (dropped) {
            if (creep.pickup(dropped) === ERR_NOT_IN_RANGE) {
                creep.moveTo(dropped, { reusePath: 3, range: 1, visualizePathStyle: { stroke: "#ffcc66" } });
            }
            return;
        }

        const source = creep.pos.findClosestByPath(FIND_SOURCES_ACTIVE);
        if (source && creep.harvest(source) === ERR_NOT_IN_RANGE) {
            creep.moveTo(source, { reusePath: 3, visualizePathStyle: { stroke: "#ffaa00" } });
        }
    },

    tryBuild(creep: Creep): boolean {
        const site = creep.pos.findClosestByPath(FIND_CONSTRUCTION_SITES);
        if (!site) {
            return false;
        }
        const result = creep.build(site);
        if (result === ERR_NOT_IN_RANGE) {
            creep.moveTo(site, { reusePath: 3, visualizePathStyle: { stroke: "#ffffff" } });
        }
        return true;
    },

    tryRepair(creep: Creep, { repairThreshold, wallTarget }: WorkerBehaviorOptions): boolean {
        const target = creep.pos.findClosestByPath(FIND_STRUCTURES, {
            filter: structure => {
                if (structure.structureType === STRUCTURE_WALL || structure.structureType === STRUCTURE_RAMPART) {
                    return structure.hits < wallTarget;
                }
                if (!("hits" in structure) || !("hitsMax" in structure)) {
                    return false;
                }
                const hits = (structure as Structure).hits;
                const hitsMax = (structure as Structure).hitsMax ?? 1;
                return hits / hitsMax < repairThreshold;
            }
        });
        if (!target) {
            return false;
        }
        const result = creep.repair(target as Structure);
        if (result === ERR_NOT_IN_RANGE) {
            creep.moveTo(target, { reusePath: 3, visualizePathStyle: { stroke: "#99c1f1" } });
        }
        return true;
    },

    upgrade(creep: Creep): void {
        const controller = creep.room.controller;
        if (!controller) {
            return;
        }
        if (creep.upgradeController(controller) === ERR_NOT_IN_RANGE) {
            creep.moveTo(controller, { reusePath: 3, visualizePathStyle: { stroke: "#99c1f1" } });
        }
    }
};
