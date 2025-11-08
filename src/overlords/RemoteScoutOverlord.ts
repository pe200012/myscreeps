import { CreepRoles, CreepSetups } from "../creeps/setups";
import { SpawnPriorities } from "../priorities";
import { ScoutBehavior } from "../roles/scout";
import { Overlord } from "./Overlord";

type RemoteOutpostMemory = NonNullable<RoomMemory["remotes"]>[number];

export class RemoteScoutOverlord extends Overlord {
    constructor(room: Room, spawnManager: import("../managers/SpawnManager").SpawnManager) {
        super(room, spawnManager, CreepRoles.scout, SpawnPriorities.scout);
    }

    init(): void {
        const room = this.room;
        if (!room) {
            return;
        }

        const remotes = this.getRemotes(room);
        for (const remote of remotes) {
            if (remote.disabled) {
                continue;
            }
            const interval = remote.scoutInterval ?? 1500;
            const needsScout = this.needsScout(remote, interval);
            if (!needsScout) {
                continue;
            }

            this.ensureTagged(CreepSetups.scout.observe, {
                tag: `${this.ref}:scout:${remote.room}`,
                match: creep => creep.memory.targetRoom === remote.room,
                quantity: 1,
                priority: SpawnPriorities.scout,
                prespawn: 15,
                memoryFactory: () => ({ targetRoom: remote.room })
            });
        }
    }

    run(handled: Set<string>): void {
        const room = this.room;
        if (!room) {
            return;
        }
        const remotes = this.getRemotes(room);
        for (const creep of this.creeps) {
            ScoutBehavior.run(creep);
            handled.add(creep.name);

            const targetRoom = creep.memory.targetRoom ?? creep.room.name;
            const remoteMemory = remotes.find(remote => remote.room === targetRoom);
            if (remoteMemory && Game.rooms[targetRoom]) {
                remoteMemory.lastVision = Game.time;
            }
        }
        room.memory.remotes = remotes;
    }

    private needsScout(remote: RemoteOutpostMemory, interval: number): boolean {
        const active = this.creeps.some(
            creep => creep.memory.targetRoom === remote.room && (creep.ticksToLive ?? 0) > 50
        );
        if (active) {
            return false;
        }
        if (!remote.lastVision) {
            return true;
        }
        return Game.time - remote.lastVision > interval;
    }

    private getRemotes(room: Room): RemoteOutpostMemory[] {
        if (!room.memory.remotes) {
            room.memory.remotes = [];
        }
        return room.memory.remotes;
    }
}
