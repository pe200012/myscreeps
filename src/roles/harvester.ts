import { hasNearbyEnemies, getSafetyPosition } from "../utils/roomUtils";

export const HARVESTER_ROLE = "harvester";

export function calculateHarvesterBody(room: Room, source: Source): BodyPartConstant[] {
    const spawns = room.find(FIND_MY_SPAWNS);
    if (spawns.length === 0) {
        return [WORK, CARRY, MOVE];
    }

    const spawn = spawns[0];
    const distance = spawn.pos.getRangeTo(source);
    const energy = room.energyCapacityAvailable;

    // Base body: 2 WORK parts for optimal harvesting (10 energy/tick)
    const body: BodyPartConstant[] = [WORK, WORK];
    let cost = BODYPART_COST[WORK] * 2;

    // Close sources (< 20 tiles): prioritize MOVE for speed
    // Far sources (>= 20 tiles): prioritize CARRY for capacity
    if (distance < 20) {
        // Close: more MOVE parts for faster trips
        const moveRatio = 0.6; // 60% of remaining budget for MOVE
        const carryRatio = 0.4; // 40% for CARRY

        const remainingEnergy = energy - cost;
        const movesBudget = Math.floor(remainingEnergy * moveRatio);
        const carryBudget = Math.floor(remainingEnergy * carryRatio);

        const moves = Math.min(Math.floor(movesBudget / BODYPART_COST[MOVE]), 8);
        const carries = Math.min(Math.floor(carryBudget / BODYPART_COST[CARRY]), 8);

        for (let i = 0; i < carries; i++) {
            body.push(CARRY);
            cost += BODYPART_COST[CARRY];
        }
        for (let i = 0; i < moves; i++) {
            body.push(MOVE);
            cost += BODYPART_COST[MOVE];
        }
    } else {
        // Far: more CARRY parts for larger hauls
        const carryRatio = 0.6; // 60% for CARRY
        const moveRatio = 0.4; // 40% for MOVE

        const remainingEnergy = energy - cost;
        const carryBudget = Math.floor(remainingEnergy * carryRatio);
        const movesBudget = Math.floor(remainingEnergy * moveRatio);

        const carries = Math.min(Math.floor(carryBudget / BODYPART_COST[CARRY]), 16);
        const moves = Math.min(Math.floor(movesBudget / BODYPART_COST[MOVE]), 8);

        for (let i = 0; i < carries; i++) {
            body.push(CARRY);
            cost += BODYPART_COST[CARRY];
        }
        for (let i = 0; i < moves; i++) {
            body.push(MOVE);
            cost += BODYPART_COST[MOVE];
        }
    }

    // Ensure at least 1 CARRY and 1 MOVE
    if (!body.includes(CARRY)) {
        body.push(CARRY);
    }
    if (!body.includes(MOVE)) {
        body.push(MOVE);
    }

    return body;
}

export function runHarvester(creep: Creep): void {
    if (!creep.memory.working && creep.store.getFreeCapacity(RESOURCE_ENERGY) === 0) {
        creep.memory.working = true;
    }

    if (creep.memory.working && creep.store.getUsedCapacity(RESOURCE_ENERGY) === 0) {
        creep.memory.working = false;
    }

    if (creep.memory.working) {
        const targets = getEnergyDepositTargets(creep.room);

        if (targets.length > 0) {
            if (creep.transfer(targets[0], RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                creep.moveTo(targets[0], { visualizePathStyle: { stroke: "#ffffff" }, reusePath: 5, range: 1 });
            }
        } else if (creep.room.controller) {
            if (creep.upgradeController(creep.room.controller) === ERR_NOT_IN_RANGE) {
                creep.moveTo(creep.room.controller, { visualizePathStyle: { stroke: "#99c1f1" } });
            }
        } else {
            const idle = getHarvesterIdlePosition(creep.room);
            if (idle) {
                if (!creep.pos.isEqualTo(idle)) {
                    creep.moveTo(idle, { visualizePathStyle: { stroke: "#66d9ef" }, reusePath: 10, range: 0 });
                } else {
                    creep.drop(RESOURCE_ENERGY);
                    creep.memory.working = false;
                }
            } else {
                creep.drop(RESOURCE_ENERGY);
                creep.memory.working = false;
            }
        }
    } else {
        const depositTargets = getEnergyDepositTargets(creep.room);
        if (depositTargets.length > 0) {
            const droppedResources = creep.room.find(FIND_DROPPED_RESOURCES, {
                filter: r => r.resourceType === RESOURCE_ENERGY && r.amount > 10 && !hasNearbyEnemies(r.pos, creep.room)
            });

            if (droppedResources.length > 0) {
                const closest = creep.pos.findClosestByPath(droppedResources);
                if (closest) {
                    if (creep.pickup(closest) === ERR_NOT_IN_RANGE) {
                        creep.moveTo(closest, { visualizePathStyle: { stroke: "#a4f6a5" }, reusePath: 3, range: 1 });
                    }
                    return;
                }
            }
        }

        // Find safe sources (no enemies nearby)
        const safeSources = creep.room.find(FIND_SOURCES_ACTIVE, {
            filter: source => !hasNearbyEnemies(source.pos, creep.room)
        });

        // Prefer assigned source if available
        let targetSource: Source | null = null;
        if (creep.memory.sourceId) {
            const assignedSource = safeSources.find(s => s.id === creep.memory.sourceId);
            if (assignedSource) {
                targetSource = assignedSource;
            }
        }

        // Fallback to closest safe source
        if (!targetSource && safeSources.length > 0) {
            targetSource = creep.pos.findClosestByPath(safeSources);
        }

        if (targetSource) {
            if (creep.harvest(targetSource) === ERR_NOT_IN_RANGE) {
                creep.moveTo(targetSource, { visualizePathStyle: { stroke: "#ffaa00" }, reusePath: 5 });
            }
            return;
        }

        // All sources are dangerous - flee to safety
        const safePos = getSafetyPosition(creep.room);
        if (safePos && !creep.pos.inRangeTo(safePos, 2)) {
            creep.moveTo(safePos, { visualizePathStyle: { stroke: "#ff0000" }, reusePath: 3 });
        }
    }
}

export const HarvesterBehavior = {
    run: runHarvester
};

function getHarvesterIdlePosition(room: Room): RoomPosition | null {
    const terrain = room.getTerrain();
    const candidates: RoomPosition[] = [];

    const anchor = room.memory.planner?.anchor;
    if (anchor) {
        const offsets = [
            { x: 3, y: 3 },
            { x: -3, y: 3 },
            { x: 3, y: -3 },
            { x: -3, y: -3 },
            { x: 0, y: 4 },
            { x: 4, y: 0 },
            { x: -4, y: 0 },
            { x: 0, y: -4 }
        ];
        for (const offset of offsets) {
            const x = anchor.x + offset.x;
            const y = anchor.y + offset.y;
            if (x <= 0 || x >= 49 || y <= 0 || y >= 49) {
                continue;
            }
            candidates.push(new RoomPosition(x, y, room.name));
        }
    }

    const spawn = room.find(FIND_MY_SPAWNS)[0];
    if (spawn) {
        for (let dx = -3; dx <= 3; dx += 1) {
            for (let dy = -3; dy <= 3; dy += 1) {
                if (Math.abs(dx) + Math.abs(dy) !== 3) {
                    continue;
                }
                const x = spawn.pos.x + dx;
                const y = spawn.pos.y + dy;
                if (x <= 0 || x >= 49 || y <= 0 || y >= 49) {
                    continue;
                }
                candidates.push(new RoomPosition(x, y, room.name));
            }
        }
    }

    if (room.controller) {
        candidates.push(new RoomPosition(room.controller.pos.x, room.controller.pos.y, room.name));
    }

    for (const pos of candidates) {
        if (terrain.get(pos.x, pos.y) === TERRAIN_MASK_WALL) {
            continue;
        }

        const structures = room.lookForAt(LOOK_STRUCTURES, pos.x, pos.y);
        if (structures.some(struct => struct.structureType !== STRUCTURE_ROAD)) {
            continue;
        }

        const sites = room.lookForAt(LOOK_CONSTRUCTION_SITES, pos.x, pos.y);
        if (sites.length > 0) {
            continue;
        }

        return pos;
    }

    return null;
}

function getEnergyDepositTargets(room: Room): AnyStructure[] {
    return room.find(FIND_STRUCTURES, {
        filter: structure => {
            const acceptsEnergy =
                structure.structureType === STRUCTURE_EXTENSION ||
                structure.structureType === STRUCTURE_SPAWN ||
                structure.structureType === STRUCTURE_TOWER ||
                structure.structureType === STRUCTURE_STORAGE;

            if (!acceptsEnergy) {
                return false;
            }

            if (!("store" in structure)) {
                return false;
            }

            const store = (structure as AnyStoreStructure).store;
            return store.getFreeCapacity(RESOURCE_ENERGY) > 0;
        }
    });
}
