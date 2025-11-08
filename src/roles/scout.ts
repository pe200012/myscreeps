/**
 * Scout role: Fast observers for remote room reconnaissance.
 *
 * Behavior:
 * - Travels to assigned target room
 * - Wanders around target room to maintain vision
 * - Provides visibility for remote mining assessment and threat detection
 * - Uses minimal body (1 MOVE part) for cost efficiency
 *
 * Scouts are managed by RemoteScoutOverlord based on room.memory.remotes configuration.
 */

import { CreepRoles } from "../creeps/setups";

export const SCOUT_ROLE = CreepRoles.scout;

/**
 * Scout behavior implementation.
 * Manages travel to target room and wandering for vision maintenance.
 */
export const ScoutBehavior = {
    /**
     * Main execution method called each tick.
     * Navigates to target room and wanders to maintain vision.
     */
    run(creep: Creep): void {
        const targetRoom = creep.memory.targetRoom ?? creep.memory.room ?? creep.room.name;
        if (creep.room.name !== targetRoom) {
            const targetPos = new RoomPosition(25, 25, targetRoom);
            if (creep.moveTo(targetPos, { reusePath: 10, range: 20, visualizePathStyle: { stroke: "#8e44ad" } }) === ERR_NO_PATH) {
                creep.moveTo(targetPos, { reusePath: 0, range: 20, visualizePathStyle: { stroke: "#8e44ad" } });
            }
            return;
        }

        if (creep.fatigue > 0) {
            return;
        }

        const anchor = new RoomPosition(25, 25, targetRoom);
        if (!creep.pos.inRangeTo(anchor, 10)) {
            creep.moveTo(anchor, { reusePath: 5, range: 5, visualizePathStyle: { stroke: "#8e44ad" } });
            return;
        }

        if (Game.time % 7 === 0) {
            const dx = Math.floor(Math.random() * 7) - 3;
            const dy = Math.floor(Math.random() * 7) - 3;
            const destination = new RoomPosition(Math.min(48, Math.max(1, creep.pos.x + dx)), Math.min(48, Math.max(1, creep.pos.y + dy)), targetRoom);
            creep.moveTo(destination, { reusePath: 0, visualizePathStyle: { stroke: "#8e44ad" } });
        }
    }
};
