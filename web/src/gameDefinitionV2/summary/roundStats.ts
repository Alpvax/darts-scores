import type { FlattenObjectUnion, NumericRange } from "@/utils/types";
import type { GameDefinition, GameTurnStatsType } from "../definition";
import type { StatsTypeForGame, SummaryPartAccumulatorWithMeta } from ".";
import type { VNodeChild } from "vue";
import { floatCompareFunc, mapObjectValues } from "@/utils";
import type { gameDefinition27 } from "@/game/27/gameDefv2";
import type { TurnKey, TurnStatsType } from "../types";

type BoolStatAcc = {
  /** The total number of times that the stat has been true */
  total: number;
  /** The maximum number of rounds that the stat could have been true for. Should allow stats for rounds which are not always played */
  roundsPlayed: number;
  /** Mean number of times it was true per game. i.e `total / numGames` */
  perGameMean: number;
  /** Mean number of times it was true for a single round. i.e. `total / roundCount`. Should allow stats for rounds which are not always played */
  rate: number;
};
type NumStatAcc = {
  /** The highest value the stat reached in a single game */
  highest: number;
  /** The lowest value the stat reached in a single game */
  lowest: number;
  /** Sum of all the values the stat reached */
  total: number;
  /** The mean stat value per game */
  perGameMean: number;
  roundsPlayed: {
    /** Total number of turns this stat was valid for across all games */
    all: number;
    /**
     * Map of value to number of turns with that value.
     *
     * Can be used for example to find non-zero count (`roundsPlayed.all - (roundsPlayed.counts.get(0) ?? 0)`)
     */
    counts: Map<number, number>;
  };
};

type StatValues<
  RoundStats extends Record<any, Record<any, number | boolean>> | Record<any, number | boolean>[],
> = (
  RoundStats extends [...any[]]
    ? RoundStats[keyof RoundStats & number]
    : RoundStats[keyof RoundStats]
) extends infer Stats extends {}
  ? FlattenObjectUnion<Stats>
  : never;

type StatTypeMap<
  RoundStats extends Record<any, Record<any, number | boolean>> | Record<any, number | boolean>[],
  BoolTyp,
  NumTyp,
  // OmitInvalid extends boolean = true,
> = {
  [K in keyof StatValues<RoundStats>]: StatValues<RoundStats>[K] extends infer StatType
    ? [StatType] extends [boolean]
      ? BoolTyp
      : [StatType] extends [number]
        ? NumTyp
        : {
            valid: never;
            error: "Stat was valid on multiple rounds with multiple types. Should one of the stats be renamed?";
            key: K;
            type: StatType;
          }
    : never;
}; // extends infer T ? true extends OmitInvalid ? { [K in keyof T as T[K] extends { valid: never } ? never : K]: T[K] } : T : never;

type BoolStatExpansion = {
  /** Number of turns this game where the stat was true */
  total: number;
  /** Total number of turns this stat was valid for */
  max: number;
};
type NumStatExpansion = {
  /** The highest value the stat reached in a single turn */
  highest: number;
  /** The lowest value the stat reached in a single turn */
  lowest: number;
  /** Sum of the stat across all the turns in the game */
  total: number;
  roundsPlayed: {
    /** Total number of turns this stat was valid for */
    all: number;
    /**
     * Map of value to number of turns with that value.
     *
     * Can be used for example to find non-zero count (`roundsPlayed.all - (roundsPlayed.counts.get(0) ?? 0)`)
     */
    counts: Map<number, number>;
  };
};

export type RoundStatsExpanded<
  RoundStats extends Record<any, Record<any, number | boolean>> | Record<any, number | boolean>[],
> = StatTypeMap<RoundStats, BoolStatExpansion, NumStatExpansion>;

export const expandRoundStats = <
  RoundStats extends Record<any, Record<any, number | boolean>> | Record<any, number | boolean>[],
>(
  playerRoundStats: RoundStats,
): RoundStatsExpanded<RoundStats> =>
  Object.values(playerRoundStats).reduce((acc, stats) => {
    for (const [__k, v] of Object.entries(stats)) {
      const key = __k as keyof typeof acc;
      const typ = typeof v;
      if (typ === "boolean") {
        const statValue = v as boolean;
        const statAcc = acc[key] as unknown as BoolStatExpansion | undefined;
        if (statAcc === undefined) {
          // @ts-expect-error
          acc[key] = { total: statValue ? 1 : 0, max: 1 } satisfies BoolStatExpansion;
        } else {
          statAcc.total += statValue ? 1 : 0;
          statAcc.max += 1;
        }
      } else if (typ === "number") {
        const statValue = v as number;
        const statAcc = acc[key] as unknown as NumStatExpansion | undefined;
        if (statAcc === undefined) {
          // @ts-expect-error
          acc[key] = {
            highest: statValue,
            lowest: statValue,
            total: statValue,
            roundsPlayed: {
              all: 1,
              counts: new Map([[statValue, 1]]),
            },
          } satisfies NumStatExpansion;
        } else {
          statAcc.highest = Math.max(statAcc.highest, statValue);
          statAcc.lowest = Math.min(statAcc.lowest, statValue);
          statAcc.total = statAcc.total + statValue;
          statAcc.roundsPlayed.all += 1;
          statAcc.roundsPlayed.counts.set(
            statValue,
            (statAcc.roundsPlayed.counts.get(statValue) ?? 0) + 1,
          );
        }
      } else {
        console.warn(`Unrecognised stat type: "${typ}" for stat:`, key, v);
      }
    }
    return acc;
  }, {} as RoundStatsExpanded<RoundStats>);

export type RoundStatsAccumulatedValues<
  G extends GameDefinition<any, any, any, any, any, any, any, any, any>,
> = [GameTurnStatsType<G>] extends [
  infer RoundStats extends
    | Record<any, Record<any, number | boolean>>
    | Record<any, number | boolean>[],
]
  ? {
      [K in keyof RoundStats & (string | number) as `round.${K}`]?: {
        [SK in keyof RoundStats[K] as RoundStats[K][SK] extends boolean | number ? SK : never]: [
          RoundStats[K][SK],
        ] extends [infer StatType]
          ? [StatType] extends [boolean]
            ? BoolStatAcc
            : [StatType] extends [number]
              ? NumStatAcc
              : never
          : never;
      };
    }
  : never;

type RoundKey<G extends GameDefinition<any, any, any, any, any, any, any, any, any>> = [
  GameTurnStatsType<G>,
] extends [
  infer RoundStats extends
    | Record<any, Record<any, number | boolean>>
    | Record<any, number | boolean>[],
]
  ? keyof { [K in keyof RoundStats & (string | number) as `round.${K}`]: never }
  : never;

type FavSpecCmpDefDir = "highest" | "lowest";
type FavSpecCmpDefObj = {
  /** The value to pick */
  best: "highest" | "lowest";
  /**
   * The number of decimal places to compare.
   * @see floatCompareFunc.
   */
  precision?: number;
};
export type ComparisonResult = "better" | "equal" | "worse";
type FavSpecCmpDefFunc = {
  /**
   * Whether the stat is deemed a favourite
   * @param val the val for the round
   * @param prev the existing favourite value
   * @returns `"better"` if the value is better than the previous favourite.
   * `"equal"` if it is equal, so should be added to the set.
   * `"worse"` if the value is worse than the current favourite.
   */
  (val: number, prev: number): ComparisonResult;
};
export const makeFavCmpFromDir = (dir: FavSpecCmpDefDir): FavSpecCmpDefFunc =>
  dir === "highest"
    ? (val, prev) => (val > prev ? "better" : val < prev ? "worse" : "equal")
    : (val, prev) => (val < prev ? "better" : val > prev ? "worse" : "equal");

export type RoundFieldGetterFor<
  G extends GameDefinition<any, any, any, any, any, any, any, any, any>,
  Return = {
    total: number;
    rateDivisor?: number;
  },
> = [
  [
    G extends GameDefinition<any, any, any, any, any, infer TurnType, any, any, any>
      ? [
          TurnStatsType<TurnType> extends Record<any, infer RStats>
            ? RStats
            : TurnStatsType<TurnType> extends (infer AStats)[]
              ? AStats
              : never,
          keyof { [K in (TurnKey<TurnType> & string) | number as `round.${K}`]: never },
        ]
      : never,
  ] extends [[infer RoundStats, infer RoundKey extends string | number]]
    ? (
        roundValues: {
          [SK in keyof RoundStats as RoundStats[SK] extends boolean | number ? SK : never]: [
            RoundStats[SK],
          ] extends [infer StatType]
            ? [StatType] extends [boolean]
              ? BoolStatAcc
              : [StatType] extends [number]
                ? NumStatAcc
                : never
            : never;
        },
        numGames: number,
        roundKey: RoundKey,
      ) => Return
    : never,
] extends [(v: infer V, n: infer N, k: infer K) => Return]
  ? (roundValues: V, numGames: N, roundKey: K) => Return
  : never;
export type RoundFieldGetter<
  RoundStats extends Record<any, Record<any, number | boolean>> | Record<any, number | boolean>[],
  Return = {
    total: number;
    rateDivisor?: number;
  },
  RoundKey extends string = keyof {
    [K in RoundStats extends [...any[]]
      ? keyof RoundStats & number
      : keyof RoundStats & string as `round.${K}`]: never;
  },
> = [
  RoundStats extends Record<any, infer RStats>
    ? RStats
    : RoundStats extends (infer AStats)[]
      ? AStats
      : never,
] extends [infer Stats]
  ? (
      roundValues: {
        [SK in keyof Stats as Stats[SK] extends boolean | number ? SK : never]: [
          Stats[SK],
        ] extends [infer StatType]
          ? [StatType] extends [boolean]
            ? BoolStatAcc
            : [StatType] extends [number]
              ? NumStatAcc
              : never
          : never;
      },
      numGames: number,
      roundKey: RoundKey,
    ) => Return
  : never;

type RoundFieldDef<G extends GameDefinition<any, any, any, any, any, any, any, any, any>> = {
  label: string | VNodeChild;
  /**
   * Get the value from the round stats
   * @param roundValues the values for the currently processing round
   * @param roundKey the round key ("round.{key}") of the currently processing round
   * @returns the value to use for the stat, or the [value, denominator] for float values ([numerator, denominator])
   */
  get: RoundFieldGetterFor<G>;
  /**
   * One of the following:
   * - a comparison function
   * - an object specifying the better value (`"highest" | "lowest"`) and optionally a multiplier to round and compare the values (for float comparison)
   * - a string specifying the better value (`"highest" | "lowest"`)
   */
  cmp: FavSpecCmpDefFunc | FavSpecCmpDefObj | FavSpecCmpDefDir;
  /** Value to ignore (e.g. 0 when all values will be more than zero) when calculating the favourite */
  ignoreValue?: number;
};
/** RoundsFieldDef with cmp normalised / cached as a function */
type RoundFieldNorm<
  G extends GameDefinition<any, any, any, any, any, any, any, any, any>,
  // RoundKey extends string = string,
> = Omit<RoundFieldDef<G>, "cmp" | "key"> & {
  key: string;
  cmp: FavSpecCmpDefFunc;
};

export type RoundsFieldDef<
  G extends GameDefinition<any, any, any, any, any, any, any, any, any>,
  /** The different rows available for each round (e.g. total, non-zero) */
  RoundsField extends string,
> = {
  [K in RoundsField]: RoundFieldDef<G>;
};

type FavDataSingle<RoundKey = string> = {
  rounds: Set<RoundKey>;
  /**
   * Value used for comparing other values against.
   * Not necessesarily accurate to more than one round, but **MUST** compare equally
   * (using the roundDef.cmp function) with the values from the other rounds in the set
   */
  value: number;
  /**
   * Whether the favourite should be ignored (e.g. the value is 0, so all rounds are favourites)
   */
  valid: boolean;
};

type RoundsFavourites<RoundsField extends string = never, RoundKeys = string> = {
  // [K in RoundsField]?: FavDataSingle<keyof GameTurnStatsType<G>>;
  [K in RoundsField]?: FavDataSingle<RoundKeys>;
};

export type RoundsAccumulatorPart<
  G extends GameDefinition<any, any, any, any, any, any, any, any, any>,
  RoundsField extends string,
> = SummaryPartAccumulatorWithMeta<
  StatsTypeForGame<G>,
  {
    valuesRaw: RoundStatsAccumulatedValues<G>;
    favourites: RoundsFavourites<RoundsField, keyof RoundStatsAccumulatedValues<G>>;
  },
  {
    [K in RoundsField]: {
      get: RoundFieldGetterFor<G, number>;
      delta?: RoundFieldGetterFor<G, number>;
      cmp: FavSpecCmpDefFunc;
    };
  }
>;

export const roundStatsAccumulator = <
  G extends GameDefinition<any, any, any, any, any, any, any, any, any>,
  RoundsField extends string,
>(
  roundsFieldsDefinition: RoundsFieldDef<G, RoundsField>,
): RoundsAccumulatorPart<G, RoundsField> => {
  const roundsFieldsDef: {
    [K in RoundsField]: RoundFieldNorm<G>;
  } = mapObjectValues(roundsFieldsDefinition, ({ cmp, ...def }, key) => {
    switch (typeof cmp) {
      case "string":
        return {
          key,
          cmp: makeFavCmpFromDir(cmp),
          ...def,
        };
      case "function":
        return { key, cmp, ...def };
      case "object": {
        const { best, precision } = cmp;
        if (precision === undefined) {
          return {
            key,
            cmp: makeFavCmpFromDir(best),
            ...def,
          };
        }
        const doCmp = floatCompareFunc(precision);
        /** [val > prev, val < prev] */
        const lookup: [ReturnType<FavSpecCmpDefFunc>, ReturnType<FavSpecCmpDefFunc>] =
          best === "highest" ? ["better", "worse"] : ["worse", "better"];
        return {
          key,
          cmp: (val, prev) => {
            const d = doCmp(val, prev);
            return d > 0 ? lookup[0] : d < 0 ? lookup[1] : "equal";
          },
          ...def,
        };
      }
      default: {
        throw new Error(
          `Invalid type for cmp field of favourite rounds "${key}": ${JSON.stringify(cmp)}`,
        );
      }
    }
  });
  return {
    meta: mapObjectValues(roundsFieldsDef, ({ get, cmp }) => ({
      get: ((roundValues, numGames, roundKey) => {
        const { total, rateDivisor } = get(roundValues, numGames, roundKey);
        return total / (rateDivisor ?? 1);
      }) as RoundFieldGetterFor<G, number>,
      cmp,
    })),
    empty: () => ({
      valuesRaw: {} as RoundStatsAccumulatedValues<G>,
      favourites: {} as RoundsFavourites<RoundsField, keyof RoundStatsAccumulatedValues<G>>,
    }),
    delta: ({ valuesRaw }, pData, numGames) => {
      type TurnStats = GameTurnStatsType<G>;
      const roundDeltas = {} as typeof valuesRaw;
      for (const [roundKey, roundStats] of Object.entries(pData).filter(([k]) =>
        k.startsWith("round."),
      ) as [keyof typeof valuesRaw, TurnStats[keyof TurnStats]][]) {
        const prevRoundStats = valuesRaw[roundKey] ?? ({} as any);
        // @ts-expect-error
        roundDeltas[roundKey] = mapObjectValues(roundStats as any, (val, statKey) => {
          const typ = typeof val;
          if (typ === "boolean") {
            const statValue = +(val as boolean);
            let statAcc = prevRoundStats[statKey] as unknown as BoolStatAcc | undefined;
            const total = (statAcc?.total ?? 0) + statValue;
            const ret: BoolStatAcc = {
              total: statValue,
              roundsPlayed: 1,
              perGameMean: total / numGames,
              rate: statValue,
            };
            if (statAcc !== undefined) {
              ret.perGameMean -= (total - statValue) / (numGames - 1);
              ret.rate -= (total - statValue) / statAcc.roundsPlayed;
            }
            return ret;
          } else if (typ === "number") {
            const statValue = val as number;
            let statAcc = prevRoundStats[statKey] as unknown as NumStatAcc | undefined;
            if (statAcc === undefined) {
              return {
                highest: statValue,
                lowest: statValue,
                total: statValue,
                perGameMean: statValue,
                roundsPlayed: {
                  all: 1,
                  counts: new Map([[statValue, 1]]),
                },
              } satisfies NumStatAcc;
            } else {
              return {
                highest: Math.max(0, statValue - statAcc.highest),
                lowest: Math.min(0, statValue - statAcc.lowest),
                total: statValue,
                perGameMean:
                  (statAcc.total + statValue) / numGames - statAcc.total / (numGames - 1),
                roundsPlayed: {
                  all: 1,
                  counts: new Map(
                    [...statAcc.roundsPlayed.counts].map(([k, v]) => [k, k === statValue ? 1 : 0]),
                  ),
                },
              } satisfies NumStatAcc;
            }
          } else {
            console.warn(
              `Unrecognised stat type: "${typ}" for "${String(roundKey)}" stat:`,
              statKey,
              val,
            );
          }
        });
      }
      const favourites = mapObjectValues(roundsFieldsDef, (fieldDef, fieldKey) =>
        (
          Object.entries(valuesRaw) as unknown as [
            keyof typeof valuesRaw,
            BoolStatAcc | NumStatAcc,
          ][]
        ).reduce(
          (acc, [roundKey, values]) => {
            const { total, rateDivisor } = fieldDef.get(values, numGames, roundKey);
            const value = rateDivisor
              ? rateDivisor >= 1
                ? total / rateDivisor
                : (console.warn(`[${String(roundKey)},${fieldKey}] rateDivisor < 1:`, rateDivisor),
                  total)
              : total;
            if (acc === undefined) {
              const valid =
                fieldDef.ignoreValue !== undefined
                  ? fieldDef.cmp(value, fieldDef.ignoreValue) === "better"
                  : true;
              return {
                rounds: new Set(valid ? [roundKey] : []),
                value,
                valid,
              };
            } else {
              // console.log("Comparing faves:", pData.playerId, roundKey, value, acc, fieldDef.cmp(value, acc.value), fieldDef);//XXX
              switch (fieldDef.cmp(value, acc.value)) {
                case "better":
                  acc.valid = true;
                  acc.value = value;
                  acc.rounds.clear();
                // No break, you still want to add the round to the set
                // eslint-disable-next-line no-fallthrough
                case "equal": {
                  if (acc.valid) {
                    acc.rounds.add(roundKey);
                  }
                  break;
                }
                case "worse":
                  break;
              }
              return acc;
            }
          },
          undefined as
            | { rounds: Set<keyof typeof valuesRaw>; value: number; valid: boolean }
            | undefined,
        ),
      );
      return { valuesRaw: roundDeltas, favourites };
    },
    push: ({ valuesRaw }, pData, numGames) => {
      type TurnStats = GameTurnStatsType<G>;
      for (const [roundKey, roundStats] of Object.entries(pData).filter(([k]) =>
        k.startsWith("round."),
      ) as [keyof typeof valuesRaw, TurnStats[keyof TurnStats]][]) {
        const roundStatAcc = valuesRaw[roundKey] ?? ({} as any);
        for (const [statKey, val] of Object.entries(roundStats as object)) {
          const typ = typeof val;
          if (typ === "boolean") {
            const statValue = val as boolean;
            let statAcc = roundStatAcc[statKey] as unknown as BoolStatAcc | undefined;
            if (statAcc === undefined) {
              const total = +statValue;
              statAcc = {
                total,
                roundsPlayed: 1,
                perGameMean: total / numGames,
                rate: total,
              } satisfies BoolStatAcc;
              roundStatAcc[statKey] = statAcc;
              valuesRaw[roundKey] = roundStatAcc;
            } else {
              statAcc.total += +statValue;
              statAcc.roundsPlayed += 1;
              statAcc.perGameMean = statAcc.total / numGames;
              statAcc.rate = statAcc.total / statAcc.roundsPlayed;
            }
          } else if (typ === "number") {
            const statValue = val as number;
            let statAcc = roundStatAcc[statKey] as unknown as NumStatAcc | undefined;
            if (statAcc === undefined) {
              statAcc = {
                highest: statValue,
                lowest: statValue,
                total: statValue,
                perGameMean: statValue,
                roundsPlayed: {
                  all: 1,
                  counts: new Map([[statValue, 1]]),
                },
              } satisfies NumStatAcc;
              roundStatAcc[statKey] = statAcc;
              valuesRaw[roundKey] = roundStatAcc;
            } else {
              statAcc.highest = Math.max(statAcc.highest, statValue);
              statAcc.lowest = Math.min(statAcc.lowest, statValue);
              statAcc.total = statAcc.total + statValue;
              statAcc.perGameMean = statAcc.total / numGames;
              statAcc.roundsPlayed.all += 1;
              statAcc.roundsPlayed.counts.set(
                statValue,
                (statAcc.roundsPlayed.counts.get(statValue) ?? 0) + 1,
              );
            }
          } else {
            console.warn(
              `Unrecognised stat type: "${typ}" for "${String(roundKey)}" stat:`,
              statKey,
              val,
            );
          }
        }
      }
      const favourites = mapObjectValues(roundsFieldsDef, (fieldDef, fieldKey) =>
        (
          Object.entries(valuesRaw) as unknown as [
            keyof typeof valuesRaw,
            BoolStatAcc | NumStatAcc,
          ][]
        ).reduce(
          (acc, [roundKey, values]) => {
            const { total, rateDivisor } = fieldDef.get(values, numGames, roundKey);
            const value = rateDivisor
              ? rateDivisor >= 1
                ? total / rateDivisor
                : (console.warn(`[${String(roundKey)},${fieldKey}] rateDivisor < 1:`, rateDivisor),
                  total)
              : total;
            if (acc === undefined) {
              const valid =
                fieldDef.ignoreValue !== undefined
                  ? fieldDef.cmp(value, fieldDef.ignoreValue) === "better"
                  : true;
              return {
                rounds: new Set(valid ? [roundKey] : []),
                value,
                valid,
              };
            } else {
              // console.log("Comparing faves:", pData.playerId, roundKey, value, acc, fieldDef.cmp(value, acc.value), fieldDef);//XXX
              switch (fieldDef.cmp(value, acc.value)) {
                case "better":
                  acc.valid = true;
                  acc.value = value;
                  acc.rounds.clear();
                // No break, you still want to add the round to the set
                // eslint-disable-next-line no-fallthrough
                case "equal": {
                  if (acc.valid) {
                    acc.rounds.add(roundKey);
                  }
                  break;
                }
                case "worse":
                  break;
              }
              return acc;
            }
          },
          undefined as
            | { rounds: Set<keyof typeof valuesRaw>; value: number; valid: boolean }
            | undefined,
        ),
      );
      return { valuesRaw, favourites };
    },
  };
};
