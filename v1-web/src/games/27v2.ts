// import { makeGameType } from ".";
// import { Result27 } from "./27";
// import { ExtendedPlayerGameResult, convertResult, PLAYER_STATS_SCHEMA, addGameToStats } from "./summary/summary27";

// export const GAME_TYPE = makeGameType<Result27, ExtendedPlayerGameResult>(
//   "twentyseven",
//   game => Object.keys(game.game),
//   (result, pid) => convertResult(result.game[pid]),
// )(
//   PLAYER_STATS_SCHEMA, addGameToStats,
//   {
//     pb: {
//       label: "Personal Best",
//       type: "player",
//       value: stats => stats.score.highest,
//     },
//     pw: {
//       label: "Personal Worst",
//       type: "player",
//       value: stats => stats.score.lowest,
//     },
//     mean: {
//       label: "Average score",
//       type: "player",
//       value: (stats, { rate }) => rate(stats.score.highest),
//     },
//     filteredW: {
//       label: "Real Wins",
//       type: "game",
//       value: (stats) => {
//         throw new Error("Function not implemented.");
//       },
//     },
//     wins: {
//       label: "Total Wins",
//       type: "game",
//       value: (stats) => {
//         throw new Error("Function not implemented.");
//       },
//     },
//     gameCount: {
//       label: "Total games played",
//       type: "player",
//       value: stats => stats.numGames,
//     },
//     winR: {
//       label: "Win rate",
//       type: "game",
//       value: (stats) => {
//         throw new Error("Function not implemented.");
//       },
//     },
//     fn: {
//       label: "Fat Nicks",
//       type: "player",
//       value: stats => stats.fn,
//     },
//     cliff: {
//       label: "Cliffs",
//       type: "player",
//       value: stats => stats.cliffs,
//       displayAdditionalRate: 2,
//     },
//     cliffR: {
//       label: "Cliff Rate",
//       type: "player",
//       value: (stats) =>  {
//         throw new Error("Function not implemented.");
//       },
//     },
//     dd: {
//       label: "Double Doubles",
//       type: "player",
//       value: stats => stats.dd,
//       displayAdditionalRate: 2,
//     },
//     ddR: {
//       label: "Double Double Rate",
//       type: "player",
//       value: (stats) =>  {
//         throw new Error("Function not implemented.");
//       },
//     },
//     hans: {
//       label: "Hans",
//       type: "player",
//       value: stats => stats.hans,
//     },
//     goblins: {
//       label: "Goblins",
//       type: "player",
//       value: stats => stats.goblins,
//     },
//     piranhas: {
//       label: "Piranhas",
//       type: "player",
//       value: stats => stats.piranhas,
//     },
//     jesus: {
//       label: "Jesus",
//       type: "player",
//       value: stats => stats.jesus,
//     },
//     ap: {
//       label: "All Positive",
//       type: "player",
//       value: stats => stats.allPos,
//     },
//     farDream: {
//       label: "Furthest Dream",
//       type: "player",
//       value: stats => stats.farDream,
//     },
//     farPos: {
//       label: "Furthest Positive",
//       type: "player",
//       value: stats => stats.farPos,
//     },
//     mostHits: {
//       label: "Most Hits",
//       type: "player",
//       value: stats => stats.gameHits.highest,
//     },
//     leastHits: {
//       label: "Least Hits",
//       type: "player",
//       value: stats => stats.gameHits.lowest,
//     },
//     meanHits: {
//       label: "Average Hits",
//       type: "player",
//       value: (stats, { rate }) => rate(stats.gameHits.total),
//     },
//   }, [
//     "pb", "pw", "mean",
//     "filteredW", "wins",
//     "gameCount", "winR",
//     "fn", "cliff", "cliffR", "dd", "ddR", "hans",
//     "goblins", "piranhas", "jesus",
//     "ap", "farDream", "farPos",
//     "mostHits", "leastHits", "meanHits",
//   ],
// );
