import type { VNodeChild } from "vue";
import ArrayKeyedMap from "array-keyed-map";
import type { Position } from "..";
import type { PlayerDataFull, PlayerTurnData, TurnKey, TurnStatsType } from "../types";
import type { GameDefinition, PlayerDataForGame } from "../definition";
import type { GameResult } from "../gameResult";

export type SummaryFieldDef<T, PlayerGameStats extends {}> = {
  label: string;
  value: (playerData: PlayerGameStats) => T;
  cmp: (a: T, b: T) => number;
  display: (value: T, playerData: PlayerGameStats) => VNodeChild;
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

export const makeSummaryAccumulatorFactoryFor = <
  G extends GameDefinition<any, any, any, any, any, any, any, any, any>,
  SummaryPartTypes extends { [k: string]: any } & { score?: never; wins?: never; numGames?: never },
>(
  gameDef: G,
  summaryParts: {
    [K in keyof SummaryPartTypes]: SummaryPartAccumulator<StatsTypeForGame<G>, SummaryPartTypes[K]>;
  } & {
    score?: {
      minimum?: number;
      maximum?: number;
    };
  },
): {
  parts: {
    score: SummaryPartAccumulator<
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
    wins: SummaryPartAccumulator<
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
  } & Omit<SummaryPartTypes, "score" | "wins">;
  create: (gameResult: GameResult<PlayerDataForGame<G>>) => any;
} => {
  type PlayerData = StatsTypeForGame<G>;
  type AccumulatorPart<T> = SummaryPartAccumulator<PlayerData, T>;
  const scoreLimits = {
    min: summaryParts.score?.minimum ?? Number.MIN_SAFE_INTEGER,
    max: summaryParts.score?.maximum ?? Number.MAX_SAFE_INTEGER,
  };
  const scoreAccumulator: AccumulatorPart<{
    /** The best score in a single game */
    best: number;
    /** The worst score in a single game */
    worst: number;
    /** Sum of all the values the stat reached */
    total: number;
    mean: number;
  }> = (([best, worst, cmpB, cmpW]: [
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

  const winsAccumulator: AccumulatorPart<{
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
  }> = {
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
  console.log("TODO: implement summary accumulator"); //TODO:

  const parts = Object.assign({ score: scoreAccumulator, wins: winsAccumulator }, summaryParts);
  return {
    // @ts-expect-error
    parts,
    create: (gameResult) =>
      new Map(
        Object.entries(gameResult.results).map(([pid, pData]) => [
          pid,
          Object.entries(parts).reduce((summary, [key, part]) => {
            summary.numGames = 1;
            summary[key] = part.push(
              part.empty(),
              // @ts-expect-error
              pData,
              1,
              gameResult.playerOrder.filter((p) => p !== pid),
              gameResult.tiebreak?.winner,
            );
            return summary;
          }, {} as any),
        ]),
      ),
  };
};

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
