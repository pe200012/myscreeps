// Extend the CreepMemory interface to include custom properties
interface CreepMemory {
    role?: string;
    working?: boolean;
    room?: string;
    targetRoom?: string;
    sourceId?: string;
    overlord?: string;
    spawnTick?: number;
    hauling?: boolean;
    refilling?: boolean;
    task?: string;
    targetId?: Id<any>;
    containerId?: Id<StructureContainer>;
    linkId?: Id<StructureLink>;
}

interface PlannerStructureMemory {
    type: BuildableStructureConstant;
    x: number;
    y: number;
    level: number;
}

interface PlannerRoadMemory {
    x: number;
    y: number;
    level?: number;
}

interface PlannerMemory {
    version: number;
    anchor: { x: number; y: number };
    generated: number;
    structures: PlannerStructureMemory[];
    roads: PlannerRoadMemory[];
    upgradePositions: Array<{ x: number; y: number }>;
    labPositions: Array<{ x: number; y: number }>;
}

interface DefenseMemory {
    lastHostileSeen: number;
    threatLevel: number;
}

interface RoomMemory {
    planner?: PlannerMemory;
    defense?: DefenseMemory;
}
