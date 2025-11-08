import { BasePlanner } from "./planner/BasePlanner";
import { runColonies } from "./colony/ColonyManager";
import { ErrorMapper } from "./utils/ErrorMapper";
import { ALLY_USERNAMES } from "./constants";

export const loop = ErrorMapper.wrapLoop(() => {
    cleanupMemory();

    const hostilesByRoom: Record<string, Creep[]> = {};
    const ownedRooms = Object.values(Game.rooms).filter(room => room.controller?.my);

    for (const room of ownedRooms) {
        BasePlanner.run(room);

        const hostiles = room.find(FIND_HOSTILE_CREEPS, {
            filter: hostile => !ALLY_USERNAMES.includes(hostile.owner.username)
        });
        hostilesByRoom[room.name] = hostiles;

        if (!room.memory.defense) {
            room.memory.defense = { lastHostileSeen: 0, threatLevel: 0 };
        }

        if (hostiles.length > 0) {
            room.memory.defense.lastHostileSeen = Game.time;
            room.memory.defense.threatLevel = hostiles.length;
        } else {
            room.memory.defense.threatLevel = 0;
        }
    }

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
});

function cleanupMemory(): void {
    for (const name in Memory.creeps) {
        if (!(name in Game.creeps)) {
            delete Memory.creeps[name];
        }
    }
}

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
