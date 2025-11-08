/**
 * Colony Manager: Global coordinator for all owned rooms.
 *
 * Responsibilities:
 * - Creates and caches Colony instances for each owned room
 * - Cleans up colonies for rooms no longer owned
 * - Orchestrates the colony execution cycle
 * - Tracks which creeps have been handled by overlords
 *
 * This module exports the primary `runColonies` function called by main loop.
 */

import { Colony } from "./Colony";

/** Global map of room names to Colony instances */
const colonies = new Map<string, Colony>();

/**
 * Executes the colony cycle for all owned rooms.
 *
 * @param rooms - Array of owned rooms to process
 * @returns Set of creep names handled by overlords (for fallback logic)
 */
export function runColonies(rooms: Room[]): Set<string> {
    const handled = new Set<string>();

    // Remove colonies for rooms no longer owned
    for (const roomName of Array.from(colonies.keys())) {
        if (!rooms.some(room => room.name === roomName)) {
            colonies.delete(roomName);
        }
    }

    for (const room of rooms) {
        const colony = getOrCreateColony(room);
        colony.refresh(room);
        colony.init();
        colony.spawn();
        colony.run(handled);
    }

    return handled;
}

/**
 * Gets or creates a Colony instance for the given room.
 * Caches colonies to maintain state across ticks.
 */
function getOrCreateColony(room: Room): Colony {
    let colony = colonies.get(room.name);
    if (!colony) {
        colony = new Colony(room);
        colonies.set(room.name, colony);
    }
    return colony;
}
