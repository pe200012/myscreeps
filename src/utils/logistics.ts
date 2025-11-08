import { SPAWN_ENERGY_RESERVE } from "../constants";

export interface HatcheryInfo {
    batteries: StructureContainer[];
    link: StructureLink | null;
    spawnEnergy: number;
}

export function getHatcheryInfo(room: Room): HatcheryInfo {
    const batteries = findSpawnBatteries(room);
    return {
        batteries,
        link: findSpawnLink(room, batteries),
        spawnEnergy: sumSpawnEnergy(room)
    };
}

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

export function sumSpawnEnergy(room: Room): number {
    const spawnEnergy = room.find(FIND_MY_SPAWNS).reduce((sum, spawn) => sum + spawn.store.getUsedCapacity(RESOURCE_ENERGY), 0);
    const batteries = findSpawnBatteries(room);
    const batteryEnergy = batteries.reduce((sum, container) => sum + container.store.getUsedCapacity(RESOURCE_ENERGY), 0);
    return spawnEnergy + batteryEnergy;
}

export function storageLink(room: Room): StructureLink | null {
    if (!room.storage) {
        return null;
    }
    const link = room.storage.pos.findInRange(FIND_MY_STRUCTURES, 2, {
        filter: structure => structure.structureType === STRUCTURE_LINK
    })[0] as StructureLink | undefined;
    return link ?? null;
}

export function terminalNeedsEnergy(room: Room, target: number): boolean {
    if (!room.terminal) {
        return false;
    }
    return room.terminal.store.getUsedCapacity(RESOURCE_ENERGY) < target;
}

export function terminalHasExcess(room: Room, target: number, buffer: number): boolean {
    if (!room.terminal) {
        return false;
    }
    return room.terminal.store.getUsedCapacity(RESOURCE_ENERGY) > target + buffer;
}

export function shouldProtectHatchery(room: Room, reserve: number = SPAWN_ENERGY_RESERVE): boolean {
    return sumSpawnEnergy(room) < reserve;
}
