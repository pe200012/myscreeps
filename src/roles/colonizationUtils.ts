/**
 * Shared helpers for colonization creep roles.
 */

interface FollowOptions {
    color?: string;
    range?: number;
}

const DEFAULT_WAYPOINT_COLOR = "#f1c40f";

export function followColonizationWaypoints(creep: Creep, options: FollowOptions = {}): boolean {
    const waypoints = creep.memory.colonizationWaypoints;
    if (!waypoints || waypoints.length === 0) {
        return false;
    }

    let index = creep.memory.colonizationWaypointIndex ?? 0;
    const color = options.color ?? DEFAULT_WAYPOINT_COLOR;
    const range = options.range ?? 1;

    while (index < waypoints.length) {
        const waypoint = waypoints[index];
        const pos = new RoomPosition(waypoint.x, waypoint.y, waypoint.roomName);
        if (creep.pos.inRangeTo(pos, range)) {
            index += 1;
            creep.memory.colonizationWaypointIndex = index;
            continue;
        }

        creep.moveTo(pos, { reusePath: 15, range, visualizePathStyle: { stroke: color } });
        return true;
    }

    return false;
}

export function getColonizationAnchor(creep: Creep): RoomPosition | null {
    const anchor = creep.memory.colonizationAnchor;
    if (!anchor) {
        return null;
    }
    return new RoomPosition(anchor.x, anchor.y, anchor.roomName);
}

export function toRoomPosition(serialized?: SerializedRoomPosition | null): RoomPosition | null {
    if (!serialized) {
        return null;
    }
    return new RoomPosition(serialized.x, serialized.y, serialized.roomName);
}
