import { SpawnManager } from "../managers/SpawnManager";
import { Overlord } from "../overlords/Overlord";
import { QueenOverlord } from "../overlords/QueenOverlord";
import { DroneOverlord } from "../overlords/DroneOverlord";
import { TransportOverlord } from "../overlords/TransportOverlord";
import { WorkerOverlord } from "../overlords/WorkerOverlord";
import { ManagerOverlord } from "../overlords/ManagerOverlord";
import { UpgraderOverlord } from "../overlords/UpgraderOverlord";

export class Colony {
    private readonly spawnManager: SpawnManager;
    private readonly overlords: Overlord[];

    constructor(room: Room) {
        this.spawnManager = new SpawnManager(room);
        this.overlords = this.createOverlords(room, this.spawnManager);
    }

    refresh(room: Room): void {
        this.spawnManager.refresh(room);
        for (const overlord of this.overlords) {
            overlord.refresh(room);
        }
    }

    init(): void {
        for (const overlord of this.overlords) {
            overlord.init();
        }
    }

    spawn(): void {
        this.spawnManager.run();
    }

    run(handled: Set<string>): void {
        for (const overlord of this.overlords) {
            overlord.run(handled);
        }
    }

    private createOverlords(room: Room, spawnManager: SpawnManager): Overlord[] {
        return [
            new QueenOverlord(room, spawnManager),
            new DroneOverlord(room, spawnManager),
            new TransportOverlord(room, spawnManager),
            new WorkerOverlord(room, spawnManager),
            new ManagerOverlord(room, spawnManager),
            new UpgraderOverlord(room, spawnManager)
        ];
    }
}
