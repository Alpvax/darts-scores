import { gameDefinitionBuilder } from "@/gameDefinitionV2/builder";
import type { PlayerDataForGame } from "@/gameDefinitionV2/definition";
import type { GameResult } from "@/gameDefinitionV2/gameResult";
import { SummaryAccumulator, type PlayerSummaryValues } from "@/gameDefinitionV2/summary";
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

export const summaryAccumulator27 = gameDefinition27.makeSummaryAccumulatorFactory(
  ({ countFurthestRound, countRoundStats, numeric, boolPart }) => ({
    fatNicks: countFurthestRound("fn", ({ farFN, fatNick }) => [farFN, fatNick], "negative"),
    dreams: countFurthestRound("dream", ({ farDream, dream }) => [farDream, dream], "positive"),
    allPos: countFurthestRound("allPos", ({ farPos, allPos }) => [farPos, allPos], "positive"),
    cliffs: countRoundStats("cliff", "positive"),
    doubleDoubles: countRoundStats("dd", "positive"),
    hits: countRoundStats("hits", ({ all }) => all * 3, "positive"),
    hans: numeric("hans", "positive"),
    goblins: boolPart("goblin", "positive"),
    piranhas: boolPart("piranha", "positive"),
    jesus: boolPart("jesus", "positive"),
    banana: boolPart("banana", "positive"),
  }),
  {
    cliffs: {
      label: "Cliffs",
      get: ({ cliff }, { fullValues }) => ({
        total: cliff.total,
        rateDivisor: fullValues?.cliff.roundsPlayed ?? cliff.roundsPlayed,
      }),
      cmp: { best: "highest", precision: 2 },
      ignoreValue: 0,
    },
    doubleDoubles: {
      label: "Double Doubles",
      get: ({ dd }, { fullValues }) => ({
        total: dd.total,
        rateDivisor: fullValues?.dd.roundsPlayed ?? dd.roundsPlayed,
      }),
      cmp: { best: "highest", precision: 2 },
      ignoreValue: 0,
    },
    total: {
      label: "Total hits",
      get: ({ hits }, { fullValues }) => ({
        total: hits.total,
        rateDivisor: fullValues?.hits.roundsPlayed.all ?? hits.roundsPlayed.all,
      }),
      cmp: { best: "highest", precision: 2 },
      ignoreValue: 0,
    },
    nonZero: {
      label: "Non-zero hits",
      get: ({ hits: { roundsPlayed } }, { fullValues }) => ({
        total: roundsPlayed.all - (roundsPlayed.counts.get(0) ?? 0),
        rateDivisor: fullValues?.hits.roundsPlayed.all ?? roundsPlayed.all,
      }),
      cmp: { best: "highest", precision: 2 },
      ignoreValue: 0,
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
    infer RoundsField
  >
    ? PlayerSummaryValues<G, SummaryPartTypes, RoundsField>
    : never;
export type RoundRowsMeta27 =
  ReturnType<typeof summaryAccumulator27.create> extends SummaryAccumulator<
    infer G,
    any,
    infer RoundsField
  >
    ? RoundRowsMeta<G, RoundsField>
    : never;
export type RoundsField27 =
  ReturnType<typeof summaryAccumulator27.create> extends SummaryAccumulator<
    any,
    any,
    infer RoundsField
  >
    ? RoundsField
    : never;
