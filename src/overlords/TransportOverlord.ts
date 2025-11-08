import { TRANSPORT_PRESPAWN } from "../constants";
import { CreepRoles, CreepSetups } from "../creeps/setups";
import { SpawnPriorities } from "../priorities";
import { TransportBehavior } from "../roles/transport";
import { Overlord } from "./Overlord";

export class TransportOverlord extends Overlord {
    constructor(room: Room, spawnManager: import("../managers/SpawnManager").SpawnManager) {
        super(room, spawnManager, CreepRoles.transport, SpawnPriorities.transport);
    }

    init(): void {
        const room = this.room;
        if (!room) {
            return;
        }

        const containers = this.findEnergyContainers(room);
        const droppedEnergy = room.find(FIND_DROPPED_RESOURCES, {
            filter: resource => resource.resourceType === RESOURCE_ENERGY && resource.amount > 100
        });
        const demand = Math.max(containers.length, Math.ceil(droppedEnergy.length / 2));
        if (demand === 0 && !room.storage) {
            return;
        }

        const setup = room.controller && room.controller.level >= 4 ? CreepSetups.transport.default : CreepSetups.transport.early;
        const quantity = Math.max(1, demand);

        this.wishlist(quantity, setup, {
            prespawn: TRANSPORT_PRESPAWN,
            priority: SpawnPriorities.transport
        });
    }

    run(handled: Set<string>): void {
        for (const creep of this.creeps) {
            TransportBehavior.run(creep);
            handled.add(creep.name);
        }
    }

    private findEnergyContainers(room: Room): StructureContainer[] {
        return room.find(FIND_STRUCTURES, {
            filter: (structure): structure is StructureContainer =>
                structure.structureType === STRUCTURE_CONTAINER && structure.store.getUsedCapacity(RESOURCE_ENERGY) > 0
        });
    }
}
