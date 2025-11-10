/**
 * Pioneer behavior: bootstrap newly-claimed rooms by collecting energy, placing a spawn site, and
 * building or upgrading until local infrastructure is operational.
 */

import { COLONIZATION_SITE_RETRY } from "../constants";
import { CreepRoles } from "../creeps/setups";
import { followColonizationWaypoints, getColonizationAnchor } from "./colonizationUtils";

export const PIONEER_ROLE = CreepRoles.pioneer;

export const PioneerBehavior = {
    run(creep: Creep): void {
        const targetRoom = creep.memory.targetRoom ?? creep.memory.colonizationAnchor?.roomName ?? creep.memory.room;
        if (!targetRoom) {
            return;
        }

        if (followColonizationWaypoints(creep, { color: "#1abc9c" })) {
            return;
        }

        if (creep.memory.working && creep.store.getUsedCapacity(RESOURCE_ENERGY) === 0) {
            creep.memory.working = false;
        } else if (!creep.memory.working && creep.store.getFreeCapacity(RESOURCE_ENERGY) === 0) {
            creep.memory.working = true;
        }

        if (creep.room.name !== targetRoom) {
            const anchor = getColonizationAnchor(creep);
            const destination = anchor && anchor.roomName === targetRoom ? anchor : new RoomPosition(25, 25, targetRoom);
            creep.moveTo(destination, { reusePath: 10, range: 1, visualizePathStyle: { stroke: "#1abc9c" } });
            return;
        }

        if (isOnRoomEdge(creep.pos)) {
            const anchor = getColonizationAnchor(creep) ?? new RoomPosition(25, 25, creep.room.name);
            creep.moveTo(anchor, { reusePath: 0, range: 1, visualizePathStyle: { stroke: "#1abc9c" } });
            return;
        }

        const controller = creep.room.controller;
        const anchor = getColonizationAnchor(creep);

        if (!controller || !controller.my) {
            gatherEnergy(creep);
            return;
        }

        if (!creep.memory.working) {
            if (gatherEnergy(creep)) {
                return;
            }
            // Failed to find energy; wander toward sources so next tick can harvest
            const source = creep.pos.findClosestByPath(FIND_SOURCES);
            if (source) {
                creep.moveTo(source, { reusePath: 5, range: 1, visualizePathStyle: { stroke: "#1abc9c" } });
            }
            return;
        }

        const spawn = creep.room.find(FIND_MY_STRUCTURES, { filter: structure => structure.structureType === STRUCTURE_SPAWN })[0];
        const spawnSite = creep.room.find(FIND_MY_CONSTRUCTION_SITES, { filter: site => site.structureType === STRUCTURE_SPAWN })[0];

        if (!spawn && !spawnSite) {
            tryPlaceSpawnSite(creep, anchor ?? controller.pos);
        }

        if (buildIfPossible(creep, spawnSite)) {
            return;
        }

        const otherSite = creep.room.find(FIND_MY_CONSTRUCTION_SITES, { filter: site => site.structureType !== STRUCTURE_SPAWN })[0];
        if (buildIfPossible(creep, otherSite)) {
            return;
        }

        if (controller) {
            if (creep.upgradeController(controller) === ERR_NOT_IN_RANGE) {
                creep.moveTo(controller, { reusePath: 5, range: 3, visualizePathStyle: { stroke: "#1abc9c" } });
            }
        }
    }
};

function gatherEnergy(creep: Creep): boolean {
    const dropped = creep.pos.findClosestByPath(FIND_DROPPED_RESOURCES, {
        filter: resource => resource.resourceType === RESOURCE_ENERGY && resource.amount > 50
    });
    if (dropped) {
        if (creep.pickup(dropped) === ERR_NOT_IN_RANGE) {
            creep.moveTo(dropped, { reusePath: 3, range: 1, visualizePathStyle: { stroke: "#1abc9c" } });
        }
        return true;
    }

    const container = creep.pos.findClosestByPath(FIND_STRUCTURES, {
        filter: structure => (structure.structureType === STRUCTURE_CONTAINER || structure.structureType === STRUCTURE_STORAGE) &&
            (structure as StructureContainer | StructureStorage).store[RESOURCE_ENERGY] > 0
    }) as StructureContainer | StructureStorage | undefined;
    if (container) {
        if (creep.withdraw(container, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
            creep.moveTo(container, { reusePath: 3, range: 1, visualizePathStyle: { stroke: "#1abc9c" } });
        }
        return true;
    }

    const source = creep.pos.findClosestByPath(FIND_SOURCES_ACTIVE);
    if (source) {
        if (creep.harvest(source) === ERR_NOT_IN_RANGE) {
            creep.moveTo(source, { reusePath: 3, range: 1, visualizePathStyle: { stroke: "#1abc9c" } });
        }
        return true;
    }

    return false;
}

function buildIfPossible(creep: Creep, site?: ConstructionSite | null): boolean {
    if (!site) {
        return false;
    }
    const result = creep.build(site);
    if (result === ERR_NOT_IN_RANGE) {
        creep.moveTo(site, { reusePath: 3, range: 3, visualizePathStyle: { stroke: "#1abc9c" } });
        return true;
    }
    if (result === OK) {
        return true;
    }
    return false;
}

function tryPlaceSpawnSite(creep: Creep, anchor: RoomPosition | null): void {
    if (!anchor || anchor.roomName !== creep.room.name) {
        return;
    }

    if (creep.memory.colonizationNextSiteCheck && Game.time < creep.memory.colonizationNextSiteCheck) {
        return;
    }
    creep.memory.colonizationNextSiteCheck = Game.time + COLONIZATION_SITE_RETRY;

    const preferredPositions = collectCandidatePositions(anchor);

    for (const pos of preferredPositions) {
        const structures = pos.lookFor(LOOK_STRUCTURES);
        const blocking = structures.find(structure => structure.structureType !== STRUCTURE_ROAD && structure.structureType !== STRUCTURE_CONTAINER && structure.structureType !== STRUCTURE_RAMPART);

        if (blocking) {
            if (blocking.structureType === STRUCTURE_CONTROLLER || creep.getActiveBodyparts(WORK) === 0) {
                continue;
            }
            if (creep.pos.inRangeTo(pos, 1)) {
                creep.dismantle(blocking);
            } else {
                creep.moveTo(pos, { reusePath: 3, range: 1, visualizePathStyle: { stroke: "#1abc9c" } });
            }
            return;
        }

        if (structures.length > 0) {
            if (creep.getActiveBodyparts(WORK) === 0) {
                continue;
            }
            const road = structures[0];
            if (creep.pos.inRangeTo(pos, 1)) {
                creep.dismantle(road);
            } else {
                creep.moveTo(pos, { reusePath: 3, range: 1, visualizePathStyle: { stroke: "#1abc9c" } });
            }
            return;
        }

        const terrain = pos.lookFor(LOOK_TERRAIN)[0];
        if (terrain === "wall") {
            continue;
        }

        const result = creep.room.createConstructionSite(pos, STRUCTURE_SPAWN);
        if (result === OK) {
            creep.say("Site", true);
            return;
        }
    }
}

function collectCandidatePositions(anchor: RoomPosition): RoomPosition[] {
    const positions: RoomPosition[] = [];
    const offsets = [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: -1, y: 0 },
        { x: 0, y: 1 },
        { x: 0, y: -1 },
        { x: 1, y: 1 },
        { x: 1, y: -1 },
        { x: -1, y: 1 },
        { x: -1, y: -1 }
    ];

    for (const offset of offsets) {
        const x = anchor.x + offset.x;
        const y = anchor.y + offset.y;
        if (x <= 0 || x >= 49 || y <= 0 || y >= 49) {
            continue;
        }
        positions.push(new RoomPosition(x, y, anchor.roomName));
    }

    return positions;
}

function isOnRoomEdge(pos: RoomPosition): boolean {
    return pos.x === 0 || pos.x === 49 || pos.y === 0 || pos.y === 49;
}
