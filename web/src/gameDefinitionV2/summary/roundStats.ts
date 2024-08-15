// export const roundStatsFields = <PlayerGameStats extends {}>(games: GameResult)

import type { FlattenObjectUnion } from "@/utils/types";

type BoolRSVal = {
  /** The total number of times that the stat has been true */
  count: number;
  /** The mean number of times that the stat has been true */
  mean: number;
};
type NumRSVal = {
  /** The highest value the stat reached in a single game */
  highest: number;
  /** The lowest value the stat reached in a single game */
  lowest: number;
  /** Sum of all the values the stat reached */
  total: number;
  /** The mean number of times that the stat has been true */
  mean: number;
  nonZero: {
    count: number;
    mean: number;
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
  roundCounts: {
    /** Total number of turns this stat was valid for */
    all: number;
    /**
     * Map of value to number of turns with that value.
     *
     * Can be used for example to find non-zero count (`roundCounts.all - (roundCounts.counts.get(0) ?? 0)`)
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
            roundCounts: {
              all: 1,
              counts: new Map([[statValue, 1]]),
            },
          } satisfies NumStatExpansion;
        } else {
          statAcc.highest = Math.max(statAcc.highest, statValue);
          statAcc.lowest = Math.min(statAcc.lowest, statValue);
          statAcc.total = statAcc.total + statValue;
          statAcc.roundCounts.all += 1;
          statAcc.roundCounts.counts.set(
            statValue,
            (statAcc.roundCounts.counts.get(statValue) ?? 0) + 1,
          );
        }
      } else {
        console.warn(`Unrecognised stat type: "${typ}" for stat:`, key, v);
      }
    }
    return acc;
  }, {} as RoundStatsExpanded<RoundStats>);

// const roundStatsAccumulator = <Rounds extends Record<any, Record<any, number | boolean>> | Record<any, number | boolean>[]>(/*zero: () => {
//   [K in keyof Rounds as Rounds[K] extends number ? K : never]: Rounds[K] extends number ? {} : {}
// }*/): (playerRoundStats: Rounds) => {
//   [K in keyof Rounds]: Rounds[K] extends boolean ? BoolRSVal : NumRSVal;
// } & {
//   favouriteRounds: {
//     [K in keyof Rounds[keyof Rounds]]: {
//       rounds: Set<keyof Rounds>;
//       count: number;
//     }
//   }
// } => {
//   let gameCount = 0;
//   let stats: {
//     [K in keyof Rounds]: Rounds[K] extends boolean ? BoolRSVal : NumRSVal;
//   };
//   const favouriteRounds = {};
//   return (playerRoundStats: Rounds) => {
//     return { favouriteRounds, ...stats};
//   };
// };
