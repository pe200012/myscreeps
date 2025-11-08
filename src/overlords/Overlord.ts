/**
 * Base overlord class for managing creep spawning and behavior coordination.
 *
 * Overlords are room-specific managers that:
 * - Request creep spawns from the SpawnManager
 * - Execute role-specific behavior for their creeps
 * - Track creep lifetimes and request replacements
 *
 * Each overlord is responsible for one role type within one room.
 * Subclasses implement init() to define spawn requests and run() for execution logic.
 */

import { CreepSetup } from "../creeps/CreepSetup";
import { SpawnManager } from "../managers/SpawnManager";

/**
 * Base options for spawn wishlist requests.
 */
export interface WishlistOptions {
    /** Spawn priority (lower = higher priority) */
    priority?: number;

    /** Ticks before death to spawn replacement */
    prespawn?: number;

    /** Base memory to assign to spawned creeps */
    memory?: Partial<CreepMemory>;

    /** Factory function to generate memory dynamically */
    memoryFactory?: () => Partial<CreepMemory>;
}

/**
 * Options for tagged spawn requests with matching criteria.
 * Tagged requests prevent duplicate spawns for the same purpose.
 */
export interface TaggedRequestOptions extends WishlistOptions {
    /** Unique identifier for this spawn request */
    tag: string;

    /** Predicate to identify existing creeps fulfilling this request */
    match: (creep: Creep) => boolean;

    /** Number of creeps to maintain */
    quantity?: number;
}

/**
 * Abstract base class for role-specific overlords.
 * Handles spawn request logic and creep lifecycle management.
 */
export abstract class Overlord {
    protected readonly role: string;
    protected readonly spawnManager: SpawnManager;
    protected readonly defaultPriority: number;
    protected readonly ref: string;
    private roomName: string;

    /**
     * Creates a new overlord instance.
     * @param room - The room this overlord manages
     * @param spawnManager - The spawn manager to submit requests to
     * @param role - The creep role this overlord manages
     * @param defaultPriority - Default spawn priority for this role
     */
    protected constructor(room: Room, spawnManager: SpawnManager, role: string, defaultPriority: number) {
        this.roomName = room.name;
        this.role = role;
        this.spawnManager = spawnManager;
        this.defaultPriority = defaultPriority;
        this.ref = `${room.name}:${role}`;
    }

    /**
     * Refreshes the overlord's room reference.
     * Called each tick before init() to update cached room data.
     */
    refresh(room: Room): void {
        this.roomName = room.name;
    }

    /**
     * Initialization phase: submit spawn requests based on current needs.
     * Called each tick after refresh() but before run().
     */
    abstract init(): void;

    /**
     * Execution phase: run behavior for all managed creeps.
     * @param handled - Set of creep names already handled this tick
     */
    abstract run(handled: Set<string>): void;

    /** Gets the current room object */
    protected get room(): Room {
        return Game.rooms[this.roomName];
    }

    /** Gets all living creeps managed by this overlord */
    protected get creeps(): Creep[] {
        return Object.values(Game.creeps).filter(creep => creep.memory.role === this.role && creep.memory.room === this.roomName);
    }

    /**
     * Gets creeps considered "healthy" (not near end of life).
     * @param prespawn - Ticks before death to consider unhealthy
     */
    protected activeCreeps(prespawn: number): Creep[] {
        return this.creeps.filter(creep => this.isHealthy(creep, prespawn));
    }

    /**
     * Requests spawns to maintain a target quantity of creeps.
     * Automatically accounts for existing healthy creeps and queued spawns.
     *
     * @param quantity - Desired number of creeps
     * @param setup - Creep body configuration
     * @param options - Spawn request options
     */
    protected wishlist(quantity: number, setup: CreepSetup, options: WishlistOptions = {}): void {
        const prespawn = options.prespawn ?? 30;
        const activeCount = this.activeCreeps(prespawn).length;
        const queued = this.spawnManager.countQueued(this.ref, setup.role);
        let remaining = quantity - (activeCount + queued);
        if (remaining <= 0) {
            return;
        }

        while (remaining > 0) {
            const baseMemory = options.memoryFactory ? options.memoryFactory() : options.memory ?? {};
            this.queueSpawn(setup, {
                priority: options.priority,
                memory: baseMemory
            });
            remaining -= 1;
        }
    }

    /**
     * Requests spawns with a unique tag to prevent duplicates.
     * Useful for single-purpose creeps (e.g., one scout per remote room).
     *
     * @param setup - Creep body configuration
     * @param options - Tagged request options including match predicate
     */
    protected ensureTagged(setup: CreepSetup, options: TaggedRequestOptions): void {
        const { tag, match } = options;
        const quantity = options.quantity ?? 1;
        const prespawn = options.prespawn ?? 30;
        const active = this.creeps.filter(creep => match(creep) && this.isHealthy(creep, prespawn)).length;
        const queued = this.spawnManager.countQueued(this.ref, setup.role, tag);
        let remaining = quantity - (active + queued);
        if (remaining <= 0) {
            return;
        }

        while (remaining > 0) {
            const baseMemory = options.memoryFactory ? options.memoryFactory() : options.memory ?? {};
            this.queueSpawn(setup, {
                priority: options.priority,
                memory: baseMemory,
                tag
            });
            remaining -= 1;
        }
    }

    /**
     * Internal: queues a spawn request with the spawn manager.
     */
    private queueSpawn(setup: CreepSetup, options: { priority?: number; memory?: Partial<CreepMemory>; tag?: string }): void {
        const priority = options.priority ?? this.defaultPriority;
        const memory = { ...(options.memory ?? {}), room: options.memory?.room ?? this.roomName };
        this.spawnManager.enqueue({
            overlord: this.ref,
            role: setup.role,
            setup,
            priority,
            memory: memory as CreepMemory,
            tag: options.tag
        });
    }

    /**
     * Internal: checks if a creep is healthy (not near end of life).
     */
    private isHealthy(creep: Creep, prespawn: number): boolean {
        if (creep.ticksToLive === undefined) {
            return true;
        }
        return creep.ticksToLive > prespawn;
    }
}
