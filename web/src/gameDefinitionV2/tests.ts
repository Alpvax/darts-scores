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
import type { PlayerDataFull, TurnKey } from "./types";
import type { StatsTypeFor, StatsTypeForGame, SummaryFieldDef } from "./summary";

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
        dd: val >= 2,
        hits: val,
      }),
      component: (val, { deltaScore, score, mutable, focus }) => "TODO: component" /*{
      mutable: (val, { deltaScore, score, mutable, focus }) => "TODO: mutable cell",
      immutable: (val, { deltaScore, score, mutable, focus }) => "TODO: immutable cell",
    }//*/,
    }),
  )
  .withGameStats((pData) => {
    const farDream = pData.turns.findIndex(({ stats: { hits } }) => hits < 1);
    const farPos = pData.turns.findIndex(({ endingScore }) => endingScore > 0);
    return {
      fatNick: pData.turns.every(({ stats: { hits } }) => hits === 0),
      farDream,
      dream: farDream >= pData.turns.length,
      farPos,
      allPos: farPos >= pData.turns.length,
      cliffs: pData.turns.reduce((total, { stats: { cliff } }) => (cliff ? total + 1 : total), 0),
      doubleDoubles: pData.turns.reduce((total, { stats: { dd } }) => (dd ? total + 1 : total), 0),
      hits: pData.turns.reduce((total, { stats: { hits } }) => total + hits, 0),
      hans: pData.turns.reduce(
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
      goblin: pData.turns.every(({ stats: { hits } }) => hits === 2 || hits === 0),
      piranha:
        pData.turns[0].stats.hits === 1 &&
        pData.turns.slice(1).every(({ stats: { hits } }) => hits === 0),
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
const testGameScores = new Map([
  [
    "totally a real player",
    {
      score: 0,
      startScore: 27,
      completed: true,
      turns: randomRounds(),
    },
  ],
  [
    "NotABot01",
    {
      score: 0,
      startScore: 27,
      completed: true,
      turns: randomRounds(),
    },
  ],
]);
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

const defaultSummary27 = {
  // score: {},
} satisfies Record<string, SummaryFieldDef<any, PlayerDataForGame<typeof gameDef27Built>>>;
