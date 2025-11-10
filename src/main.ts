/**
 * Main game loop entry point for Screeps automation.
 * Orchestrates base planning, colony management, defense tracking, and fallback behaviors.
 */

import { BasePlanner } from "./planner/BasePlanner";
import { runColonies } from "./colony/ColonyManager";
import { ErrorMapper } from "./utils/ErrorMapper";
import { ALLY_USERNAMES } from "./constants";
import { preTick, reconcileTraffic } from "./utils/CartographerIntegration";

/**
 * Primary game loop wrapped with error handling.
 * Executes every tick to manage all owned rooms and creeps.
 */
export const loop = ErrorMapper.wrapLoop(() => {
    preTick();
    cleanupMemory();

    // Track hostile creeps by room for defense coordination
    const hostilesByRoom: Record<string, Creep[]> = {};
    const ownedRooms = Object.values(Game.rooms).filter(room => room.controller?.my);

    // Update defense memory and track hostiles for each owned room
    for (const room of ownedRooms) {
        BasePlanner.run(room);

        const hostiles = room.find(FIND_HOSTILE_CREEPS, {
            filter: hostile => !ALLY_USERNAMES.includes(hostile.owner.username)
        });
        hostilesByRoom[room.name] = hostiles;

        // Initialize defense memory if not present
        if (!room.memory.defense) {
            room.memory.defense = { lastHostileSeen: 0, threatLevel: 0 };
        }

        // Update threat tracking based on current hostile presence
        if (hostiles.length > 0) {
            room.memory.defense.lastHostileSeen = Game.time;
            room.memory.defense.threatLevel = hostiles.length;
        } else {
            room.memory.defense.threatLevel = 0;
        }
    }

    // Run all colony overlords and track which creeps were handled
    const handled = runColonies(ownedRooms);

    // Fallback behavior: ensure any straggler creeps at least defend themselves
    for (const creep of Object.values(Game.creeps)) {
        if (!creep.memory.room) {
            creep.memory.room = creep.room.name;
        }
        if (!handled.has(creep.name)) {
            defaultFallback(creep, hostilesByRoom);
        }
    }

    reconcileTraffic();
});

/**
 * Cleans up memory for dead creeps.
 * Prevents memory leaks by removing entries for creeps that no longer exist.
 */
function cleanupMemory(): void {
    for (const name in Memory.creeps) {
        if (!(name in Game.creeps)) {
            delete Memory.creeps[name];
        }
    }
}

/**
 * Default fallback behavior for creeps not handled by overlords.
 * Attempts to defend against hostiles or defaults to upgrading the controller.
 *
 * @param creep - The creep to apply fallback behavior to
 * @param hostilesByRoom - Map of room names to hostile creeps for defense coordination
 */
function defaultFallback(creep: Creep, hostilesByRoom: Record<string, Creep[]>): void {
    const hostiles = hostilesByRoom[creep.memory.room ?? creep.room.name] ?? [];
    if (hostiles.length > 0) {
        const target = creep.pos.findClosestByPath(hostiles);
        if (target) {
            if (creep.attack(target) === ERR_NOT_IN_RANGE) {
                creep.moveTo(target, { visualizePathStyle: { stroke: "#ff0000" } });
            }
            return;
        }
    }

    if (creep.room.controller && creep.room.controller.my) {
        if (creep.upgradeController(creep.room.controller) === ERR_NOT_IN_RANGE) {
            creep.moveTo(creep.room.controller, { visualizePathStyle: { stroke: "#99c1f1" } });
        }
    }
}
