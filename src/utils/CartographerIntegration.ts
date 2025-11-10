/**
 * Integrates the Cartographer movement library by patching the stock `creep.moveTo`
 * implementation and re-exporting lifecycle helpers expected in the main loop.
 */

import { moveTo as cartographerMoveTo, type MoveOpts, type MoveTarget } from "screeps-cartographer";

// Re-export tick helpers so consumers can keep a single import site.
export { preTick, reconcileTraffic } from "screeps-cartographer";

type CartographerCompatibleTarget = Parameters<typeof cartographerMoveTo>[1];
type CartographerOptions = (MoveToOpts & Partial<MoveOpts>) & {
    fallbackOpts?: MoveOpts;
};

declare global {
    interface Creep {
        /**
         * Reference to the original Screeps moveTo implementation for edge cases that are not
         * Cartographer-compatible.
         */
        readonly _stockMoveTo?: Creep["moveTo"];
    }

    interface PowerCreep {
        readonly _stockMoveTo?: PowerCreep["moveTo"];
    }
}

const patchFlag = Symbol("cartographer-moveTo-patched");

patchPrototype(Creep.prototype);
if (typeof PowerCreep !== "undefined") {
    patchPrototype(PowerCreep.prototype);
}

function patchPrototype(prototype: Creep | PowerCreep): void {
    const proto = prototype as unknown as { moveTo: Creep["moveTo"];[patchFlag]?: boolean; _stockMoveTo?: Creep["moveTo"]; };
    if (proto[patchFlag]) {
        return;
    }

    const stockMoveTo = proto.moveTo;
    Object.defineProperty(proto, "_stockMoveTo", {
        value: stockMoveTo,
        configurable: false,
        enumerable: false,
        writable: false
    });

    Object.defineProperty(proto, patchFlag, {
        value: true,
        configurable: false,
        enumerable: false,
        writable: false
    });

    proto.moveTo = function patchedMoveTo(this: Creep, targetOrX: any, yOrOpts?: any, maybeOpts?: any): CreepMoveReturnCode {
        const originalArgs = arguments as unknown as [any, any?, any?];
        let target: CartographerCompatibleTarget | undefined;
        let opts: CartographerOptions | undefined;

        if (typeof targetOrX === "number") {
            const x = targetOrX;
            const y = yOrOpts as number | undefined;
            if (typeof y !== "number") {
                return (stockMoveTo as any).apply(this, originalArgs) as CreepMoveReturnCode;
            }
            target = new RoomPosition(x, y, this.room.name);
            opts = maybeOpts as CartographerOptions | undefined;
        } else {
            target = targetOrX as CartographerCompatibleTarget;
            opts = yOrOpts as CartographerOptions | undefined;
        }

        if (!target) {
            return ERR_INVALID_ARGS as CreepMoveReturnCode;
        }

        if (shouldFallbackToStock(opts)) {
            return stockMoveTo.call(this, target as any, opts as any) as CreepMoveReturnCode;
        }

        const { fallbackOpts, range, ...rest } = opts ?? {};
        const normalizedTarget = normalizeTargetRange(target, range);

        return cartographerMoveTo(
            this,
            normalizedTarget as CartographerCompatibleTarget,
            rest as MoveOpts,
            fallbackOpts
        ) as CreepMoveReturnCode;
    } as Creep["moveTo"];
}

function shouldFallbackToStock(opts: CartographerOptions | undefined): boolean {
    if (!opts) {
        return false;
    }
    if (opts.noPathFinding || opts.serializeMemory) {
        return true;
    }
    return false;
}

function normalizeTargetRange(target: CartographerCompatibleTarget, range: number | undefined): CartographerCompatibleTarget {
    if (range === undefined) {
        return target;
    }

    if (Array.isArray(target)) {
        return target.map(entry => convertSingleTarget(entry, range)) as CartographerCompatibleTarget;
    }

    return convertSingleTarget(target, range);
}

function convertSingleTarget(target: CartographerCompatibleTarget | MoveTarget, range: number): CartographerCompatibleTarget {
    if (!target) {
        return target as CartographerCompatibleTarget;
    }

    if (isMoveTarget(target)) {
        return { pos: target.pos, range };
    }

    if (isHasPos(target)) {
        return { pos: target.pos, range };
    }

    if (target instanceof RoomPosition) {
        return { pos: target, range };
    }

    return target as CartographerCompatibleTarget;
}

function isMoveTarget(value: unknown): value is MoveTarget {
    return !!value && typeof value === "object" && "pos" in (value as MoveTarget) && "range" in (value as MoveTarget);
}

function isHasPos(value: unknown): value is _HasRoomPosition {
    return !!value && typeof value === "object" && "pos" in (value as _HasRoomPosition);
}
