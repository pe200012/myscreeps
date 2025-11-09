/**
 * Creep body generation system for flexible and scalable unit composition.
 * Supports pattern-based body building with prefix/suffix parts.
 */

/**
 * Configuration for generating creep bodies.
 * Defines how body parts are arranged and scaled based on available energy.
 */
export interface BodySetup {
    /** Repeating pattern of body parts to scale with energy */
    pattern: BodyPartConstant[];

    /** Body parts to prepend before the pattern */
    prefix?: BodyPartConstant[];

    /** Body parts to append after the pattern */
    suffix?: BodyPartConstant[];

    /** Maximum number of pattern repetitions */
    sizeLimit?: number;

    /** Whether to repeat prefix/suffix with each pattern repetition */
    proportionalPrefixSuffix?: boolean;

    /** Whether to maintain part order (true) or group by type (false) */
    ordered?: boolean;
}

/**
 * Generates creep bodies based on available energy and configuration.
 * Handles scaling, ordering, and cost calculations automatically.
 */
export class CreepSetup {
    public readonly role: string;
    private readonly bodySetup: Required<BodySetup>;

    /**
     * Creates a new creep setup configuration.
     * @param role - The role identifier for this creep type
     * @param bodySetup - Body generation configuration
     */
    constructor(role: string, bodySetup: BodySetup) {
        this.role = role;
        this.bodySetup = {
            pattern: bodySetup.pattern,
            prefix: bodySetup.prefix ?? [],
            suffix: bodySetup.suffix ?? [],
            sizeLimit: bodySetup.sizeLimit ?? Infinity,
            proportionalPrefixSuffix: bodySetup.proportionalPrefixSuffix ?? false,
            ordered: bodySetup.ordered ?? true
        };
    }

    /**
     * Generates a creep body based on available energy capacity.
     * Scales the pattern repetitions to use as much energy as possible
     * while respecting size limits and the 50-part maximum.
     *
     * @param energyCapacity - Maximum energy available for spawning
     * @returns Array of body parts, or empty array if insufficient energy
     */
    generateBody(energyCapacity: number): BodyPartConstant[] {
        const { pattern, prefix, suffix, sizeLimit, proportionalPrefixSuffix, ordered } = this.bodySetup;
        const prefixCost = bodyCost(prefix);
        const suffixCost = bodyCost(suffix);
        const patternCost = bodyCost(pattern);

        if (energyCapacity < prefixCost) {
            return [];
        }

        if (energyCapacity < prefixCost + suffixCost && patternCost === 0) {
            return [];
        }

        let repeats = 0;
        if (patternCost > 0) {
            const availableForPattern = Math.max(0, energyCapacity - prefixCost - suffixCost);
            repeats = Math.min(Math.floor(availableForPattern / patternCost), sizeLimit);
        }

        let body: BodyPartConstant[] = [];

        if (proportionalPrefixSuffix && prefix.length > 0) {
            for (let i = 0; i < repeats; i++) {
                body = body.concat(prefix);
            }
        } else {
            body = body.concat(prefix);
        }

        let patternAdded = false;

        if (pattern.length > 0) {
            if (ordered) {
                for (let i = 0; i < repeats; i++) {
                    body = body.concat(pattern);
                    patternAdded = true;
                }
            } else {
                const patternLength = pattern.length;
                for (let i = 0; i < patternLength; i++) {
                    for (let j = 0; j < repeats; j++) {
                        body.push(pattern[i]);
                        patternAdded = true;
                    }
                }
            }
        }

        if (!patternAdded && pattern.length > 0 && prefixCost + suffixCost + patternCost <= energyCapacity) {
            body = body.concat(pattern);
            patternAdded = true;
        }

        if (pattern.length === 0 && body.length === 0 && energyCapacity >= prefixCost + suffixCost) {
            // No pattern defined, ensure we at least return prefix + suffix if affordable
            body = body.concat(prefix);
        }

        if (proportionalPrefixSuffix && suffix.length > 0) {
            for (let i = 0; i < repeats; i++) {
                if (bodyCost(body) + suffixCost > energyCapacity) {
                    break;
                }
                body = body.concat(suffix);
            }
        } else {
            if (bodyCost(body) + suffixCost <= energyCapacity) {
                body = body.concat(suffix);
            }
        }

        // If no pattern parts were added due to low energy and we still have capacity for a single pattern, add one
        if (body.length === 0 && patternCost > 0 && energyCapacity >= patternCost) {
            body = pattern.slice();
        }

        if (bodyCost(body) > energyCapacity) {
            // Trim the body until it fits within the available capacity
            const trimmed: BodyPartConstant[] = [];
            let remainingEnergy = energyCapacity;
            for (const part of body) {
                const partCost = BODYPART_COST[part];
                if (partCost <= remainingEnergy && trimmed.length < 50) {
                    trimmed.push(part);
                    remainingEnergy -= partCost;
                } else {
                    break;
                }
            }
            return trimmed;
        }

        return body.slice(0, 50);
    }
}

/**
 * Calculates the total energy cost of a body configuration.
 * @param body - Array of body parts
 * @returns Total energy cost
 */
export function bodyCost(body: BodyPartConstant[]): number {
    return body.reduce((total, part) => total + BODYPART_COST[part], 0);
}
