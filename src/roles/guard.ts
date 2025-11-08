/**
 * Guard/Defender role: Combat units for base defense.
 *
 * Behavior:
 * - Heals self if damaged and has HEAL parts
 * - Attacks hostile creeps (non-allies)
 * - Rallies to base anchor or spawn when no threats present
 *
 * This behavior is shared between legacy "guard" role and new "defender" role.
 * Defenders are spawned reactively based on threat memory.
 */

import { ALLY_USERNAMES } from "../constants";
import { CreepRoles } from "../creeps/setups";

export const DEFENDER_ROLE = CreepRoles.defender;
export const GUARD_ROLE = "guard"; // Legacy name for existing creeps

/**
 * Guard/Defender behavior implementation.
 * Manages self-healing, combat targeting, and rally positioning.
 */
export const GuardBehavior = {
    /**
     * Main execution method called each tick.
     * Handles healing, combat, and rallying.
     * @param creep - The defender creep
     * @param hostiles - Optional pre-computed hostile list for efficiency
     */
    run(creep: Creep, hostiles?: Creep[]): void {
        if (creep.getActiveBodyparts(HEAL) > 0 && creep.hits < creep.hitsMax) {
            creep.heal(creep);
        }

        const combatTargets = hostiles && hostiles.length > 0 ? hostiles : this.findHostiles(creep.room);
        if (combatTargets.length > 0) {
            const target = creep.pos.findClosestByRange(combatTargets);
            if (!target) {
                return;
            }

            if (creep.attack(target) === ERR_NOT_IN_RANGE) {
                creep.moveTo(target, { visualizePathStyle: { stroke: "#ff5555" }, reusePath: 3, range: 1 });
            }

            return;
        }

        const rallyPoint = getRallyPoint(creep.room);
        if (rallyPoint && !creep.pos.inRangeTo(rallyPoint, 1)) {
            creep.moveTo(rallyPoint, { visualizePathStyle: { stroke: "#ff6600" }, reusePath: 10, range: 1 });
        }
    },

    /**
     * Finds all hostile creeps in the room, excluding allies.
     * @param room - The room to search
     * @returns Array of hostile creeps
     */
    findHostiles(room: Room): Creep[] {
        return room.find(FIND_HOSTILE_CREEPS, {
            filter: hostile => !ALLY_USERNAMES.includes(hostile.owner.username)
        });
    }
};

/**
 * Legacy guard runner for backward compatibility.
 * @param creep - The guard creep
 * @param hostilesByRoom - Map of room names to hostile creeps
 */
export function runGuard(creep: Creep, hostilesByRoom: Record<string, Creep[]>): void {
    GuardBehavior.run(creep, hostilesByRoom[creep.room.name] ?? []);
}

/**
 * Determines the rally point for defenders when no threats present.
 * Prefers planner anchor, then spawn, then controller.
 * @param room - The room to find rally point for
 * @returns Rally position, or null if room has no suitable structures
 */
function getRallyPoint(room: Room): RoomPosition | null {
    const anchor = room.memory.planner?.anchor;
    if (anchor) {
        return new RoomPosition(anchor.x, anchor.y, room.name);
    }

    const spawn = room.find(FIND_MY_SPAWNS)[0];
    if (spawn) {
        return spawn.pos;
    }

    if (room.controller) {
        return room.controller.pos;
    }

    return null;
}
