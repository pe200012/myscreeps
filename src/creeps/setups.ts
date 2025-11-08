/**
 * Centralized creep role definitions and body configurations.
 * Defines all creep types and their variants (early/default/late game).
 */

import { CreepSetup } from "./CreepSetup";

/**
 * Standard role identifiers used throughout the codebase.
 */
export const CreepRoles = {
    queen: "queen",
    manager: "manager",
    worker: "worker",
    transport: "transport",
    drone: "drone",
    upgrader: "upgrader",
    defender: "defender",
    scout: "scout"
} as const;

/**
 * Predefined creep setups for all roles and game stages.
 * Each role may have multiple variants (early/default/late) for different RCL levels.
 *
 * Setup naming conventions:
 * - early: Low-energy setups for RCL 1-3
 * - default: Standard setups for RCL 4-7
 * - late/rcl8: Optimized setups for RCL 8
 * - emergency: Minimal viable setups for critical situations
 */
export const CreepSetups = {
    /** Queens: Spawn and extension fillers for hatchery logistics */
    queen: {
        early: new CreepSetup(CreepRoles.queen, {
            prefix: [CARRY, MOVE],
            pattern: [CARRY, CARRY, MOVE],
            suffix: [],
            sizeLimit: 2,
            ordered: true,
            proportionalPrefixSuffix: false
        }),
        default: new CreepSetup(CreepRoles.queen, {
            prefix: [CARRY, CARRY, MOVE],
            pattern: [CARRY, CARRY, MOVE],
            suffix: [CARRY],
            sizeLimit: 3,
            ordered: true,
            proportionalPrefixSuffix: false
        })
    },
    /** Managers: Command center operators for storage/terminal/link coordination */
    manager: {
        default: new CreepSetup(CreepRoles.manager, {
            prefix: [CARRY, CARRY, MOVE],
            pattern: [CARRY, CARRY, MOVE],
            suffix: [WORK],
            sizeLimit: 4,
            ordered: true,
            proportionalPrefixSuffix: false
        })
    },
    /** Workers: General construction, repair, and upgrade units */
    worker: {
        early: new CreepSetup(CreepRoles.worker, {
            prefix: [],
            pattern: [WORK, CARRY, MOVE],
            suffix: [],
            sizeLimit: 3,
            ordered: true,
            proportionalPrefixSuffix: false
        }),
        default: new CreepSetup(CreepRoles.worker, {
            prefix: [WORK, CARRY, MOVE],
            pattern: [WORK, WORK, CARRY, MOVE],
            suffix: [],
            sizeLimit: 3,
            ordered: true,
            proportionalPrefixSuffix: false
        }),
        late: new CreepSetup(CreepRoles.worker, {
            prefix: [WORK, WORK, CARRY, MOVE],
            pattern: [WORK, WORK, CARRY, MOVE],
            suffix: [],
            sizeLimit: 4,
            ordered: true,
            proportionalPrefixSuffix: false
        })
    },
    /** Transports: Dedicated haulers for moving energy around the base */
    transport: {
        early: new CreepSetup(CreepRoles.transport, {
            prefix: [],
            pattern: [CARRY, CARRY, MOVE],
            suffix: [],
            sizeLimit: 3,
            ordered: true,
            proportionalPrefixSuffix: false
        }),
        default: new CreepSetup(CreepRoles.transport, {
            prefix: [CARRY, MOVE],
            pattern: [CARRY, CARRY, MOVE],
            suffix: [],
            sizeLimit: 6,
            ordered: true,
            proportionalPrefixSuffix: false
        })
    },
    /** Drones: Static source harvesters that mine into containers/links */
    drone: {
        emergency: new CreepSetup(CreepRoles.drone, {
            prefix: [WORK, CARRY, MOVE],
            pattern: [],
            suffix: [],
            sizeLimit: 1,
            ordered: true,
            proportionalPrefixSuffix: false
        }),
        standard: new CreepSetup(CreepRoles.drone, {
            prefix: [WORK, CARRY, CARRY, MOVE],
            pattern: [WORK, WORK, CARRY, MOVE],
            suffix: [],
            sizeLimit: 2,
            ordered: true,
            proportionalPrefixSuffix: false
        }),
        double: new CreepSetup(CreepRoles.drone, {
            prefix: [WORK, WORK, WORK, MOVE],
            pattern: [WORK, WORK, CARRY, MOVE],
            suffix: [],
            sizeLimit: 2,
            ordered: true,
            proportionalPrefixSuffix: false
        })
    },
    /** Upgraders: Dedicated controller upgraders for progression */
    upgrader: {
        early: new CreepSetup(CreepRoles.upgrader, {
            prefix: [],
            pattern: [WORK, CARRY, MOVE],
            suffix: [],
            sizeLimit: 3,
            ordered: true,
            proportionalPrefixSuffix: false
        }),
        default: new CreepSetup(CreepRoles.upgrader, {
            prefix: [WORK, WORK, MOVE],
            pattern: [WORK, WORK, CARRY, MOVE],
            suffix: [],
            sizeLimit: 3,
            ordered: true,
            proportionalPrefixSuffix: false
        }),
        rcl8: new CreepSetup(CreepRoles.upgrader, {
            prefix: [WORK, WORK, WORK, WORK, WORK, MOVE, MOVE],
            pattern: [WORK, WORK, WORK, WORK, MOVE],
            suffix: [MOVE],
            sizeLimit: 6,
            ordered: true,
            proportionalPrefixSuffix: false
        })
    },
    /** Defenders: Combat units for base defense */
    defender: {
        emergency: new CreepSetup(CreepRoles.defender, {
            prefix: [TOUGH, MOVE, ATTACK],
            pattern: [MOVE, ATTACK],
            suffix: [],
            sizeLimit: 2,
            ordered: true,
            proportionalPrefixSuffix: false
        }),
        default: new CreepSetup(CreepRoles.defender, {
            prefix: [TOUGH, TOUGH, MOVE, MOVE],
            pattern: [ATTACK, ATTACK, MOVE],
            suffix: [MOVE],
            sizeLimit: 3,
            ordered: true,
            proportionalPrefixSuffix: false
        })
    },
    /** Scouts: Fast observers for remote room reconnaissance */
    scout: {
        observe: new CreepSetup(CreepRoles.scout, {
            prefix: [MOVE],
            pattern: [MOVE],
            suffix: [],
            sizeLimit: 1,
            ordered: true,
            proportionalPrefixSuffix: false
        })
    }
} as const;
