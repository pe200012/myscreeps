/**
 * Logistics utility functions for hatchery and storage management.
 * Provides centralized helpers for energy flow coordination.
 */

import { SPAWN_ENERGY_RESERVE } from "../constants";

/**
 * Consolidated information about spawn energy infrastructure.
 */
export interface HatcheryInfo {
    /** Containers near spawns used as energy batteries */
    batteries: StructureContainer[];

    /** Link near spawns for rapid energy transfer */
    link: StructureLink | null;

    /** Total energy in spawns, extensions, and batteries */
    spawnEnergy: number;
}

/**
 * Gathers all hatchery-related information for a room.
 * @param room - The room to analyze
 * @returns Consolidated hatchery infrastructure data
 */
export function getHatcheryInfo(room: Room): HatcheryInfo {
    const batteries = findSpawnBatteries(room);
    return {
        batteries,
        link: findSpawnLink(room, batteries),
        spawnEnergy: sumSpawnEnergy(room)
    };
}

/**
 * Finds all containers within range 2 of any spawn in the room.
 * These containers serve as energy batteries for spawn refilling.
 * @param room - The room to search
 * @returns Array of battery containers
 */
export function findSpawnBatteries(room: Room): StructureContainer[] {
    const spawns = room.find(FIND_MY_SPAWNS);
    if (spawns.length === 0) {
        return [];
    }
    const batteries: StructureContainer[] = [];
    for (const spawn of spawns) {
        const containers = spawn.pos.findInRange(FIND_STRUCTURES, 2, {
            filter: (structure): structure is StructureContainer => structure.structureType === STRUCTURE_CONTAINER
        });
        for (const container of containers) {
            if (!batteries.includes(container)) {
                batteries.push(container);
            }
        }
    }
    return batteries;
}

/**
 * Finds a link within range 2 of spawns or batteries.
 * This link is used for rapid energy transfer to the hatchery.
 * @param room - The room to search
 * @param batteries - Optional pre-computed battery containers
 * @returns The hatchery link, or null if none exists
 */
export function findSpawnLink(room: Room, batteries?: StructureContainer[]): StructureLink | null {
    const spawns = room.find(FIND_MY_SPAWNS);
    if (spawns.length === 0) {
        return null;
    }
    const searchOrigins: RoomPosition[] = batteries && batteries.length > 0 ? batteries.map(b => b.pos) : spawns.map(s => s.pos);
    for (const origin of searchOrigins) {
        const link = origin.findInRange(FIND_MY_STRUCTURES, 2, {
            filter: structure => structure.structureType === STRUCTURE_LINK
        })[0] as StructureLink | undefined;
        if (link) {
            return link;
        }
    }
    return null;
}

/**
 * Calculates total energy available in the hatchery system.
 * Includes spawns, extensions (implicitly), and battery containers.
 * @param room - The room to analyze
 * @returns Total energy in hatchery infrastructure
 */
export function sumSpawnEnergy(room: Room): number {
    const spawnEnergy = room.find(FIND_MY_SPAWNS).reduce((sum, spawn) => sum + spawn.store.getUsedCapacity(RESOURCE_ENERGY), 0);
    const batteries = findSpawnBatteries(room);
    const batteryEnergy = batteries.reduce((sum, container) => sum + container.store.getUsedCapacity(RESOURCE_ENERGY), 0);
    return spawnEnergy + batteryEnergy;
}

/**
 * Finds the link within range 2 of storage (command link).
 * This link is managed by the manager for central energy distribution.
 * @param room - The room to search
 * @returns The storage link, or null if storage or link doesn't exist
 */
export function storageLink(room: Room): StructureLink | null {
    if (!room.storage) {
        return null;
    }
    const link = room.storage.pos.findInRange(FIND_MY_STRUCTURES, 2, {
        filter: structure => structure.structureType === STRUCTURE_LINK
    })[0] as StructureLink | undefined;
    return link ?? null;
}

/**
 * Checks if the terminal needs energy based on a target threshold.
 * @param room - The room to check
 * @param target - Desired energy level in terminal
 * @returns true if terminal energy is below target
 */
export function terminalNeedsEnergy(room: Room, target: number): boolean {
    if (!room.terminal) {
        return false;
    }
    return room.terminal.store.getUsedCapacity(RESOURCE_ENERGY) < target;
}

/**
 * Checks if the terminal has excess energy beyond target + buffer.
 * Used to decide when to transfer energy from terminal to storage.
 * @param room - The room to check
 * @param target - Desired energy level in terminal
 * @param buffer - Additional energy above target before considering excess
 * @returns true if terminal energy exceeds target + buffer
 */
export function terminalHasExcess(room: Room, target: number, buffer: number): boolean {
    if (!room.terminal) {
        return false;
    }
    return room.terminal.store.getUsedCapacity(RESOURCE_ENERGY) > target + buffer;
}

/**
 * Determines if hatchery energy reserves should be protected.
 * When true, logistics units avoid withdrawing from hatchery batteries.
 * @param room - The room to check
 * @param reserve - Energy threshold below which to protect (default: SPAWN_ENERGY_RESERVE)
 * @returns true if hatchery energy is below reserve threshold
 */
export function shouldProtectHatchery(room: Room, reserve: number = SPAWN_ENERGY_RESERVE): boolean {
    return sumSpawnEnergy(room) < reserve;
}
