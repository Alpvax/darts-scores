import { gameDefinitionBuilder } from "@/gameDefinitionV2/builder";
import type { PlayerDataForGame } from "@/gameDefinitionV2/definition";
import type { GameResult } from "@/gameDefinitionV2/gameResult";
import {
  makeSummaryAccumulatorFactoryFor,
  SummaryAccumulator,
  type PlayerSummaryValues,
} from "@/gameDefinitionV2/summary";
import type { RoundRowsMeta } from "@/gameDefinitionV2/summary/summaryComponent";
import type { NumericRange } from "@/utils/types";
import dbAdapter27 from "./database";

export const gameDefinition27 = gameDefinitionBuilder("twentyseven")<
  { startScore: number; jesus?: boolean },
  {}
>(
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
      farFN: farFN < 0 ? turns.length : farFN,
      fatNick: farFN < 0,
      farDream: farDream < 0 ? turns.length : farDream,
      dream: farDream < 0,
      farPos: farPos < 0 ? turns.length : farPos,
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
  })
  .build("highestFirst", dbAdapter27());

export const summaryAccumulator27 = makeSummaryAccumulatorFactoryFor(
  gameDefinition27,
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
      // push: ({ furthest, count }, { farFN, fatNick }) => {
      //   console.log("FatNick.push", { fatNick, farFN, furthest, count });
      //   return {
      //     furthest: Math.max(farFN, furthest),
      //     count: count + +fatNick,
      //   };
      // },
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
      get: ({ hits: { roundsPlayed } }) => roundsPlayed.all - (roundsPlayed.counts.get(0) ?? 0),
      cmp: "highest",
    },
  },
);

export const Summary27Component = summaryAccumulator27.createComponent();

export type PlayerDataFull27 = PlayerDataForGame<typeof gameDefinition27>;
export type GameResult27 = GameResult<PlayerDataForGame<typeof gameDefinition27>>;
export type PlayerSummaryValues27 =
  ReturnType<typeof summaryAccumulator27.create> extends SummaryAccumulator<
    infer G,
    infer SummaryPartTypes,
    infer FavFields
  >
    ? PlayerSummaryValues<G, SummaryPartTypes, FavFields>
    : never;
export type RoundRowsMeta27 =
  ReturnType<typeof summaryAccumulator27.create> extends SummaryAccumulator<
    infer G,
    any,
    infer FavFields
  >
    ? RoundRowsMeta<G, FavFields>
    : never;
