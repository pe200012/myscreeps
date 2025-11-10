/**
 * Overseer for colonization pioneers. Maintains a pioneer contingent per active colonization task
 * so freshly-claimed rooms can bootstrap infrastructure.
 */

import { CreepRoles, CreepSetups } from "../creeps/setups";
import { getColonizationTasksFor } from "../expansion/ColonizationManager";
import { SpawnPriorities } from "../priorities";
import { PioneerBehavior } from "../roles/pioneer";
import { Overlord } from "./Overlord";

export class ColonizerPioneerOverlord extends Overlord {
    constructor(room: Room, spawnManager: import("../managers/SpawnManager").SpawnManager) {
        super(room, spawnManager, CreepRoles.pioneer, SpawnPriorities.pioneer);
    }

    init(): void {
        const room = this.room;
        if (!room) {
            return;
        }

        const tasks = getColonizationTasksFor(room.name);
        for (const task of tasks) {
            this.ensureTagged(CreepSetups.pioneer.default, {
                tag: `pioneer:${task.id}`,
                quantity: Math.max(1, task.pioneerQuota),
                priority: SpawnPriorities.pioneer,
                match: creep => creep.memory.colonizationId === task.id,
                memoryFactory: () => ({
                    working: false,
                    targetRoom: task.targetRoom,
                    colonizationId: task.id,
                    colonizationParent: room.name,
                    colonizationAnchor: task.anchor,
                    colonizationWaypoints: task.waypoints
                })
            });
        }
    }

    run(handled: Set<string>): void {
        for (const creep of this.creeps) {
            PioneerBehavior.run(creep);
            handled.add(creep.name);
        }
    }
}
