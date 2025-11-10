import { CreepRoles, CreepSetups } from "../creeps/setups";
import { SpawnPriorities } from "../priorities";
import { UpgraderBehavior } from "../roles/upgrader";
import { Overlord } from "./Overlord";

export class UpgraderOverlord extends Overlord {
    constructor(room: Room, spawnManager: import("../managers/SpawnManager").SpawnManager) {
        super(room, spawnManager, CreepRoles.upgrader, SpawnPriorities.upgrader);
    }

    init(): void {
        const room = this.room;
        if (!room || !room.controller) {
            return;
        }

        const controllerLevel = room.controller.level;
        const hasStorage = !!room.storage;
        const setup = controllerLevel >= 8 ? CreepSetups.upgrader.rcl8 : hasStorage ? CreepSetups.upgrader.default : CreepSetups.upgrader.early;

        let quantity = 1;
        if (controllerLevel < 8) {
            quantity = hasStorage ? 4 : 3;
        } else {
            quantity = room.storage && room.storage.store.getUsedCapacity(RESOURCE_ENERGY) > 200000 ? 5 : 4;
        }

        this.wishlist(quantity, setup, {
            prespawn: 30,
            priority: controllerLevel < 3 ? SpawnPriorities.worker : SpawnPriorities.upgrader,
            memory: { targetRoom: room.name }
        });
    }

    run(handled: Set<string>): void {
        for (const creep of this.creeps) {
            UpgraderBehavior.run(creep);
            handled.add(creep.name);
        }
    }
}
