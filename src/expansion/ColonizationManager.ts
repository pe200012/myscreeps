/**
 * ColonizationManager: tracks colonization directives and distributes work to parent colonies.
 *
 * Inspired by Overmind's directive system, this manager bridges flag-based intents with
 * per-colony overlords for claimers and pioneers.
 */

import { COLONIZATION_PIONEER_QUOTA } from "../constants";
import { CreepRoles } from "../creeps/setups";

const COLONIZE_PRIMARY = COLOR_PURPLE;
const COLONIZE_SECONDARY = COLOR_GREY;
const TASK_RETENTION = 1500;

/** Run colonization bookkeeping once per tick. */
export function runColonizationManagement(): void {
    ensureMemory();

    const tasks = Memory.colonization!.tasks;
    synchronizeFlags(tasks);
    reassignParents(tasks);
    updateTaskStates(tasks);
    cleanupTasks(tasks);
}

/** Retrieve active colonization tasks assigned to a parent room. */
export function getColonizationTasksFor(parentRoom: string): ColonizationTaskMemory[] {
    ensureMemory();
    return Memory.colonization!.tasks.filter(task => task.parentRoom === parentRoom && task.state !== "completed" && task.state !== "blocked");
}

/** Fetch a colonization task by id. */
export function getColonizationTask(id: string): ColonizationTaskMemory | undefined {
    ensureMemory();
    return Memory.colonization!.tasks.find(task => task.id === id);
}

function ensureMemory(): void {
    if (!Memory.colonization) {
        Memory.colonization = { tasks: [] };
    }
}

function synchronizeFlags(tasks: ColonizationTaskMemory[]): void {
    const seenFlags = new Set<string>();

    for (const flag of Object.values(Game.flags)) {
        if (flag.color !== COLONIZE_PRIMARY || flag.secondaryColor !== COLONIZE_SECONDARY) {
            continue;
        }
        seenFlags.add(flag.name);
        const existing = tasks.find(task => task.flagName === flag.name || task.targetRoom === flag.pos.roomName);
        if (existing) {
            existing.flagName = flag.name;
            applyFlagOverrides(existing, flag);
            continue;
        }

        const anchor = serialize(flag.pos);
        const parentRoom = determineParentRoom(flag, anchor.roomName);
        const waypoints = extractWaypoints(flag);
        const quota = extractPioneerQuota(flag);

        const task: ColonizationTaskMemory = {
            id: flag.name,
            targetRoom: flag.pos.roomName,
            parentRoom,
            state: "pending",
            flagName: flag.name,
            anchor,
            waypoints: waypoints ?? undefined,
            pioneerQuota: quota,
            created: Game.time
        };
        tasks.push(task);
    }

    for (const task of tasks) {
        if (task.flagName && !seenFlags.has(task.flagName)) {
            task.flagName = undefined;
        }
    }
}

function applyFlagOverrides(task: ColonizationTaskMemory, flag: Flag): void {
    task.anchor = serialize(flag.pos);

    const overrides = flag.memory as any;

    if (typeof overrides?.parentRoom === "string") {
        task.parentRoom = overrides.parentRoom;
    }

    const quotaCandidate = overrides?.pioneers ?? overrides?.pioneerQuota;
    if (typeof quotaCandidate === "number" && quotaCandidate > 0) {
        task.pioneerQuota = Math.max(1, Math.floor(quotaCandidate));
    }

    const waypoints = extractWaypoints(flag);
    if (waypoints && waypoints.length > 0) {
        task.waypoints = waypoints;
    }
}

function extractPioneerQuota(flag: Flag): number {
    const overrides = flag.memory as any;
    const custom = overrides?.pioneers ?? overrides?.pioneerQuota;
    if (typeof custom === "number" && custom > 0) {
        return Math.max(1, Math.floor(custom));
    }
    return COLONIZATION_PIONEER_QUOTA;
}

function extractWaypoints(flag: Flag): SerializedRoomPosition[] | null {
    const overrides = flag.memory as any;
    const raw = overrides?.waypoints ?? overrides?.colonizationWaypoints;
    if (!Array.isArray(raw)) {
        return null;
    }

    const waypoints: SerializedRoomPosition[] = [];
    for (const entry of raw) {
        if (typeof entry === "string") {
            const parts = entry.split("/");
            if (parts.length >= 1) {
                const roomName = parts[0];
                const x = parts.length >= 2 ? Number(parts[1]) : 25;
                const y = parts.length >= 3 ? Number(parts[2]) : 25;
                if (!isNaN(x) && !isNaN(y) && typeof roomName === "string") {
                    waypoints.push({ roomName, x, y });
                }
            }
        } else if (entry && typeof entry === "object" && typeof entry.roomName === "string" && typeof entry.x === "number" && typeof entry.y === "number") {
            waypoints.push({ roomName: entry.roomName, x: entry.x, y: entry.y });
        }
    }

    return waypoints.length > 0 ? waypoints : null;
}

function determineParentRoom(flag: Flag, targetRoom: string): string | undefined {
    const overrides = flag.memory as any;
    if (typeof overrides?.parentRoom === "string") {
        return overrides.parentRoom;
    }
    return findNearestOwnedRoom(targetRoom);
}

function findNearestOwnedRoom(roomName: string): string | undefined {
    let best: { room: string; distance: number } | undefined;
    for (const room of Object.values(Game.rooms)) {
        if (!room.controller?.my) {
            continue;
        }
        const distance = Game.map.getRoomLinearDistance(room.name, roomName);
        if (!best || distance < best.distance) {
            best = { room: room.name, distance };
        }
    }
    return best?.room;
}

function reassignParents(tasks: ColonizationTaskMemory[]): void {
    for (const task of tasks) {
        if (task.state === "completed") {
            continue;
        }
        if (task.parentRoom && Game.rooms[task.parentRoom]?.controller?.my) {
            continue;
        }
        task.parentRoom = findNearestOwnedRoom(task.targetRoom);
    }
}

function updateTaskStates(tasks: ColonizationTaskMemory[]): void {
    for (const task of tasks) {
        const room = Game.rooms[task.targetRoom];
        if (!room) {
            if (task.state === "pending") {
                continue;
            }
            if (task.state === "completed") {
                continue;
            }
            if (task.state === "blocked") {
                continue;
            }
            task.state = "pending";
            task.blockedReason = undefined;
            continue;
        }

        const controller = room.controller;
        if (!controller) {
            task.state = "pending";
            task.blockedReason = undefined;
            continue;
        }

        const username = resolveUsername();
        if (controller.my) {
            const spawns = room.find(FIND_MY_STRUCTURES, { filter: structure => structure.structureType === STRUCTURE_SPAWN });
            if (spawns.length > 0) {
                if (task.state !== "completed") {
                    finalizeTask(task);
                }
                continue;
            }

            const spawnSites = room.find(FIND_MY_CONSTRUCTION_SITES, { filter: site => site.structureType === STRUCTURE_SPAWN });
            task.state = spawnSites.length > 0 ? "building" : "claiming";
            task.blockedReason = undefined;
            continue;
        }

        if (controller.owner && username && controller.owner.username !== username) {
            task.state = "blocked";
            task.blockedReason = `Owned by ${controller.owner.username}`;
            continue;
        }

        if (controller.reservation && username && controller.reservation.username !== username) {
            task.state = "blocked";
            task.blockedReason = `Reserved by ${controller.reservation.username}`;
            continue;
        }

        task.state = "claiming";
        task.blockedReason = undefined;
    }
}

function finalizeTask(task: ColonizationTaskMemory): void {
    task.state = "completed";
    task.completedAt = Game.time;
    task.blockedReason = undefined;

    for (const creep of Object.values(Game.creeps)) {
        if (creep.memory.colonizationId !== task.id) {
            continue;
        }

        if (creep.memory.role === CreepRoles.pioneer) {
            creep.memory.role = CreepRoles.worker;
            creep.memory.room = task.targetRoom;
            creep.memory.targetRoom = task.targetRoom;
            delete creep.memory.colonizationId;
            delete creep.memory.colonizationAnchor;
            delete creep.memory.colonizationWaypoints;
            delete creep.memory.colonizationWaypointIndex;
            delete creep.memory.colonizationParent;
            delete creep.memory.colonizationNextSiteCheck;
            delete creep.memory.colonizationSigned;
        } else if (creep.memory.role === CreepRoles.claimer) {
            if (!creep.spawning) {
                creep.suicide();
            }
        } else {
            delete creep.memory.colonizationId;
        }
    }

    if (task.flagName) {
        const flag = Game.flags[task.flagName];
        if (flag) {
            flag.remove();
        }
    }
}

function cleanupTasks(tasks: ColonizationTaskMemory[]): void {
    const now = Game.time;
    for (let i = tasks.length - 1; i >= 0; i--) {
        const task = tasks[i];
        if (task.state === "completed" && task.completedAt !== undefined && now - task.completedAt > TASK_RETENTION) {
            tasks.splice(i, 1);
        }
    }
}

function serialize(pos: RoomPosition): SerializedRoomPosition {
    return { x: pos.x, y: pos.y, roomName: pos.roomName };
}

function resolveUsername(): string | undefined {
    const spawn = Object.values(Game.spawns)[0];
    if (spawn?.owner?.username) {
        return spawn.owner.username;
    }
    const creep = Object.values(Game.creeps)[0];
    return creep?.owner?.username;
}