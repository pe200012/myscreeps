/**
 * Build priorities define the order in which construction sites should be built.
 * Based on Overmind's priority system: https://github.com/bencbartlett/Overmind
 *
 * Workers will build structures in this order, ensuring critical infrastructure
 * comes online first (spawns, towers) before less critical structures.
 */

/**
 * Prioritized list of structure types for construction.
 * Earlier items in the array have higher priority.
 */
export const BuildPriorities: BuildableStructureConstant[] = [
    STRUCTURE_SPAWN,        // Spawns first - critical for colony survival
    STRUCTURE_TOWER,        // Towers second - defense and repair
    STRUCTURE_EXTENSION,    // Extensions third - increases spawn capacity
    STRUCTURE_STORAGE,      // Storage before most other structures
    STRUCTURE_TERMINAL,     // Terminal for trading and resource management
    STRUCTURE_CONTAINER,    // Containers for energy storage at sources
    STRUCTURE_LINK,         // Links for energy transport
    STRUCTURE_EXTRACTOR,    // Extractors for mineral mining
    STRUCTURE_LAB,          // Labs for boost production
    STRUCTURE_NUKER,        // Nuker is low priority
    STRUCTURE_OBSERVER,     // Observer for scouting
    STRUCTURE_POWER_SPAWN,  // Power spawn for processing power
    STRUCTURE_WALL,         // Walls after most infrastructure
    STRUCTURE_RAMPART,      // Ramparts after walls
    STRUCTURE_ROAD,         // Roads last - low priority
];

/**
 * Prioritized list for repair operations.
 * Structures that should be repaired first during emergencies.
 */
export const RepairPriorities: StructureConstant[] = [
    STRUCTURE_SPAWN,
    STRUCTURE_TOWER,
    STRUCTURE_STORAGE,
    STRUCTURE_TERMINAL,
    STRUCTURE_EXTENSION,
    STRUCTURE_CONTAINER,
    STRUCTURE_ROAD,
    STRUCTURE_RAMPART,
    STRUCTURE_WALL,
];
