import { QUEEN_PRESPAWN } from "../constants";
import { CreepRoles, CreepSetups } from "../creeps/setups";
import { SpawnPriorities } from "../priorities";
import { QueenBehavior } from "../roles/queen";
import { Overlord } from "./Overlord";

export class QueenOverlord extends Overlord {
    constructor(room: Room, spawnManager: import("../managers/SpawnManager").SpawnManager) {
        super(room, spawnManager, CreepRoles.queen, SpawnPriorities.queen);
    }

    init(): void {
        const room = this.room;
        if (!room) {
            return;
        }

        const hasStorage = !!room.storage;
        const setup = hasStorage ? CreepSetups.queen.default : CreepSetups.queen.early;

        this.ensureTagged(setup, {
            tag: `${this.ref}:queen`,
            match: () => true,
            quantity: 1,
            prespawn: QUEEN_PRESPAWN,
            priority: SpawnPriorities.queen
        });
    }

    run(handled: Set<string>): void {
        for (const creep of this.creeps) {
            QueenBehavior.run(creep);
            handled.add(creep.name);
        }
    }
}
