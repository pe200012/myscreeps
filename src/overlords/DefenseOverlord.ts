/**
 * Defense Overlord: Manages defender spawning based on threat levels.
 *
 * Spawning logic:
 * - Spawns 0-3 defenders based on current hostile count
 * - Uses emergency setup for light threats, default for heavy threats
 * - Elevates to emergency priority when active hostiles present
 * - Maintains 1 defender for RECENT_THREAT_TICKS after last hostile seen
 * - Tracks threats via room.memory.defense
 */

import { ALLY_USERNAMES, DEFENSE_PRESPAWN, RECENT_THREAT_TICKS } from "../constants";
import { CreepRoles, CreepSetups } from "../creeps/setups";
import { SpawnPriorities } from "../priorities";
import { GuardBehavior } from "../roles/guard";
import { Overlord } from "./Overlord";

export class DefenseOverlord extends Overlord {
    constructor(room: Room, spawnManager: import("../managers/SpawnManager").SpawnManager) {
        super(room, spawnManager, CreepRoles.defender, SpawnPriorities.defender);
    }

    init(): void {
        const room = this.room;
        if (!room) {
            return;
        }

        const hostiles = this.getHostiles(room);
        const threatLevel = hostiles.length;
        const defenseMemory = room.memory.defense;
        const recentlyThreatened = defenseMemory ? Game.time - defenseMemory.lastHostileSeen < RECENT_THREAT_TICKS : false;
        const desiredQuantity = threatLevel > 0 ? Math.min(3, Math.ceil(threatLevel / 2) + 1) : recentlyThreatened ? 1 : 0;

        if (desiredQuantity <= 0) {
            return;
        }

        const setup = threatLevel >= 2 ? CreepSetups.defender.default : CreepSetups.defender.emergency;
        const priority = threatLevel > 0 ? SpawnPriorities.emergency : SpawnPriorities.defender;

        this.wishlist(desiredQuantity, setup, {
            prespawn: DEFENSE_PRESPAWN,
            priority
        });
    }

    run(handled: Set<string>): void {
        const hostiles = this.room ? this.getHostiles(this.room) : [];
        for (const creep of this.creeps) {
            GuardBehavior.run(creep, hostiles);
            handled.add(creep.name);
        }
    }

    private getHostiles(room: Room): Creep[] {
        return room.find(FIND_HOSTILE_CREEPS, {
            filter: hostile => !ALLY_USERNAMES.includes(hostile.owner.username)
        });
    }
}
