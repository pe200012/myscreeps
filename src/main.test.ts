import { describe, expect, test } from "bun:test";

describe("Screeps Game Loop", () => {
    test("example test", () => {
        expect(1 + 1).toBe(2);
    });

    test("creep memory structure", () => {
        const memory: CreepMemory = {
            role: "harvester",
            working: false,
        };

        expect(memory.role).toBe("harvester");
        expect(memory.working).toBe(false);
    });
});
