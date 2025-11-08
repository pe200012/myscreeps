/**
 * Spawn priority constants for different creep roles.
 * Lower numbers = higher priority in the spawn queue.
 *
 * Numbers are spaced to mirror the ordering used in Overmind
 * (https://github.com/bencbartlett/Overmind) so economic roles finish
 * recovering before standing defense creeps consume spawn time.
 */
export const SpawnPriorities = {
    /** Critical emergency spawning (highest priority) */
    emergency: 0,

    /** Drones mine energy and should come online before other economy */
    drone: 10,

    /** Queens keep extensions topped up so they stay near the top */
    queen: 50,

    /** Managers handle storage/terminal/link throughput */
    manager: 60,

    /** Transports move harvested energy to storage/spawns */
    transport: 90,

    /** Workers build and repair critical infrastructure */
    worker: 120,

    /** Upgraders can wait slightly longer than other economic roles */
    upgrader: 160,

    /** Standby defenders fall behind eco unless an emergency elevates them */
    defender: 240,

    /** Scouts for room observation */
    scout: 320,

    /** Remote operations (lowest priority) */
    remote: 400
} as const;
