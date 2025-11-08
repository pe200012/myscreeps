/**
 * Global game constants and configuration values.
 * Centralizes all tunable parameters for easy balancing.
 */

/** List of allied player usernames to ignore in hostile detection */
export const ALLY_USERNAMES: string[] = [];

/** Range at which enemies are considered dangerous for defensive actions */
export const ENEMY_DANGER_RANGE = 5;

/** Minimum number of drone harvesters to maintain per energy source */
export const MIN_DRONES_PER_SOURCE = 1;

/** Number of ticks to consider a threat "recent" for defense spawning */
export const RECENT_THREAT_TICKS = 150;

/** Energy reserve to maintain in spawns/extensions for emergency spawning */
export const SPAWN_ENERGY_RESERVE = 300;

/** Ticks before queen death to start spawning replacement */
export const QUEEN_PRESPAWN = 25;

/** Ticks before drone death to start spawning replacement */
export const DRONE_PRESPAWN = 30;

/** Ticks before transport death to start spawning replacement */
export const TRANSPORT_PRESPAWN = 30;

/** Ticks before worker death to start spawning replacement */
export const WORKER_PRESPAWN = 20;

/** Minimum storage energy before manager transfers to terminal */
export const MANAGER_STORAGE_THRESHOLD = 50000;

/** Hit points ratio threshold for workers to repair structures */
export const WORKER_REPAIR_THRESHOLD = 0.85;

/** Target hit points for walls and ramparts */
export const WORKER_WALL_TARGET = 500000;

/** Desired energy level to maintain in terminal */
export const TERMINAL_ENERGY_TARGET = 50000;

/** Buffer above/below target before triggering terminal transfers */
export const TERMINAL_ENERGY_BUFFER = 20000;

/** Ticks before defender death to start spawning replacement */
export const DEFENSE_PRESPAWN = 15;
