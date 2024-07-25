/*
 * ============================================================================
 * TEMPORARY TEST TYPES AND VALUES
 * ============================================================================
 */

import type { NumericRange } from "@/utils/types";
import { gameDefinitionBuilder, type ArrayGameDef } from ".";
import { makePlayerGameState } from "./gameData";

const gameType27 = gameDefinitionBuilder("twentyseven")<{ score: number; jesus?: boolean }>(
  () => ({
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

type T27GameDefTarget = ArrayGameDef<
  "twentyseven",
  { score: number; jesus?: boolean },
  NumericRange<4>,
  { cliff: boolean; dd: boolean; hits: number },
  NumericRange<4>,
  20
>;
type T27GameDefRet = typeof gameType27;
type RetRoundsV1 = T27GameDefRet["rounds"];
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
type T27RoundsCmp = Cmp<TrgRounds, RetRoundsV1>;

const playerData27 = makePlayerGameState(gameType27, "totallyARealPlayer");

console.log("Player data 27:", gameType27.type, playerData27);
console.log("Player data 27:", playerData27.deltaScores);
