import { BasePlanner } from "./planner/BasePlanner";
import { ErrorMapper } from "./utils/ErrorMapper";
import { manageSpawning } from "./spawning";
import { HARVESTER_ROLE, runHarvester } from "./roles/harvester";
import { BUILDER_ROLE, runBuilder } from "./roles/builder";
import { GUARD_ROLE, runGuard } from "./roles/guard";
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

        manageSpawning(room, hostiles);
    }

    for (const creep of Object.values(Game.creeps)) {
        if (!creep.memory.room) {
            creep.memory.room = creep.room.name;
        }

        if (creep.memory.role === HARVESTER_ROLE) {
            runHarvester(creep);
        } else if (creep.memory.role === GUARD_ROLE) {
            runGuard(creep, hostilesByRoom);
        } else if (creep.memory.role === BUILDER_ROLE) {
            runBuilder(creep);
        } else {
            runHarvester(creep);
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
