import { CreepRoles } from "../creeps/setups";

export const QUEEN_ROLE = CreepRoles.queen;

export interface TransferTarget {
    structure: StructureSpawn | StructureExtension | StructureTower | StructureLink | StructureStorage;
    freeCapacity: number;
}

export const QueenBehavior = {
    run(creep: Creep): void {
        const carrying = creep.store.getUsedCapacity(RESOURCE_ENERGY);
        const free = creep.store.getFreeCapacity(RESOURCE_ENERGY);

        if (!creep.memory.refilling && carrying === 0) {
            creep.memory.refilling = true;
        } else if (creep.memory.refilling && free === 0) {
            creep.memory.refilling = false;
        }

        if (creep.memory.refilling) {
            this.withdrawEnergy(creep);
        } else {
            this.depositEnergy(creep);
        }
    },

    withdrawEnergy(creep: Creep): void {
        const structures: (StructureStorage | StructureLink | StructureContainer | StructureSpawn)[] = [];
        if (creep.room.storage) {
            structures.push(creep.room.storage);
        }
        const link = this.getSupplyLink(creep.room);
        if (link) {
            structures.push(link);
        }
        const containers = creep.room.find(FIND_STRUCTURES, {
            filter: (structure): structure is StructureContainer => structure.structureType === STRUCTURE_CONTAINER
        });
        for (const container of containers) {
            if (container.store[RESOURCE_ENERGY] > 0) {
                structures.push(container);
            }
        }
        const spawns = creep.room.find(FIND_MY_SPAWNS);
        for (const spawn of spawns) {
            if (spawn.store[RESOURCE_ENERGY] > creep.room.energyCapacityAvailable / 2) {
                structures.push(spawn);
            }
        }

        const dropped = creep.pos.findClosestByPath(FIND_DROPPED_RESOURCES, {
            filter: resource => resource.resourceType === RESOURCE_ENERGY && resource.amount >= 50
        });

        const structure = this.pickStructureWithEnergy(creep, structures);
        if (structure) {
            const outcome = creep.withdraw(structure, RESOURCE_ENERGY);
            if (outcome === ERR_NOT_IN_RANGE) {
                creep.moveTo(structure, { reusePath: 3, range: 1, visualizePathStyle: { stroke: "#ffaa00" } });
            }
            return;
        }

        if (dropped) {
            if (creep.pickup(dropped) === ERR_NOT_IN_RANGE) {
                creep.moveTo(dropped, { reusePath: 3, range: 1, visualizePathStyle: { stroke: "#ffcc66" } });
            }
            return;
        }

        const source = this.getClosestActiveSource(creep);
        if (!source) {
            creep.say("idle");
            return;
        }

        if (creep.harvest(source) === ERR_NOT_IN_RANGE) {
            creep.moveTo(source, { reusePath: 3, range: 1, visualizePathStyle: { stroke: "#ffaa00" } });
        }
    },

    depositEnergy(creep: Creep): void {
        const targets = this.getDepositTargets(creep.room);
        const fallback = creep.room.storage ?? creep.room.find(FIND_MY_SPAWNS)[0] ?? null;
        const target = targets.length > 0 ? targets[0].structure : fallback;
        if (!target) {
            creep.say("no target");
            return;
        }

        const result = creep.transfer(target, RESOURCE_ENERGY);
        if (result === ERR_NOT_IN_RANGE) {
            creep.moveTo(target, { reusePath: 3, range: 1, visualizePathStyle: { stroke: "#ffffff" } });
        } else if (result === ERR_FULL) {
            creep.memory.refilling = true;
        }
    },

    getDepositTargets(room: Room): TransferTarget[] {
        const spawnTargets: TransferTarget[] = [];
        const spawns = room.find(FIND_MY_SPAWNS);
        const extensions = room.find(FIND_MY_STRUCTURES, {
            filter: structure => structure.structureType === STRUCTURE_EXTENSION
        }) as StructureExtension[];
        const towers = room.find(FIND_MY_STRUCTURES, {
            filter: structure => structure.structureType === STRUCTURE_TOWER
        }) as StructureTower[];

        for (const structure of [...spawns, ...extensions, ...towers]) {
            const freeCapacity = structure.store.getFreeCapacity(RESOURCE_ENERGY);
            if (freeCapacity > 0) {
                spawnTargets.push({ structure, freeCapacity });
            }
        }

        spawnTargets.sort((a, b) => a.freeCapacity - b.freeCapacity);
        return spawnTargets;
    },

    getSupplyLink(room: Room): StructureLink | null {
        if (!room.memory.planner?.structures) {
            return null;
        }
        const linkEntry = room.memory.planner.structures.find(struct => struct.type === STRUCTURE_LINK);
        if (!linkEntry) {
            return null;
        }
        const link = room.lookForAt(LOOK_STRUCTURES, linkEntry.x, linkEntry.y).find(structure =>
            structure.structureType === STRUCTURE_LINK
        );
        return (link as StructureLink) ?? null;
    },

    pickStructureWithEnergy(creep: Creep, structures: AnyStoreStructure[]): AnyStoreStructure | null {
        let best: AnyStoreStructure | null = null;
        let highest = 0;
        for (const structure of structures) {
            const available = structure.store?.[RESOURCE_ENERGY] ?? 0;
            if (available <= 0) {
                continue;
            }
            const distance = creep.pos.getRangeTo(structure);
            const score = available - distance * 5;
            if (score > highest) {
                highest = score;
                best = structure;
            }
        }
        return best;
    },

    getClosestActiveSource(creep: Creep): Source | null {
        const source = creep.pos.findClosestByPath(FIND_SOURCES_ACTIVE);
        return source ?? null;
    }
};
