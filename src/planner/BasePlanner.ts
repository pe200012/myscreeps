import { buildDistanceTransform, DistanceMatrix } from "./DistanceTransform";
import { runFloodFill } from "./FloodFill";
import {
    ANCHOR_BUFFER,
    CORE_ROADS,
    CORE_STAMP,
    EXTENSION_GRID,
    FAST_FILL_EXTENSIONS,
    LAB_STAMP,
    RelativeOffset,
    RelativeRoad,
    RelativeStructure,
    SUPPORT_STRUCTURES
} from "./layouts";

const PLANNER_VERSION = 2;
const ROOM_SIZE = 50;
const MAX_STRUCTURE_SITES_PER_TICK = 3;
const MAX_ROAD_SITES_PER_TICK = 5;
const GLOBAL_CONSTRUCTION_SITE_BUFFER = 95;
const CLEANUP_RADIUS = 12;
const MAX_REMOVALS_PER_TICK = 2;
const REMOVABLE_STRUCTURES: ReadonlySet<StructureConstant> = new Set([
    STRUCTURE_EXTENSION,
    STRUCTURE_ROAD,
    STRUCTURE_CONTAINER,
    STRUCTURE_LINK,
    STRUCTURE_LAB,
    STRUCTURE_OBSERVER,
    STRUCTURE_FACTORY,
    STRUCTURE_POWER_SPAWN
]);

const REFERENCE_ANCHOR_STRUCTURES: ReadonlyArray<RelativeStructure> = [
    ...CORE_STAMP,
    ...FAST_FILL_EXTENSIONS,
    ...SUPPORT_STRUCTURES
];

export class BasePlanner {
    public static run(room: Room): void {
        if (!room.controller?.my) {
            if (room.memory.planner) {
                delete room.memory.planner;
            }
            return;
        }

        let plan = room.memory.planner;
        if (!plan || plan.version !== PLANNER_VERSION) {
            const generated = this.computePlan(room);
            if (generated) {
                room.memory.planner = generated;
                plan = generated;
                this.visualize(room, generated);
            } else {
                return;
            }
        }

        if (!plan) {
            return;
        }

        this.ensureRoadLevels(plan);
        this.maintain(room, plan);

        if (Game.time % 10 === 0) {
            this.visualize(room, plan);
        }
        // this.visualize(room, plan);
    }

    private static computePlan(room: Room): PlannerMemory | null {
        const terrain = room.getTerrain();
        const distanceMatrix = buildDistanceTransform(room);
        const anchor = this.deriveAnchorFromExistingBase(room, terrain) ?? this.selectAnchor(room, distanceMatrix);
        if (!anchor) {
            return null;
        }

        const plan: PlannerMemory = {
            version: PLANNER_VERSION,
            anchor: { x: anchor.x, y: anchor.y },
            generated: Game.time,
            structures: [],
            roads: [],
            upgradePositions: [],
            labPositions: []
        };

        const blocked = new Set<string>();
        const roadSet = new Set<string>();

        const addStructure = (type: BuildableStructureConstant, pos: RoomPosition, level: number): void => {
            if (!this.isInside(pos) || terrain.get(pos.x, pos.y) === TERRAIN_MASK_WALL) {
                return;
            }

            const key = this.key(pos.x, pos.y);
            if (blocked.has(key)) {
                return;
            }

            if (type !== STRUCTURE_RAMPART && roadSet.has(key)) {
                plan.roads = plan.roads.filter(road => road.x !== pos.x || road.y !== pos.y);
                roadSet.delete(key);
            }

            plan.structures.push({ type, x: pos.x, y: pos.y, level });
            if (type !== STRUCTURE_ROAD) {
                blocked.add(key);
            } else {
                roadSet.add(key);
            }
        };

        const addRoad = (pos: RoomPosition, level = 1): void => {
            if (!this.isInside(pos) || terrain.get(pos.x, pos.y) === TERRAIN_MASK_WALL) {
                return;
            }

            const key = this.key(pos.x, pos.y);
            if (roadSet.has(key) || blocked.has(key)) {
                return;
            }

            plan.roads.push({ x: pos.x, y: pos.y, level });
            roadSet.add(key);
        };

        const translate = (offset: RelativeOffset): RoomPosition | null => {
            const x = anchor.x + offset.x;
            const y = anchor.y + offset.y;
            if (x < 0 || x >= ROOM_SIZE || y < 0 || y >= ROOM_SIZE) {
                return null;
            }
            return new RoomPosition(x, y, room.name);
        };

        const stampStructures = (stamp: RelativeStructure[]): void => {
            for (const entry of stamp) {
                const translated = translate(entry.offset);
                if (!translated) {
                    continue;
                }
                addStructure(entry.type, translated, entry.level);
            }
        };

        const stampRoads = (roads: RelativeRoad[]): void => {
            for (const entry of roads) {
                const translated = translate(entry.offset);
                if (!translated) {
                    continue;
                }
                addRoad(translated, entry.level);
            }
        };

        stampStructures(CORE_STAMP);
        stampStructures(FAST_FILL_EXTENSIONS);
        stampStructures(SUPPORT_STRUCTURES);
        stampRoads(CORE_ROADS);

        const labPositions: RoomPosition[] = [];
        for (const lab of LAB_STAMP) {
            const pos = translate(lab.offset);
            if (!pos) {
                continue;
            }
            addStructure(lab.type, pos, lab.level);
            labPositions.push(pos);
        }
        plan.labPositions = labPositions.map(pos => ({ x: pos.x, y: pos.y }));

        const flood = runFloodFill(room, [anchor]);
        const maxExtensions = CONTROLLER_STRUCTURES[STRUCTURE_EXTENSION][8];
        let addedExtensions = plan.structures.filter(s => s.type === STRUCTURE_EXTENSION).length;
        const sortedGrid = [...EXTENSION_GRID].sort((a, b) => {
            const posA = translate(a.offset);
            const posB = translate(b.offset);
            if (!posA || !posB) {
                return 0;
            }
            const distA = flood[posA.y][posA.x];
            const distB = flood[posB.y][posB.x];
            const scoreA = distA < 0 ? Infinity : distA;
            const scoreB = distB < 0 ? Infinity : distB;
            return scoreA - scoreB;
        });

        for (const gridEntry of sortedGrid) {
            if (addedExtensions >= maxExtensions) {
                break;
            }
            const pos = translate(gridEntry.offset);
            if (!pos) {
                continue;
            }
            addStructure(gridEntry.type, pos, gridEntry.level);
            addedExtensions += 1;
        }

        const upgrade = this.planUpgradeSite(room, anchor, terrain);
        if (upgrade) {
            for (const tile of upgrade.pad) {
                if (!this.isInside(tile)) {
                    continue;
                }
                plan.upgradePositions.push({ x: tile.x, y: tile.y });
            }
            addStructure(STRUCTURE_CONTAINER, upgrade.container, 2);
            if (upgrade.link) {
                addStructure(STRUCTURE_LINK, upgrade.link, 5);
            }
        }

        const storagePosData = plan.structures.find(s => s.type === STRUCTURE_STORAGE);
        if (storagePosData) {
            const storagePos = new RoomPosition(storagePosData.x, storagePosData.y, room.name);
            const costMatrix = this.createBlockedMatrix(blocked);
            costMatrix.set(storagePos.x, storagePos.y, 1);
            const goals: Array<{ pos: RoomPosition; range: number; type: string }> = [];
            for (const source of room.find(FIND_SOURCES)) {
                goals.push({ pos: source.pos, range: 1, type: "source" });
            }
            if (room.controller) {
                goals.push({ pos: room.controller.pos, range: 3, type: "controller" });
            }
            const mineral = room.find(FIND_MINERALS)[0];
            if (mineral) {
                goals.push({ pos: mineral.pos, range: 1, type: "mineral" });
            }

            for (const goal of goals) {
                const path = PathFinder.search(
                    storagePos,
                    { pos: goal.pos, range: goal.range },
                    {
                        plainCost: 2,
                        swampCost: 5,
                        maxOps: 4000,
                        roomCallback: () => costMatrix
                    }
                );

                const roadLevel = goal.type === "controller" ? 3 : 2;
                for (const step of path.path) {
                    const pos = new RoomPosition(step.x, step.y, room.name);
                    addRoad(pos, roadLevel);
                }

                const last = path.path[path.path.length - 1];
                if (!last) {
                    continue;
                }
                const lastPos = new RoomPosition(last.x, last.y, room.name);

                if (goal.type === "source") {
                    addStructure(STRUCTURE_CONTAINER, lastPos, 2);
                    const retreat = path.path[path.path.length - 2];
                    if (retreat) {
                        const retreatPos = new RoomPosition(retreat.x, retreat.y, room.name);
                        addStructure(STRUCTURE_LINK, retreatPos, 6);
                    }
                } else if (goal.type === "mineral") {
                    addStructure(STRUCTURE_CONTAINER, lastPos, 6);
                    addStructure(STRUCTURE_EXTRACTOR, goal.pos, 6);
                }
            }
        }

        return plan;
    }

    private static deriveAnchorFromExistingBase(room: Room, terrain: RoomTerrain): RoomPosition | null {
        const layoutEntries = [...CORE_STAMP, ...FAST_FILL_EXTENSIONS, ...SUPPORT_STRUCTURES, ...LAB_STAMP];
        const entriesByType = new Map<BuildableStructureConstant, RelativeStructure[]>();
        for (const entry of layoutEntries) {
            const bucket = entriesByType.get(entry.type) ?? [];
            bucket.push(entry);
            entriesByType.set(entry.type, bucket);
        }

        const weightByType: Partial<Record<BuildableStructureConstant, number>> = {
            [STRUCTURE_SPAWN]: 12,
            [STRUCTURE_STORAGE]: 8,
            [STRUCTURE_TERMINAL]: 7,
            [STRUCTURE_TOWER]: 5,
            [STRUCTURE_LINK]: 4,
            [STRUCTURE_EXTENSION]: 2,
            [STRUCTURE_FACTORY]: 3,
            [STRUCTURE_OBSERVER]: 2,
            [STRUCTURE_POWER_SPAWN]: 3,
            [STRUCTURE_LAB]: 2,
            [STRUCTURE_NUKER]: 1
        };

        interface AnchorCandidate {
            anchor: RoomPosition;
            score: number;
            derivedFromPrimary: boolean;
        }

        const candidates = new Map<string, AnchorCandidate>();

        const register = (pos: RoomPosition, structureType: BuildableStructureConstant): void => {
            const relevant = entriesByType.get(structureType);
            if (!relevant || relevant.length === 0) {
                return;
            }
            const weight = weightByType[structureType] ?? 1;
            for (const layoutEntry of relevant) {
                const anchorX = pos.x - layoutEntry.offset.x;
                const anchorY = pos.y - layoutEntry.offset.y;
                if (anchorX <= 0 || anchorX >= ROOM_SIZE - 1 || anchorY <= 0 || anchorY >= ROOM_SIZE - 1) {
                    continue;
                }
                if (terrain.get(anchorX, anchorY) === TERRAIN_MASK_WALL) {
                    continue;
                }
                const key = this.key(anchorX, anchorY);
                let candidate = candidates.get(key);
                if (!candidate) {
                    candidate = {
                        anchor: new RoomPosition(anchorX, anchorY, room.name),
                        score: 0,
                        derivedFromPrimary: false
                    };
                    candidates.set(key, candidate);
                }
                candidate.score += weight;
                if (structureType === STRUCTURE_SPAWN || structureType === STRUCTURE_STORAGE) {
                    candidate.derivedFromPrimary = true;
                }
            }
        };

        const ownedStructures = room.find(FIND_STRUCTURES) as Structure[];
        for (const structure of ownedStructures) {
            if (!("my" in structure) || !(structure as OwnedStructure).my) {
                continue;
            }
            const type = structure.structureType as BuildableStructureConstant;
            if (!entriesByType.has(type)) {
                continue;
            }
            register(structure.pos, type);
        }

        const sites = room.find(FIND_MY_CONSTRUCTION_SITES);
        for (const site of sites) {
            if (!entriesByType.has(site.structureType)) {
                continue;
            }
            register(site.pos, site.structureType);
        }

        if (candidates.size === 0) {
            return null;
        }

        let best: AnchorCandidate | null = null;
        let bestScore = -Infinity;
        for (const candidate of candidates.values()) {
            if (!this.isInside(candidate.anchor)) {
                continue;
            }
            const alignment = this.countAnchorMatches(room, candidate.anchor);
            if (alignment === 0 && !candidate.derivedFromPrimary) {
                continue;
            }
            const totalScore = candidate.score + alignment * 3 + (candidate.derivedFromPrimary ? 5 : 0);
            if (totalScore > bestScore) {
                bestScore = totalScore;
                best = candidate;
            }
        }

        return best?.anchor ?? null;
    }

    private static selectAnchor(room: Room, matrix: DistanceMatrix): RoomPosition | null {
        const terrain = room.getTerrain();
        const controller = room.controller?.pos;
        const sources = room.find(FIND_SOURCES);
        let best: RoomPosition | null = null;
        let bestScore = -Infinity;

        for (let y = ANCHOR_BUFFER; y < ROOM_SIZE - ANCHOR_BUFFER; y += 1) {
            for (let x = ANCHOR_BUFFER; x < ROOM_SIZE - ANCHOR_BUFFER; x += 1) {
                if (matrix[y][x] < 3) {
                    continue;
                }
                if (terrain.get(x, y) === TERRAIN_MASK_WALL) {
                    continue;
                }
                const candidate = new RoomPosition(x, y, room.name);
                if (!this.stampFits(candidate, terrain)) {
                    continue;
                }

                let score = matrix[y][x] * 5;
                if (controller) {
                    score -= controller.getRangeTo(candidate) * 2;
                }
                for (const source of sources) {
                    score -= source.pos.getRangeTo(candidate);
                }

                if (score > bestScore) {
                    bestScore = score;
                    best = candidate;
                }
            }
        }

        return best;
    }

    private static countAnchorMatches(room: Room, anchor: RoomPosition): number {
        let matches = 0;
        for (const entry of REFERENCE_ANCHOR_STRUCTURES) {
            const x = anchor.x + entry.offset.x;
            const y = anchor.y + entry.offset.y;
            if (x < 0 || x >= ROOM_SIZE || y < 0 || y >= ROOM_SIZE) {
                continue;
            }
            const pos = new RoomPosition(x, y, room.name);
            const structures = pos.lookFor(LOOK_STRUCTURES);
            if (
                structures.some(struct => struct.structureType === entry.type && (!("my" in struct) || (struct as OwnedStructure).my))
            ) {
                matches += 1;
                continue;
            }
            const sites = pos.lookFor(LOOK_CONSTRUCTION_SITES);
            if (sites.some(site => site.my && site.structureType === entry.type)) {
                matches += 1;
            }
        }

        return matches;
    }

    private static stampFits(anchor: RoomPosition, terrain: RoomTerrain): boolean {
        const offsets: RelativeStructure[] = [...CORE_STAMP, ...FAST_FILL_EXTENSIONS, ...SUPPORT_STRUCTURES, ...LAB_STAMP, ...EXTENSION_GRID];
        for (const entry of offsets) {
            const x = anchor.x + entry.offset.x;
            const y = anchor.y + entry.offset.y;
            if (x <= 0 || x >= ROOM_SIZE - 1 || y <= 0 || y >= ROOM_SIZE - 1) {
                return false;
            }
            if (terrain.get(x, y) === TERRAIN_MASK_WALL) {
                return false;
            }
        }
        return true;
    }

    private static planUpgradeSite(
        room: Room,
        anchor: RoomPosition,
        terrain: RoomTerrain
    ): { pad: RoomPosition[]; container: RoomPosition; link?: RoomPosition } | null {
        const controller = room.controller?.pos;
        if (!controller) {
            return null;
        }

        const candidates: RoomPosition[] = [];
        for (let dx = -3; dx <= 3; dx += 1) {
            for (let dy = -3; dy <= 3; dy += 1) {
                const x = controller.x + dx;
                const y = controller.y + dy;
                if (x <= 0 || x >= ROOM_SIZE - 1 || y <= 0 || y >= ROOM_SIZE - 1) {
                    continue;
                }
                if (!controller.inRangeTo(new RoomPosition(x, y, room.name), 3)) {
                    continue;
                }
                if (terrain.get(x, y) === TERRAIN_MASK_WALL) {
                    continue;
                }
                candidates.push(new RoomPosition(x, y, room.name));
            }
        }

        if (candidates.length === 0) {
            return null;
        }

        const sorted = candidates.sort((a, b) => {
            const rangeA = a.getRangeTo(anchor);
            const rangeB = b.getRangeTo(anchor);
            return rangeA - rangeB;
        });

        const container = sorted[0];
        const pad: RoomPosition[] = [];
        for (const pos of sorted.slice(0, 5)) {
            pad.push(pos);
        }

        let link: RoomPosition | undefined;
        for (const pos of pad) {
            if (pos.getRangeTo(controller) <= 3 && pos.getRangeTo(anchor) <= 6) {
                link = pos;
                break;
            }
        }

        if (link && link.x === container.x && link.y === container.y) {
            link = pad.find(pos => pos !== container && pos.getRangeTo(controller) <= 3);
        }

        return { pad, container, link };
    }

    private static ensureRoadLevels(plan: PlannerMemory): void {
        for (const road of plan.roads) {
            if (road.level === undefined) {
                road.level = 1;
            }
        }
    }

    private static maintain(room: Room, plan: PlannerMemory): void {
        const level = room.controller?.level ?? 0;
        if (level <= 0) {
            return;
        }

        const desiredStructures = plan.structures.filter(structure => structure.level <= level);
        const desiredRoads = plan.roads.filter(road => (road.level ?? 1) <= level);
        const desiredStructureMap = this.buildStructureMap(desiredStructures);
        const desiredRoadKeys = new Set<string>();
        for (const road of desiredRoads) {
            desiredRoadKeys.add(this.key(road.x, road.y));
        }

        this.cleanConstructionSites(room, desiredStructureMap, desiredRoadKeys, plan.anchor);

        let removalBudget = MAX_REMOVALS_PER_TICK;
        removalBudget = this.removeMisplacedRoads(room, desiredRoadKeys, plan.anchor, removalBudget);

        const structureCounts = this.countStructureTotals(room);
        const siteCounts = this.countSiteTotals(room);
        let globalSites = Object.keys(Game.constructionSites).length;

        const structureResult = this.buildMissingStructures(
            room,
            desiredStructures,
            structureCounts,
            siteCounts,
            level,
            globalSites,
            plan.anchor,
            removalBudget
        );
        globalSites = structureResult.globalSites;
        removalBudget = structureResult.removalBudget;

        const roadResult = this.buildMissingRoads(room, desiredRoads, globalSites, MAX_ROAD_SITES_PER_TICK);
        globalSites = roadResult.globalSites;
    }

    private static buildStructureMap(entries: PlannerStructureMemory[]): Map<string, BuildableStructureConstant> {
        const result = new Map<string, BuildableStructureConstant>();
        for (const entry of entries) {
            result.set(this.key(entry.x, entry.y), entry.type);
        }
        return result;
    }

    private static cleanConstructionSites(
        room: Room,
        desiredStructureMap: Map<string, BuildableStructureConstant>,
        desiredRoadKeys: Set<string>,
        anchor: { x: number; y: number }
    ): void {
        const sites = room.find(FIND_MY_CONSTRUCTION_SITES);
        for (const site of sites) {
            if (!this.withinCleanupBounds(site.pos, anchor)) {
                continue;
            }
            const key = this.key(site.pos.x, site.pos.y);
            if (site.structureType === STRUCTURE_ROAD) {
                if (!desiredRoadKeys.has(key)) {
                    site.remove();
                }
                continue;
            }
            const desired = desiredStructureMap.get(key);
            if (!desired || desired !== site.structureType) {
                site.remove();
            }
        }
    }

    private static removeMisplacedRoads(
        room: Room,
        desiredRoadKeys: Set<string>,
        anchor: { x: number; y: number },
        removalBudget: number
    ): number {
        if (removalBudget <= 0) {
            return removalBudget;
        }
        const roads = room.find(FIND_STRUCTURES, {
            filter: structure => structure.structureType === STRUCTURE_ROAD
        }) as StructureRoad[];

        for (const road of roads) {
            if (!this.withinCleanupBounds(road.pos, anchor)) {
                continue;
            }
            const key = this.key(road.pos.x, road.pos.y);
            if (desiredRoadKeys.has(key)) {
                continue;
            }
            const result = road.destroy();
            if (result === OK) {
                removalBudget -= 1;
                if (removalBudget <= 0) {
                    break;
                }
            }
        }

        return removalBudget;
    }

    private static countStructureTotals(room: Room): Partial<Record<StructureConstant, number>> {
        const counts: Partial<Record<StructureConstant, number>> = {};
        const structures = room.find(FIND_STRUCTURES);
        for (const structure of structures) {
            if ("my" in structure && !(structure as OwnedStructure).my) {
                continue;
            }
            const type = structure.structureType;
            counts[type] = (counts[type] ?? 0) + 1;
        }
        return counts;
    }

    private static countSiteTotals(room: Room): Partial<Record<StructureConstant, number>> {
        const counts: Partial<Record<StructureConstant, number>> = {};
        const sites = room.find(FIND_MY_CONSTRUCTION_SITES);
        for (const site of sites) {
            counts[site.structureType] = (counts[site.structureType] ?? 0) + 1;
        }
        return counts;
    }

    private static buildMissingStructures(
        room: Room,
        desired: PlannerStructureMemory[],
        structureCounts: Partial<Record<StructureConstant, number>>,
        siteCounts: Partial<Record<StructureConstant, number>>,
        level: number,
        globalSites: number,
        anchor: { x: number; y: number },
        removalBudget: number
    ): { placements: number; globalSites: number; removalBudget: number } {
        if (globalSites >= GLOBAL_CONSTRUCTION_SITE_BUFFER) {
            return { placements: 0, globalSites, removalBudget };
        }

        let placements = 0;
        for (const entry of desired) {
            if (placements >= MAX_STRUCTURE_SITES_PER_TICK || globalSites >= GLOBAL_CONSTRUCTION_SITE_BUFFER) {
                break;
            }

            const pos = new RoomPosition(entry.x, entry.y, room.name);
            if (this.hasStructure(pos, entry.type)) {
                continue;
            }
            if (this.hasConstructionSite(pos, entry.type)) {
                continue;
            }

            let blockingStructures = pos
                .lookFor(LOOK_STRUCTURES)
                .filter(struct => struct.structureType !== STRUCTURE_RAMPART && struct.structureType !== entry.type);

            if (blockingStructures.length > 0 && removalBudget > 0 && this.withinCleanupBounds(pos, anchor)) {
                blockingStructures = blockingStructures.filter(struct => REMOVABLE_STRUCTURES.has(struct.structureType));
                for (const structure of blockingStructures) {
                    const result = structure.destroy();
                    if (result === OK) {
                        removalBudget -= 1;
                        break;
                    }
                }
                if (this.hasStructure(pos, entry.type)) {
                    continue;
                }
                if (this.hasConstructionSite(pos, entry.type)) {
                    continue;
                }
            }

            blockingStructures = pos
                .lookFor(LOOK_STRUCTURES)
                .filter(struct => struct.structureType !== STRUCTURE_RAMPART && struct.structureType !== entry.type);
            if (blockingStructures.length > 0) {
                continue;
            }

            const limit = CONTROLLER_STRUCTURES[entry.type]?.[level] ?? 0;
            if (limit > 0) {
                const current = (structureCounts[entry.type] ?? 0) + (siteCounts[entry.type] ?? 0);
                if (current >= limit) {
                    continue;
                }
            }

            const result = pos.createConstructionSite(entry.type);
            if (result === OK) {
                placements += 1;
                globalSites += 1;
                siteCounts[entry.type] = (siteCounts[entry.type] ?? 0) + 1;
            }
        }

        return { placements, globalSites, removalBudget };
    }

    private static buildMissingRoads(
        room: Room,
        desired: PlannerRoadMemory[],
        globalSites: number,
        maxPlacements: number
    ): { placements: number; globalSites: number } {
        if (globalSites >= GLOBAL_CONSTRUCTION_SITE_BUFFER || maxPlacements <= 0) {
            return { placements: 0, globalSites };
        }

        let placements = 0;
        for (const road of desired) {
            if (placements >= maxPlacements || globalSites >= GLOBAL_CONSTRUCTION_SITE_BUFFER) {
                break;
            }

            const pos = new RoomPosition(road.x, road.y, room.name);
            if (this.hasStructure(pos, STRUCTURE_ROAD) || this.hasConstructionSite(pos, STRUCTURE_ROAD)) {
                continue;
            }

            const blocking = pos
                .lookFor(LOOK_STRUCTURES)
                .some(struct => struct.structureType !== STRUCTURE_RAMPART && struct.structureType !== STRUCTURE_ROAD);
            if (blocking) {
                continue;
            }

            const result = pos.createConstructionSite(STRUCTURE_ROAD);
            if (result === OK) {
                placements += 1;
                globalSites += 1;
            }
        }

        return { placements, globalSites };
    }

    private static hasStructure(pos: RoomPosition, type: StructureConstant): boolean {
        return pos.lookFor(LOOK_STRUCTURES).some(structure => structure.structureType === type);
    }

    private static hasConstructionSite(pos: RoomPosition, type?: StructureConstant): boolean {
        const sites = pos.lookFor(LOOK_CONSTRUCTION_SITES);
        if (type) {
            return sites.some(site => site.structureType === type);
        }
        return sites.length > 0;
    }

    private static withinCleanupBounds(pos: RoomPosition, anchor: { x: number; y: number }): boolean {
        return Math.abs(pos.x - anchor.x) <= CLEANUP_RADIUS && Math.abs(pos.y - anchor.y) <= CLEANUP_RADIUS;
    }

    private static createBlockedMatrix(blocked: Set<string>): CostMatrix {
        const matrix = new PathFinder.CostMatrix();
        blocked.forEach(key => {
            const [x, y] = key.split(":").map(Number);
            matrix.set(x, y, 0xff);
        });
        return matrix;
    }

    private static key(x: number, y: number): string {
        return `${x}:${y}`;
    }

    private static isInside(pos: RoomPosition): boolean {
        return pos.x > 0 && pos.x < ROOM_SIZE - 1 && pos.y > 0 && pos.y < ROOM_SIZE - 1;
    }

    private static visualize(room: Room, plan: PlannerMemory): void {
        const visual = new RoomVisual(room.name);
        visual.circle(plan.anchor.x, plan.anchor.y, { radius: 0.5, fill: "#2b8a3e", opacity: 0.3 });
        for (const structure of plan.structures) {
            visual.text(this.symbol(structure.type), structure.x, structure.y, {
                font: 0.5,
                color: "#ffffff",
                backgroundColor: "#000000",
                backgroundPadding: 0.02
            });
        }
        for (const road of plan.roads) {
            visual.circle(road.x, road.y, { radius: 0.1, fill: "#ffd43b", opacity: 0.7 });
        }
        for (const pad of plan.upgradePositions) {
            visual.rect(pad.x - 0.45, pad.y - 0.45, 0.9, 0.9, { stroke: "#74c0fc", opacity: 0.5 });
        }
    }

    private static symbol(type: string): string {
        switch (type) {
            case STRUCTURE_SPAWN:
                return "S";
            case STRUCTURE_EXTENSION:
                return "E";
            case STRUCTURE_STORAGE:
                return "ST";
            case STRUCTURE_TERMINAL:
                return "T";
            case STRUCTURE_LAB:
                return "L";
            case STRUCTURE_TOWER:
                return "Tw";
            case STRUCTURE_LINK:
                return "Li";
            case STRUCTURE_FACTORY:
                return "F";
            case STRUCTURE_POWER_SPAWN:
                return "P";
            case STRUCTURE_NUKER:
                return "N";
            case STRUCTURE_OBSERVER:
                return "O";
            case STRUCTURE_CONTAINER:
                return "C";
            case STRUCTURE_EXTRACTOR:
                return "Ex";
            case STRUCTURE_RAMPART:
                return "R";
            default:
                return type.slice(0, 1).toUpperCase();
        }
    }
}
