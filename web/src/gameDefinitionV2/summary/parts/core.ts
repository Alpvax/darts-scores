import ArrayKeyedMap from "array-keyed-map";
import type { SummaryPartAccumulator, StatsTypeForGame } from "..";
import type { GameDefinition } from "../../definition";

export { makeRoundStatsAccumulatorPart, type RoundsAccumulatorPart } from "./roundStats";

export type NumGamesAccumulatorPart<
  G extends GameDefinition<any, any, any, any, any, any, any, any, any>,
> = SummaryPartAccumulator<StatsTypeForGame<G>, number>;
export const makeNumGamesAccPart = <
  G extends GameDefinition<any, any, any, any, any, any, any, any, any>,
>(): NumGamesAccumulatorPart<G> => ({
  empty: () => 0,
  push: (prev) => prev + 1,
  displayDefaults: {
    direction: "neutral",
  },
});

export type ScoreAccumulatorPart<
  G extends GameDefinition<any, any, any, any, any, any, any, any, any>,
> = SummaryPartAccumulator<
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
/**
 * @param bestDirection Whether the best score is the most positive or most negative (i.e. highest or lowest).
 */
export const makeScoreAccPart = <
  G extends GameDefinition<any, any, any, any, any, any, any, any, any>,
>(
  bestDirection: "positive" | "negative",
  {
    maximumValue = Number.MIN_SAFE_INTEGER,
    minimumValue = Number.MAX_SAFE_INTEGER,
    cmpBest,
    cmpWorst,
  }: {
    /** Highest possible score at end of game, defaults to `Number.MAX_SAFE_INTEGER` */
    maximumValue?: number;
    /** Lowest possible score at end of game, defaults to `Number.MIN_SAFE_INTEGER` */
    minimumValue?: number;
    /**
     * Comparison for best value. Should return the better value of the 2 args.
     * Defaults to `bestDirection === "positive" ? Math.max : Math.min`
     */
    cmpBest?: (a: number, b: number) => number;
    /**
     * Comparison for worst value. Should return the worse value of the 2 args.
     * Defaults to `bestDirection === "positive" ? Math.min : Math.max`
     */
    cmpWorst?: (a: number, b: number) => number;
  },
): ScoreAccumulatorPart<G> => {
  const cmpB = cmpBest ?? (bestDirection === "positive" ? Math.max : Math.min);
  const cmpW = cmpWorst ?? (bestDirection === "positive" ? Math.min : Math.max);
  return {
    empty: () => ({
      best: bestDirection === "positive" ? maximumValue : minimumValue,
      worst: bestDirection === "positive" ? minimumValue : maximumValue,
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
    displayDefaults: {
      direction: bestDirection,
      zero: null,
    },
  };
};
export type WinsAccumulatorPart<
  G extends GameDefinition<any, any, any, any, any, any, any, any, any>,
> = SummaryPartAccumulator<StatsTypeForGame<G>, WinsAccumulatorInstance<G>>;

type WinsStats = {
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
};
const emptyWinsStats = (): WinsStats => ({
  totalOutright: 0,
  meanOutright: 0,
  tiebreakWins: 0,
  tiebreaksPlayed: 0,
  tiebreakWinRate: 0,
  total: 0,
  mean: 0,
  gameCount: 0,
});
const pushStats = (
  stats: WinsStats,
  numGames: number,
  tieDelta: number,
  outrightDelta: number,
  tiebreakDelta: number,
  anyDelta: number,
): WinsStats => ({
  totalOutright: outrightDelta,
  meanOutright: (stats.totalOutright + outrightDelta) / numGames - stats.meanOutright,
  tiebreakWins: tiebreakDelta,
  tiebreaksPlayed: tieDelta,
  tiebreakWinRate:
    stats.tiebreaksPlayed + tieDelta > 0
      ? (stats.tiebreakWins + tiebreakDelta) / (stats.tiebreaksPlayed + tieDelta) -
        stats.tiebreakWinRate
      : 0,
  total: anyDelta,
  mean: (stats.total + anyDelta) / numGames - stats.mean,
  gameCount: stats.gameCount + 1,
});

class WinsAccumulatorInstance<
  G extends GameDefinition<any, any, any, any, any, any, any, any, PlayerId>,
  PlayerId extends string = string,
> {
  /** This player ID, used to filter opponents lists */
  private playerId: PlayerId;
  private allInternal: WinsStats;
  /** Cached readonly all stats view */
  private allCached: Readonly<WinsStats> | null = null;
  readonly byOpponentsMap: ArrayKeyedMap<PlayerId, WinsStats>;
  private byOpponentsCacheAtLeast: ArrayKeyedMap<PlayerId, Readonly<WinsStats>> =
    new ArrayKeyedMap();

  constructor(playerId: PlayerId, all?: WinsStats, byOpponents?: [PlayerId[], WinsStats][]) {
    this.playerId = playerId;
    this.allInternal = all ?? emptyWinsStats();
    this.byOpponentsMap = new ArrayKeyedMap(byOpponents);
  }

  get all(): WinsStats {
    if (this.allCached === null) {
      this.allCached = Object.freeze({ ...this.allInternal });
    }
    return this.allCached;
  }

  /** Always make unique and sort to prevent duplicate entries spread through map */
  opponentsKey(opponents: Iterable<PlayerId>): PlayerId[] {
    return opponents instanceof Set
      ? [...opponents].filter((pid) => pid !== this.playerId).toSorted()
      : [...new Set([...opponents].filter((pid) => pid !== this.playerId))].toSorted();
  }

  /**
   * Get the wins stats for games with exactly the specified opponents.
   * @param opponents the opponents to match against. The current player will be automatically filtered out of the list.
   * Will return stats for games where exactly those players played, no additional players
   */
  getWithExact(opponents: Iterable<PlayerId>): WinsStats {
    return this.byOpponentsMap.get(this.opponentsKey(opponents)) ?? emptyWinsStats();
  }
  /**
   * Get the wins stats for games with exactly the specified opponents. Also returns the normalised opponents key and whether the object existed in the map.
   * Does not add the key to the map if it doesn't exist.
   * @param opponents the opponents to match against. The current player will be automatically filtered out of the list.
   * Will return stats for games where exactly those players played, no additional players.
   * @returns an object of { opponents: the normalised opponents key, stats: the stats for the given entry, exists: whether the stats exists or whether an empty object has been returned }
   */
  getWithExactFull(opponents: Iterable<PlayerId>): {
    key: PlayerId[];
    stats: WinsStats;
    exists: boolean;
  } {
    const key = this.opponentsKey(opponents);

    const existing = this.byOpponentsMap.get(key);
    // If object does not exist, return a readonly copy of the empty stats
    return {
      key,
      stats: existing ?? Object.freeze(emptyWinsStats()),
      exists: existing ? true : false,
    };
  }

  /**
   * Get the wins stats for games with at least the specified opponents. Additional players may have also played
   * @param requiredOpponents the opponents to match against. The current player will be automatically filtered out of the list.
   * Will return stats for games where exactly those players played, no additional players
   */
  getWithAtLeast(requiredOpponents: Iterable<PlayerId>): Readonly<WinsStats> {
    const key = this.opponentsKey(requiredOpponents);
    let cached = this.byOpponentsCacheAtLeast.get(key);
    if (cached === undefined) {
      const numGames = this.all.gameCount;
      cached = [...this.byOpponentsMap.entries()].reduce((acc, [players, stats]) => {
        if (key.every((pid) => players.includes(pid))) {
          acc.totalOutright += stats.totalOutright;
          acc.meanOutright = acc.totalOutright / numGames;
          acc.tiebreakWins += stats.tiebreakWins;
          acc.tiebreaksPlayed += stats.tiebreaksPlayed;
          acc.tiebreakWinRate =
            acc.tiebreaksPlayed > 0 ? acc.tiebreakWins / acc.tiebreaksPlayed : 0;
          acc.total += stats.total;
          acc.mean = acc.total / numGames;
          acc.gameCount += stats.gameCount;
        }
        return acc;
      }, emptyWinsStats());
      this.byOpponentsCacheAtLeast.set(key, Object.freeze(cached));
    }
    return cached;
  }

  /**
   * Calculate the difference between the current and new game stats, without mutating this object
   * @param pData
   * @param opponents
   * @param tiebreakWinner
   * @returns
   */
  delta(
    pData: StatsTypeForGame<G>,
    opponents: Iterable<PlayerId>,
    tiebreakWinner?: PlayerId,
  ): WinsAccumulatorInstance<G, PlayerId> {
    const numGames = this.all.gameCount + 1;

    const win =
      pData.position.pos === 1 && (tiebreakWinner ? tiebreakWinner === pData.playerId : true);
    const tie = pData.position.players.filter((pid: string) => pid !== pData.playerId).length > 0;

    const tieDelta = tie ? 1 : 0;
    const outrightDelta = win && !tie ? 1 : 0;
    const tiebreakDelta = win && tie ? 1 : 0;
    const anyDelta = win ? 1 : 0;

    const { key, stats } = this.getWithExactFull(opponents);
    return new WinsAccumulatorInstance(
      this.playerId,
      {
        totalOutright: outrightDelta,
        meanOutright: (this.all.totalOutright + outrightDelta) / numGames - this.all.meanOutright,
        tiebreakWins: tiebreakDelta,
        tiebreaksPlayed: tieDelta,
        tiebreakWinRate:
          this.all.tiebreaksPlayed + tieDelta > 0
            ? (this.all.tiebreakWins + tiebreakDelta) / (this.all.tiebreaksPlayed + tieDelta) -
              this.all.tiebreakWinRate
            : 0,
        total: anyDelta,
        mean: (this.all.total + anyDelta) / numGames - this.all.mean,
        gameCount: 1,
      },
      [
        [
          key,
          {
            totalOutright: outrightDelta,
            meanOutright: (stats.totalOutright + outrightDelta) / numGames - stats.meanOutright,
            tiebreakWins: tiebreakDelta,
            tiebreaksPlayed: tieDelta,
            tiebreakWinRate:
              stats.tiebreaksPlayed + tieDelta > 0
                ? (stats.tiebreakWins + tiebreakDelta) / (stats.tiebreaksPlayed + tieDelta) -
                  stats.tiebreakWinRate
                : 0,
            total: anyDelta,
            mean: (stats.total + anyDelta) / numGames - stats.mean,
            gameCount: 1,
          },
        ],
      ],
    );
  }

  /**
   * Mutate the current saved data, adding the stats from the passed in game
   * @param pData
   * @param opponents
   * @param tiebreakWinner
   * @returns this for convenience for implementing part
   */
  pushGameData(
    pData: StatsTypeForGame<G>,
    opponents: Iterable<PlayerId>,
    tiebreakWinner?: PlayerId,
  ): this {
    const numGames = this.all.gameCount + 1;

    const win =
      pData.position.pos === 1 && (tiebreakWinner ? tiebreakWinner === pData.playerId : true);
    const tie = pData.position.players.filter((pid: string) => pid !== pData.playerId).length > 0;

    const tieDelta = tie ? 1 : 0;
    const outrightDelta = win && !tie ? 1 : 0;
    const tiebreakDelta = win && tie ? 1 : 0;
    const anyDelta = win ? 1 : 0;

    this.allInternal = pushStats(
      this.allInternal,
      numGames,
      tieDelta,
      outrightDelta,
      tiebreakDelta,
      anyDelta,
    );
    // Invalidate the cache
    this.allCached = null;

    const { key, stats } = this.getWithExactFull(opponents);
    this.byOpponentsMap.set(
      key,
      pushStats(stats, numGames, tieDelta, outrightDelta, tiebreakDelta, anyDelta),
    );
    // Invalidate caches
    this.byOpponentsCacheAtLeast.clear();

    // Return this for convenience
    return this;
  }
}

export const makeWinsAccPart = <
  G extends GameDefinition<any, any, any, any, any, any, any, any, any>,
>(): WinsAccumulatorPart<G> => ({
  displayDefaults: {
    direction: "positive",
  },
  empty: (pid) => new WinsAccumulatorInstance(pid),
  delta: (inst, pData, _, opponents, tiebreakWinner) =>
    inst.delta(pData, opponents, tiebreakWinner),
  push: (inst, pData, _, opponents, tiebreakWinner) =>
    inst.pushGameData(pData, opponents, tiebreakWinner),
});
