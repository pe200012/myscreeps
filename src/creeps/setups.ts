import { CreepSetup } from "./CreepSetup";

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

export const CreepSetups = {
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
            prefix: [WORK, WORK, MOVE],
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
