export interface RelativeOffset {
    x: number;
    y: number;
}

export interface RelativeStructure {
    type: BuildableStructureConstant;
    offset: RelativeOffset;
    level: number;
}

export interface RelativeRoad {
    offset: RelativeOffset;
    level: number;
}

export const ANCHOR_BUFFER = 6;

export const CORE_STAMP: RelativeStructure[] = [
    { type: STRUCTURE_SPAWN, offset: { x: 0, y: 0 }, level: 1 },
    { type: STRUCTURE_SPAWN, offset: { x: -1, y: -1 }, level: 7 },
    { type: STRUCTURE_SPAWN, offset: { x: 1, y: -1 }, level: 8 },
    { type: STRUCTURE_STORAGE, offset: { x: 0, y: 1 }, level: 4 },
    { type: STRUCTURE_TERMINAL, offset: { x: 0, y: -2 }, level: 6 },
    { type: STRUCTURE_LINK, offset: { x: 1, y: 1 }, level: 5 },
    { type: STRUCTURE_TOWER, offset: { x: -1, y: 0 }, level: 5 },
    { type: STRUCTURE_TOWER, offset: { x: 1, y: 0 }, level: 5 },
    { type: STRUCTURE_TOWER, offset: { x: -1, y: 1 }, level: 6 },
    { type: STRUCTURE_TOWER, offset: { x: 1, y: -2 }, level: 7 }
];

export const FAST_FILL_EXTENSIONS: RelativeStructure[] = [
    { type: STRUCTURE_EXTENSION, offset: { x: -2, y: 0 }, level: 2 },
    { type: STRUCTURE_EXTENSION, offset: { x: -2, y: 1 }, level: 2 },
    { type: STRUCTURE_EXTENSION, offset: { x: 2, y: 0 }, level: 2 },
    { type: STRUCTURE_EXTENSION, offset: { x: 2, y: 1 }, level: 2 },
    { type: STRUCTURE_EXTENSION, offset: { x: -2, y: -1 }, level: 3 },
    { type: STRUCTURE_EXTENSION, offset: { x: 2, y: -1 }, level: 3 }
];

export const EXTENSION_GRID: RelativeStructure[] = [];

for (let dx = -4; dx <= 4; dx += 1) {
    for (let dy = -4; dy <= 4; dy += 1) {
        if (Math.abs(dx) <= 2 && Math.abs(dy) <= 2) {
            continue;
        }

        if ((Math.abs(dx) + Math.abs(dy)) % 2 === 0) {
            EXTENSION_GRID.push({
                type: STRUCTURE_EXTENSION,
                offset: { x: dx, y: dy },
                level: 4
            });
        }
    }
}

export const LAB_STAMP: RelativeStructure[] = [
    { type: STRUCTURE_LAB, offset: { x: -1, y: 3 }, level: 6 },
    { type: STRUCTURE_LAB, offset: { x: 0, y: 3 }, level: 6 },
    { type: STRUCTURE_LAB, offset: { x: 1, y: 3 }, level: 6 },
    { type: STRUCTURE_LAB, offset: { x: -1, y: 4 }, level: 7 },
    { type: STRUCTURE_LAB, offset: { x: 0, y: 4 }, level: 7 },
    { type: STRUCTURE_LAB, offset: { x: 1, y: 4 }, level: 7 },
    { type: STRUCTURE_LAB, offset: { x: -1, y: 5 }, level: 8 },
    { type: STRUCTURE_LAB, offset: { x: 0, y: 5 }, level: 8 },
    { type: STRUCTURE_LAB, offset: { x: 1, y: 5 }, level: 8 },
    { type: STRUCTURE_LAB, offset: { x: 2, y: 4 }, level: 8 }
];

export const SUPPORT_STRUCTURES: RelativeStructure[] = [
    { type: STRUCTURE_FACTORY, offset: { x: -2, y: 3 }, level: 7 },
    { type: STRUCTURE_NUKER, offset: { x: 2, y: 3 }, level: 8 },
    { type: STRUCTURE_OBSERVER, offset: { x: 3, y: 1 }, level: 8 },
    { type: STRUCTURE_POWER_SPAWN, offset: { x: -3, y: 1 }, level: 8 }
];

export const CORE_ROADS: RelativeRoad[] = [
    { offset: { x: -2, y: -2 }, level: 2 },
    { offset: { x: -1, y: -2 }, level: 2 },
    { offset: { x: 0, y: -2 }, level: 2 },
    { offset: { x: 1, y: -2 }, level: 2 },
    { offset: { x: 2, y: -2 }, level: 2 },
    { offset: { x: -2, y: -1 }, level: 2 },
    { offset: { x: 2, y: -1 }, level: 2 },
    { offset: { x: -2, y: 0 }, level: 2 },
    { offset: { x: 2, y: 0 }, level: 2 },
    { offset: { x: -2, y: 1 }, level: 2 },
    { offset: { x: 2, y: 1 }, level: 2 },
    { offset: { x: -2, y: 2 }, level: 2 },
    { offset: { x: -1, y: 2 }, level: 2 },
    { offset: { x: 0, y: 2 }, level: 2 },
    { offset: { x: 1, y: 2 }, level: 2 },
    { offset: { x: 2, y: 2 }, level: 2 }
];
