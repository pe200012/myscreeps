import _ from "lodash";
import { HARVESTER_ROLE, calculateHarvesterBody } from "./roles/harvester";
import { BUILDER_ROLE, BUILDER_BODY } from "./roles/builder";
import { GUARD_ROLE, GUARD_BODY } from "./roles/guard";
import { MIN_HARVESTERS, RECENT_THREAT_TICKS } from "./constants";

export function manageSpawning(room: Room, hostiles: Creep[]): void {
    const roomCreeps = _.filter(Game.creeps, creep => creep.memory.room === room.name);
    const harvesters = roomCreeps.filter(creep => creep.memory.role === HARVESTER_ROLE);
    const sources = room.find(FIND_SOURCES);

    // Spawn harvesters for each source
    for (const source of sources) {
        const assignedHarvesters = harvesters.filter(h => h.memory.sourceId === source.id);
        if (assignedHarvesters.length === 0) {
            const body = calculateHarvesterBody(room, source);
            if (spawnRoleWithSource(room, body, HARVESTER_ROLE, source.id)) {
                return;
            }
        }
    }

    // Ensure minimum harvesters
    const desiredHarvesters = Math.max(MIN_HARVESTERS, sources.length);
    if (harvesters.length < desiredHarvesters) {
        const unassignedSource = sources.find(s => !harvesters.some(h => h.memory.sourceId === s.id));
        if (unassignedSource) {
            const body = calculateHarvesterBody(room, unassignedSource);
            if (spawnRoleWithSource(room, body, HARVESTER_ROLE, unassignedSource.id)) {
                return;
            }
        }
    } else {

        // Builder spawning: spawn at least one builder if there are construction sites
        const constructionSites = room.find(FIND_CONSTRUCTION_SITES);
        const builders = roomCreeps.filter(creep => creep.memory.role === BUILDER_ROLE);
        const desiredBuilders = Math.min(
            2,
            constructionSites.length > 0 ? Math.max(1, Math.ceil(constructionSites.length / 5)) : 0
        );

        if (builders.length < desiredBuilders) {
            spawnRole(room, BUILDER_BODY, BUILDER_ROLE);
        }

        const guards = roomCreeps.filter(creep => creep.memory.role === GUARD_ROLE);
        const defenseMemory = room.memory.defense;
        const recentThreat = defenseMemory ? Game.time - defenseMemory.lastHostileSeen < RECENT_THREAT_TICKS : false;
        const desiredGuards = Math.min(3, Math.max(hostiles.length, recentThreat ? 1 : 0));

        if (guards.length < desiredGuards) {
            spawnRole(room, GUARD_BODY, GUARD_ROLE);
        }
    }
}

function spawnRole(room: Room, body: BodyPartConstant[], role: string): boolean {
    const spawn = getAvailableSpawn(room, bodyCost(body));
    if (!spawn) {
        return false;
    }

    const creepName = `${role}-${room.name}-${Game.time}`;
    const memory: CreepMemory = { role, room: room.name, targetRoom: room.name };
    const result = spawn.spawnCreep(body, creepName, { memory });

    if (result === OK) {
        console.log(`[Spawn] ${spawn.name} created ${role} ${creepName}`);
        return true;
    }

    return false;
}

function spawnRoleWithSource(room: Room, body: BodyPartConstant[], role: string, sourceId: string): boolean {
    const spawn = getAvailableSpawn(room, bodyCost(body));
    if (!spawn) {
        return false;
    }

    const creepName = `${role}-${room.name}-${Game.time}`;
    const memory: CreepMemory = { role, room: room.name, targetRoom: room.name, sourceId };
    const result = spawn.spawnCreep(body, creepName, { memory });

    if (result === OK) {
        console.log(`[Spawn] ${spawn.name} created ${role} ${creepName} for source ${sourceId}`);
        return true;
    }

    return false;
}

function getAvailableSpawn(room: Room, energyCost: number): StructureSpawn | null {
    const spawns = room.find(FIND_MY_SPAWNS);
    return (
        spawns.find(spawn => !spawn.spawning && spawn.store.getUsedCapacity(RESOURCE_ENERGY) >= energyCost) ?? null
    );
}

function bodyCost(body: BodyPartConstant[]): number {
    return body.reduce((total, part) => total + BODYPART_COST[part], 0);
}
