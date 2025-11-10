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

    /** Identifier for associated colonization task */
    colonizationId?: string;

    /** Parent room coordinating colonization */
    colonizationParent?: string;

    /** Anchor position for placing the initial spawn */
    colonizationAnchor?: SerializedRoomPosition;

    /** Ordered list of waypoints to traverse en route to target */
    colonizationWaypoints?: SerializedRoomPosition[];

    /** Current waypoint index */
    colonizationWaypointIndex?: number;

    /** Game tick when the creep will next attempt to place a spawn site */
    colonizationNextSiteCheck?: number;

    /** Whether the colonization claimer has already signed the controller */
    colonizationSigned?: boolean;

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

    /** Current construction site being built (for worker cooperation) */
    buildTarget?: Id<ConstructionSite>;

    /** Persistent repair target to reduce retarget churn */
    repairTarget?: Id<Structure>;
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

/** Serialized room position for memory storage */
interface SerializedRoomPosition {
    x: number;
    y: number;
    roomName: string;
}

type ColonizationTaskState = "pending" | "claiming" | "building" | "blocked" | "completed";

interface ColonizationTaskMemory {
    /** Unique identifier for the colonization effort */
    id: string;

    /** Target room to claim */
    targetRoom: string;

    /** Coordinating parent room for spawning creeps */
    parentRoom?: string;

    /** Current lifecycle state */
    state: ColonizationTaskState;

    /** Name of the originating flag, if any */
    flagName?: string;

    /** Desired spawn anchor location */
    anchor: SerializedRoomPosition;

    /** Optional traversal waypoints */
    waypoints?: SerializedRoomPosition[];

    /** Desired pioneer quantity */
    pioneerQuota: number;

    /** Game tick when task was created */
    created: number;

    /** Game tick when task was completed */
    completedAt?: number;

    /** Additional context when blocked */
    blockedReason?: string;
}

interface ColonizationMemory {
    tasks: ColonizationTaskMemory[];
}

interface Memory {
    colonization?: ColonizationMemory;
}

interface MoveToOpts {
    fallbackOpts?: import("screeps-cartographer").MoveOpts;
    priority?: number;
    keepTargetInRoom?: boolean;
    avoidCreeps?: boolean;
    avoidObstacleStructures?: boolean;
    avoidSourceKeepers?: boolean;
    repathIfStuck?: number;
    ignorePortals?: boolean;
    avoidPortals?: boolean;
    avoidTargets?: (roomName: string) => import("screeps-cartographer").MoveTarget[];
    avoidTargetGradient?: number;
    maxOpsPerRoom?: number;
}
