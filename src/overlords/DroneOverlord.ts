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

            this.ensureTagged(setup, {
                tag: `${this.ref}:source:${source.id}`,
                match: creep => creep.memory.sourceId === source.id,
                quantity: MIN_DRONES_PER_SOURCE,
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
}
