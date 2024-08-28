/*
 * ============================================================================
 * TEMPORARY TEST TYPES AND VALUES
 * ============================================================================
 */

import type { FixedLengthArray, NumericRange } from "@/utils/types";
import { gameDefinitionBuilder, type ArrayGameDef } from ".";
import { gameDefinitionBuilder as gameDefBuilder } from "./builder";
import { makePlayerGameState, type CalculatedPlayerData } from "./gameData";
import type { SoloGameStatsFactory } from "./stats";
import { makeGameInstanceFactoryFor } from "./gameDataInstance";
import { GameDefinition, type PlayerDataForGame } from "./definition";
import type { TurnKey } from "./types";
import {
  makeSummaryAccumulatorFactoryFor,
  SummaryAccumulator,
  type PlayerSummaryValues,
  type StatsTypeForGame,
} from "./summary";
import type { GameResult } from "./gameResult";

const gameType27 = gameDefinitionBuilder("twentyseven")<{ score: number; jesus?: boolean }>(
  () => ({
    startScore: 27,
    score: 27,
  }),
  {
    order: "highestFirst",
    scoreField: "score",
  },
).withArrayRounds<NumericRange<4>, { cliff: boolean; dd: boolean; hits: number }>()(20, (idx) => ({
  untakenValue: 0, // as NumericRange<4>,
  deltaScore: (val) => {
    switch (val) {
      case 0:
        return (idx + 1) * -2;
      case 1:
        return (idx + 1) * 2;
      case 2:
        return (idx + 1) * 4;
      case 3:
        return (idx + 1) * 6;
    }
  },
  turnStats: (val) => ({
    cliff: val === 3,
    dd: val >= 2,
    hits: val,
  }),
  component: (val, { deltaScore, score, mutable, focus }) => "TODO: component" /*{
      mutable: (val, { deltaScore, score, mutable, focus }) => "TODO: mutable cell",
      immutable: (val, { deltaScore, score, mutable, focus }) => "TODO: immutable cell",
    }//*/,
}));

const gameType27v2 = gameDefBuilder("twentyseven")<{ startScore: number; jesus?: boolean }, {}>(
  () => ({
    startScore: 27,
  }),
  () => ({}),
)
  .withArrayRounds<NumericRange<4>, { cliff: boolean; dd: boolean; hits: NumericRange<4> }>()(
    20,
    (idx) => ({
      untakenValue: 0, // as NumericRange<4>,
      deltaScore: (val) => {
        switch (val) {
          case 0:
            return (idx + 1) * -2;
          case 1:
            return (idx + 1) * 2;
          case 2:
            return (idx + 1) * 4;
          case 3:
            return (idx + 1) * 6;
        }
      },
      turnStats: (val) => ({
        cliff: val === 3,
        dd: val >= 2, //TODO: config27.ddIncludeCliffs
        hits: val,
      }),
      component: (val, { deltaScore, score, mutable, focus }) => "TODO: component" /*{
      mutable: (val, { deltaScore, score, mutable, focus }) => "TODO: mutable cell",
      immutable: (val, { deltaScore, score, mutable, focus }) => "TODO: immutable cell",
    }//*/,
    }),
  )
  .withGameStats(({ score, turns }) => {
    const farFN = turns.findIndex(({ stats: { hits } }) => hits > 0);
    const farDream = turns.findIndex(({ stats: { hits } }) => hits < 1);
    const farPos = turns.findIndex(({ endingScore }) => endingScore < 0);
    return {
      farFN,
      fatNick: farFN < 0,
      farDream,
      dream: farDream < 0,
      farPos,
      allPos: farPos < 0,
      /** Losing the allPos on the final round by a single point (ending on -1) */
      banana: farPos === turns.length - 1 && score === -1,
      cliffs: turns.reduce((total, { stats: { cliff } }) => (cliff ? total + 1 : total), 0),
      doubleDoubles: turns.reduce((total, { stats: { dd } }) => (dd ? total + 1 : total), 0),
      hits: turns.reduce((total, { stats: { hits } }) => total + hits, 0),
      hans: turns.reduce(
        ({ count, preDD }, { stats: { dd } }) => {
          if (dd) {
            preDD += 1;
            if (preDD >= 3) {
              count += 1;
            }
          } else {
            preDD = 0;
          }
          return { count, preDD };
        },
        { count: 0, preDD: 0 },
      ).count,
      goblin: turns.every(({ stats: { hits } }) => hits === 2 || hits === 0),
      piranha:
        turns[0].stats.hits === 1 && turns.slice(1).every(({ stats: { hits } }) => hits === 0),
    };
  })<{}>((pdata, shared, pos) => {
  // console.log("GameStats:", pdata, shared, pos);
  return {};
});
const gameDef27Built = gameType27v2.build("highestFirst");

const randomRounds = () =>
  Array.from({ length: 20 }, () => {
    const rnd = Math.random();
    return rnd < 0.75 ? 0 : rnd < 0.9 ? 1 : rnd < 0.98 ? 2 : 3;
  }) as FixedLengthArray<NumericRange<4>, 20>;

const randomGame = (players: string[]) =>
  new Map(
    players.map((pid) => [
      pid,
      {
        // score: 0,
        startScore: 27,
        completed: true,
        turns: randomRounds(),
      },
    ]),
  );
const testGameScores = randomGame(["totally a real player", "NotABot01"]);
(() => {
  const gameDefV3 = new GameDefinition(
    "twentyseven",
    undefined,
    "highestFirst",
    () => ({}),
    () =>
      ({
        startScore: 27,
      }) as { startScore: number; jesus?: boolean },
    gameType27v2.soloStatsFactory,
    gameType27v2.fullStatsFactory,
    gameType27v2.getRound.bind(gameType27v2),
  );
  console.log(
    "Running GameDefinition test game:",
    gameDefV3.calculateGameResult(testGameScores, {}),
  );

  console.log(
    "Running gameType.build test game:",
    gameDef27Built.calculateGameResult(testGameScores, {}),
  );

  const gameInstanceFactory = makeGameInstanceFactoryFor(gameType27v2);
  console.log(
    "Running test game (makeGameInstanceFactoryFor):",
    gameInstanceFactory(testGameScores, {}),
  );
})();

type T27GameDefTarget = ArrayGameDef<
  "twentyseven",
  { score: number; jesus?: boolean },
  NumericRange<4>,
  { cliff: boolean; dd: boolean; hits: number },
  NumericRange<4>,
  20
>;
type T27GameDefRet = typeof gameType27;
type T27GameDefRetV2 = typeof gameType27v2;
type RetRoundsV1 = T27GameDefRet["rounds"];
// type RetRoundsV2 = T27GameDefRetV2["rounds"];
type TrgRounds = T27GameDefTarget["rounds"];

type Cmp<A, B> = A extends B
  ? B extends A
    ? true
    : "A = B, B ! A"
  : B extends A
    ? "B = A, A ! B"
    : false;

type T27GameDefCmp = Cmp<T27GameDefTarget, T27GameDefRet>;
type T27DetailedCmp = {
  [K in keyof T27GameDefTarget]: Cmp<T27GameDefTarget[K], T27GameDefRet[K]> extends infer C
    ? C extends true
      ? true
      : [C, T27GameDefTarget[K], T27GameDefRet[K]]
    : never;
};
type T27DetailedDefCmp = {
  [K in keyof T27GameDefRetV2]: K extends keyof T27GameDefRet
    ? Cmp<T27GameDefRetV2[K], T27GameDefRet[K]> extends infer C
      ? C extends true
        ? true
        : [C, T27GameDefRetV2[K], T27GameDefRet[K]]
      : never
    : [K, T27GameDefRetV2[K]];
};
type T27RoundsCmp = Cmp<TrgRounds, RetRoundsV1>;

const playerData27 = makePlayerGameState(gameType27, "totallyARealPlayer");

console.log("Player data 27:", gameType27.type, playerData27);
console.log("Player data 27:", playerData27.deltaScores);

type T27Solo = SoloGameStatsFactory<T27GameDefRet, { hans: number }>;
type T27PData = CalculatedPlayerData<T27GameDefRet>;

type T27GDPDataFull = PlayerDataForGame<typeof gameDef27Built>;
type T27GDTurnData =
  typeof gameDef27Built extends GameDefinition<
    any,
    any,
    any,
    any,
    any,
    infer TurnData,
    any,
    any,
    any
  >
    ? TurnData
    : unknown;
type T = { [K in TurnKey<T27GDTurnData>]: any };

type T27StatsType = StatsTypeForGame<typeof gameDef27Built>;
type T27StatsKeys = keyof StatsTypeForGame<typeof gameDef27Built>;

// const defaultSummary27 = [
//   {
//     label: "Personal Best",
//     value: ({ score }) => score,
//     cmp: ,
//     display: ,
//     extended: ,
//   },

// ] satisfies SummaryFieldDef<any, PlayerDataForGame<typeof gameDef27Built>>[];

const summaryAcc27 = makeSummaryAccumulatorFactoryFor(
  gameDef27Built,
  {
    fatNicks: {
      empty: () => ({
        furthest: 0,
        count: 0,
      }),
      push: ({ furthest, count }, { farFN, fatNick }) => ({
        furthest: Math.max(farFN, furthest),
        count: count + +fatNick,
      }),
    },
    dreams: {
      empty: () => ({
        furthest: 0,
        count: 0,
      }),
      push: ({ furthest, count }, { farDream, dream }) => ({
        furthest: Math.max(farDream, furthest),
        count: count + +dream,
      }),
    },
    allPos: {
      empty: () => ({
        furthest: 0,
        count: 0,
      }),
      push: ({ furthest, count }, { farPos, allPos }) => ({
        furthest: Math.max(farPos, furthest),
        count: count + +allPos,
      }),
    },
    cliffs: {
      empty: () => ({
        most: 0,
        least: 20, // Is it really worth calculating?
        total: 0,
        available: 0,
        /** Average cliff per game */
        perGameMean: 0,
        /** Mean cliff rate of a single round */
        rate: 0,
      }),
      push: (
        { most, least, total: prev, available: prevA, perGameMean, rate },
        { roundStatsGameSummary: { cliff } },
        numGames,
      ) => {
        const total = prev + cliff.total;
        const available = prevA + cliff.max;
        return {
          most: Math.max(most, cliff.total),
          least: Math.min(least, cliff.total),
          total,
          available,
          perGameMean: total / numGames,
          rate: total / available,
        };
      },
    },
    doubleDoubles: {
      empty: () => ({
        most: 0,
        least: 20, // Is it really worth calculating?
        total: 0,
        available: 0,
        /** Average dd per game */
        perGameMean: 0,
        /** Mean dd rate of a single round */
        rate: 0,
      }),
      push: (
        { most, least, total: prev, available: prevA, perGameMean, rate },
        { roundStatsGameSummary: { dd } },
        numGames,
      ) => {
        const total = prev + dd.total;
        const available = prevA + dd.max;
        return {
          most: Math.max(most, dd.total),
          least: Math.min(least, dd.total),
          total,
          available,
          perGameMean: total / numGames,
          rate: total / available,
        };
      },
    },
    hits: {
      empty: () => ({
        most: 0,
        least: 60,
        total: 0,
        available: 0,
        /** Average hit per game */
        perGameMean: 0,
        /** Mean hit rate of a single dart */
        rate: 0,
      }),
      push: (
        { most, least, total: prev, available: prevA, perGameMean, rate },
        { roundStatsGameSummary: { hits } },
        numGames,
      ) => {
        const total = prev + hits.total;
        const available = prevA + hits.roundsPlayed.all * 3;
        return {
          most: Math.max(most, hits.total),
          least: Math.min(least, hits.total),
          total,
          available,
          perGameMean: total / numGames,
          rate: total / available,
        };
      },
    },
    hans: {
      empty: () => ({
        most: 0,
        least: 20, // Is it really worth calculating?
        total: 0,
        mean: 0,
      }),
      push: ({ most, least, total: prev, mean }, { hans }, numGames) => {
        const total = prev + hans;
        return {
          most: Math.max(most, hans),
          least: Math.min(least, hans),
          total,
          mean: total / numGames,
        };
      },
    },
    goblins: {
      empty: () => ({
        count: 0,
        mean: 0,
      }),
      push: ({ count, mean }, { goblin }, numGames) => {
        const total = count + +goblin;
        return {
          count: total,
          mean: total / numGames,
        };
      },
    },
    piranhas: {
      empty: () => ({
        count: 0,
        mean: 0,
      }),
      push: ({ count, mean }, { piranha }, numGames) => {
        const total = count + +piranha;
        return {
          count: total,
          mean: total / numGames,
        };
      },
    },
    jesus: {
      empty: () => ({
        count: 0,
        mean: 0,
      }),
      push: ({ count, mean }, { jesus }, numGames) => {
        const total = count + (jesus ? 1 : 0);
        return {
          count: total,
          mean: total / numGames,
        };
      },
    },
    banana: {
      empty: () => ({
        count: 0,
        mean: 0,
      }),
      push: ({ count, mean }, { banana }, numGames) => {
        const total = count + +banana;
        return {
          count: total,
          mean: total / numGames,
        };
      },
    },
  },
  {
    cliffs: {
      get: ({ cliff }) => cliff.total,
      cmp: "highest",
    },
    doubleDoubles: {
      get: ({ dd }) => dd.total,
      cmp: "highest",
    },
    total: {
      get: ({ hits }) => hits.total,
      cmp: "highest",
    },
    nonZero: {
      get: ({ hits: { roundsPlayed } }, numGames) =>
        roundsPlayed.all - (roundsPlayed.counts.get(0) ?? 0),
      cmp: "highest",
    },
  },
);
console.log("Summary parts:", summaryAcc27.parts);
type TGameSummary27Parts = typeof summaryAcc27.parts;
type TGameSummary27PValues =
  PlayerSummaryValues<
    typeof gameDef27Built,
    {
      [K in keyof TGameSummary27Parts]: K extends "score" | "wins"
        ? never | undefined
        : TGameSummary27Parts[K];
    }
  > extends infer _T
    ? { [K in keyof _T]: _T[K] }
    : never;

const accGameSummary27 = (
  accumulator: ReturnType<typeof summaryAcc27.create>,
  playerOrder = ["player1", "player2"],
  forceTie = false,
) => {
  const game = gameDef27Built.calculateGameResult(
    forceTie
      ? (() => {
          const turns = randomRounds();
          return new Map(
            playerOrder.map((pid) => [
              pid,
              {
                // score: 0,
                startScore: 27,
                completed: true,
                turns,
              },
            ]),
          );
        })()
      : randomGame(playerOrder),
    {},
  );
  const result: GameResult<T27GDPDataFull> = {
    date: new Date(),
    playerOrder,
    results: [...game.players].reduce(
      (acc, [pid, pData]) => Object.assign(acc, { [pid]: pData }),
      {},
    ),
  };
  const winners = game.positionsOrdered[0].players;
  if (winners.length > 1) {
    result.tiebreak = {
      players: winners,
      type: "UNKNOWN",
      winner: winners[Math.floor(Math.random() * winners.length)],
    };
  }
  console.log("Summary for single game:", result.results, result.tiebreak);
  console.log(
    "pre =>",
    [...accumulator.getAllSummaries()].reduce(
      (obj, [pid, s]) =>
        Object.assign(obj, {
          [pid]: Object.entries(s).reduce(
            (acc, [k, v]) =>
              Object.assign(acc, {
                [k]:
                  k === "wins"
                    ? v
                    : (() => {
                        try {
                          return structuredClone(v);
                        } catch (e) {
                          return e;
                        }
                      })(),
              }),
            {} as any,
          ),
        }),
      {} as any,
    ),
  );
  accumulator.pushGame(result);
  console.log(
    "post =>",
    [...accumulator.getAllSummaries()].reduce(
      (acc, [k, v]) => Object.assign(acc, { [k]: v }),
      {} as any,
    ),
  );
};

const accumulator27 = summaryAcc27.create();

console.log("Summary 1");
accGameSummary27(accumulator27);
console.log("Summary 2");
accGameSummary27(accumulator27);
console.log("Summary 3 (tie)");
accGameSummary27(accumulator27, undefined, true);
