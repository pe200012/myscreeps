import { WORKER_PRESPAWN, WORKER_REPAIR_THRESHOLD, WORKER_WALL_TARGET } from "../constants";
import { CreepRoles, CreepSetups } from "../creeps/setups";
import { SpawnPriorities } from "../priorities";
import { WorkerBehavior } from "../roles/worker";
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
            WorkerBehavior.run(creep, { repairThreshold: WORKER_REPAIR_THRESHOLD, wallTarget: WORKER_WALL_TARGET });
            handled.add(creep.name);
        }
    }

    private countDamagedStructures(room: Room): number {
        return room.find(FIND_STRUCTURES, {
            filter: structure => {
                if (structure.structureType === STRUCTURE_WALL || structure.structureType === STRUCTURE_RAMPART) {
                    return structure.hits < WORKER_WALL_TARGET;
                }
                if (!("hits" in structure) || !("hitsMax" in structure)) {
                    return false;
                }
                const hits = (structure as Structure).hits;
                const hitsMax = (structure as Structure).hitsMax ?? 1;
                return hits / hitsMax < WORKER_REPAIR_THRESHOLD;
            }
        }).length;
    }
}
