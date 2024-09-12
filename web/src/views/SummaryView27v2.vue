<script lang="ts">
import { use27Config } from "@/game/27/config";
import {
  gameDefinition27,
  Summary27Component,
  summaryAccumulator27,
  type GameResult27,
  type PlayerSummaryValues27,
  type RoundRowsMeta27,
} from "@/game/27/gameDefv2";
import { floatField, type SummaryFieldDef } from "@/gameDefinitionV2/summary";
import type { FixedLengthArray, NumericRange } from "@/utils/types";
import { ref, defineComponent, watch, computed, h } from "vue";
import SummaryV1 from "./SummaryView27.vue";
import { gameMeta, type TurnData27 } from "@/game/27";
import type { GameResult } from "@/gameUtils/summary";
import type { IntoTaken } from "@/gameUtils/roundDeclaration";
import PlayerName from "@/components/PlayerName";

export default defineComponent({
  components: {
    Summary27Component,
    SummaryV1,
  },
  props: {},
  setup: (/*TODO: props*/) => {
    const accumulator = ref(summaryAccumulator27.create());
    const players = ref([
      //TODO: proper players
      "y5IM9Fi0VhqwZ6gAjil6",
      "6LuRdib3wFxhbcjjh0au",
      "Gt8I7XPbPWiQ92FGsTtR",
      "jcfFkGCY81brr8agA3g3",
      "jpBEiBzn9QTVN0C6Hn1m",
      "k7GNyCogBy79JE4qhvAj",
    ]);
    const makeGame = ({
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      identifier,
      length = 20,
      all = false,
      forceTie = false,
    }: {
      identifier?: number | string;
      length?: number;
      all?: boolean;
      forceTie?: boolean;
    }): { v1: GameResult<TurnData27>; v2: GameResult27 } => {
      const randomRounds = () =>
        Array.from({ length: 20 }, (_, i) =>
          i < length
            ? Math.random() < 0.3
              ? Math.random() < 0.1
                ? Math.random() < 0.01
                  ? 3
                  : 2
                : 1
              : 0
            : 0,
        ) as FixedLengthArray<NumericRange<4>, 20>;
      const playerDataRaw = forceTie
        ? (() => {
            const turns = randomRounds();
            return new Map(
              players.value.flatMap((pid) =>
                all || Math.random() < 0.8
                  ? [
                      [
                        pid,
                        {
                          // score: 0,
                          startScore: 27,
                          completed: true,
                          turns,
                        },
                      ],
                    ]
                  : [],
              ),
            );
          })()
        : new Map(
            players.value.flatMap((pid) =>
              all || Math.random() < 0.8
                ? [
                    [
                      pid,
                      {
                        // score: 0,
                        startScore: 27,
                        completed: true,
                        turns: randomRounds(),
                      },
                    ],
                  ]
                : [],
            ),
          );
      const v1pData = new Map(
        [...playerDataRaw].map(([pid, { turns: hits }]) => {
          const { turns, score } = gameMeta.rounds.reduce(
            ({ turns, score }, r, i) => {
              const t = r.turnData(hits[i], score, "", i);
              turns.push(t);
              return { turns, score: t.score };
            },
            { turns: [] as TurnData27[], score: 27 },
          );
          return [
            pid,
            {
              playerId: pid,
              complete: true,
              score,
              turns: new Map(
                turns.flatMap((t, i) =>
                  t.value === undefined ? [] : [[i, t as IntoTaken<TurnData27>]],
                ),
              ),
              allTurns: new Map(turns.map((t, i) => [i, t])),
            },
          ];
        }),
      );
      const game = gameDefinition27.calculateGameResult(playerDataRaw, {});
      const result: GameResult27 = {
        date: new Date(),
        playerOrder: players.value.filter((pid) => playerDataRaw.has(pid)),
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
        console.log("Tiebreak:", result.tiebreak); //XXX
      }

      // console.log(`Summary Game ${identifier} results:`, game.results); //XXX
      return {
        v1: {
          date: new Date(),
          players: players.value.map((pid) => ({ pid })),
          results: new Map(
            [...v1pData].map(([pid, data]) => {
              const pos = game.players.get(pid)?.position!;
              return [
                pid,
                {
                  ...data,
                  position: pos.pos,
                  tied: pos.players.filter((p) => p !== pid),
                },
              ];
            }),
          ),
          tiebreakWinner: result.tiebreak?.winner,
        },
        v2: result,
      };
    };
    const games = ref(Array.from({ length: 10 }, (_, identifier) => makeGame({ identifier })));
    games.value.push(makeGame({ identifier: "all players", length: 20, all: true }));
    games.value.push(makeGame({ identifier: "all tied", all: true, forceTie: true }));
    // games.value.push(makeGame({ identifier: "fatnicks", length: 0 }));

    const realWinsPlayers = use27Config().realWinsPlayers.readonlyRef();
    watch(
      [games, realWinsPlayers],
      ([newGames]) => {
        accumulator.value.playerSummaries.clear();
        for (const game of newGames) {
          accumulator.value.pushGame(game.v2);
        }
      },
      { immediate: true },
    );

    watch(
      () => accumulator.value,
      (v) =>
        console.log(
          "Real Wins players",
          realWinsPlayers.value,
          [...v.getAllSummaries()].map(([pid, { wins }]) => [pid, wins.byOpponents.entries()]),
        ),
      { immediate: true },
    ); //XXX

    const meanFmt = new Intl.NumberFormat(undefined, {
      maximumFractionDigits: 2,
    });
    const rateFmt = new Intl.NumberFormat(undefined, {
      maximumFractionDigits: 2,
      style: "percent",
    });
    const listFormat = new Intl.ListFormat(undefined, { type: "conjunction", style: "long" });

    return {
      players,
      games: computed(() => games.value.map(({ v1 }) => v1)),
      summaries: computed(() => accumulator.value.getAllSummaries()),
      // inProgress: makeGame("partial", 8).results,
      fieldData: [
        {
          label: "Personal Best",
          value: ({ score }) => score.best,
          displayCompact: (val) => val,
          cmp: (a, b) => a - b,
          highlight: (val, { highest }) => ({ best: val === highest }),
        },
        {
          label: "Personal Worst",
          value: ({ score }) => score.worst,
          displayCompact: (val) => val,
          cmp: (a, b) => a - b,
          highlight: (val, { highest }) => ({ best: val === highest, worst: val === -393 }),
        },
        floatField({
          label: "Average Score",
          value: ({ score }) => score.mean,
          format: meanFmt,
          highlight: { best: "highest" },
        }),
        {
          label: "Real wins",
          value: ({ wins }, playerId) => {
            const req = realWinsPlayers.value.filter((pid) => pid !== playerId);
            return [...wins.byOpponents.entries()].reduce(
              (wins, [players, { total }]) =>
                req.every((pid) => players.includes(pid)) ? wins + total : wins,
              0,
            );
          },
          displayCompact: (val) => val,
          cmp: (a, b) => a - b,
          highlight: (val, { highest }) => ({ best: val > 0 && val === highest }),
          description: () => [
            "Rounds where ",
            ...listFormat
              .format(realWinsPlayers.value.map((pid) => `{@{${pid}}@}`))
              .split(/(\{@\{\w+\}@\})/)
              .map((item) => {
                const match = /\{@\{(\w+)\}@\}/.exec(item);
                return match ? h(PlayerName, { playerId: match[1] }, () => item) : item;
              }),
            " all played",
          ],
        },
        {
          label: "Outright Wins",
          value: ({ wins }) => wins.all.totalOutright,
          displayCompact: (val) => val,
          cmp: (a, b) => a - b,
          highlight: (val, { highest }) => ({ best: val > 0 && val === highest }),
        },
        {
          label: "Tiebreak Wins",
          value: ({ wins }) => wins.all.tiebreakWins,
          displayCompact: (val, _, { wins }) => `${val} / ${wins.all.tiebreaksPlayed}`,
          cmp: (a, b) => a - b,
          highlight: (val, { highest }) => ({ best: val > 0 && val === highest }),
        },
        {
          label: "Total Games Played",
          value: ({ numGames }) => numGames,
          displayCompact: (val) => val,
          cmp: (a, b) => a - b,
          highlight: () => "",
        },
        floatField({
          label: "Win Rate",
          value: ({ wins }) => wins.all.mean,
          format: rateFmt,
          highlight: { best: "highest" },
        }),
        {
          label: "Fat Nicks",
          value: ({ fatNicks }) => fatNicks.count,
          displayCompact: (val, _, { fatNicks }) =>
            val > 0 ? val : `0 (furthest ${fatNicks.furthest})`,
          cmp: (a, b) => a - b,
          highlight: (val, { highest }) => ({ worst: val > 0 && val === highest }),
        },
        floatField({
          label: "Cliffs",
          value: ({ cliffs }) => cliffs.rate,
          format: rateFmt,
          highlight: (cmp, { highest }) => ({ best: cmp(0) > 0 && cmp(highest) === 0 }),
          extended: (_, { cliffs: { available, perGameMean, rate, ...cliffs } }) =>
            JSON.stringify(cliffs),
        }),
        floatField({
          label: "Double Doubles",
          value: ({ doubleDoubles }) => doubleDoubles.rate,
          format: rateFmt,
          highlight: (cmp, { highest }) => ({ best: cmp(0) > 0 && cmp(highest) === 0 }),
          extended: (_, { doubleDoubles: { available, perGameMean, rate, ...dd } }) =>
            JSON.stringify(dd),
        }),
        {
          label: "Hans",
          value: ({ hans }) => hans.total,
          displayCompact: (val) => val,
          cmp: (a, b) => a - b,
          highlight: (val, { highest }) => ({ best: val > 0 && val === highest }),
          extended: (val, { hans }) => JSON.stringify(hans),
        },
        {
          label: "Goblins",
          value: ({ goblins }) => goblins.count,
          displayCompact: (val) => val,
          cmp: (a, b) => a - b,
          highlight: (val, { highest }) => ({ best: val > 0 && val === highest }),
        },
        {
          label: "Piranhas",
          value: ({ piranhas }) => piranhas.count,
          displayCompact: (val) => val,
          cmp: (a, b) => a - b,
          highlight: (val, { highest }) => ({ best: val > 0 && val === highest }),
        },
        {
          label: "Jesus",
          value: ({ jesus }) => jesus.count,
          displayCompact: (val) => val,
          cmp: (a, b) => a - b,
          highlight: (val, { highest }) => ({ best: val > 0 && val === highest }),
        },
        {
          label: "Dreams",
          value: ({ dreams }) => dreams.count,
          displayCompact: (val, _, { dreams }) =>
            val > 0 ? val : `0 (furthest ${dreams.furthest})`,
          cmp: (a, b) => a - b,
          highlight: (val, { highest }) => ({ best: val > 0 && val === highest }),
        },
        {
          label: "All Positives",
          value: ({ allPos }) => allPos.count,
          displayCompact: (val, _, { allPos }) =>
            val > 0 ? val : `0 (furthest ${allPos.furthest})`,
          cmp: (a, b) => a - b,
          highlight: (val, { highest }) => ({ best: val > 0 && val === highest }),
        },
        {
          label: "Most Hits",
          value: ({ hits }) => hits.most,
          displayCompact: (val) => val,
          cmp: (a, b) => a - b,
          highlight: (val, { highest }) => ({ best: val === highest }),
        },
        {
          label: "Least Hits",
          value: ({ hits }) => hits.least,
          displayCompact: (val) => val,
          cmp: (a, b) => a - b,
          highlight: (val, { highest }) => ({ best: val === highest }),
        },
        floatField({
          label: "Average Hits",
          value: ({ hits }) => hits.perGameMean,
          format: meanFmt,
          highlight: { best: "highest" },
        }),
      ] satisfies SummaryFieldDef<number, PlayerSummaryValues27>[],
      roundsFields: {
        field: "total",
        display: rateFmt.format,
        rows: Array.from({ length: 20 }, (_, i) => ({
          key: `round.${i}`,
          label: (i + 1).toString(),
        })),
      } satisfies RoundRowsMeta27,
    };
  },
});
</script>

<template>
  <Summary27Component
    :players="players"
    :summaries="summaries"
    :field-data="fieldData"
    :rounds-fields="roundsFields"
  />
  <!-- <Summary27
    :players="players"
    :games="games"
    :in-progress-game="inProgress"
    :delta-format="null"
  /> -->
  <SummaryV1 :players="players" :games="games" />
</template>
