/**
 * Centralized spawn queue manager for a room.
 *
 * Responsibilities:
 * - Maintains priority-ordered spawn queue
 * - Prevents duplicate spawn requests via tags
 * - Generates creep names and assigns memory
 * - Handles spawn execution across multiple spawns
 *
 * Overlords submit spawn requests which are queued by priority.
 * Lower priority numbers are processed first.
 */

import { CreepSetup, bodyCost } from "../creeps/CreepSetup";

/**
 * A single spawn request in the queue.
 */
interface SpawnOrder {
    overlord: string;
    role: string;
    setup: CreepSetup;
    priority: number;
    memory: CreepMemory;
    tag?: string;
    enqueued: number;
}

/**
 * Internal type for peeking at the queue.
 */
interface PeekOrder {
    priority: number;
    order: SpawnOrder;
}

/**
 * Manages spawn queue and execution for a single room.
 */
export class SpawnManager {
    private readonly queue = new Map<number, SpawnOrder[]>();
    private roomName: string;

    /**
     * Creates a new spawn manager for a room.
     * @param room - The room to manage spawns for
     */
    constructor(room: Room) {
        this.roomName = room.name;
    }

    /**
     * Refreshes the manager's room reference.
     * Called each tick to update cached room name.
     */
    refresh(room: Room): void {
        this.roomName = room.name;
    }

    /**
     * Adds a spawn request to the queue.
     * Ignores duplicate tagged requests to prevent over-spawning.
     *
     * @param request - The spawn request to enqueue
     */
    enqueue(request: Omit<SpawnOrder, "enqueued">): void {
        if (request.tag && this.hasTag(request.tag)) {
            return;
        }

        const memory: CreepMemory = {
            role: request.role,
            room: request.memory.room ?? this.roomName,
            targetRoom: request.memory.targetRoom ?? this.roomName,
            ...request.memory
        };

        const order: SpawnOrder = {
            overlord: request.overlord,
            role: request.role,
            setup: request.setup,
            priority: request.priority,
            memory,
            tag: request.tag,
            enqueued: Game.time
        };

        const bucket = this.queue.get(order.priority);
        if (bucket) {
            bucket.push(order);
        } else {
            this.queue.set(order.priority, [order]);
        }
    }

    /**
     * Counts queued spawn requests matching criteria.
     * Used by overlords to avoid over-requesting spawns.
     *
     * @param overlord - The overlord reference to match
     * @param role - The role to match
     * @param tag - Optional tag to match
     * @returns Number of matching queued requests
     */
    countQueued(overlord: string, role: string, tag?: string): number {
        let total = 0;
        for (const orders of this.queue.values()) {
            for (const order of orders) {
                if (order.overlord !== overlord || order.role !== role) {
                    continue;
                }
                if (tag && order.tag !== tag) {
                    continue;
                }
                total += 1;
            }
        }
        return total;
    }

    /**
     * Executes spawn queue processing for all available spawns.
     * Processes highest priority requests first, waiting for energy if needed.
     * Stops processing if insufficient energy for current priority level.
     */
    run(): void {
        const room = Game.rooms[this.roomName];
        if (!room) {
            return;
        }

        const spawns = room.find(FIND_MY_SPAWNS).filter(spawn => !spawn.spawning);
        if (spawns.length === 0) {
            return;
        }

        for (const spawn of spawns) {
            while (!spawn.spawning) {
                const peeked = this.peek();
                if (!peeked) {
                    return;
                }

                const { priority, order } = peeked;
                const body = order.setup.generateBody(room.energyCapacityAvailable);
                if (body.length === 0) {
                    this.consume(priority);
                    continue;
                }

                const cost = bodyCost(body);
                if (room.energyAvailable < cost) {
                    // Wait until we have the energy to honor this request before checking lower priorities
                    return;
                }

                const name = this.generateName(order.role);
                const memory: CreepMemory = {
                    ...order.memory,
                    role: order.role,
                    room: order.memory.room ?? this.roomName,
                    overlord: order.overlord,
                    spawnTick: Game.time
                };

                const result = spawn.spawnCreep(body, name, { memory });
                if (result === OK) {
                    this.consume(priority);
                    if (!spawn.spawning) {
                        // Safety guard in case spawn instantly free (unlikely)
                        break;
                    }
                } else if (result === ERR_BUSY) {
                    return;
                } else if (result === ERR_NOT_ENOUGH_ENERGY) {
                    return;
                } else {
                    console.log(`[SpawnManager] Failed to spawn ${order.role} in ${this.roomName}: ${result}`);
                    this.consume(priority);
                }
            }
        }
    }

    /**
     * Internal: peeks at the highest priority order without removing it.
     */
    private peek(): PeekOrder | undefined {
        const priorities = Array.from(this.queue.keys()).sort((a, b) => a - b);
        for (const priority of priorities) {
            const orders = this.queue.get(priority);
            if (!orders || orders.length === 0) {
                this.queue.delete(priority);
                continue;
            }

            const order = orders[0];
            return { priority, order };
        }
        return undefined;
    }

    /**
     * Internal: removes the first order from a priority bucket.
     */
    private consume(priority: number): void {
        const orders = this.queue.get(priority);
        if (!orders || orders.length === 0) {
            this.queue.delete(priority);
            return;
        }
        orders.shift();
        if (orders.length === 0) {
            this.queue.delete(priority);
        }
    }

    /**
     * Internal: checks if a tag already exists in the queue.
     */
    private hasTag(tag: string): boolean {
        for (const orders of this.queue.values()) {
            if (orders.some(order => order.tag === tag)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Internal: generates a unique creep name.
     * Format: {role}-{room}-{time_base36}[-{suffix}]
     */
    private generateName(role: string): string {
        const base = `${role}-${this.roomName}-${Game.time.toString(36)}`;
        if (!Game.creeps[base]) {
            return base;
        }
        let suffix = 0;
        while (Game.creeps[`${base}-${suffix}`]) {
            suffix += 1;
        }
        return `${base}-${suffix}`;
    }
}
