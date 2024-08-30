import type { VNodeChild } from "vue";
import ArrayKeyedMap from "array-keyed-map";
import type { Position } from "..";
import type { PlayerDataFull, PlayerTurnData, TurnKey, TurnStatsType } from "../types";
import type { GameDefinition, PlayerDataForGame } from "../definition";
import type { GameResult } from "../gameResult";
import {
  roundStatsAccumulator,
  type RoundsAccumulatorPart,
  type RoundsFavouritesSpecDef,
} from "./roundStats";
import type { ClassBindings } from "@/utils";
import { createSummaryComponent } from "./summaryComponent";

export type SummaryFieldDef<T, PlayerGameStats extends {}> = {
  label: string;
  value: (playerData: PlayerGameStats, playerId: string) => T;
  cmp: (a: T, b: T) => number;
  highlight: (value: T, limits: { highest: T; lowest: T }) => ClassBindings;
  display: (value: T, delta: T | undefined, playerData: PlayerGameStats) => VNodeChild;
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
  SummaryPartTypes extends { [k: string]: any } & {
    score?: never;
    wins?: never;
    numGames?: never;
    rounds?: never;
  },
  FavFields extends string,
>(
  gameDef: G,
  {
    score: scoreDef,
    ...summaryParts
  }: {
    [K in keyof SummaryPartTypes]: SummaryPartAccumulator<StatsTypeForGame<G>, SummaryPartTypes[K]>;
  } & {
    score?: {
      minimum?: number;
      maximum?: number;
    };
  },
  roundsFavourites?: RoundsFavouritesSpecDef<G, FavFields>,
): {
  parts: {
    score: ScoreAccumulatorPart<G>;
    wins: WinsAccumulatorPart<G>;
    rounds: RoundsAccumulatorPart<G, FavFields>;
  } & Omit<SummaryPartTypes, "score" | "wins" | "rounds">;
  create: () => SummaryAccumulator<G, SummaryPartTypes, FavFields>;
  createComponent: () => ReturnType<typeof createSummaryComponent<G, SummaryPartTypes, FavFields>>;
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

  const roundsAccumulator = roundStatsAccumulator<G, FavFields>(
    roundsFavourites ?? ({} as RoundsFavouritesSpecDef<G, FavFields>),
  );

  const parts = Object.assign(
    { score: scoreAccumulator, wins: winsAccumulator, rounds: roundsAccumulator },
    summaryParts,
  );
  return {
    // @ts-expect-error
    parts,
    // @ts-expect-error
    create: () => new SummaryAccumulator<G, SummaryPartTypes, FavFields>(parts),
    createComponent: () => createSummaryComponent<G, SummaryPartTypes, FavFields>(),
  };
};

export type PlayerSummaryValues<
  G extends GameDefinition<any, any, any, any, any, any, any, any, any>,
  SummaryPartTypes extends { [k: string]: any },
  FavFields extends string,
> = {
  numGames: number;
  score: AccumulatorValuesLookup<ScoreAccumulatorPart<G>>;
  wins: AccumulatorValuesLookup<WinsAccumulatorPart<G>>;
  rounds: AccumulatorValuesLookup<RoundsAccumulatorPart<G, FavFields>>;
} & Omit<SummaryPartTypes, "numGames" | "score" | "wins" | "rounds">;

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

export class SummaryAccumulator<
  G extends GameDefinition<any, any, any, any, any, any, any, any, any>,
  SummaryPartTypes extends { [k: string]: any } & {
    score?: never;
    wins?: never;
    numGames?: never;
    rounds?: never;
  },
  FavFields extends string,
> {
  readonly playerSummaries = new Map<string, PlayerSummaryValues<G, SummaryPartTypes, FavFields>>();
  constructor(
    private readonly parts: {
      [K in keyof SummaryPartTypes]: SummaryPartAccumulator<
        StatsTypeForGame<G>,
        SummaryPartTypes[K]
      >;
    } & {
      score: ScoreAccumulatorPart<G>;
      wins: WinsAccumulatorPart<G>;
      rounds: RoundsAccumulatorPart<G, FavFields>;
    },
  ) {}

  makeEmptyPlayerSummary() {
    return (
      Object.entries(this.parts) as [
        keyof PlayerSummaryValues<G, SummaryPartTypes, FavFields>,
        SummaryPartAccumulator<StatsTypeForGame<G>, any>,
      ][]
    ).reduce(
      (summary, [key, part]) => {
        summary.numGames = 0;
        summary[key as keyof PlayerSummaryValues<G, SummaryPartTypes, FavFields>] = part.empty();
        return summary;
      },
      {} as PlayerSummaryValues<G, SummaryPartTypes, FavFields>,
    );
  }
  pushGame(gameResult: GameResult<PlayerDataForGame<G>>): void {
    for (const [pid, pData] of Object.entries(gameResult.results)) {
      const prev = this.playerSummaries.get(pid) ?? this.makeEmptyPlayerSummary();
      const numGames = prev.numGames + 1;
      const opponents = gameResult.playerOrder.filter((p) => p !== pid);
      const newSummary = (
        Object.entries(this.parts) as [
          keyof PlayerSummaryValues<G, SummaryPartTypes, FavFields>,
          SummaryPartAccumulator<StatsTypeForGame<G>, any>,
        ][]
      ).reduce(
        (summary, [key, part]) => {
          summary.numGames = numGames;
          summary[key as keyof PlayerSummaryValues<G, SummaryPartTypes, FavFields>] = part.push(
            prev[key],
            playerStats(pData),
            numGames,
            opponents,
            gameResult.tiebreak?.winner,
          );
          return summary;
        },
        {} as PlayerSummaryValues<G, SummaryPartTypes, FavFields>,
      );
      this.playerSummaries.set(pid, newSummary);
    }
  }
  getSummary(playerId: string): PlayerSummaryValues<G, SummaryPartTypes, FavFields> {
    return this.playerSummaries.get(playerId) ?? this.makeEmptyPlayerSummary();
  }
  getSummaries(
    ...playerIds: string[]
  ): Map<string, PlayerSummaryValues<G, SummaryPartTypes, FavFields>>;
  getSummaries(
    playerIds: string[],
  ): Map<string, PlayerSummaryValues<G, SummaryPartTypes, FavFields>>;
  getSummaries(
    arg0: string | string[],
    ...rest: [...string[]]
  ): Map<string, PlayerSummaryValues<G, SummaryPartTypes, FavFields>> {
    const playerIds = typeof arg0 === "string" ? [arg0, ...rest] : arg0;
    return new Map(playerIds.map((pid) => [pid, this.getSummary(pid)]));
  }
  getAllSummaries(): Map<string, PlayerSummaryValues<G, SummaryPartTypes, FavFields>> {
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