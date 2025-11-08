import { MANAGER_STORAGE_THRESHOLD, TERMINAL_ENERGY_BUFFER, TERMINAL_ENERGY_TARGET } from "../constants";
import { CreepRoles } from "../creeps/setups";
import { storageLink, terminalHasExcess, terminalNeedsEnergy } from "../utils/logistics";

export const MANAGER_ROLE = CreepRoles.manager;

export const ManagerBehavior = {
    run(creep: Creep): void {
        if (!creep.room.storage) {
            return;
        }

        if (creep.memory.hauling === undefined) {
            creep.memory.hauling = false;
        }

        if (!creep.memory.hauling && creep.store.getFreeCapacity() === 0) {
            creep.memory.hauling = true;
        }
        if (creep.memory.hauling && creep.store.getUsedCapacity() === 0) {
            creep.memory.hauling = false;
        }

        if (creep.memory.hauling) {
            this.deliver(creep);
        } else {
            this.collect(creep);
        }
    },

    collect(creep: Creep): void {
        const storage = creep.room.storage;
        const commandLink = storageLink(creep.room);
        const terminal = creep.room.terminal;

        if (commandLink && commandLink.store.getUsedCapacity(RESOURCE_ENERGY) >= 200) {
            if (creep.withdraw(commandLink, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                creep.moveTo(commandLink, { reusePath: 3, range: 1, visualizePathStyle: { stroke: "#ffaa00" } });
            }
            return;
        }

        if (terminal && terminalHasExcess(creep.room, TERMINAL_ENERGY_TARGET, TERMINAL_ENERGY_BUFFER)) {
            if (creep.withdraw(terminal, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                creep.moveTo(terminal, { reusePath: 3, range: 1, visualizePathStyle: { stroke: "#ffaa00" } });
            }
            return;
        }

        if (storage && storage.store[RESOURCE_ENERGY] > 0) {
            if (creep.withdraw(storage, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                creep.moveTo(storage, { reusePath: 3, range: 1, visualizePathStyle: { stroke: "#ffaa00" } });
            }
        }
    },

    deliver(creep: Creep): void {
        const storage = creep.room.storage;
        const terminal = creep.room.terminal;
        const towers = creep.room.find(FIND_MY_STRUCTURES, {
            filter: structure => structure.structureType === STRUCTURE_TOWER && structure.store.getFreeCapacity(RESOURCE_ENERGY) > 100
        }) as StructureTower[];
        const links = creep.room.find(FIND_MY_STRUCTURES, {
            filter: structure => structure.structureType === STRUCTURE_LINK && structure.energy < structure.energyCapacity
        }) as StructureLink[];
        const storageLinkTarget = storageLink(creep.room);

        if (towers.length > 0) {
            const tower = towers[0];
            if (creep.transfer(tower, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                creep.moveTo(tower, { reusePath: 3, range: 1, visualizePathStyle: { stroke: "#ffffff" } });
            }
            return;
        }

        if (storageLinkTarget && storageLinkTarget.store.getFreeCapacity(RESOURCE_ENERGY) > 0) {
            if (creep.transfer(storageLinkTarget, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                creep.moveTo(storageLinkTarget, { reusePath: 3, range: 1, visualizePathStyle: { stroke: "#ffffff" } });
            }
            return;
        }

        if (links.length > 0) {
            const link = links[0];
            if (creep.transfer(link, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                creep.moveTo(link, { reusePath: 3, range: 1, visualizePathStyle: { stroke: "#ffffff" } });
            }
            return;
        }

        if (terminal && terminalNeedsEnergy(creep.room, TERMINAL_ENERGY_TARGET) && storage && storage.store.getUsedCapacity(RESOURCE_ENERGY) > MANAGER_STORAGE_THRESHOLD) {
            if (creep.transfer(terminal, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                creep.moveTo(terminal, { reusePath: 3, range: 1, visualizePathStyle: { stroke: "#ffffff" } });
            }
            return;
        }

        if (storage) {
            if (creep.transfer(storage, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                creep.moveTo(storage, { reusePath: 3, range: 1, visualizePathStyle: { stroke: "#ffffff" } });
            }
        }
    }
};
