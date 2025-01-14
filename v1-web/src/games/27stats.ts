import { MPGameStats, SPGameStats } from "./27v3";
import { Builder } from "./stats/builder";
import {
  GameStat, Stat, StatsDefinition, SummaryFieldDisplay, SummaryFieldKeys, summaryGenerator,
} from "./stats/statsAccumulator";
import { RoundNums1_20 as RoundNums, UnionToIntersection } from "@/utils/utilTypes";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _builder = Builder.create< { [k: string]: SPGameStats & MPGameStats }>();
//  .addField("score", GameStats);

type RoundHits = {
  total: number;
  games: number;
  dd: number;
  cliffs: number;
}

const NUM_HITS_FORMAT = new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 });
// const roundDataStat =
// (round: number, maximumFractionDigits = 2): Stat<RoundHits, SPGameStats, {// & MPGameStats, {
//   totalHits: SummaryFieldDisplay<RoundHits>;
//   totalRate: SummaryFieldDisplay<RoundHits>;
//   gameHits: SummaryFieldDisplay<RoundHits>;
//   gameRate: SummaryFieldDisplay<RoundHits>;
//   ddHits: SummaryFieldDisplay<RoundHits>;
//   ddRate: SummaryFieldDisplay<RoundHits>;
//   cliffHits: SummaryFieldDisplay<RoundHits>;
//   cliffRate: SummaryFieldDisplay<RoundHits>;
//   totalDarts: SummaryFieldDisplay<RoundHits>;
// }> => {
//   const roundStr = round.toString();
//   const rateFmt = new Intl.NumberFormat(undefined, { maximumFractionDigits, style: "percent" });
//   const makeFields =
//   (name: string, k: keyof RoundHits): Record<string, SummaryFieldDisplay<RoundHits>> => ({
//     [`${name}Hits`]: {
//       label: roundStr,
//       getFieldValue: (val, num) => val[k] / num,
//       highlight: {}, //TODO: highlighting
//     },
//     [`${name}Rate`]: {
//       label: roundStr,
//       getFieldValue: (val, num) => val[k] / num,
//       display: val => rateFmt.format(val),
//       highlight: {}, //TODO: highlighting
//     },
//   });
//   return {
//     startValue: () => ({
//       total: 0,
//       games: 0,
//       dd: 0,
//       cliffs: 0,
//     }),
//     summaryFields: Object.assign(
//       {
//         totalDarts: {
//           label: `Total Darts at ${roundStr}`,
//           getFieldValue: (_, num) => num * 3,
//           display: val => rateFmt.format(val),
//           highlight: {},
//         } as SummaryFieldDisplay<RoundHits>,
//       },
//       makeFields("total", "total"),
//       makeFields("game", "games"),
//       makeFields("dd", "dd"),
//       makeFields("cliff", "cliffs"),
//     ),
//     addGameResult({ total, games, dd, cliffs }, { numsHit, dd: ddHit, cliffs: cliffsHit }) {
//       const c = cliffsHit.has(round);
//       const d = ddHit.has(round);
//       const h = numsHit.has(round);
//       return {
//         total: total + (c ? 3 : d ? 2 : h ? 1 : 0),
//         games: games + (h ? 1 : 0),
//         dd: dd + (d ? 1 : 0),
//         cliffs: cliffs + (c ? 1 : 0),
//       };
//     },
//   };
// };

type RoundHitsData = {
  [N in RoundNums]: {
    total: number;
    games: number;
    dd: number;
    cliffs: number;
  };
} & {
  favourites: {
    total: { hits: number; rounds: Set<RoundNums> };
    games: { hits: number; rounds: Set<RoundNums> };
    dd: { hits: number; rounds: Set<RoundNums> };
    cliffs: { hits: number; rounds: Set<RoundNums> };
  };
};
type RoundNumFields<N extends number> = Record<
  `round${N}totalHits` |
  `round${N}totalRate` |
  `round${N}gameHits` |
  `round${N}gameRate` |
  `round${N}ddHits` |
  `round${N}ddRate` |
  `round${N}cliffHits` |
  `round${N}cliffRate` |
  `round${N}totalDarts`, SummaryFieldDisplay<RoundHitsData>>;
const roundDataStats =
(maximumFractionDigits = 2): Stat<RoundHitsData, SPGameStats, /* & MPGameStats,*/
UnionToIntersection<RoundNumFields<RoundNums>>> => {
  const rateFmt = new Intl.NumberFormat(undefined, { maximumFractionDigits, style: "percent" });
  const makeFields =
  (
    round: keyof RoundHitsData & number, label: string, name: string, k: keyof RoundHits,
    favourites: {
      [K in keyof RoundHits]: (
        limits: { highest: number; lowest: number },
        val: number, data: RoundHitsData,
      ) => boolean;
    },
  ):
  Record<string, SummaryFieldDisplay<RoundHitsData>> => {
    const highlight = Object.assign(
      { favourite: favourites[k] },
      ...Object.entries(favourites).map(([key, fav]) => ({ [`favourite_${key}`]: fav })),
    );
    return {
      [`round${round}${name}Hits`]: {
        label,
        getFieldValue: (val, num) => val[round][k],
        highlight,
      },
      [`round${round}${name}Rate`]: {
        label,
        getFieldValue: (val, num) => val[round][k] / num,
        display: val => rateFmt.format(val),
        highlight,
      },
    };
  };
  const initFavourites = (): RoundHitsData["favourites"] => ({ // Empty sets as no favourite when all equal
    total: { hits: 0, rounds: new Set() },
    games: { hits: 0, rounds: new Set() },
    dd: { hits: 0, rounds: new Set() },
    cliffs: { hits: 0, rounds: new Set() },
  });
  return {
    startValue: () => Array.from({ length: 20 }, () => ({
      total: 0,
      games: 0,
      dd: 0,
      cliffs: 0,
    })).reduce((obj, round, i) => Object.assign(obj, { [i + 1]: round }), {
      favourites: initFavourites(),
    } as RoundHitsData),
    summaryFields: Object.assign(
      {} as UnionToIntersection<RoundNumFields<RoundNums>>,
      ...Array.from({ length: 20 }, (_, i) => {
        const round = i + 1 as keyof RoundHitsData & number;
        const favourites: {
          [K in keyof RoundHits]: (
            limits: { highest: number; lowest: number },
            val: number, data: RoundHitsData,
          ) => boolean;
        } = {
          total: (limits, val, { favourites }) => favourites.total.rounds.has(round),
          games: (limits, val, { favourites }) => favourites.games.rounds.has(round),
          dd: (limits, val, { favourites }) => favourites.dd.rounds.has(round),
          cliffs: (limits, val, { favourites }) => favourites.cliffs.rounds.has(round),
        };
        const label = `Round ${round}`;
        return Object.assign(
          {
            [`round${round}totalDarts`]: {
              label: `Total Darts at ${i + 1}`,
              getFieldValue: (_, num) => num * 3,
              display: val => rateFmt.format(val),
              highlight: {},
            } as SummaryFieldDisplay<RoundHitsData>,
          },
          makeFields(round, label, "total", "total", favourites),
          makeFields(round, label, "games", "games", favourites),
          makeFields(round, label, "dd", "dd", favourites),
          makeFields(round, label, "cliffs", "cliffs", favourites),
        );
      }),
    ),
    addGameResult(prevValue, { rounds }) {
      const favourites = initFavourites();
      const roundData = rounds.reduce((val, h, i) => {
        const r = (i + 1) as keyof RoundHitsData & number;
        const { total, games, dd, cliffs } = prevValue[r];
        const res = {
          total: total + h,
          games: games + (h > 0 ? 1 : 0),
          dd: dd + (h === 2 ? 1 : 0),
          cliffs: cliffs + (h === 3 ? 1 : 0),
        };
        val[r] = res;
        for (const [k, { hits: prevMax, rounds: favRounds }] of
          Object.entries(favourites) as [keyof typeof favourites, {
            hits: number; rounds: Set<RoundNums>;
          }][]) {
          if (res[k] > prevMax) {
            favRounds.clear();
            favRounds.add(r);
            favourites[k].hits = res[k];
          } else if (res[k] === prevMax && prevMax > 0) {
            favRounds.add(r);
          }
        }
        return val;
      }, {} as RoundHitsData);
      return Object.assign(roundData, { favourites });
    },
  };
};

export const stats = {
  score: GameStat.game_integer(
    result => result.score,
    {
      highest: {
        label: "Personal Best",
      },
      lowest: {
        label: "Personal Worst",
        highlight: { best: "highest", worst: "lowest" },
      },
      mean: {
        label: "Average Score",
      },
    },
  ),
  // wins: GameStat.boolean(
  //   result => result.position === 1,
  //   "Wins",
  // ),
  numGames: GameStat.numGames("Total games played	"),
  // fatNicks: GameStat.boolean(result => result.fatNick, {
  //   label: "Fat Nicks",
  //   highlight: { worst: "highestNZ" },
  // }),
  fatNicks: {
    startValue: () => ({
      closest: 0,
      total: 0,
    }),
    addGameResult: ({ closest, total }, { fatNickUntil }) => {
      return {
        closest: Math.max(closest, fatNickUntil),
        total: total + (fatNickUntil > 19 ? 1 : 0),
      };
    },
    summaryFields: {
      count: {
        label: "Fat Nicks",
        getFieldValue: val => val.total,
        highlight: { worst: "highestNZ" },
      },
      closest: {
        label: "Closest to Fat Nick",
        getFieldValue: val => val.closest,
        highlight: { best: "lowestNZ", worst: "highestNZ" },
      },
    },
  },
  cliffs: GameStat.integer(result => result.cliffs.size, 20, {
    highest: { label: "Most Cliffs / game" },
    lowest: { label: "Least Cliffs / game" },
    total: { label: "Cliffs" },
    meanGames: { label: "Cliff Rate (no. games)" },
    meanTotal: { label: "Cliff Rate" },
  }),
  doubleDoubles: GameStat.integer(result => result.dd.size, 20, {
    highest: { label: "Most Double Doubles / game" },
    lowest: { label: "Least Double Doubles / game" },
    total: { label: "Double Doubles" },
    meanGames: { label: "Double Double Rate (no. games)" },
    meanTotal: { label: "Double Double Rate" },
  }),
  hans: GameStat.game_integer(result => result.hans.size, { //TODO: Multiple hans per game?
    total: { label: "Hans" },
  }),
  goblins: GameStat.boolean(result => result.goblin, "Goblins"),
  piranhas: GameStat.boolean(result => result.piranha, "Piranhas"),
  jesus: GameStat.boolean(result => result.jesus, "Jesus"),
  // allPos: GameStat.boolean(result => result.farPos >= 20, "All Positive"),
  positive: {
    startValue: () => ({
      furthest: 0,
      shortest: 20,
      total: 0,
    }),
    addGameResult: ({ furthest, shortest, total }, { farPos }) => {
      return {
        furthest: Math.max(furthest, farPos),
        shortest: Math.min(shortest, farPos),
        total: total + (farPos > 19 ? 1 : 0),
      };
    },
    summaryFields: {
      total: {
        label: "All Positive",
        getFieldValue: val => val.total,
        highlight: { best: "highestNZ" },
      },
      furthest: {
        label: "Furthest Positive",
        getFieldValue: val => val.furthest,
        highlight: { best: "highestNZ" },
      },
    },
  },
  dreams: {
    startValue: () => ({
      furthest: 0,
      shortest: 20,
      total: 0,
    }),
    addGameResult: ({ furthest, shortest, total }, { farDream }) => {
      return {
        furthest: Math.max(furthest, farDream),
        shortest: Math.min(shortest, farDream),
        total: total + (farDream > 19 ? 1 : 0),
      };
    },
    summaryFields: {
      total: {
        label: "Dreams",
        getFieldValue: val => val.total,
        highlight: { best: "highestNZ" },
      },
      furthest: {
        label: "Furthest Dream",
        getFieldValue: val => val.furthest,
        highlight: { best: "highestNZ" },
      },
    },
  },
  hits: GameStat.game_integer(result => result.totalHits,
    {
      highest: {
        label: "Most Hits",
      },
      lowest: {
        label: "Least Hits",
      },
      mean: {
        label: "Average Hits",
        display: val => NUM_HITS_FORMAT.format(val),
      },
    },
  ),
  roundData: roundDataStats(),
  // round1: roundDataStat(1),
  // round2: roundDataStat(2),
  // round3: roundDataStat(3),
  // round4: roundDataStat(4),
  // round5: roundDataStat(5),
  // round6: roundDataStat(6),
  // round7: roundDataStat(7),
  // round8: roundDataStat(8),
  // round9: roundDataStat(9),
  // round10: roundDataStat(10),
  // round11: roundDataStat(11),
  // round12: roundDataStat(12),
  // round13: roundDataStat(13),
  // round14: roundDataStat(14),
  // round15: roundDataStat(15),
  // round16: roundDataStat(16),
  // round17: roundDataStat(17),
  // round18: roundDataStat(18),
  // round19: roundDataStat(19),
  // round20: roundDataStat(20),
  // roundData: {
  //   startValue: () => Array.from({ length: 20 }, _ => ({
  //     total: 0,
  //     games: 0,
  //     dd: 0,
  //     cliffs: 0,
  //   })),
  //   addGameResult:
  //    ({ total, games, dd, cliffs }, { rounds, numsHit, dd: ddHit, cliffs: cliffsHit }) => {
  //     return {
  //       total: rounds[]
  //     };
  //   },
  //   summaryFields: Array.from({ length: 20 }).reduce((obj, _, i) => {
  //     const round = (i + 1).toString();
  //     obj[round] = {
  //       label: round,
  //       getFieldValue: val => val.total,
  //     };
  //     return obj;
  //   }, {} as Record<string, SummaryFieldDisplay<RoundHits>>),
  // },
} satisfies StatsDefinition<SPGameStats>;// & MPGameStats>;

export type SummaryFieldKey = SummaryFieldKeys<typeof stats>;
export const summaryFactory = summaryGenerator<typeof stats, SPGameStats>(stats);// & MPGameStats>(stats);
