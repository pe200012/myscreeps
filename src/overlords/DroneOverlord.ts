import { DRONE_PRESPAWN, MIN_DRONES_PER_SOURCE } from "../constants";
import { CreepSetup } from "../creeps/CreepSetup";
import { CreepRoles, CreepSetups } from "../creeps/setups";
import { SpawnPriorities } from "../priorities";
import { DroneBehavior } from "../roles/drone";
import { Overlord } from "./Overlord";

export class DroneOverlord extends Overlord {
    constructor(room: Room, spawnManager: import("../managers/SpawnManager").SpawnManager) {
        super(room, spawnManager, CreepRoles.drone, SpawnPriorities.drone);
    }

    init(): void {
        const room = this.room;
        if (!room || !room.controller) {
            return;
        }

        const sources = room.find(FIND_SOURCES);
        const emergency = this.activeCreeps(DRONE_PRESPAWN).length === 0 && room.energyAvailable < 300;

        for (const source of sources) {
            const setup = this.chooseSetup(room, source, emergency);
            const container = this.findMiningContainer(source);
            const link = this.findMiningLink(source);
            const availableSpots = this.countMiningSpots(source);
            const desiredDrones = Math.min(availableSpots, MIN_DRONES_PER_SOURCE);

            this.ensureTagged(setup, {
                tag: `${this.ref}:source:${source.id}`,
                match: creep => creep.memory.sourceId === source.id,
                quantity: desiredDrones,
                prespawn: DRONE_PRESPAWN,
                priority: emergency ? SpawnPriorities.emergency : SpawnPriorities.drone,
                memoryFactory: () => ({
                    sourceId: source.id,
                    containerId: container?.id,
                    linkId: link?.id
                })
            });
        }
    }

    run(handled: Set<string>): void {
        for (const creep of this.creeps) {
            DroneBehavior.run(creep);
            handled.add(creep.name);
        }
    }

    private chooseSetup(room: Room, source: Source, emergency: boolean): CreepSetup {
        if (emergency) {
            return CreepSetups.drone.emergency;
        }

        const hasContainer = this.findMiningContainer(source) !== undefined;
        const controllerLevel = room.controller?.level ?? 0;
        if (controllerLevel >= 6 && hasContainer) {
            return CreepSetups.drone.double;
        }
        return CreepSetups.drone.standard;
    }

    private findMiningContainer(source: Source): StructureContainer | undefined {
        return source.pos
            .findInRange(FIND_STRUCTURES, 2, {
                filter: structure => structure.structureType === STRUCTURE_CONTAINER
            })
            .shift() as StructureContainer | undefined;
    }

    private findMiningLink(source: Source): StructureLink | undefined {
        return source.pos
            .findInRange(FIND_STRUCTURES, 2, {
                filter: structure => structure.structureType === STRUCTURE_LINK
            })
            .shift() as StructureLink | undefined;
    }

    private countMiningSpots(source: Source): number {
        const terrain = source.room.getTerrain();
        let count = 0;

        // Check all 8 adjacent positions around the source
        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                if (dx === 0 && dy === 0) {
                    continue; // Skip the source itself
                }

                const x = source.pos.x + dx;
                const y = source.pos.y + dy;

                // Check if position is within room bounds
                if (x <= 0 || x >= 49 || y <= 0 || y >= 49) {
                    continue;
                }

                // Check if position is not a wall
                if (terrain.get(x, y) !== TERRAIN_MASK_WALL) {
                    count++;
                }
            }
        }

        return count;
    }
}
