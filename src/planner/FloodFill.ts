const ROOM_SIZE = 50;

interface QueueItem {
    x: number;
    y: number;
}

export type FloodMatrix = number[][];

export function runFloodFill(room: Room, starts: RoomPosition[]): FloodMatrix {
    const terrain = room.getTerrain();
    const matrix: FloodMatrix = Array.from({ length: ROOM_SIZE }, () => Array(ROOM_SIZE).fill(-1));
    const queue: QueueItem[] = [];

    for (const pos of starts) {
        if (matrix[pos.y][pos.x] === 0) {
            continue;
        }

        matrix[pos.y][pos.x] = 0;
        queue.push({ x: pos.x, y: pos.y });
    }

    while (queue.length > 0) {
        const current = queue.shift();
        if (!current) {
            break;
        }

        const base = matrix[current.y][current.x];
        const range = base + 1;
        const candidates: QueueItem[] = [
            { x: current.x + 1, y: current.y },
            { x: current.x - 1, y: current.y },
            { x: current.x, y: current.y + 1 },
            { x: current.x, y: current.y - 1 }
        ];

        for (const next of candidates) {
            if (next.x < 0 || next.x >= ROOM_SIZE || next.y < 0 || next.y >= ROOM_SIZE) {
                continue;
            }

            if (terrain.get(next.x, next.y) === TERRAIN_MASK_WALL) {
                continue;
            }

            if (matrix[next.y][next.x] !== -1 && matrix[next.y][next.x] <= range) {
                continue;
            }

            matrix[next.y][next.x] = range;
            queue.push(next);
        }
    }

    return matrix;
}
