import { ALLY_USERNAMES } from "../constants";
import { CreepRoles } from "../creeps/setups";

export const DEFENDER_ROLE = CreepRoles.defender;
export const GUARD_ROLE = "guard"; // Legacy name for existing creeps

export const GuardBehavior = {
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

    findHostiles(room: Room): Creep[] {
        return room.find(FIND_HOSTILE_CREEPS, {
            filter: hostile => !ALLY_USERNAMES.includes(hostile.owner.username)
        });
    }
};

export function runGuard(creep: Creep, hostilesByRoom: Record<string, Creep[]>): void {
    GuardBehavior.run(creep, hostilesByRoom[creep.room.name] ?? []);
}

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
