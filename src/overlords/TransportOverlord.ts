import { TERMINAL_ENERGY_TARGET, TRANSPORT_PRESPAWN } from "../constants";
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
        let demand = Math.max(containers.length, Math.ceil(droppedEnergy.length / 2));

        const hasEnergyInfrastructure = room.storage != null || this.hasEnergyContainers(room);
        if (!hasEnergyInfrastructure && demand === 0) {
            return;
        }

        if (demand === 0 && hasEnergyInfrastructure) {
            // Ensure at least one logistics creep keeps energy flowing from containers/batteries
            demand = 1;
        }

        const setup = room.controller && room.controller.level >= 4 ? CreepSetups.transport.default : CreepSetups.transport.early;
        const quantity = Math.max(1, demand);

        this.wishlist(quantity, setup, {
            prespawn: TRANSPORT_PRESPAWN,
            priority: SpawnPriorities.transport
        });
    }

    run(handled: Set<string>): void {
        const room = this.room;
        const preferStorage = !room?.terminal || room.terminal.store.getUsedCapacity(RESOURCE_ENERGY) >= TERMINAL_ENERGY_TARGET;
        for (const creep of this.creeps) {
            TransportBehavior.run(creep, { preferStorage });
            handled.add(creep.name);
        }
    }

    private findEnergyContainers(room: Room): StructureContainer[] {
        return room.find(FIND_STRUCTURES, {
            filter: (structure): structure is StructureContainer =>
                structure.structureType === STRUCTURE_CONTAINER && structure.store.getUsedCapacity(RESOURCE_ENERGY) > 0
        });
    }

    private hasEnergyContainers(room: Room): boolean {
        return room.find(FIND_STRUCTURES, {
            filter: (structure): structure is StructureContainer => {
                if (structure.structureType !== STRUCTURE_CONTAINER) {
                    return false;
                }
                const nearSource = structure.pos.findInRange(FIND_SOURCES, 1).length > 0;
                const nearSpawn = structure.pos.findInRange(FIND_MY_SPAWNS, 2).length > 0;
                return nearSource || nearSpawn;
            }
        }).length > 0;
    }
}
