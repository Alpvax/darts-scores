// export const roundStatsFields = <PlayerGameStats extends {}>(games: GameResult)

import type { FlattenObjectUnion, NumericRange } from "@/utils/types";
import type { GameDefinition, GameTurnStatsType } from "../definition";
import type { StatsTypeForGame, SummaryPartAccumulator } from ".";

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
  : // ? {
    //   [K in Stats extends Stats ? keyof Stats : never]: Stats[K]
    // }
    never;

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
> = {
  [K in keyof StatValues<RoundStats>]: StatValues<RoundStats>[K] extends infer StatType
    ? [StatType] extends [boolean]
      ? BoolStatExpansion
      : [StatType] extends [number]
        ? NumStatExpansion
        : {
            valid: never;
            error: "Stat was valid on multiple rounds with multiple types. Should one of the stats be renamed?";
            key: K;
            type: StatType;
          }
    : never;
};

export type RoundStatsExpandedForGame<
  G extends GameDefinition<any, any, any, any, any, any, any, any, any>,
> = RoundStatsExpanded<
  GameTurnStatsType<G> extends infer RoundStats extends
    | Record<any, Record<any, number | boolean>>
    | Record<any, number | boolean>[]
    ? RoundStats
    : any
>;

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
      [K in keyof StatValues<RoundStats>]?: StatValues<RoundStats>[K] extends infer StatType
        ? [StatType] extends [boolean]
          ? BoolStatAcc
          : [StatType] extends [number]
            ? NumStatAcc
            : {
                valid: never;
                error: "Stat was valid on multiple rounds with multiple types. Should one of the stats be renamed?";
                key: K;
                type: StatType;
              }
        : never;
    }
  : never;

type FavDataSingle<RoundKey = string> = {
  rounds: Set<RoundKey>;
  value: number;
};
type FavouriteData<RoundKey = string> = {
  max: FavDataSingle<RoundKey>;
  min: FavDataSingle<RoundKey>;
};
type BoolFavorites<RoundKey = string> = {
  [K in "total" | "roundCount" | "perGameMean" | "rate"]: FavouriteData<RoundKey>;
};
type NumFavorites<RoundKey = string> = {
  highest: FavouriteData<RoundKey>;
  lowest: FavouriteData<RoundKey>;
  total: FavouriteData<RoundKey>;
  perGameMean: FavouriteData<RoundKey>;
  rate: FavouriteData<RoundKey>;
  roundsPlayed: FavouriteData<RoundKey>;
  // roundsPlayed: Map<number, FavouriteData<RoundKey>>;
};
type RoundStatsFavouritesFor<
  G extends GameDefinition<any, any, any, any, any, any, any, any, any>,
> =
  GameTurnStatsType<G> extends infer RoundStats extends
    | Record<any, Record<any, number | boolean>>
    | Record<any, number | boolean>[]
    ? {
        [K in keyof StatValues<RoundStats>]?: StatValues<RoundStats>[K] extends infer StatType
          ? [StatType] extends [boolean]
            ? BoolFavorites<keyof RoundStats>
            : [StatType] extends [number]
              ? NumFavorites<keyof RoundStats>
              : {
                  valid: never;
                  error: "Stat was valid on multiple rounds with multiple types. Should one of the stats be renamed?";
                  key: K;
                  type: StatType;
                }
          : never;
      }
    : {};

type RoundsFavouritesSpecified<
  G extends GameDefinition<any, any, any, any, any, any, any, any, any>,
  FavFields extends string = never,
> = {
  [K in FavFields]?: FavDataSingle<keyof GameTurnStatsType<G>>;
};
type FavSpecFieldDefFor<G extends GameDefinition<any, any, any, any, any, any, any, any, any>> =
  GameTurnStatsType<G> extends infer RoundStats extends
    | Record<any, Record<any, number | boolean>>
    | Record<any, number | boolean>[]
    ? FavSpecFieldDef<RoundStats>
    : never;
type FavSpecFieldDef<
  RoundStats extends Record<any, Record<any, number | boolean>> | Record<any, number | boolean>[],
> = {
  /**
   * Get the value from the round stats
   * @param roundValues the values for the currently processing round
   * @param roundKey the round key ("round.{key}") of the currently processing round
   * @returns the value to use for the stat
   */
  get: (
    roundValues: {
      [K in keyof StatValues<RoundStats>]: StatValues<RoundStats>[K] extends infer StatType
        ? [StatType] extends [boolean]
          ? BoolStatAcc
          : [StatType] extends [number]
            ? NumStatAcc
            : {
                valid: never;
                error: "Stat was valid on multiple rounds with multiple types. Should one of the stats be renamed?";
                key: K;
                type: StatType;
              }
        : never;
    },
    numGames: number,
    roundKey: keyof RoundStats,
  ) => number;
  /**
   * One of the following:
   * - a comparison function
   * - an object specifying the better value (`"highest" | "lowest"`) and optionally a multiplier to round and compare the values (for float comparison)
   * - a string specifying the better value (`"highest" | "lowest"`)
   */
  cmp: FavSpecCmpDefFunc | FavSpecCmpDefObj | FavSpecCmpDefDir;
};
type FavSpecCmpDefDir = "highest" | "lowest";
export const makeFavCmpFromDir = (dir: FavSpecCmpDefDir): FavSpecCmpDefFunc =>
  dir === "highest"
    ? (val, prev) => (val > prev ? "override" : val < prev ? "ignore" : "additional")
    : (val, prev) => (val < prev ? "override" : val > prev ? "ignore" : "additional");
type FavSpecCmpDefObj = {
  /** The value to pick */
  best: "highest" | "lowest";
  /**
   * A multiplier used to compare the values.
   * `delta = Math.round((val - prev) * mult)`.
   *
   * If not specified, no rounding is performed.
   */
  mult?: number;
};
type FavSpecCmpDefFunc = {
  /**
   * Whether the stat is deemed a favourite
   * @param val the val for the round
   * @param prev the existing favourite value
   * @returns `"override"` if the value is better than the previous favourite.
   * `"additional"` if it is equal, so should be added to the set.
   * `"ignore"` if the value is worse than the current favourite.
   */
  (val: number, prev: number): "override" | "additional" | "ignore";
};
export type RoundsFavouritesSpecDef<
  G extends GameDefinition<any, any, any, any, any, any, any, any, any>,
  FavFields extends string = never,
> =
  GameTurnStatsType<G> extends infer RoundStats extends
    | Record<any, Record<any, number | boolean>>
    | Record<any, number | boolean>[]
    ? {
        [K in FavFields]: FavSpecFieldDef<RoundStats>;
      }
    : {};

type T27Turns = {
  valueType: NumericRange<4>;
  statsType: { cliff: boolean; dd: boolean; hits: NumericRange<4> };
  length: 20;
};
type T27GD = GameDefinition<any, any, any, any, any, T27Turns, any, any, any>;
type TGT = GameTurnStatsType<T27GD>;
type T = RoundStatsFavouritesFor<T27GD>;
type TAcc = RoundsAccumulatorPart<T27GD>;
type TFav = RoundsFavouritesSpecDef<T27GD, "cliffs" | "total" | "dd" | "nonZero">;

export type RoundsAccumulatorPart<
  G extends GameDefinition<any, any, any, any, any, any, any, any, any>,
  FavFields extends string = never,
> = SummaryPartAccumulator<
  StatsTypeForGame<G>,
  {
    values: RoundStatsAccumulatedValues<G>;
    favouritesAllFields: RoundStatsFavouritesFor<G>;
    favouritesSpecified: RoundsFavouritesSpecified<G, FavFields>;
  }
>;

const initFavourite = <T>(value: number, roundKey: T): FavouriteData<T> => ({
  max: { rounds: new Set([roundKey]), value },
  min: { rounds: new Set([roundKey]), value },
});
const accumulateFavourite = <T>(value: number, favData: FavouriteData<T>, roundKey: T) => {
  if (value >= favData.max.value) {
    if (value > favData.max.value) {
      favData.max.value = value;
      favData.max.rounds.clear();
    }
    favData.max.rounds.add(roundKey);
    if (favData.min !== favData.max) {
      favData.min.rounds.delete(roundKey);
    }
  }
  if (value <= favData.min.value) {
    if (value < favData.min.value) {
      favData.min.value = value;
      favData.min.rounds.clear();
    }
    favData.min.rounds.add(roundKey);
    if (favData.min !== favData.max) {
      favData.max.rounds.delete(roundKey);
    }
  }
};

export const roundStatsAccumulator = <
  G extends GameDefinition<any, any, any, any, any, any, any, any, any>,
  FavFields extends string,
>(
  favouritesFactory: RoundsFavouritesSpecDef<G, FavFields>,
): RoundsAccumulatorPart<G, FavFields> => ({
  empty: () => ({
    values: {} as RoundStatsAccumulatedValues<G>,
    favouritesAllFields: {} as RoundStatsFavouritesFor<G>,
    favouritesSpecified: {} as RoundsFavouritesSpecified<G, FavFields>,
  }),
  push: ({ values, favouritesAllFields, favouritesSpecified }, pData, numGames) => {
    type TurnStats = GameTurnStatsType<G>;
    for (const [roundKey, roundStats] of Object.entries(pData).filter(([k]) =>
      k.startsWith("round."),
    ) as [keyof typeof values, TurnStats[keyof TurnStats]][]) {
      const roundStatAcc = values[roundKey] ?? ({} as any);
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
            values[roundKey] = roundStatAcc;
          } else {
            statAcc.total += +statValue;
            statAcc.roundsPlayed += 1;
            statAcc.perGameMean = statAcc.total / numGames;
            statAcc.rate = statAcc.total / statAcc.roundsPlayed;
          }
          const favData = favouritesAllFields[statKey as keyof typeof favouritesAllFields] as
            | BoolFavorites<typeof roundKey>
            | undefined;
          if (favData === undefined) {
            (favouritesAllFields as any)[statKey] = {
              total: initFavourite(statAcc!.total, roundKey),
              roundCount: initFavourite(statAcc!.roundsPlayed, roundKey),
              perGameMean: initFavourite(statAcc!.perGameMean, roundKey),
              rate: initFavourite(statAcc!.rate, roundKey),
            } satisfies BoolFavorites<typeof roundKey>;
          } else {
            accumulateFavourite(statAcc.total, favData.total, roundKey);
            accumulateFavourite(statAcc.roundsPlayed, favData.roundCount, roundKey);
            accumulateFavourite(statAcc.perGameMean, favData.perGameMean, roundKey);
            accumulateFavourite(statAcc.rate, favData.rate, roundKey);
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
            values[roundKey] = roundStatAcc;
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
          const favData = favouritesAllFields[statKey as keyof typeof favouritesAllFields] as
            | NumFavorites<typeof roundKey>
            | undefined;
          if (favData === undefined) {
            (favouritesAllFields as any)[statKey] = {
              highest: initFavourite(statAcc!.highest, roundKey),
              lowest: initFavourite(statAcc!.lowest, roundKey),
              total: initFavourite(statAcc!.total, roundKey),
              perGameMean: initFavourite(statAcc!.perGameMean, roundKey),
              rate: initFavourite(statAcc!.total / statAcc!.roundsPlayed.all, roundKey),
              roundsPlayed: initFavourite(statAcc!.roundsPlayed.all, roundKey),
              // roundsPlayed: new Map(
              //   [...statAcc!.roundsPlayed.counts].map(([num, count]) => [
              //     num,
              //     { rounds: new Set([roundKey]), count: statAcc!.total / count },
              //   ]),
              // ),
            } satisfies NumFavorites<typeof roundKey>;
          } else {
            accumulateFavourite(statAcc!.highest, favData.highest, roundKey);
            accumulateFavourite(statAcc!.lowest, favData.lowest, roundKey);
            accumulateFavourite(statAcc!.total, favData.total, roundKey);
            accumulateFavourite(statAcc!.perGameMean, favData.perGameMean, roundKey);
            accumulateFavourite(statAcc!.total / statAcc!.roundsPlayed.all, favData.rate, roundKey);
            accumulateFavourite(statAcc!.roundsPlayed.all, favData.roundsPlayed, roundKey);
            // roundsPlayed?
          }
        } else {
          console.warn(
            `Unrecognised stat type: "${typ}" for "${String(roundKey)}" stat:`,
            statKey,
            val,
          );
        }
      }
      for (const [favKey, favSpec] of Object.entries(favouritesFactory) as [
        keyof typeof favouritesSpecified,
        FavSpecFieldDefFor<G>,
      ][]) {
        const favData = favouritesSpecified[favKey] as FavDataSingle<typeof roundKey> | undefined;
        // @ts-expect-error
        const value = favSpec.get(values[roundKey], numGames, roundKey);
        if (favData === undefined) {
          favouritesSpecified[favKey] = {
            rounds: new Set([roundKey as keyof TurnStats]),
            value,
          } satisfies FavDataSingle<keyof TurnStats>;
        } else {
          let cmp: FavSpecCmpDefFunc;
          switch (typeof favSpec.cmp) {
            case "string":
              cmp = makeFavCmpFromDir(favSpec.cmp as FavSpecCmpDefDir);
              favSpec.cmp = cmp; // Cache cmp function for later
              break;
            case "function":
              cmp = favSpec.cmp;
              break;
            case "object": {
              const { best, mult } = favSpec.cmp;
              cmp =
                mult === undefined
                  ? makeFavCmpFromDir(best)
                  : best === "highest"
                    ? (val, prev) => {
                        const delta = Math.round((val - prev) * mult);
                        return delta > 0 ? "override" : delta < 0 ? "ignore" : "additional";
                      }
                    : (val, prev) => {
                        const delta = Math.round((val - prev) * mult);
                        return delta < 0 ? "override" : delta > 0 ? "ignore" : "additional";
                      };
              favSpec.cmp = cmp; // Cache cmp function for later
              break;
            }
            default:
              console.error(
                `Invalid type for cmp field of favourite rounds "${favKey}"`,
                favSpec.cmp,
              );
              cmp = () => {
                throw new Error(`Invalid type for cmp field of favourite rounds "${favKey}"`);
              };
              break;
          }
          switch (cmp(value, favData!.value)) {
            case "override":
              favData!.value = value;
              favData!.rounds.clear();
            // No break, you still want to add the round to the set
            case "additional":
              favData!.rounds.add(roundKey);
              break;
            case "ignore":
              break;
          }
        }
      }
    }
    return { values, favouritesAllFields, favouritesSpecified };
  },
});
