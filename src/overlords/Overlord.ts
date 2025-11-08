import { CreepSetup } from "../creeps/CreepSetup";
import { SpawnManager } from "../managers/SpawnManager";

export interface WishlistOptions {
    priority?: number;
    prespawn?: number;
    memory?: Partial<CreepMemory>;
    memoryFactory?: () => Partial<CreepMemory>;
}

export interface TaggedRequestOptions extends WishlistOptions {
    tag: string;
    match: (creep: Creep) => boolean;
    quantity?: number;
}

export abstract class Overlord {
    protected readonly role: string;
    protected readonly spawnManager: SpawnManager;
    protected readonly defaultPriority: number;
    protected readonly ref: string;
    private roomName: string;

    protected constructor(room: Room, spawnManager: SpawnManager, role: string, defaultPriority: number) {
        this.roomName = room.name;
        this.role = role;
        this.spawnManager = spawnManager;
        this.defaultPriority = defaultPriority;
        this.ref = `${room.name}:${role}`;
    }

    refresh(room: Room): void {
        this.roomName = room.name;
    }

    abstract init(): void;

    abstract run(handled: Set<string>): void;

    protected get room(): Room {
        return Game.rooms[this.roomName];
    }

    protected get creeps(): Creep[] {
        return Object.values(Game.creeps).filter(creep => creep.memory.role === this.role && creep.memory.room === this.roomName);
    }

    protected activeCreeps(prespawn: number): Creep[] {
        return this.creeps.filter(creep => this.isHealthy(creep, prespawn));
    }

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

    private isHealthy(creep: Creep, prespawn: number): boolean {
        if (creep.ticksToLive === undefined) {
            return true;
        }
        return creep.ticksToLive > prespawn;
    }
}
