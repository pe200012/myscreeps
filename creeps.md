# Overmind Creep Management Notes

## Spawning Pipeline
- **Responsibility flow**: Overlords request creeps via `wishlist()` or `requestCreep()`; requests are routed to a colony `Hatchery` or shared `SpawnGroup` when multi-room support is needed. Each request records the target setup, overlord ref, and options like forced spawn selection or exit directions.
- **Queue structure**: The hatchery maintains a `productionQueue` hash keyed by numeric priority. Priorities come from `OverlordPriority` constants (e.g. queens at 100, emergency bootstrap at 0, remote ops >= 900). Requests append to an array per priority and `productionPriorities` tracks the active keys for sorted iteration.
- **ProtoCreep generation**: `generateProtoCreep()` builds the biggest body allowed by `CreepSetup.generateBody(this.room.energyCapacityAvailable)` and seeds memory with `_MEM.COLONY`, `_MEM.OVERLORD`, `role`, and placeholder origin. Partners for squad spawning ride along in the request payload.
- **Spawn execution**: `handleSpawns()` repeatedly pops `availableSpawns` and calls `spawnHighestPriorityCreep()`. Failures due to low energy capacity mark `isOverloaded`; other transient errors requeue the order so the hatchery does not starve higher tiers. When a spawn finishes, `Movement.vacatePos()` clears the exit tile.
- **Spawn groups**: `SpawnGroup.init()` rebalances requests across nearby colonies by picking the hatchery with minimum `nextAvailability + distance`. This is how siege/offense directives can assemble large bodies without starving the host room.
- **Energy logistics**: Hatcheries register link/hauler requests (preferring 75% full batteries in larva colonies, 50% later) and empties non-energy resources via logistics requests so spawn throughput stays consistent.

## Overlord Demand Planning
- **Lifecycle filtering**: `wishlist()` subtracts creeps that will survive long enough using `lifetimeFilter()` with prespawn buffers (defaults to 50 ticks, expanded for portals/incubation). Idle creeps can be reassigned to the overlord instead of spawning fresh bodies.
- **Auto-run harness**: Overlords wrap owned creeps in `Zerg` objects and drive them with `autoRun()`, which handles boosting, task assignment, and the underlying task runner. Roles that lose their overlord fall back to `DefaultOverlord` behavior so they do not idle forever.
- **Directive interaction**: Remote directives offset priorities per outpost index so distant rooms scale gradually (`priority += outpostIndex * roomIncrement`). War/defense directives raise priorities above the wartime cutoff (<=299) so emergency units pre-empt economy creeps.

## Role Catalog & Body Scaling
- **Setup definitions**: `creepSetups/setups.ts` enumerates role constants (`Roles`) and the associated `CreepSetup` variants. Patterns usually expose `early`, `default`, and specialized versions (e.g. `Setups.managers.stationary`, `CombatSetups.hydralisks.siege_T3`). Bodies assemble through prefix/pattern/suffix loops so they resize cleanly up to `sizeLimit`.
- **Economic core**:
  - `queen`: Dedicated spawn refiller. `QueenOverlord` keeps exactly one active (using early body until storage exists). Bunker rooms switch to `BunkerQueenOverlord` with more complex routing.
  - `manager`: Runs the command center cluster once storage/terminal exist; can swap to a WORK-heavy variant for structure repairs.
  - `worker`: General maintenance (build, repair, fortify). `WorkerOverlord` dynamically decides between construction, fortification thresholds, and dismantle targets.
  - `transport`: Handles logistics network jobs with a stable matching system; `TransportOverlord` evaluates request benefit (`dQ/dt`) before issuing tasks.
  - `drone` miner variants (standard, emergency, double, source keeper) are allocated per mining site / remote directives; emergency bodies ensure income recovery after crashes.
  - `upgrader`: Controlled by `UpgradingOverlord`, including RCL8 throttled body sets and booster logic via lab network integration.
- **Remote control**:
  - `claim`/`reserve` roles exported under `Setups.infestors`. `ReservingOverlord` maintains controller buffers (2000 ticks default) and only requests bodies when reservations dip.
  - `pioneer` roles handle fresh colonies; once a spawn exists they are reassigned to miners/workers to avoid waste.
  - `scout` roles include stationary sentries and wandering surveyors for expansion scouting.

- **Combat suites**: `CombatSetups` provides grouped patterns (`zerglings`, `hydralisks`, `broodlings`, `healers`, `dismantlers`, `bunkerGuard`, etc.) with boosted alternatives. Combat overlords (e.g. `OutpostDefenseOverlord`, `PairDestroyerOverlord`) calculate needs from `CombatIntel` (enemy attack/ranged/heal totals) and issue wishes with priority offsets so the hatchery forms balanced squads. Squad requests can bundle multiple setups via `requestSquad()`.

## Task & Control Model
- **Zerg wrapper**: Every creep gains helper methods (`goHarvest`, `park`, `flee`, `hasMineralsInCarry`, boost bookkeeping) and ties into the task system. Tasks encapsulate intent (`TaskHarvest`, `TaskTransfer`, etc.) and cache target references, enabling resilient reassignment when vision is lost.
- **Logistics integration**: Hatchery, command center, and labs push transport requests via `TransportRequestGroup` (close-range priorities) or `LogisticsNetwork` (global matching) so haulers respond to energy/mineral needs without explicit overlord micromanagement.

## Takeaways for Our Planner
- Spawn logic is centralized in the hatchery with priority queues; planners should produce clear demand signals (desired quantity, priority, prespawn) and let the shared infrastructure balance requests.
- Roles are thin shells around an overlord: the overlord owns lifecycle math, task selection, and spawn logic. Implementing new automation is easiest via a new overlord that exports `wishlist()` calls instead of manually building creeps.
- Body scaling relies on pattern repetition, so planner outputs should reference the existing `CreepSetup` catalog rather than hard-coding body arrays when possible.
- Logistics and hatchery energy cadence are critical—automated role planners need to consider refuel thresholds and battery/link availability or risk stall.
