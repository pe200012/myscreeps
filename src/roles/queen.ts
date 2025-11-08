import { SPAWN_ENERGY_RESERVE } from "../constants";
import { CreepRoles } from "../creeps/setups";
import { getHatcheryInfo, shouldProtectHatchery } from "../utils/logistics";

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
        const hatchery = getHatcheryInfo(creep.room);
        const structures: AnyStoreStructure[] = [];
        const seen = new Set<Id<AnyStoreStructure>>();

        const addStructure = (structure: AnyStoreStructure | null | undefined): void => {
            if (!structure) {
                return;
            }
            const id = structure.id as Id<AnyStoreStructure>;
            if (seen.has(id)) {
                return;
            }
            if (structure.store.getUsedCapacity(RESOURCE_ENERGY) <= 0) {
                return;
            }
            structures.push(structure);
            seen.add(id);
        };

        addStructure(hatchery.link);
        for (const battery of hatchery.batteries) {
            addStructure(battery);
        }

        if (creep.room.storage) {
            addStructure(creep.room.storage);
        }

        if (creep.room.terminal && creep.room.terminal.store.getUsedCapacity(RESOURCE_ENERGY) > 5000) {
            addStructure(creep.room.terminal);
        }

        const spawns = creep.room.find(FIND_MY_SPAWNS);
        const protectReserve = shouldProtectHatchery(creep.room);
        for (const spawn of spawns) {
            const stored = spawn.store.getUsedCapacity(RESOURCE_ENERGY);
            if (!protectReserve && stored > SPAWN_ENERGY_RESERVE) {
                addStructure(spawn);
            }
        }

        const dropped = creep.pos.findClosestByPath(FIND_DROPPED_RESOURCES, {
            filter: resource => resource.resourceType === RESOURCE_ENERGY && resource.amount >= 50
        });

        const structure = this.pickStructureWithEnergy(creep, structures, hatchery);
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
        const hatchery = getHatcheryInfo(creep.room);
        const battery = hatchery.batteries.find(candidate => candidate.store.getFreeCapacity(RESOURCE_ENERGY) > 0) ?? null;

        const targets = this.getDepositTargets(creep.room);
        const fallback = creep.room.storage ?? creep.room.find(FIND_MY_SPAWNS)[0] ?? null;
        const hatcheryNeedsEnergy = hatchery.spawnEnergy < SPAWN_ENERGY_RESERVE;
        const target = hatcheryNeedsEnergy && battery ? battery : targets.length > 0 ? targets[0].structure : fallback;
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

    pickStructureWithEnergy(creep: Creep, structures: AnyStoreStructure[], hatchery: ReturnType<typeof getHatcheryInfo>): AnyStoreStructure | null {
        let best: AnyStoreStructure | null = null;
        let highest = -Infinity;
        const batteryIds = new Set(hatchery.batteries.map(battery => battery.id));
        for (const structure of structures) {
            const available = structure.store.getUsedCapacity(RESOURCE_ENERGY);
            if (available <= 0) {
                continue;
            }
            const distance = creep.pos.getRangeTo(structure);
            const weight = this.structureWeight(structure, batteryIds, hatchery.link);
            const score = available * weight - distance * 5;
            if (score > highest) {
                highest = score;
                best = structure;
            }
        }
        return best;
    },

    structureWeight(structure: AnyStoreStructure, batteryIds: Set<Id<StructureContainer>>, hatcheryLink: StructureLink | null): number {
        if (batteryIds.has(structure.id as Id<StructureContainer>)) {
            return 4;
        }
        if (hatcheryLink && structure.id === hatcheryLink.id) {
            return 3;
        }
        switch (structure.structureType) {
            case STRUCTURE_STORAGE:
                return 2.5;
            case STRUCTURE_TERMINAL:
                return 1.8;
            case STRUCTURE_LINK:
                return 2.2;
            case STRUCTURE_SPAWN:
                return 1.5;
            default:
                return 1;
        }
    },

    getClosestActiveSource(creep: Creep): Source | null {
        const source = creep.pos.findClosestByPath(FIND_SOURCES_ACTIVE);
        return source ?? null;
    }
};
