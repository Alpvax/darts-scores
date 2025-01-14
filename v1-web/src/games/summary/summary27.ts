import { z } from "zod";
import { PlayerStatsHolder as StatsHolder, highLowTotal, statsCounterFactory } from "./v2";
import { PlayerGameResult27 } from "../27";

export type ExtendedPlayerGameResult = {
  /** Total number of hits this game */
  totalHits: number;
  /** Targets hit this game, use `.size` to get count */
  numsHit: Set<number>;
  /** Targets of double doubles hit this game, use `.size` to get count */
  dd: Set<number>;
  /** Targets of cliffs hit this game, use `.size` to get count */
  cliffs: Set<number>;
  /**
   * Hans hit this game. Hitting cliffs will count for Hans streaks.
   * Hans are formatted as `{ start, length }`
   * where start is the target of the first consecutive double double/cliff
   * and length is the number of consecutive double doubles/cliffs hit (>= 3)
   */
  hans: Set<{ start: number; length: number }>;
  /**
   * How far the score stayed positive.
   * range: 0 (impossible without handicap) - 20 (all positive)
   * lowest value without handicap is 5 (score on round 5 would be -3)
   */
  farPos: number;
  /**
   * How far the player got before missing their first target.
   * range: 0 - 20 (a dream)
   */
  farDream: number;
  /** The player's final score */
  score: number;
  fatNick: boolean;
  /** The last consecutive miss; 0 = hit double 1, 20 = a fat nick */
  fatNickUntil: number;
  piranha: boolean;
  goblin: boolean;
  jesus: boolean;
  rounds: number[];
  fnAmnesty?: boolean;
  handicap?: number;
};

const extDefaultsSchema = z.object({
  /** A currently unused flag that may be used later for display */
  fnAmnesty: z.boolean().default(false),
  /** The number added to the player's starting score */
  handicap: z.number().default(0),
  /** Whether the only hit was the very last dart of the game */
  jesus: z.boolean().default(false),
});

/**
 * Convert a PlayerGameResult27 to an ExtendedPlayerGameResult.
 * Additionally, recalculates all stats.
 */
export const convertResult = (result: PlayerGameResult27): ExtendedPlayerGameResult =>
  calculateResult(result.rounds, extDefaultsSchema.parse(result));
/**
 * Recalculate all stats from a list of hits.
 * (rounds[0] = how many times the player hit double 1)
 */
export const calculateResult = (
  rounds: number[],
  {
    fnAmnesty,
    handicap,
    jesus,
  }: z.output<typeof extDefaultsSchema>,
): ExtendedPlayerGameResult => {
  let totalHits = 0;
  const numsHit = new Set<number>();
  const cliffs = new Set<number>();
  const dd = new Set<number>();
  let ddSince: number | null = null;
  const hans = new Set<{ start: number; length: number }>();
  let isPos = true;
  let farPos = 20;
  let isDream = true;
  let farDream = 20;
  let farFN = 20;
  let score = 27 + handicap;
  for (const [i, hits] of rounds.entries()) {
    const r = i + 1;
    const delta = r * 2 * (hits > 0 ? hits : -1);
    totalHits += hits;
    if (hits > 0) {
      numsHit.add(r);
      if (farFN === 20) {
        farFN = i;
      }
    }
    if (isDream && hits < 1) {
      farDream = i;
      isDream = false;
    }
    score += delta;
    if (isPos && score < 0) {
      farPos = i;
      isPos = false;
    }
    switch (hits) {
      case 3:
        cliffs.add(r);
        // Allow cliffs to extend hans
        if (ddSince === null) {
          ddSince = r;
        }
        break;
      case 2:
        dd.add(r);
        if (ddSince === null) {
          ddSince = r;
        }
        break;
      default:
        if (ddSince !== null) {
          const length = r - ddSince;
          if (length >= 3) {
            hans.add({
              start: ddSince,
              length,
            });
          }
          ddSince = null;
        }
        break;
    }
  }
  const result: ExtendedPlayerGameResult = {
    totalHits,
    numsHit,
    cliffs,
    dd,
    hans,
    farPos,
    farDream,
    score,
    fatNick: totalHits === 0,
    fatNickUntil: farFN,
    piranha: totalHits === 1 && numsHit.has(1),
    goblin: numsHit.size > 0 && numsHit.size === dd.size,
    jesus,
    rounds,
  };
  if (fnAmnesty) {
    result.fnAmnesty = true;
  }
  if (handicap !== 0) {
    result.handicap = handicap;
  }
  return result;
};

const FAV_TARGETS_SCHEMA = z.object({
  hits: z.number().int().min(0).default(0),
  targets: z.array(z.number().int().min(1).max(20)).default([]),
}).default({});
const ROUND_HITS_SCHEMA = z.object({
  total: z.number().int().min(0).default(0),
  games: z.number().int().min(0).default(0),
  dd: z.number().int().min(0).default(0),
  cliffs: z.number().int().min(0).default(0),
}).default({});
export const PLAYER_STATS_SCHEMA = z.object({
  numGames: z.number().int().default(0),
  score: highLowTotal.newSchema({
    high: Number.MIN_SAFE_INTEGER,
    low: Number.MAX_SAFE_INTEGER,
    total: 0,
    func: s => s.int(),
  }),
  gameHits: highLowTotal.newSchema({
    min: 0,
    max: 60,
    total: 0,
    func: s => s.int(),
  }),
  fn: z.number().int().min(0).default(0),
  fnUntil: z.number().int().min(0).max(20).default(0),
  cliffs: z.number().int().min(0).default(0),
  dd: z.number().int().min(0).default(0),
  hans: z.number().int().min(0).default(0),
  goblins: z.number().int().min(0).default(0),
  piranhas: z.number().int().min(0).default(0),
  jesus: z.number().int().min(0).default(0),
  allPos: z.number().int().min(0).default(0),
  farPos: z.number().int().min(0).default(0),
  farDream: z.number().int().min(0).default(0),
  roundData: z.object({
    favourites: z.object({
      /** Most hit numbers, total hits (i.e. up to 3 per game) */
      total: FAV_TARGETS_SCHEMA,
      /** Most cliffed numbers */
      cliffs: FAV_TARGETS_SCHEMA,
      /** Most double doubled numbers */
      dd: FAV_TARGETS_SCHEMA,
      /** Most hit numbers, number of games (i.e. up to 1 per game) */
      games: FAV_TARGETS_SCHEMA,
    }).default({}),
    rounds: z.record(z.string().regex(/[1-9]|1[0-9]|20/), ROUND_HITS_SCHEMA)
      .default(Array.from({ length: 20 }, _ => ROUND_HITS_SCHEMA.parse({}))
        .reduce((obj, round, i) => Object.assign(obj, { [i + 1]: round }), {})),
  }).default({}),
});

export type PlayerStats = z.infer<typeof PLAYER_STATS_SCHEMA>;

export const addGameToStats = (
  stats: PlayerStats,
  gameResult: ExtendedPlayerGameResult,
): typeof stats => ({
  numGames: stats.numGames + 1,
  score: highLowTotal.addStat(stats.score, gameResult.score),
  gameHits: highLowTotal.addStat(stats.gameHits, gameResult.totalHits),
  fn: stats.fn + (gameResult.fatNick ? 1 : 0),
  fnUntil: Math.max(stats.fnUntil, gameResult.fatNickUntil),
  cliffs: stats.cliffs + gameResult.cliffs.size,
  dd: stats.dd + gameResult.dd.size,
  goblins: stats.goblins + (gameResult.goblin ? 1 : 0),
  piranhas: stats.piranhas + (gameResult.piranha ? 1 : 0),
  jesus: stats.jesus + (gameResult.jesus ? 1 : 0),
  hans: stats.hans + gameResult.hans.size, //TODO: does a longer streak count as 2?
  allPos: stats.allPos + (gameResult.farPos > 19 ? 1: 0),
  farPos: Math.max(stats.farPos, gameResult.farPos),
  farDream: Math.max(stats.farDream, gameResult.farDream),
  roundData: updateRoundData(stats.roundData, gameResult.rounds),
});

/** Caution: mutates input roundData */
const updateRoundData = (
  { favourites, rounds }: PlayerStats["roundData"],
  gameRounds: ExtendedPlayerGameResult["rounds"],
): PlayerStats["roundData"] => {
  for (const [i, hits] of gameRounds.entries()) {
    const r = i + 1;
    rounds[r].total += hits;
    if (hits > 0) {
      rounds[r].games += 1;
      const totalHits = rounds[r].total;
      if (totalHits > favourites.total.hits) {
        favourites.total = {
          hits: totalHits,
          targets: [r],
        };
      } else if (totalHits === favourites.total.hits) {
        favourites.total.targets.push(r);
      }
      const games = rounds[r].games;
      if (games > favourites.games.hits) {
        favourites.games = {
          hits: games,
          targets: [r],
        };
      } else if (games === favourites.games.hits) {
        favourites.games.targets.push(r);
      }
    }
    if (hits === 2) {
      rounds[r].dd += 1;
      const ddH = rounds[r].dd;
      if (ddH > favourites.dd.hits) {
        favourites.dd = {
          hits: ddH,
          targets: [r],
        };
      } else if (ddH === favourites.dd.hits) {
        favourites.dd.targets.push(r);
      }
    }
    if (hits === 3) {
      rounds[r].cliffs += 1;
      const c = rounds[r].cliffs;
      if (c > favourites.cliffs.hits) {
        favourites.cliffs = {
          hits: c,
          targets: [r],
        };
      } else if (c === favourites.cliffs.hits) {
        favourites.cliffs.targets.push(r);
      }
    }
  }
  return { favourites, rounds };
};

export type PlayerStatsHolder = StatsHolder<PlayerStats, ExtendedPlayerGameResult>;
export const SUMMARY_FACTORY = statsCounterFactory(PLAYER_STATS_SCHEMA, addGameToStats);

export type SummaryFields = {
  pb: number;
  pw: number;
};
// export const summaryDisplay = (stats: PlayerStats, wins: Map<string[], number>) => ({
//   pb: stats.score.highest,
//   pw: stats.score.lowest,
//   mean: stats.score.total / stats.numGames,
//   filteredW:
//   wins
//   gameCount
//   winR
//   fn
//   cliff
//   cliffR
//   dd
//   ddR
//   hans
//   goblins
//   piranhas
//   jesus
//   ap
//   farDream
//   farPos
//   mostHits
//   leastHits
//   meanHits
// });

