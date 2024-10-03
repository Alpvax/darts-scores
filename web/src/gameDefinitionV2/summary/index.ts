import type { VNodeChild } from "vue";
import ArrayKeyedMap from "array-keyed-map";
import type { Position } from "..";
import type { PlayerDataFull, PlayerTurnData, TurnKey, TurnStatsType } from "../types";
import type { GameDefinition, PlayerDataForGame } from "../definition";
import type { GameResult } from "../gameResult";
import {
  roundStatsAccumulator,
  type ComparisonResult,
  type RoundsAccumulatorPart,
  type RoundsFieldDef,
} from "./roundStats";
import { floatCompareFunc, mapObjectValues, type ClassBindings } from "@/utils";
import { createSummaryComponent } from "./summaryComponent";

type FloatingFieldDef<PlayerGameStats extends {}> = (Omit<
  SummaryFieldDef<number, PlayerGameStats>,
  "cmp" | "highlight" | "displayCompact" | "extended"
> & {
  highlight?:
    | ((
        cmpValue: (val: number) => number,
        limits: { highest: number; lowest: number },
      ) => ClassBindings)
    | {
        [clas: string]: "highest" | "lowest" | number;
      };
  displayCompact?: (valueFormatted: string, playerData: PlayerGameStats) => VNodeChild;
  extended?: (value: { raw: number; formatted: string }, playerData: PlayerGameStats) => VNodeChild;
}) & {
  maximumFractionDigits?: number;
  format?: Intl.NumberFormatOptions;
};

export const floatField = <PlayerGameStats extends {}>({
  label,
  value,
  displayCompact,
  description,
  extended,
  highlight: defHighlight,
  ...def
}: FloatingFieldDef<PlayerGameStats>): SummaryFieldDef<number, PlayerGameStats> => {
  const format = new Intl.NumberFormat(undefined, {
    maximumFractionDigits: def.maximumFractionDigits,
    ...def.format,
  });
  const { maximumFractionDigits, style } = format.resolvedOptions();
  const maxFD = style === "percent" ? (maximumFractionDigits ?? 0) + 2 : maximumFractionDigits;
  const cmp = maxFD ? floatCompareFunc(maxFD) : (a: number, b: number) => a - b;
  const highlight: SummaryFieldDef<number, PlayerGameStats>["highlight"] =
    defHighlight === undefined
      ? () => undefined
      : typeof defHighlight === "object"
        ? (value, limits) =>
            mapObjectValues(
              defHighlight as {
                [clas: string]: "highest" | "lowest" | number;
              },
              (val) =>
                cmp(
                  value,
                  val === "highest" ? limits.highest : val === "lowest" ? limits.lowest : val,
                ) === 0,
            )
        : (value, limits) =>
            (
              defHighlight as (
                cmpValue: (val: number) => number,
                limits: { highest: number; lowest: number },
              ) => ClassBindings
            )((val) => cmp(value, val), limits);
  return {
    label,
    value,
    cmp,
    highlight,
    displayCompact: displayCompact
      ? (value, playerData) => displayCompact(format.format(value), playerData)
      : format.format,
    description,
    extended: extended
      ? (value, playerData) => extended({ raw: value, formatted: format.format(value) }, playerData)
      : undefined,
    ...def,
  };
};

export type SummaryFieldDef<T, PlayerGameStats extends {}> = {
  label: string;
  value: (playerData: PlayerGameStats, playerId: string) => T;
  cmp: (a: T, b: T) => number;
  deltaDirection?: ((delta: T) => ComparisonResult) | "positive" | "negative" | "neutral";
  highlight: (value: T, limits: { highest: T; lowest: T }) => ClassBindings;
  /** The content of the <td> cell for a given player */
  displayCompact: (value: T, playerData: PlayerGameStats) => VNodeChild;
  /** The rows when expanded.
   * If string, it is the label for the row which is a duplicate of the compact row.
   * Otherwise, it is a SummaryFieldDef, without allowing for further nested rows.
   */
  displayExpanded?: (string | Omit<SummaryFieldDef<any, PlayerGameStats>, "displayExpanded">)[];
  /** Tooltip / hover over label */
  description?: () => VNodeChild;
  /** Tooltip / hover element */
  extended?: (value: T, playerData: PlayerGameStats) => VNodeChild;
  //TODO: implement click-filter
};

/**
 * Metadata used to accumulate player stats into part of a summary.
 */
export type SummaryPartAccumulator<PlayerData extends StatsTypeFor<any, any, any>, SummaryPart> = {
  /** Create an empty summary (the initial / zero values, when no games have been played) */
  empty(): SummaryPart;
  /**
   * Accumulate an entry into the summary
   * @param accumulated The previous summary values
   * @param playerData The player data to retrieve values for the game from
   * @param numGames The total number of games played by the player, for convenience creating rate / mean
   * @param opponents The opponents in this game (i.e. all players except this one)
   * @param tiebreakWinner The winner of this game if it was a tiebreak, or undefined if it was won outright
   */
  push(
    accumulated: SummaryPart,
    playerData: PlayerData,
    numGames: number,
    opponents: string[],
    tiebreakWinner?: string,
  ): SummaryPart;
  delta?: (
    accumulated: SummaryPart,
    playerData: PlayerData,
    numGames: number,
    opponents: string[],
    tiebreakWinner?: string,
  ) => SummaryPart;
};
/**
 * Metadata used to accumulate player stats into part of a summary.
 * Has an additional meta field which can be used from component
 */
export type SummaryPartAccumulatorWithMeta<
  PlayerData extends StatsTypeFor<any, any, any>,
  SummaryPart,
  CommonMeta,
> = SummaryPartAccumulator<PlayerData, SummaryPart> & {
  meta: CommonMeta;
};

export type SummaryAccumulatorDef<PlayerData extends StatsTypeFor<any, any, any>> = {
  [k: string]: SummaryPartAccumulator<PlayerData, any>;
};
export type SummaryAccumulatorForGame<
  G extends GameDefinition<any, any, any, any, any, any, any, any, any>,
> = {
  [k: string]: SummaryPartAccumulator<StatsTypeForGame<G>, any>;
};
export type SummaryAccumulatorForGameTyped<
  G extends GameDefinition<any, any, any, any, any, any, any, any, any>,
  SummaryParts extends { [k: string]: any },
> = {
  [K in keyof SummaryParts]: SummaryPartAccumulator<StatsTypeForGame<G>, SummaryParts[K]>;
};

type SummaryPartTypes<
  G extends GameDefinition<any, any, any, any, any, any, any, any, any>,
  SummaryParts extends {
    [k: string]:
      | SummaryPartAccumulatorWithMeta<StatsTypeForGame<G>, any, any>
      | SummaryPartAccumulator<StatsTypeForGame<G>, any>;
  },
  RoundsField extends string,
> = {
  [K in keyof SummaryParts as K extends keyof FixedSummaryAccumulatorParts<G, RoundsField>
    ? never
    : K]: SummaryParts[K] extends SummaryPartAccumulatorWithMeta<any, infer T, infer M>
    ? [T, M]
    : SummaryParts[K] extends SummaryPartAccumulator<any, infer T>
      ? [T]
      : never;
};

export const makeSummaryAccumulatorFactoryFor = <
  G extends GameDefinition<any, any, any, any, any, any, any, any, any>,
  SummaryParts extends {
    [k: string]:
      | SummaryPartAccumulatorWithMeta<StatsTypeForGame<G>, any, any>
      | SummaryPartAccumulator<StatsTypeForGame<G>, any>;
  } & {
    [K in keyof Omit<FixedSummaryAccumulatorParts<G, RoundsField>, "score">]?: never;
  },
  RoundsField extends string,
>(
  gameDef: G,
  {
    score: scoreDef,
    ...summaryParts
  }: {
    [K in keyof SummaryParts]: SummaryParts[K] /* extends [infer T, infer M]
      ? SummaryPartAccumulatorWithMeta<StatsTypeForGame<G>, T, M>
      : SummaryPartTypes[K] extends [infer T]
        ? SummaryPartAccumulator<StatsTypeForGame<G>, T>
        : never;*/;
  } & {
    score?: {
      minimum?: number;
      maximum?: number;
    };
  },
  roundsDef?: RoundsFieldDef<G, RoundsField>,
): {
  parts: SummaryAccumulatorParts<G, SummaryPartTypes<G, SummaryParts, RoundsField>, RoundsField>;
  create: () => SummaryAccumulator<G, SummaryPartTypes<G, SummaryParts, RoundsField>, RoundsField>;
  createComponent: () => ReturnType<
    typeof createSummaryComponent<G, SummaryPartTypes<G, SummaryParts, RoundsField>, RoundsField>
  >;
} => {
  type PlayerData = StatsTypeForGame<G>;
  type AccumulatorPart<T> = SummaryPartAccumulator<PlayerData, T>;
  const scoreLimits = {
    min: scoreDef?.minimum ?? Number.MIN_SAFE_INTEGER,
    max: scoreDef?.maximum ?? Number.MAX_SAFE_INTEGER,
  };
  const scoreAccumulator: ScoreAccumulatorPart<G> = (([best, worst, cmpB, cmpW]: [
    number,
    number,
    (a: number, b: number) => number,
    (a: number, b: number) => number,
  ]) => ({
    empty: () => ({
      best,
      worst,
      total: 0,
      mean: 0,
    }),
    push: ({ best, worst, total }, { score }, numGames) => {
      const tot = total + score;
      return {
        best: cmpB(best, score),
        worst: cmpW(worst, score),
        total: tot,
        mean: tot / numGames,
      };
    },
  }))(
    gameDef.positionOrder === "highestFirst"
      ? [scoreLimits.min, scoreLimits.max, Math.max, Math.min]
      : [scoreLimits.max, scoreLimits.min, Math.min, Math.max],
  );

  const winsAccumulator: WinsAccumulatorPart<G> = {
    empty: () => ({
      all: {
        totalOutright: 0,
        meanOutright: 0,
        tiebreakWins: 0,
        tiebreaksPlayed: 0,
        tiebreakWinRate: 0,
        total: 0,
        mean: 0,
      },
      byOpponents: new ArrayKeyedMap(),
    }),
    delta: ({ all, byOpponents }, pData, numGames, opponents, tiebreakWinner) => {
      const win =
        pData.position.pos === 1 && (tiebreakWinner ? tiebreakWinner === pData.playerId : true);
      const tie = pData.position.players.filter((pid: string) => pid !== pData.playerId).length > 0;

      const tieDelta = tie ? 1 : 0;
      const outrightDelta = win && !tie ? 1 : 0;
      const tiebreakDelta = win && tie ? 1 : 0;
      const anyDelta = win ? 1 : 0;

      // Always sort to prevent duplicate entries spread through map
      const key = opponents.toSorted();
      const v = byOpponents.get(key) ?? {
        totalOutright: 0,
        meanOutright: 0,
        tiebreakWins: 0,
        tiebreaksPlayed: 0,
        tiebreakWinRate: 0,
        total: 0,
        mean: 0,
        gameCount: 0,
      };

      return {
        all: {
          totalOutright: outrightDelta,
          meanOutright: (all.totalOutright + outrightDelta) / numGames - all.meanOutright,
          tiebreakWins: tiebreakDelta,
          tiebreaksPlayed: tieDelta,
          tiebreakWinRate:
            (all.tiebreakWins + tiebreakDelta) / (all.tiebreaksPlayed + tieDelta) -
            all.tiebreakWinRate,
          total: anyDelta,
          mean: (all.total + anyDelta) / numGames - all.mean,
        },
        byOpponents: new ArrayKeyedMap([
          [
            key,
            {
              totalOutright: outrightDelta,
              meanOutright: (v.totalOutright + outrightDelta) / numGames - v.meanOutright,
              tiebreakWins: tiebreakDelta,
              tiebreaksPlayed: tieDelta,
              tiebreakWinRate:
                (v.tiebreakWins + tiebreakDelta) / (v.tiebreaksPlayed + tieDelta) -
                v.tiebreakWinRate,
              total: anyDelta,
              mean: (v.total + anyDelta) / numGames - v.mean,
              gameCount: 1,
            },
          ],
        ]),
      };
    },
    push: ({ all, byOpponents }, pData, numGames, opponents, tiebreakWinner) => {
      const win =
        pData.position.pos === 1 && (tiebreakWinner ? tiebreakWinner === pData.playerId : true);
      const tie = pData.position.players.filter((pid: string) => pid !== pData.playerId).length > 0;

      const tieDelta = tie ? 1 : 0;
      const outrightDelta = win && !tie ? 1 : 0;
      const tiebreakDelta = win && tie ? 1 : 0;
      const anyDelta = win ? 1 : 0;

      // Always sort to prevent duplicate entries spread through map
      const key = opponents.toSorted();
      const v = byOpponents.get(key) ?? {
        totalOutright: 0,
        meanOutright: 0,
        tiebreakWins: 0,
        tiebreaksPlayed: 0,
        tiebreakWinRate: 0,
        total: 0,
        mean: 0,
        gameCount: 0,
      };

      let totalOutright = v.totalOutright + outrightDelta;
      let tiebreakWins = v.tiebreakWins + tiebreakDelta;
      let tiebreaksPlayed = v.tiebreaksPlayed + tieDelta;
      let total = v.total + anyDelta;

      byOpponents.set(key, {
        totalOutright,
        meanOutright: totalOutright / numGames,
        tiebreakWins,
        tiebreaksPlayed,
        tiebreakWinRate: tiebreakWins / tiebreaksPlayed,
        total,
        mean: total / numGames,
        gameCount: v.gameCount + 1,
      });

      totalOutright = all.totalOutright + outrightDelta;
      tiebreakWins = all.tiebreakWins + tiebreakDelta;
      tiebreaksPlayed = all.tiebreaksPlayed + tieDelta;
      total = all.total + anyDelta;
      return {
        all: {
          totalOutright,
          meanOutright: totalOutright / numGames,
          tiebreakWins,
          tiebreaksPlayed,
          tiebreakWinRate: tiebreakWins / tiebreaksPlayed,
          total,
          mean: total / numGames,
        },
        byOpponents, //TODO: don't mutate existing copy?
      };
    },
  };

  const roundsAccumulator = roundStatsAccumulator<G, RoundsField>(
    roundsDef ?? ({} as RoundsFieldDef<G, RoundsField>),
  );

  const parts = Object.assign(
    { score: scoreAccumulator, wins: winsAccumulator, rounds: roundsAccumulator },
    summaryParts,
  ) as SummaryAccumulatorParts<G, SummaryPartTypes<G, SummaryParts, RoundsField>, RoundsField>;
  return {
    parts,
    create: () =>
      new SummaryAccumulator<G, SummaryPartTypes<G, SummaryParts, RoundsField>, RoundsField>(parts),
    createComponent: () =>
      createSummaryComponent<G, SummaryPartTypes<G, SummaryParts, RoundsField>, RoundsField>(parts),
  };
};

export interface FixedSummaryAccumulatorParts<
  G extends GameDefinition<any, any, any, any, any, any, any, any, any>,
  RoundsField extends string,
> {
  score: ScoreAccumulatorPart<G>;
  wins: WinsAccumulatorPart<G>;
  rounds: RoundsAccumulatorPart<G, RoundsField>;
}

export type SummaryAccumulatorParts<
  G extends GameDefinition<any, any, any, any, any, any, any, any, any>,
  SummaryPartTypes extends { [k: string]: [any] | [any, any] } & {
    score?: never;
    wins?: never;
    numGames?: never;
    rounds?: never;
  },
  RoundsField extends string,
> = FixedSummaryAccumulatorParts<G, RoundsField> & {
  [K in keyof SummaryPartTypes as K extends
    | keyof FixedSummaryAccumulatorParts<G, RoundsField>
    | "numGames"
    ? never
    : K]: [SummaryPartTypes[K]] extends [[infer T, infer M]]
    ? SummaryPartAccumulatorWithMeta<StatsTypeForGame<G>, T, M>
    : [SummaryPartTypes[K]] extends [[infer T]]
      ? SummaryPartAccumulator<StatsTypeForGame<G>, T>
      : never;
};

export type PlayerSummaryValues<
  G extends GameDefinition<any, any, any, any, any, any, any, any, any>,
  SummaryPartTypes extends { [k: string]: [any] | [any, any] },
  RoundsField extends string,
> = {
  numGames: number;
  score: AccumulatorValuesLookup<ScoreAccumulatorPart<G>>;
  wins: AccumulatorValuesLookup<WinsAccumulatorPart<G>>;
  rounds: AccumulatorValuesLookup<RoundsAccumulatorPart<G, RoundsField>>;
} & {
  [K in keyof SummaryPartTypes as K extends
    | keyof FixedSummaryAccumulatorParts<G, RoundsField>
    | "numGames"
    ? never
    : K]: SummaryPartTypes[K] extends [infer T, infer M]
    ? T
    : SummaryPartTypes[K] extends [infer T]
      ? T
      : never;
};

type ScoreAccumulatorPart<G extends GameDefinition<any, any, any, any, any, any, any, any, any>> =
  SummaryPartAccumulator<
    StatsTypeForGame<G>,
    {
      /** The best score in a single game */
      best: number;
      /** The worst score in a single game */
      worst: number;
      /** Sum of all the values the stat reached */
      total: number;
      mean: number;
    }
  >;
type WinsAccumulatorPart<G extends GameDefinition<any, any, any, any, any, any, any, any, any>> =
  SummaryPartAccumulator<
    StatsTypeForGame<G>,
    {
      all: {
        /** Number of times won outright */
        totalOutright: number;
        /** Average outright win rate (not including draws/tiebreaks) */
        meanOutright: number;
        /** Number of times won tiebreaks */
        tiebreakWins: number;
        /** Total number of tiebreaks played */
        tiebreaksPlayed: number;
        /** tiebreakWins / tiebreaksPlayed */
        tiebreakWinRate: number;
        /** Total wins (outright + tiebreak wins) */
        total: number;
        /** Average wins / game (outright + tiebreak wins) */
        mean: number;
      };
      byOpponents: ArrayKeyedMap<
        string,
        {
          /** Number of times won outright */
          totalOutright: number;
          /** Average outright win rate (not including draws/tiebreaks) */
          meanOutright: number;
          /** Number of times won tiebreaks */
          tiebreakWins: number;
          /** Total number of tiebreaks played */
          tiebreaksPlayed: number;
          /** tiebreakWins / tiebreaksPlayed */
          tiebreakWinRate: number;
          /** Total wins (outright + tiebreak wins) */
          total: number;
          /** Average wins / game (outright + tiebreak wins) */
          mean: number;
          /** Games played fitting the requirements */
          gameCount: number;
        }
      >;
    }
  >;

// type RoundsAccumulatorPart<G extends GameDefinition<any, any, any, any, any, any, any, any, any>> =
//   SummaryPartAccumulator<StatsTypeForGame<G>, GameTurnStatsType<G>>;
// type RoundsAccumulatorPart<G extends GameDefinition<any, any, any, any, any, any, any, any, any>> = G extends GameDefinition<
// any,
// any,
// any,
// infer PlayerState,
// any,
// infer TurnType,
// infer SoloStats,
// infer FullPlayerStats,
// infer PlayerId
// >
// ? SummaryPartAccumulator<StatsTypeFor<
//     TurnType,
//     PlayerDataFull<PlayerState, TurnType, SoloStats, FullPlayerStats, PlayerId>
//   >, TurnStatsType<TurnType>>
// : never;

type AccumulatorValuesLookup<Part extends SummaryPartAccumulator<any, any>> =
  Part extends SummaryPartAccumulator<any, infer T> ? T : never;

const calcDefaultDeltas = <T>(prevVals: T, newVals: T, key?: string): T => {
  switch (typeof newVals) {
    case "number":
      return (newVals - (prevVals as number)) as T;
    case "bigint":
      return (newVals - (prevVals as bigint)) as T;
    case "object":
      if (newVals instanceof Set) {
        console.warn("Unsupported default type for deltas:", key, typeof newVals, newVals);
        return newVals;
      } else {
        if (newVals === null) {
          console.warn("Unsupported default type for deltas:", key, null);
          return newVals;
        }
        if (newVals instanceof Map) {
          type K = T extends Map<infer K, any> ? K : never;
          type V = T extends Map<any, infer V> ? V : never;
          return new Map(
            ([...newVals] as [K, V][]).map(([k, v]) => [
              k,
              calcDefaultDeltas((prevVals as Map<K, V>).get(k), v, key ? `${key}.${k}` : String(k)),
            ]),
          ) as T;
        }
        type K = keyof T;
        type V = T[K];
        return mapObjectValues<V, V, K>(newVals, (v, k) =>
          calcDefaultDeltas(prevVals[k], v, key ? `${key}.${String(k)}` : String(k)),
        ) as T;
      }
  }
  console.warn("Unsupported default type for deltas:", key, typeof newVals, newVals);
  return newVals;
};
export class SummaryAccumulator<
  G extends GameDefinition<any, any, any, any, any, any, any, any, any>,
  SummaryPartTypes extends { [k: string]: [any] | [any, any] } & {
    score?: never;
    wins?: never;
    numGames?: never;
    rounds?: never;
  },
  RoundsField extends string,
> {
  readonly playerSummaries = new Map<
    string,
    PlayerSummaryValues<G, SummaryPartTypes, RoundsField>
  >();
  constructor(private readonly parts: SummaryAccumulatorParts<G, SummaryPartTypes, RoundsField>) {}

  makeEmptyPlayerSummary() {
    return (
      Object.entries(this.parts) as [
        keyof PlayerSummaryValues<G, SummaryPartTypes, RoundsField>,
        SummaryPartAccumulator<StatsTypeForGame<G>, any>,
      ][]
    ).reduce((summary, [key, part]) => Object.assign(summary, { [key]: part.empty() }), {
      numGames: 0,
    } as PlayerSummaryValues<G, SummaryPartTypes, RoundsField>);
  }
  makeGameDeltas(
    gameResult: GameResult<PlayerDataForGame<G>>,
  ): Map<string, PlayerSummaryValues<G, SummaryPartTypes, RoundsField>> {
    const tiebreakWinner = gameResult.tiebreak?.winner;
    return Object.entries(gameResult.results).reduce((deltaSummaries, [pid, pData]) => {
      const prev = this.playerSummaries.get(pid) ?? this.makeEmptyPlayerSummary();
      const numGames = prev.numGames + 1;
      const opponents = gameResult.playerOrder.filter((p) => p !== pid);
      const pStats: StatsTypeForGame<G> = playerStats(pData);
      const deltaSummary = { numGames: 1 } as PlayerSummaryValues<G, SummaryPartTypes, RoundsField>;
      for (const [key, part] of Object.entries(this.parts) as [
        keyof PlayerSummaryValues<G, SummaryPartTypes, RoundsField>,
        SummaryPartAccumulator<StatsTypeForGame<G>, any>,
      ][]) {
        if (part.delta) {
          deltaSummary[key] = part.delta(prev[key], pStats, numGames, opponents, tiebreakWinner);
        } else {
          deltaSummary[key] = calcDefaultDeltas(
            prev[key],
            part.push(prev[key], pStats, numGames, opponents, tiebreakWinner),
            String(key),
          );
        }
        deltaSummary;
      }
      deltaSummaries.set(pid, deltaSummary);
      return deltaSummaries;
    }, new Map<string, PlayerSummaryValues<G, SummaryPartTypes, RoundsField>>());
  }
  pushGame(gameResult: GameResult<PlayerDataForGame<G>>): void {
    for (const [pid, pData] of Object.entries(gameResult.results)) {
      const prev = this.playerSummaries.get(pid) ?? this.makeEmptyPlayerSummary();
      const numGames = prev.numGames + 1;
      const opponents = gameResult.playerOrder.filter((p) => p !== pid);
      const pStats: StatsTypeForGame<G> = playerStats(pData);
      const newSummary = (
        Object.entries(this.parts) as [
          keyof PlayerSummaryValues<G, SummaryPartTypes, RoundsField>,
          SummaryPartAccumulator<StatsTypeForGame<G>, any>,
        ][]
      ).reduce(
        (summary, [key, part]) =>
          Object.assign(summary, {
            [key]: part.push(prev[key], pStats, numGames, opponents, gameResult.tiebreak?.winner),
          }),
        { numGames } as PlayerSummaryValues<G, SummaryPartTypes, RoundsField>,
      );
      this.playerSummaries.set(pid, newSummary);
    }
  }
  getSummary(playerId: string): PlayerSummaryValues<G, SummaryPartTypes, RoundsField> {
    return this.playerSummaries.get(playerId) ?? this.makeEmptyPlayerSummary();
  }
  getSummaries(
    ...playerIds: string[]
  ): Map<string, PlayerSummaryValues<G, SummaryPartTypes, RoundsField>>;
  getSummaries(
    playerIds: string[],
  ): Map<string, PlayerSummaryValues<G, SummaryPartTypes, RoundsField>>;
  getSummaries(
    arg0: string | string[],
    ...rest: [...string[]]
  ): Map<string, PlayerSummaryValues<G, SummaryPartTypes, RoundsField>> {
    const playerIds = typeof arg0 === "string" ? [arg0, ...rest] : arg0;
    return new Map(playerIds.map((pid) => [pid, this.getSummary(pid)]));
  }
  getAllSummaries(): Map<string, PlayerSummaryValues<G, SummaryPartTypes, RoundsField>> {
    return this.playerSummaries;
  }
}

export type SummaryDefinitionFor<
  G extends GameDefinition<any, any, any, any, any, any, any, any, any>,
> = SummaryFieldDef<any, PlayerDataForGame<G>>;

export type StatsTypeForGame<
  G extends GameDefinition<any, any, any, any, any, any, any, any, any>,
> =
  G extends GameDefinition<
    any,
    any,
    any,
    infer PlayerState,
    any,
    infer TurnType,
    infer SoloStats,
    infer FullPlayerStats,
    infer PlayerId
  >
    ? StatsTypeFor<
        TurnType,
        PlayerDataFull<PlayerState, TurnType, SoloStats, FullPlayerStats, PlayerId>
      >
    : never;
export type StatsTypeFor<
  TurnType,
  PlayerData extends {
    playerId: PlayerId;
    completed: boolean;
    turns: PlayerTurnData<TurnType>;
    score: number;
    displayName?: string;
    // handicap?: Handicap<Turns>
    position: Position;
  },
  PlayerId extends string = string,
> = {
  [K in TurnKey<TurnType> & string as `round.${K}`]: K extends keyof TurnStatsType<TurnType>
    ? TurnStatsType<TurnType>[K]
    : never;
} & {
  [K in TurnKey<TurnType> & number as `round.${K}`]: K extends keyof TurnStatsType<TurnType>
    ? TurnStatsType<TurnType>[K]
    : never;
} & Omit<PlayerData, "playerId" | "completed" | "turns" | "displayName" | "handicap" | "position">;

function playerStats<
  G extends GameDefinition<any, any, any, any, any, any, any, any, any>,
  PlayerData extends {
    turns: G extends GameDefinition<any, any, any, any, any, infer TurnType, any, any, any>
      ? PlayerTurnData<TurnType>
      : never;
  },
>(pData: PlayerData): StatsTypeForGame<G>;
function playerStats<
  TurnType,
  PlayerData extends {
    playerId: PlayerId;
    completed: boolean;
    turns: PlayerTurnData<TurnType>;
    score: number;
    displayName?: string;
    // handicap?: Handicap<Turns>
    position: Position;
  },
  PlayerId extends string = string,
>(pData: PlayerData): StatsTypeFor<TurnType, PlayerData, PlayerId>;
function playerStats<
  G extends GameDefinition<any, any, any, any, any, any, any, any, any>,
  PlayerData extends {
    turns: G extends GameDefinition<any, any, any, any, any, infer TurnType, any, any, any>
      ? PlayerTurnData<TurnType>
      : never;
  },
>({ turns, ...rest }: PlayerData) {
  return {
    ...rest,
    ...(Array.isArray(turns)
      ? turns.reduce(
          (acc, { stats }, i) => Object.assign(acc, { [`round.${i}`]: stats }, {} as any),
          {} as any,
        )
      : Object.entries(turns as { [k: string]: { stats: any } }).reduce(
          (acc, [k, { stats }]) => Object.assign(acc, { [`round.${k}`]: stats }),
          {} as any,
        )),
  };
}
