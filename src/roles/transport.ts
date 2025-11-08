import { CreepRoles } from "../creeps/setups";

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
        const storage = creep.room.storage;
        if (storage && storage.store[RESOURCE_ENERGY] > 0 && storage.store.getUsedCapacity(RESOURCE_ENERGY) > 1000) {
            if (creep.withdraw(storage, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                creep.moveTo(storage, { reusePath: 3, range: 1, visualizePathStyle: { stroke: "#ffaa00" } });
            }
            return;
        }

        const containers = creep.room.find(FIND_STRUCTURES, {
            filter: (structure): structure is StructureContainer =>
                structure.structureType === STRUCTURE_CONTAINER && structure.store.getUsedCapacity(RESOURCE_ENERGY) > 100
        });
        if (containers.length > 0) {
            const richest = containers.reduce((best, current) =>
                (current.store[RESOURCE_ENERGY] > best.store[RESOURCE_ENERGY] ? current : best)
            );
            if (creep.withdraw(richest, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                creep.moveTo(richest, { reusePath: 3, range: 1, visualizePathStyle: { stroke: "#ffaa00" } });
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
        const targets: AnyStoreStructure[] = [];
        const spawns = creep.room.find(FIND_MY_SPAWNS);
        const extensions = creep.room.find(FIND_MY_STRUCTURES, {
            filter: structure => structure.structureType === STRUCTURE_EXTENSION
        }) as StructureExtension[];
        const towers = creep.room.find(FIND_MY_STRUCTURES, {
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

        const storage = creep.room.storage ?? null;
        const terminal = creep.room.terminal ?? null;
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

        if (creep.room.storage) {
            if (creep.transfer(creep.room.storage, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                creep.moveTo(creep.room.storage, { reusePath: 3, range: 1, visualizePathStyle: { stroke: "#ffffff" } });
            }
            return;
        }

        creep.drop(RESOURCE_ENERGY);
    }
};
