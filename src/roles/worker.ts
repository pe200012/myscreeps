/**
 * Worker role: General purpose construction, repair, and upgrade units.
 *
 * Behavior:
 * - Gathers energy from storage, containers, dropped resources, or sources
 * - Prioritizes construction sites by structure type (spawns/towers first)
 * - Repairs structures below threshold (walls/ramparts to target HP)
 * - Falls back to upgrading controller when idle
 *
 * Workers are flexible laborers that handle all non-specialized tasks,
 * adapting to the room's needs dynamically.
 */

import { CreepRoles } from "../creeps/setups";
import { BuildPriorities } from "../priorities/buildPriorities";

export const WORKER_ROLE = CreepRoles.worker;

/**
 * Configuration options for worker behavior.
 */
export interface WorkerBehaviorOptions {
    /** Maximum hit points workers should push walls toward at full strength */
    wallTarget: number;
}

/**
 * Worker behavior implementation.
 * Manages gathering, building, repairing, and upgrading.
 */
export const WorkerBehavior = {
    /**
     * Main execution method called each tick.
     * Toggles between gathering and working modes.
     */
    run(creep: Creep, options: WorkerBehaviorOptions): void {
        if (creep.memory.working === undefined) {
            creep.memory.working = false;
        }

        if (!creep.memory.working && creep.store.getFreeCapacity(RESOURCE_ENERGY) === 0) {
            creep.memory.working = true;
        }
        if (creep.memory.working && creep.store.getUsedCapacity(RESOURCE_ENERGY) === 0) {
            creep.memory.working = false;
        }

        if (creep.memory.working) {
            if (this.tryBuild(creep)) {
                return;
            }
            if (this.tryRepair(creep, options)) {
                return;
            }
            // Clear build target if not building anymore
            delete creep.memory.buildTarget;
            this.upgrade(creep);
        } else {
            // Clear build target when gathering
            delete creep.memory.buildTarget;
            delete creep.memory.repairTarget;
            this.gather(creep);
        }
    },

    /**
     * Gathers energy from available sources with priority order:
     * storage → containers → dropped resources → active sources
     */
    gather(creep: Creep): void {
        const storage = creep.room.storage;
        if (storage && storage.store.getUsedCapacity(RESOURCE_ENERGY) > 5000) {
            if (creep.withdraw(storage, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                creep.moveTo(storage, { reusePath: 3, range: 1, visualizePathStyle: { stroke: "#ffaa00" } });
            }
            return;
        }

        const container = creep.pos.findClosestByPath(FIND_STRUCTURES, {
            filter: (structure): structure is StructureContainer =>
                structure.structureType === STRUCTURE_CONTAINER && structure.store[RESOURCE_ENERGY] > 100
        });
        if (container) {
            if (creep.withdraw(container, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                creep.moveTo(container, { reusePath: 3, range: 1, visualizePathStyle: { stroke: "#ffaa00" } });
            }
            return;
        }

        const dropped = creep.pos.findClosestByPath(FIND_DROPPED_RESOURCES, {
            filter: resource => resource.resourceType === RESOURCE_ENERGY && resource.amount >= 50
        });
        if (dropped) {
            if (creep.pickup(dropped) === ERR_NOT_IN_RANGE) {
                creep.moveTo(dropped, { reusePath: 3, range: 1, visualizePathStyle: { stroke: "#ffcc66" } });
            }
            return;
        }

        const source = creep.pos.findClosestByPath(FIND_SOURCES_ACTIVE);
        if (source && creep.harvest(source) === ERR_NOT_IN_RANGE) {
            creep.moveTo(source, { reusePath: 3, visualizePathStyle: { stroke: "#ffaa00" } });
        }
    },

    /**
     * Attempts to build the nearest construction site.
     * Prioritizes by structure type according to BuildPriorities.
     * Prefers sites where other workers are already building (cooperation).
     * @returns true if a construction site was found and targeted
     */
    tryBuild(creep: Creep): boolean {
        // Group construction sites by structure type
        const sites = creep.room.find(FIND_CONSTRUCTION_SITES);
        if (sites.length === 0) {
            return false;
        }

        // Find all workers currently building
        const workersBuilding = creep.room.find(FIND_MY_CREEPS, {
            filter: c =>
                c.id !== creep.id &&
                c.memory.role === WORKER_ROLE &&
                c.memory.working === true &&
                c.memory.buildTarget
        });

        // Count workers per construction site
        const workersPerSite = new Map<string, number>();
        for (const worker of workersBuilding) {
            const targetId = worker.memory.buildTarget;
            if (targetId) {
                workersPerSite.set(targetId, (workersPerSite.get(targetId) || 0) + 1);
            }
        }

        // Group sites by type for priority sorting
        const sitesByType: { [key: string]: ConstructionSite[] } = {};
        for (const site of sites) {
            if (!sitesByType[site.structureType]) {
                sitesByType[site.structureType] = [];
            }
            sitesByType[site.structureType].push(site);
        }

        // Find the highest priority structure type that has sites
        let target: ConstructionSite | null = null;
        for (const structureType of BuildPriorities) {
            const sitesOfType = sitesByType[structureType];
            if (sitesOfType && sitesOfType.length > 0) {
                // Sort sites: prioritize sites with workers, then by distance
                const sortedSites = sitesOfType.sort((a, b) => {
                    const workersA = workersPerSite.get(a.id) || 0;
                    const workersB = workersPerSite.get(b.id) || 0;

                    // Prefer sites with more workers (cooperation)
                    if (workersA !== workersB) {
                        return workersB - workersA;
                    }

                    // Fall back to distance if no workers or same number of workers
                    const distA = creep.pos.getRangeTo(a);
                    const distB = creep.pos.getRangeTo(b);
                    return distA - distB;
                });

                target = sortedSites[0];
                if (target) {
                    break;
                }
            }
        }

        if (!target) {
            return false;
        }

        // Store the build target in memory for cooperation tracking
        creep.memory.buildTarget = target.id;

        const result = creep.build(target);
        if (result === ERR_NOT_IN_RANGE) {
            const distance = creep.pos.getRangeTo(target);
            creep.moveTo(target, {
                reusePath: 3,
                range: 3,
                avoidCreeps: distance <= 5,
                priority: 6,
                visualizePathStyle: { stroke: "#ffffff" }
            });
        } else if (result === OK || result === ERR_INVALID_TARGET) {
            // Clear build target when done or site is gone
            delete creep.memory.buildTarget;
        }
        return true;
    },

    /**
     * Attempts to repair the nearest damaged structure.
    * Walls and ramparts are repaired toward a level-dependent share of wallTarget.
    * Other structures are repaired toward a level-dependent share of their max hits.
     *
     * @returns true if a repair target was found and targeted
     */
    tryRepair(creep: Creep, { wallTarget }: WorkerBehaviorOptions): boolean {
        const repairFraction = getRepairFraction(creep.room.controller?.level);
        const target = this.resolveRepairTarget(creep, repairFraction, wallTarget);
        if (!target) {
            return false;
        }
        const result = creep.repair(target as Structure);
        if (result === ERR_NOT_IN_RANGE) {
            const distance = creep.pos.getRangeTo(target);
            creep.moveTo(target, {
                reusePath: 3,
                range: target.structureType === STRUCTURE_ROAD ? 1 : 3,
                avoidCreeps: distance <= 2,
                priority: 5,
                visualizePathStyle: { stroke: "#99c1f1" }
            });
        } else if (result === OK) {
            this.pruneRepairTarget(creep, target as Structure, repairFraction, wallTarget);
        } else if (result === ERR_INVALID_TARGET) {
            delete creep.memory.repairTarget;
        }
        return true;
    },

    resolveRepairTarget(creep: Creep, repairFraction: number, wallTarget: number): Structure | null {
        const existing = creep.memory.repairTarget ? Game.getObjectById(creep.memory.repairTarget) : undefined;
        if (existing && this.shouldKeepRepairing(existing as Structure, repairFraction, wallTarget)) {
            return existing as Structure;
        }
        delete creep.memory.repairTarget;

        const rampart = creep.pos.findClosestByPath(FIND_STRUCTURES, {
            filter: structure => isDamagedRampart(structure as Structure, repairFraction, wallTarget)
        }) as Structure | null;
        if (rampart) {
            creep.memory.repairTarget = rampart.id as Id<Structure>;
            return rampart;
        }

        const structure = creep.pos.findClosestByPath(FIND_STRUCTURES, {
            filter: structure => isRepairableStructure(structure as Structure, repairFraction)
        }) as Structure | null;
        if (structure) {
            creep.memory.repairTarget = structure.id as Id<Structure>;
            return structure;
        }

        return null;
    },

    shouldKeepRepairing(structure: Structure, repairFraction: number, wallTarget: number): boolean {
        if (structure.structureType === STRUCTURE_WALL) {
            return structure.hits < getWallTarget(wallTarget, repairFraction);
        }
        if (structure.structureType === STRUCTURE_RAMPART) {
            const rampart = structure as StructureRampart;
            return rampart.hits < getRampartTarget(rampart, wallTarget, repairFraction);
        }
        if (!structure.hitsMax) {
            return false;
        }
        return structure.hits < structure.hitsMax * repairFraction;
    },

    pruneRepairTarget(creep: Creep, structure: Structure, repairFraction: number, wallTarget: number): void {
        if (!this.shouldKeepRepairing(structure, repairFraction, wallTarget)) {
            delete creep.memory.repairTarget;
        }
    },

    /**
     * Upgrades the room controller as a fallback activity.
     */
    upgrade(creep: Creep): void {
        const controller = creep.room.controller;
        if (!controller) {
            return;
        }
        if (creep.upgradeController(controller) === ERR_NOT_IN_RANGE) {
            const distance = creep.pos.getRangeTo(controller);
            creep.moveTo(controller, {
                reusePath: 3,
                range: 3,
                avoidCreeps: distance <= 2,
                priority: 4,
                visualizePathStyle: { stroke: "#99c1f1" }
            });
        }
    }
};

function isRepairableStructure(structure: Structure, repairFraction: number): boolean {
    if (!structure.hitsMax) {
        return false;
    }
    if (structure.structureType === STRUCTURE_WALL || structure.structureType === STRUCTURE_RAMPART) {
        return false;
    }
    return structure.hits < structure.hitsMax * repairFraction;
}

function isDamagedRampart(structure: Structure, repairFraction: number, wallTarget: number): structure is StructureRampart | StructureWall {
    if (structure.structureType === STRUCTURE_RAMPART) {
        const rampart = structure as StructureRampart;
        const target = getRampartTarget(rampart, wallTarget, repairFraction);
        return !!rampart.my && rampart.hits < target;
    }
    if (structure.structureType === STRUCTURE_WALL) {
        return structure.hits < getWallTarget(wallTarget, repairFraction);
    }
    return false;
}

export function getRampartTarget(rampart: StructureRampart, wallTarget: number, repairFraction: number): number {
    const cap = Math.min(rampart.hitsMax ?? wallTarget, wallTarget);
    return cap * repairFraction;
}

export function getWallTarget(wallTarget: number, repairFraction: number): number {
    return wallTarget * repairFraction;
}

export function getRepairFraction(level?: number): number {
    if (!level || level < 5) {
        return 0.5;
    }
    if (level < 6) {
        return 0.8;
    }
    return 1;
}

