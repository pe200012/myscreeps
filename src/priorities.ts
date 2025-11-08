/**
 * Spawn priority constants for different creep roles.
 * Lower numbers = higher priority in the spawn queue.
 *
 * Priority bands:
 * - 0-99: Emergency/critical roles (emergency spawns, defenders)
 * - 100-199: Core economic roles (queen, manager, drones)
 * - 200-299: Support economic roles (transport, workers, upgraders)
 * - 300+: Expansion and scouting roles (scouts, remote operations)
 */
export const SpawnPriorities = {
    /** Critical emergency spawning (highest priority) */
    emergency: 0,

    /** Defenders for active threat response */
    defender: 25,

    /** Queens for spawn/extension refilling */
    queen: 50,

    /** Managers for storage/terminal/link management */
    manager: 75,

    /** Drones for source harvesting */
    drone: 100,

    /** Transport creeps for hauling */
    transport: 150,

    /** Workers for construction and repair */
    worker: 200,

    /** Upgraders for controller upgrades */
    upgrader: 250,

    /** Scouts for room observation */
    scout: 320,

    /** Remote operations (lowest priority) */
    remote: 400
} as const;
