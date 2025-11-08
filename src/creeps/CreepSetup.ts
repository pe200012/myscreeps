export interface BodySetup {
    pattern: BodyPartConstant[];
    prefix?: BodyPartConstant[];
    suffix?: BodyPartConstant[];
    sizeLimit?: number;
    proportionalPrefixSuffix?: boolean;
    ordered?: boolean;
}

export class CreepSetup {
    public readonly role: string;
    private readonly bodySetup: Required<BodySetup>;

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

    generateBody(energyCapacity: number): BodyPartConstant[] {
        const { pattern, prefix, suffix, sizeLimit, proportionalPrefixSuffix, ordered } = this.bodySetup;
        const prefixCost = bodyCost(prefix);
        const suffixCost = bodyCost(suffix);
        const patternCost = bodyCost(pattern);

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

        if (!patternAdded && pattern.length > 0) {
            body = body.concat(pattern);
            patternAdded = true;
        }

        if (pattern.length === 0 && body.length === 0 && energyCapacity >= prefixCost + suffixCost) {
            // No pattern defined, ensure we at least return prefix + suffix if affordable
            body = body.concat(prefix);
        }

        if (proportionalPrefixSuffix && suffix.length > 0) {
            for (let i = 0; i < repeats; i++) {
                body = body.concat(suffix);
            }
        } else {
            body = body.concat(suffix);
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

export function bodyCost(body: BodyPartConstant[]): number {
    return body.reduce((total, part) => total + BODYPART_COST[part], 0);
}
