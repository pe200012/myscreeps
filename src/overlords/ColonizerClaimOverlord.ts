/**
 * Overseer for colonization claimers. Requests CLAIM creeps for each active colonization task
 * assigned to the parent colony and delegates their behavior.
 */

import { CreepRoles, CreepSetups } from "../creeps/setups";
import { getColonizationTasksFor } from "../expansion/ColonizationManager";
import { SpawnPriorities } from "../priorities";
import { ClaimerBehavior } from "../roles/claimer";
import { Overlord } from "./Overlord";

export class ColonizerClaimOverlord extends Overlord {
    constructor(room: Room, spawnManager: import("../managers/SpawnManager").SpawnManager) {
        super(room, spawnManager, CreepRoles.claimer, SpawnPriorities.claimer);
    }

    init(): void {
        const room = this.room;
        if (!room) {
            return;
        }

        const tasks = getColonizationTasksFor(room.name);
        for (const task of tasks) {
            this.ensureTagged(CreepSetups.claimer.default, {
                tag: `claim:${task.id}`,
                quantity: 1,
                priority: SpawnPriorities.claimer,
                match: creep => creep.memory.colonizationId === task.id,
                memoryFactory: () => ({
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
            ClaimerBehavior.run(creep);
            handled.add(creep.name);
        }
    }
}
