# Overmind Base Automation Summary

## Layout Templates and Anchor Selection
- Overmind ships with pre-authored structure blueprints for each RCL in `src/roomPlanner/layouts/*.ts`. The bunker, command center, and hatchery layouts anchor around `(25,25)` and list every structure position per level, allowing deterministic translations into any room via simple offsets.
- `BasePlanner.getBunkerLocation()` runs a distance transform over the room terrain to find open tiles with at least a 6-tile radius clearance. It filters candidate anchors that intersect the controller, sources, or mineral using a cached lookup of bunker coordinates. The search samples up to 10 spots and minimizes aggregate path length to critical targets, rejecting anchors whose total path exceeds `MAX_TOTAL_PATH_LENGTH`.
- When visualization is enabled, the planner marks legal anchors and distance scores with `RoomVisual`, helping debug auto-selected bunker spots without manual flag placement.

## Room Planner Lifecycle
- Each colony owns a `RoomPlanner` instance that tracks temporary `placements` (bunker, hatchery, command center), the composed `plan`, and a flattened `map` of final tile assignments. Placement flags translate layout coordinates from anchor space into room coordinates; rotation support exists but is intentionally disabled for stability.
- Activating the planner saves any user flags, reinstates them on reactivation, and guides configuration through standardized white flag color pairs. In automatic autonomy, the planner can skip manual flagging by deriving a bunker anchor from spawn positions or stored expansion data.
- Once placements exist, `finalize()` validates the layout against terrain collisions, serializes per-RCL maps into memory (`mapsByLevel` or `bunkerData` for bunker colonies), and persists road/barrier plans. It also queues rechecks, erases helper flags, and optionally clears hostile structures for clean room initialization.

## Automated Structure Maintenance
- When inactive, `RoomPlanner.run()` continually enforces the saved blueprint. Every ~100–300 ticks (configurable by server type) it alternates between `demolishMisplacedStructures()` and `buildMissingStructures()` so the room converges on the blueprint with minimal CPU spikes.
- Demolition logic observes safety rails: it skips terminal/storage at low RCL, ensures spawn rebuild capacity before razing, coordinates terminal evacuations through directives, and halts if removing a structure would starve the colony. It also purges hostile construction and newbie walls.
- Build logic respects `BuildPriorities`, only placing sites when allowed by controller limits and throttled by `maxSitesPerColony`. If a conflicting low-priority structure blocks placement, the planner will dismantle it automatically. Mineral extractor placement is also triggered when the mineral is present.
- Link automation tracks existing structures and sites, computes ideal link anchors (controller first, then distant sources), and spawns construction sites once prerequisites (storage/command center links) and controller level requirements are satisfied.

## Road Network Automation
- The dedicated `RoadPlanner` periodically recomputes optimal routes between storage and every registered colony destination (sources, controller, outposts). Paths are found with rich cost matrices (plain=3, swamp=4, walls penalized) and optional heuristics to encourage overlap by lowering future traversal costs along planned tiles.
- Paths are deduplicated, filtered off exits, and combined with any roads stored in the room plan before committing to memory as a per-room coordinate lookup. Coverage metrics track how much of each path is already paved, with expiration windows tuned to reinvestigate unfinished segments more frequently.
- During maintenance, the planner queues missing road construction based on proximity to origin, respecting the same per-tick site cap as structures. Full recalculations happen on a long cadence (1–3k ticks depending on shard) to adapt to outpost churn.

## Defensive Envelope Automation
- `BarrierPlanner` synthesizes rampart rings via a min-cut solve. For bunker layouts it wraps the bunker rectangle and controller with padded bounds; otherwise it envelopes hatchery, storage, and upgrader areas. Results save into a lookup used for both maintenance and visualization.
- Rampart construction starts once colonies reach RCL 3. At higher levels the planner shifts strategy: bunker colonies focus ramparts within bunker bounds or controller range, while late-game bunkers add per-tile ramparts directly on bunker coordinates.
- The barrier planner augments its lookup with critical structure positions (spawns, towers, storage, terminal) each tick before attempting to place new rampart sites, guaranteeing high-value targets remain protected even if the min-cut changes slowly.

## Integration with Expansion and Autonomy
- Expansion planning seeds rooms with a stored bunker anchor (`colony.room.memory._RM.EXPANSION_DATA`), enabling new colonies to auto-generate layouts without player interaction once the first spawn lands.
- The automation stack respects the global autonomy setting: in `Autonomy.Automatic`, the room planner self-finalizes when placements are detected; otherwise players can intervene manually without losing persistent data.
- Persistent memories (`mapsByLevel`, `roadLookup`, `barrierLookup`) let Overmind rebuild or audit base layouts after resets or shard migrations, and they feed lightweight `shouldRecheck()` heuristics so maintenance only fires when due.
