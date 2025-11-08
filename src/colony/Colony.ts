/**
 * Colony: Represents a single owned room and its overlords.
 *
 * A colony coordinates all economic and defensive operations in one room through:
 * - A centralized spawn manager for the room
 * - Multiple overlords, each managing one role type
 *
 * Execution order each tick:
 * 1. refresh() - Update room references
 * 2. init() - Submit spawn requests from all overlords
 * 3. spawn() - Process spawn queue
 * 4. run() - Execute creep behaviors
 */

import { SpawnManager } from "../managers/SpawnManager";
import { Overlord } from "../overlords/Overlord";
import { QueenOverlord } from "../overlords/QueenOverlord";
import { DroneOverlord } from "../overlords/DroneOverlord";
import { TransportOverlord } from "../overlords/TransportOverlord";
import { WorkerOverlord } from "../overlords/WorkerOverlord";
import { ManagerOverlord } from "../overlords/ManagerOverlord";
import { UpgraderOverlord } from "../overlords/UpgraderOverlord";
import { DefenseOverlord } from "../overlords/DefenseOverlord";
import { RemoteScoutOverlord } from "../overlords/RemoteScoutOverlord";

export class Colony {
    private readonly spawnManager: SpawnManager;
    private readonly overlords: Overlord[];

    /**
     * Creates a new colony for the given room.
     * Instantiates spawn manager and all overlords.
     */
    constructor(room: Room) {
        this.spawnManager = new SpawnManager(room);
        this.overlords = this.createOverlords(room, this.spawnManager);
    }

    /**
     * Refreshes room references for spawn manager and all overlords.
     * Called each tick before other operations.
     */
    refresh(room: Room): void {
        this.spawnManager.refresh(room);
        for (const overlord of this.overlords) {
            overlord.refresh(room);
        }
    }

    /**
     * Initialization phase: all overlords submit spawn requests.
     */
    init(): void {
        for (const overlord of this.overlords) {
            overlord.init();
        }
    }

    /**
     * Spawn phase: processes the spawn queue.
     */
    spawn(): void {
        this.spawnManager.run();
    }

    /**
     * Run phase: executes behaviors for all managed creeps.
     * @param handled - Set of creep names handled, updated by overlords
     */
    run(handled: Set<string>): void {
        for (const overlord of this.overlords) {
            overlord.run(handled);
        }
    }

    /**
     * Creates all overlords for this colony.
     * Each overlord manages one role type.
     * Order determines spawn priority when priorities are equal.
     */
    private createOverlords(room: Room, spawnManager: SpawnManager): Overlord[] {
        return [
            new QueenOverlord(room, spawnManager),
            new DroneOverlord(room, spawnManager),
            new TransportOverlord(room, spawnManager),
            new WorkerOverlord(room, spawnManager),
            new ManagerOverlord(room, spawnManager),
            new UpgraderOverlord(room, spawnManager),
            new DefenseOverlord(room, spawnManager),
            new RemoteScoutOverlord(room, spawnManager)
        ];
    }
}
