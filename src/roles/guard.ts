export const GUARD_ROLE = "guard";
export const GUARD_BODY: BodyPartConstant[] = [TOUGH, MOVE, MOVE, ATTACK, ATTACK, ATTACK];

export function runGuard(creep: Creep, hostilesByRoom: Record<string, Creep[]>): void {
    if (creep.getActiveBodyparts(HEAL) > 0 && creep.hits < creep.hitsMax) {
        creep.heal(creep);
    }

    const hostiles = hostilesByRoom[creep.room.name] ?? [];
    if (hostiles.length > 0) {
        const target = creep.pos.findClosestByRange(hostiles);
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
