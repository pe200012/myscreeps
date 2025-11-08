import { ALLY_USERNAMES, ENEMY_DANGER_RANGE } from "../constants";

export function hasNearbyEnemies(pos: RoomPosition, room: Room): boolean {
    const hostiles = room.find(FIND_HOSTILE_CREEPS, {
        filter: hostile => !ALLY_USERNAMES.includes(hostile.owner.username)
    });

    return hostiles.some(hostile => pos.getRangeTo(hostile) <= ENEMY_DANGER_RANGE);
}

export function getSafetyPosition(room: Room): RoomPosition | null {
    // Try spawn first
    const spawns = room.find(FIND_MY_SPAWNS);
    if (spawns.length > 0) {
        const spawn = spawns[0];
        if (!hasNearbyEnemies(spawn.pos, room)) {
            return spawn.pos;
        }
    }

    // Try controller
    if (room.controller && room.controller.my) {
        if (!hasNearbyEnemies(room.controller.pos, room)) {
            return room.controller.pos;
        }
    }

    // Try storage
    if (room.storage && !hasNearbyEnemies(room.storage.pos, room)) {
        return room.storage.pos;
    }

    // Try planner anchor
    const anchor = room.memory.planner?.anchor;
    if (anchor) {
        const anchorPos = new RoomPosition(anchor.x, anchor.y, room.name);
        if (!hasNearbyEnemies(anchorPos, room)) {
            return anchorPos;
        }
    }

    return null;
}
