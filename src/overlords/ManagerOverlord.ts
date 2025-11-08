import { MANAGER_STORAGE_THRESHOLD, TRANSPORT_PRESPAWN } from "../constants";
import { CreepRoles, CreepSetups } from "../creeps/setups";
import { SpawnPriorities } from "../priorities";
import { ManagerBehavior } from "../roles/manager";
import { Overlord } from "./Overlord";

// Manager creeps handle the command center cluster (storage, terminal, links)
export class ManagerOverlord extends Overlord {
    constructor(room: Room, spawnManager: import("../managers/SpawnManager").SpawnManager) {
        super(room, spawnManager, CreepRoles.manager, SpawnPriorities.manager);
    }

    init(): void {
        const room = this.room;
        if (!room || !room.storage) {
            return;
        }

        if (room.storage.store.getUsedCapacity(RESOURCE_ENERGY) < MANAGER_STORAGE_THRESHOLD && !room.terminal) {
            return; // Skip until the command center is stocked
        }

        this.ensureTagged(CreepSetups.manager.default, {
            tag: `${this.ref}:manager`,
            match: () => true,
            quantity: 1,
            prespawn: TRANSPORT_PRESPAWN,
            priority: SpawnPriorities.manager
        });
    }

    run(handled: Set<string>): void {
        if (!this.room || !this.room.storage) {
            return;
        }

        for (const creep of this.creeps) {
            ManagerBehavior.run(creep);
            handled.add(creep.name);
        }
    }
}
