import { WORKER_PRESPAWN, WORKER_WALL_TARGET } from "../constants";
import { CreepRoles, CreepSetups } from "../creeps/setups";
import { SpawnPriorities } from "../priorities";
import { WorkerBehavior, getRampartTarget, getRepairFraction, getWallTarget } from "../roles/worker";
import { Overlord } from "./Overlord";

export class WorkerOverlord extends Overlord {
    constructor(room: Room, spawnManager: import("../managers/SpawnManager").SpawnManager) {
        super(room, spawnManager, CreepRoles.worker, SpawnPriorities.worker);
    }

    init(): void {
        const room = this.room;
        if (!room) {
            return;
        }

        const sites = room.find(FIND_CONSTRUCTION_SITES).length;
        const damaged = this.countDamagedStructures(room);
        const controllerLevel = room.controller?.level ?? 0;
        const hasStorage = !!room.storage;

        const setup = controllerLevel >= 5 ? CreepSetups.worker.late : hasStorage ? CreepSetups.worker.default : CreepSetups.worker.early;
        const quantity = Math.min(6, Math.max(1, Math.ceil(sites / 5) + Math.ceil(damaged / 10)));

        this.wishlist(quantity, setup, {
            prespawn: WORKER_PRESPAWN,
            priority: SpawnPriorities.worker
        });
    }

    run(handled: Set<string>): void {
        for (const creep of this.creeps) {
            WorkerBehavior.run(creep, { wallTarget: WORKER_WALL_TARGET });
            handled.add(creep.name);
        }
    }

    private countDamagedStructures(room: Room): number {
        const repairFraction = getRepairFraction(room.controller?.level);
        return room.find(FIND_STRUCTURES, {
            filter: structure => {
                if (structure.structureType === STRUCTURE_WALL || structure.structureType === STRUCTURE_RAMPART) {
                    if (structure.structureType === STRUCTURE_WALL) {
                        return structure.hits < getWallTarget(WORKER_WALL_TARGET, repairFraction);
                    }
                    const rampart = structure as StructureRampart;
                    return (!!rampart.my) && rampart.hits < getRampartTarget(rampart, WORKER_WALL_TARGET, repairFraction);
                }
                if (!("hits" in structure) || !("hitsMax" in structure)) {
                    return false;
                }
                const hits = (structure as Structure).hits;
                const hitsMax = (structure as Structure).hitsMax ?? 1;
                return hits < hitsMax * repairFraction;
            }
        }).length;
    }
}
