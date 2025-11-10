/**
 * Claimer behavior: travels to the target room, handles controller interaction, and signs once claimed.
 */

import { CreepRoles } from "../creeps/setups";
import { followColonizationWaypoints, getColonizationAnchor } from "./colonizationUtils";

export const CLAIMER_ROLE = CreepRoles.claimer;

export const ClaimerBehavior = {
    run(creep: Creep): void {
        const targetRoom = creep.memory.targetRoom ?? creep.memory.colonizationAnchor?.roomName ?? creep.memory.room;
        if (!targetRoom) {
            return;
        }

        if (followColonizationWaypoints(creep, { color: "#f1c40f" })) {
            return;
        }

        if (creep.room.name !== targetRoom) {
            const anchor = getColonizationAnchor(creep);
            const destination = anchor && anchor.roomName === targetRoom ? anchor : new RoomPosition(25, 25, targetRoom);
            creep.moveTo(destination, { reusePath: 10, range: 1, visualizePathStyle: { stroke: "#f1c40f" } });
            return;
        }

        const controller = creep.room.controller;
        if (!controller) {
            return;
        }

        const username = creep.owner.username;

        if (!controller.my) {
            if (controller.owner && controller.owner.username !== username) {
                if (creep.attackController(controller) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(controller, { reusePath: 3, visualizePathStyle: { stroke: "#f1c40f" } });
                }
                return;
            }

            const claimResult = creep.claimController(controller);
            if (claimResult === ERR_NOT_IN_RANGE) {
                creep.moveTo(controller, { reusePath: 3, visualizePathStyle: { stroke: "#f1c40f" } });
                return;
            }
            if (claimResult === ERR_GCL_NOT_ENOUGH) {
                const reserve = creep.reserveController(controller);
                if (reserve === ERR_NOT_IN_RANGE) {
                    creep.moveTo(controller, { reusePath: 3, visualizePathStyle: { stroke: "#f1c40f" } });
                }
                return;
            }
            if (claimResult === ERR_INVALID_TARGET && controller.reservation && controller.reservation.username !== username) {
                if (creep.attackController(controller) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(controller, { reusePath: 3, visualizePathStyle: { stroke: "#f1c40f" } });
                }
                return;
            }
            if (claimResult === OK) {
                creep.say("Claim", true);
            }
            return;
        }

        if (controller.sign?.username === username) {
            creep.memory.colonizationSigned = true;
        }

        if (!creep.memory.colonizationSigned) {
            const signText = "Secured for the swarm.";
            const signResult = creep.signController(controller, signText);
            if (signResult === ERR_NOT_IN_RANGE) {
                creep.moveTo(controller, { reusePath: 3, visualizePathStyle: { stroke: "#f1c40f" } });
                return;
            }
            if (signResult === OK) {
                creep.memory.colonizationSigned = true;
                creep.say("✍", true);
                return;
            }
        }

        const anchor = getColonizationAnchor(creep);
        if (anchor && anchor.roomName === creep.room.name && !creep.pos.inRangeTo(anchor, 2)) {
            creep.moveTo(anchor, { reusePath: 5, range: 2, visualizePathStyle: { stroke: "#f1c40f" } });
            return;
        }

        creep.say("Idle", true);
    }
};
