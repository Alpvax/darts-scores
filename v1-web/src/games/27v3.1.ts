import { Result27 } from "./27";
import Game27 from "@/components/27/Game27.vue";
import * as GameType from "./gameTypeV3";
import { PLAYER_STATS_SCHEMA, addGameToStats, convertResult } from "./summary/summary27";
import { z } from "zod";
// import { makeSummaryFields } from "./statsV3";
import { SummaryFieldKeys, makeSummaryFields } from "./summaryV3/declaration";

type SPGameStats = {
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

type MPGameStats = {
  /**
   * The position of the player in relation to other players. First = 1.
   */
  position: number;
  /**
   * The score difference between first and this position (always >=0).
   */
  lostByPoints: number;
  /**
   * Whether the player won but was not first for the last N rounds (N=3 currently).
   */
  sneakyVictory: boolean;
  /**
   * Map of playerId: score difference for all players in game with worse scores.
   */
  playersBeaten: Map<string, number>;
  /**
   * Set of playerIds for all other players in game with the same score.
   */
  playersTied: Set<string>;
  /**
   * Map of playerId: score difference for all players in game with better scores.
   */
  playersLostTo: Map<string, number>;
};

const SUMMARY_SCHEMA = PLAYER_STATS_SCHEMA.extend({
  wins: z.object({
    total: z.number().int().min(0).default(0),
    breakdown: z.map(z.set(z.string().length(20)), z.number().int().min(0)).default(new Map()),
  }).default({}),
  sneakyWins: z.number().int().min(0).default(0),
});

export const GAME_TYPE = GameType.create<Result27, SPGameStats, MPGameStats>(
  "twentyseven",
  result => new Map(Object.entries(result.game).map(([k, r]) => [k, convertResult(r)])),
  (game, spstats) => {
    const orderedScores = [...spstats.values()].map(({ score }) => score).sort((a, b) => b - a);
    const winningScore = orderedScores[0];
    const scores: Map<number, {
      pos: number;
      lostBy: number;
      players: Set<string>;
    }> = new Map();
    for (const [pid, { score }] of spstats.entries()) {
      if (scores.has(score)) {
        scores.get(score)!.players.add(pid);
      } else {
        scores.set(score, {
          pos: orderedScores.indexOf(score) + 1,
          lostBy: winningScore - score,
          players: new Set([pid]),
        });
      }
    }
    if (scores.size < 2) {
      return new Map([...spstats.entries()].map(([pid, stats]) => [pid, {
        position: 1,
        lostByPoints: 0,
        playersBeaten: new Map(),
        playersTied: scores.get(stats.score)!.players,
        playersLostTo: new Map(),
        sneakyVictory: false,
        ...stats,
      }]));
    }
    return new Map([...spstats.entries()].map(([pid, stats]) => {
      const pos = scores.get(stats.score)!;
      return [pid, {
        position: pos.pos,
        lostByPoints: pos.lostBy,
        playersBeaten: new Map(orderedScores.flatMap((s, i) => {
          if (i < pos.pos) {
            return [];
          }
          const delta = stats.score - s;
          return [...scores.get(s)!.players.values()].map(p => [p, delta]);
        })),
        playersTied: new Set([...pos.players.values()].filter(p => p != pid)),
        playersLostTo: new Map(orderedScores.flatMap((s, i) => {
          if (i < pos.pos) {
            const delta = s - stats.score;
            return [...scores.get(s)!.players.values()].map(p => [p, delta]);
          }
          return [];
        })),
        sneakyVictory: pos.pos === 1 && false, //TODO: calculate sneaky
        ...stats,
      }];
    }));
  },
).withSummary(GameType.ZodSummaryFactory(
  SUMMARY_SCHEMA,
  (summary, stats) => {
    const players = new Set([
      ...stats.playersBeaten.keys(),
      ...stats.playersTied,
      ...stats.playersLostTo.keys(),
    ]);
    const winsBreakdown = summary.wins.breakdown;
    winsBreakdown.set(players, winsBreakdown.has(players) ? winsBreakdown.get(players)! + 1 : 1);
    return {
      ...addGameToStats(summary, stats),
      wins: {
        total: summary.wins.total + (stats.position === 1 && players.size > 1 ? 1 : 0),
        breakdown: winsBreakdown,
      },
      sneakyWins: summary.sneakyWins + (stats.sneakyVictory ? 1 : 0),
    };
  },
)).withComponent(Game27);

export const summaryFields = makeSummaryFields<z.infer<typeof SUMMARY_SCHEMA>>()([
  {
    key: "pb",
    label: "Personal Best",
    value: stats => stats.score.highest,
    highlight: ["highest", true],
  },
  {
    key: "pb",
    label: "Personal Worst",
    value: stats => stats.score.lowest,
    highlight: ["highest", true],
  },
  {
    key: "mean",
    label: "Average score",
    value: stats => stats.score.total / stats.numGames,
    format: {
      maximumFractionDigits: 2,
    },
    highlight: ["highest", true],
  },
  // { //TODO: Real Wins?
  //   label: "Real Wins",
  //   key: "filteredW",
  //   highlight: {
  //     best: "highest",
  //   },
  // },
  {
    key: "wins",
    label: "Total Wins",
    value: stats => stats.wins.total,
    highlight: "highest",
  },
  {
    label: "Total games played",
    key: "numGames",
    value: stats => stats.numGames,
    highlight: "highest",
  },
  {
    key: "winR",
    label: "Win rate",
    value: stats => stats.wins.total / stats.numGames,
    format: { style: "percent", maximumFractionDigits: 2 },
    highlight: "highest",
  },
  {
    key: "fn",
    label: "Fat Nicks",
    value: stats => stats.fn,
    highlight: {
      worst: "highest",
    },
  },
  {
    key: "cliffs",
    label: "Cliffs",
    value: stats => stats.cliffs,
    highlight: "highest",
    rate: "Cliff Rate",
  },
  // {
  //   label: "Cliff Rate",
  //   key: "cliffs",
  //   rateFormat: true,
  //   highlight: {
  //     best: "highest",
  //   },
  // },
  {
    key: "dd",
    label: "Double Doubles",
    value: stats => stats.dd,
    highlight: "highest",
    rate: "Double Double Rate",
  },
  // {
  //   label: "Double Double Rate",
  //   key: "dd",
  //   rateFormat: true,
  //   highlight: {
  //     best: "highest",
  //   },
  // },
  {
    key: "hans",
    label: "Hans",
    value: stats => stats.hans,
    highlight: "highest",
  },
  {
    key: "goblins",
    label: "Goblins",
    value: stats => stats.goblins,
    highlight: "highest",
  },
  {
    key: "piranhas",
    label: "Piranhas",
    value: stats => stats.piranhas,
    highlight: "highest",
  },
  {
    key: "jesus",
    label: "Jesus",
    value: stats => stats.jesus,
    highlight: "highest",
  },
  {
    key: "allPos",
    label: "All Positive",
    value: stats => stats.allPos,
    highlight: "highest",
  },
  {
    key: "farDream",
    label: "Furthest Dream",
    value: stats => stats.farDream,
    highlight: "highest",
  },
  {
    key: "farPos",
    label: "Furthest Positive",
    value: stats => stats.farPos,
    highlight: "highest",
  },
  {
    key: "maxHits",
    label: "Most Hits",
    value: stats => stats.gameHits.highest,
    highlight: "highest",
  },
  {
    key: "minHits",
    label: "Least Hits",
    value: stats => stats.gameHits.lowest,
    highlight: ["highest", true],
  },
  {
    key: "meanHits",
    label: "Average Hits",
    value: stats => stats.gameHits.total,
    format: {
      maximumFractionDigits: 2,
    },
    highlight: "highest",
  },
] as const);

type T = SummaryFieldKeys<typeof summaryFields>
