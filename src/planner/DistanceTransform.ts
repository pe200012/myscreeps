export type DistanceMatrix = number[][];

const ROOM_SIZE = 50;

export function buildDistanceTransform(room: Room): DistanceMatrix {
    const terrain = room.getTerrain();
    const matrix: DistanceMatrix = Array.from({ length: ROOM_SIZE }, () => Array(ROOM_SIZE).fill(Infinity));

    for (let y = 0; y < ROOM_SIZE; y += 1) {
        for (let x = 0; x < ROOM_SIZE; x += 1) {
            if (terrain.get(x, y) === TERRAIN_MASK_WALL || x === 0 || y === 0 || x === ROOM_SIZE - 1 || y === ROOM_SIZE - 1) {
                matrix[y][x] = 0;
            }
        }
    }

    for (let y = 0; y < ROOM_SIZE; y += 1) {
        for (let x = 0; x < ROOM_SIZE; x += 1) {
            if (matrix[y][x] === 0) {
                continue;
            }

            const top = y > 0 ? matrix[y - 1][x] : Infinity;
            const left = x > 0 ? matrix[y][x - 1] : Infinity;
            const topLeft = y > 0 && x > 0 ? matrix[y - 1][x - 1] : Infinity;
            const topRight = y > 0 && x < ROOM_SIZE - 1 ? matrix[y - 1][x + 1] : Infinity;
            const min = Math.min(top, left, topLeft, topRight);
            matrix[y][x] = Math.min(matrix[y][x], min + 1);
        }
    }

    for (let y = ROOM_SIZE - 1; y >= 0; y -= 1) {
        for (let x = ROOM_SIZE - 1; x >= 0; x -= 1) {
            if (matrix[y][x] === 0) {
                continue;
            }

            const bottom = y < ROOM_SIZE - 1 ? matrix[y + 1][x] : Infinity;
            const right = x < ROOM_SIZE - 1 ? matrix[y][x + 1] : Infinity;
            const bottomLeft = y < ROOM_SIZE - 1 && x > 0 ? matrix[y + 1][x - 1] : Infinity;
            const bottomRight = y < ROOM_SIZE - 1 && x < ROOM_SIZE - 1 ? matrix[y + 1][x + 1] : Infinity;
            const min = Math.min(bottom, right, bottomLeft, bottomRight);
            matrix[y][x] = Math.min(matrix[y][x], min + 1);
        }
    }

    return matrix;
}
