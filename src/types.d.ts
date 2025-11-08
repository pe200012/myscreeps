/**
 * Global type definitions and memory extensions.
 * Extends Screeps' built-in interfaces with custom properties.
 */

/**
 * Extended CreepMemory with custom properties for role-specific data.
 */
interface CreepMemory {
    /** Creep role identifier (queen, drone, worker, etc.) */
    role?: string;

    /** Whether creep is in "working" phase (vs gathering) */
    working?: boolean;

    /** Home room where creep was spawned */
    room?: string;

    /** Target room for scouts or remote operations */
    targetRoom?: string;

    /** Assigned source ID for drones */
    sourceId?: string;

    /** Overlord reference that spawned this creep */
    overlord?: string;

    /** Game tick when creep was spawned */
    spawnTick?: number;

    /** Whether transport is in hauling mode (vs collecting) */
    hauling?: boolean;

    /** Whether queen is in refilling mode (vs depositing) */
    refilling?: boolean;

    /** Generic task identifier for complex behaviors */
    task?: string;

    /** Generic target structure/creep ID */
    targetId?: Id<any>;

    /** Cached container ID (for drones) */
    containerId?: Id<StructureContainer>;

    /** Cached link ID (for drones) */
    linkId?: Id<StructureLink>;
}

/**
 * Planner structure placement data.
 */
interface PlannerStructureMemory {
    type: BuildableStructureConstant;
    x: number;
    y: number;
    level: number;
}

/**
 * Planner road placement data.
 */
interface PlannerRoadMemory {
    x: number;
    y: number;
    level?: number;
}

/**
 * Complete planner memory for a room's base layout.
 */
interface PlannerMemory {
    /** Planner version for migration */
    version: number;

    /** Central anchor point for base layout */
    anchor: { x: number; y: number };

    /** Game tick when plan was generated */
    generated: number;

    /** All structure placements */
    structures: PlannerStructureMemory[];

    /** All road placements */
    roads: PlannerRoadMemory[];

    /** Positions around controller for upgraders */
    upgradePositions: Array<{ x: number; y: number }>;

    /** Lab positions for chemical production */
    labPositions: Array<{ x: number; y: number }>;
}

/**
 * Defense tracking memory.
 */
interface DefenseMemory {
    /** Game tick when hostile was last seen */
    lastHostileSeen: number;

    /** Current threat level (number of hostiles) */
    threatLevel: number;
}

/**
 * Remote outpost configuration.
 */
interface RemoteOutpostMemory {
    /** Name of the remote room */
    room: string;

    /** How often to scout (in ticks) */
    scoutInterval?: number;

    /** Last game tick when room had vision */
    lastVision?: number;

    /** Whether this remote is disabled */
    disabled?: boolean;
}

/**
 * Extended RoomMemory with custom properties.
 */
interface RoomMemory {
    /** Base layout planner data */
    planner?: PlannerMemory;

    /** Defense threat tracking */
    defense?: DefenseMemory;

    /** Remote room configurations */
    remotes?: RemoteOutpostMemory[];
}
