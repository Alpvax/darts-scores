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
import { defaultSummaryFields, gameMeta, summaryFactory, type TurnData27 } from "@/game/27";
import type { GameResult } from "@/gameUtils/summary";
import type { IntoTaken } from "@/gameUtils/roundDeclaration";
import PlayerName from "@/components/PlayerName";
import { createSummaryComponent } from "@/components/summary";
import {
  normaliseFieldRows,
  row as row1,
  row2,
  type MultiFieldDef,
  type NormalisedSummaryRowsDef,
} from "@/gameDefinitionV2/summary/display/v1";
import { createRecord, floatCompareFunc } from "@/utils";
import { row, RowFormat, type SummaryFieldRow } from "@/gameDefinitionV2/summary/display/v2";
import { getVDNumFormat, type HighlightDef } from "@/gameDefinitionV2/summary/display";

export default defineComponent({
  components: {
    Summary27Component,
    SummaryV1: createSummaryComponent(summaryFactory, defaultSummaryFields),
  },
  props: {},
  setup: (/*TODO: props*/) => {
    const config = use27Config();
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
      fn = false,
    }: {
      identifier?: number | string;
      length?: number;
      all?: boolean;
      forceTie?: boolean;
      fn?: false | string[];
    }): { v1: GameResult<TurnData27>; v2: GameResult27 } => {
      const fnRounds = Array.from({ length }, () => 0) as FixedLengthArray<NumericRange<4>, 20>;
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
            const turns = fn !== false ? fnRounds : randomRounds();
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
              fn && fn.includes(pid)
                ? [
                    [
                      pid,
                      {
                        // score: 0,
                        startScore: 27,
                        completed: true,
                        turns: fnRounds,
                      },
                    ],
                  ]
                : all || Math.random() < 0.8
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
    games.value.push(makeGame({ identifier: "fatnicks", fn: ["k7GNyCogBy79JE4qhvAj"] }));
    games.value.push(
      makeGame({ identifier: "fatnicks", forceTie: true, fn: ["k7GNyCogBy79JE4qhvAj"] }),
    );
    // games.value.push(makeGame({ identifier: "fatnicks", length: 0 }));

    const realWinsPlayers = config.realWinsPlayers.readonlyRef();

    const partialGame = ref(makeGame({ identifier: "partial", fn: ["k7GNyCogBy79JE4qhvAj"] }));
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

    const meanFmt: Intl.NumberFormatOptions = {
      maximumFractionDigits: 2,
    };
    const rateFmt: Intl.NumberFormatOptions = {
      maximumFractionDigits: 2,
      style: "percent",
    };
    const listFormat = new Intl.ListFormat(undefined, { type: "conjunction", style: "long" });

    const roundField = config.summaryRoundsField.mutableRef("local");

    return {
      players,
      games: computed(() => games.value.map(({ v1 }) => v1)),
      summaries: computed(() => accumulator.value.getAllSummaries()),
      partialGame,
      deltaGame: computed(() => accumulator.value.makeGameDeltas(partialGame.value.v2)),
      // inProgress: makeGame("partial", 8).results,
      fieldDataV1: [
        {
          label: "Personal Best",
          value: ({ score }) => score.best,
          displayCompact: (val) => val,
          deltaDirection: "positive",
          cmp: (a, b) => a - b,
          highlight: (val, { highest }) => ({ best: val === highest }),
        },
        {
          label: "Personal Worst",
          value: ({ score }) => score.worst,
          displayCompact: (val) => val,
          deltaDirection: "positive",
          cmp: (a, b) => a - b,
          highlight: (val, { highest }) => ({ best: val === highest, worst: val === -393 }),
        },
        floatField({
          label: "Average Score",
          value: ({ score }) => score.mean,
          deltaDirection: "positive",
          format: meanFmt,
          highlight: { best: "highest" },
        }),
        {
          label: "Real wins",
          value: ({ wins }) => wins.getWithAtLeast(realWinsPlayers.value).total,
          displayCompact: (val) => val,
          deltaDirection: "positive",
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
          deltaDirection: "positive",
          cmp: (a, b) => a - b,
          highlight: (val, { highest }) => ({ best: val > 0 && val === highest }),
        },
        {
          label: "Tiebreak Wins",
          value: ({ wins }) => wins.all.tiebreakWins,
          displayCompact: (val, { wins }) => `${val} / ${wins.all.tiebreaksPlayed}`,
          deltaDirection: "positive",
          cmp: (a, b) => a - b,
          highlight: (val, { highest }) => ({ best: val > 0 && val === highest }),
        },
        {
          label: "Total Games Played",
          value: ({ numGames }) => numGames,
          displayCompact: (val) => val,
          deltaDirection: "neutral",
          cmp: (a, b) => a - b,
          highlight: () => "",
        },
        floatField({
          label: "Win Rate",
          value: ({ wins }) => wins.all.mean,
          deltaDirection: "positive",
          format: rateFmt,
          highlight: { best: "highest" },
        }),
        {
          label: "Fat Nicks",
          value: ({ fatNicks }) => fatNicks.count,
          displayCompact: (val, { fatNicks }) =>
            val > 0 ? val : `0 (furthest ${fatNicks.furthest})`,
          deltaDirection: "negative",
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
          deltaDirection: "positive",
          displayExpanded: [
            floatField({
              label: "Rate",
              value: ({ cliffs }) => cliffs.rate,
              deltaDirection: "positive",
              format: rateFmt,
              highlight: (cmp, { highest }) => ({ best: cmp(0) > 0 && cmp(highest) === 0 }),
            }),
            {
              label: "Total",
              value: ({ cliffs }) => cliffs.total,
              displayCompact: (val) => val,
              deltaDirection: "positive",
              cmp: (a, b) => a - b,
              highlight: (val, { highest }) => ({ best: val === highest }),
            },
            {
              label: "Most / game",
              value: ({ cliffs }) => cliffs.most,
              displayCompact: (val) => val,
              deltaDirection: "positive",
              cmp: (a, b) => a - b,
              highlight: (val, { highest }) => ({ best: val === highest }),
            },
            {
              label: "Fewest / game",
              value: ({ cliffs }) => cliffs.least,
              displayCompact: (val) => val,
              deltaDirection: "positive",
              cmp: (a, b) => a - b,
              highlight: (val, { highest }) => ({ best: val === highest }),
            },
          ],
        }),
        floatField({
          label: "Double Doubles",
          value: ({ doubleDoubles }) => doubleDoubles.rate,
          deltaDirection: "positive",
          format: rateFmt,
          highlight: (cmp, { highest }) => ({ best: cmp(0) > 0 && cmp(highest) === 0 }),
          extended: (_, { doubleDoubles: { available, perGameMean, rate, ...dd } }) =>
            JSON.stringify(dd),
          displayExpanded: [
            "Rate",
            {
              label: "Total",
              value: ({ doubleDoubles }) => doubleDoubles.total,
              displayCompact: (val) => val,
              deltaDirection: "positive",
              cmp: (a, b) => a - b,
              highlight: (val, { highest }) => ({ best: val === highest }),
            },
            {
              label: "Most / game",
              value: ({ doubleDoubles }) => doubleDoubles.most,
              displayCompact: (val) => val,
              deltaDirection: "positive",
              cmp: (a, b) => a - b,
              highlight: (val, { highest }) => ({ best: val === highest }),
            },
            {
              label: "Fewest / game",
              value: ({ doubleDoubles }) => doubleDoubles.least,
              displayCompact: (val) => val,
              deltaDirection: "positive",
              cmp: (a, b) => a - b,
              highlight: (val, { highest }) => ({ best: val === highest }),
            },
          ],
        }),
        {
          label: "Hans",
          value: ({ hans }) => hans.total,
          displayCompact: (val) => val,
          deltaDirection: "positive",
          cmp: (a, b) => a - b,
          highlight: (val, { highest }) => ({ best: val > 0 && val === highest }),
          extended: (val, { hans }) => JSON.stringify(hans),
        },
        {
          label: "Goblins",
          value: ({ goblins }) => goblins.count,
          displayCompact: (val) => val,
          deltaDirection: "positive",
          cmp: (a, b) => a - b,
          highlight: (val, { highest }) => ({ best: val > 0 && val === highest }),
        },
        {
          label: "Piranhas",
          value: ({ piranhas }) => piranhas.count,
          displayCompact: (val) => val,
          deltaDirection: "positive",
          cmp: (a, b) => a - b,
          highlight: (val, { highest }) => ({ best: val > 0 && val === highest }),
        },
        {
          label: "Jesus",
          value: ({ jesus }) => jesus.count,
          displayCompact: (val) => val,
          deltaDirection: "positive",
          cmp: (a, b) => a - b,
          highlight: (val, { highest }) => ({ best: val > 0 && val === highest }),
        },
        {
          label: "Dreams",
          value: ({ dreams }) => dreams.count,
          displayCompact: (val, { dreams }) => (val > 0 ? val : `0 (furthest ${dreams.furthest})`),
          deltaDirection: "positive",
          cmp: (a, b) => a - b,
          highlight: (val, { highest }) => ({ best: val > 0 && val === highest }),
        },
        {
          label: "All Positives",
          value: ({ allPos }) => allPos.count,
          displayCompact: (val, { allPos }) => (val > 0 ? val : `0 (furthest ${allPos.furthest})`),
          deltaDirection: "positive",
          cmp: (a, b) => a - b,
          highlight: (val, { highest }) => ({ best: val > 0 && val === highest }),
        },
        {
          label: "Most Hits",
          value: ({ hits }) => hits.most,
          displayCompact: (val) => val,
          deltaDirection: "positive",
          cmp: (a, b) => a - b,
          highlight: (val, { highest }) => ({ best: val === highest }),
        },
        {
          label: "Least Hits",
          value: ({ hits }) => hits.least,
          displayCompact: (val) => val,
          deltaDirection: "positive",
          cmp: (a, b) => a - b,
          highlight: (val, { highest }) => ({ best: val === highest }),
        },
        floatField({
          label: "Average Hits",
          value: ({ hits }) => hits.perGameMean,
          deltaDirection: "positive",
          format: meanFmt,
          highlight: { best: "highest" },
        }),
      ] satisfies SummaryFieldDef<number, PlayerSummaryValues27>[],
      fieldData: [
        normaliseFieldRows({
          fields: {
            keys: new Set(["best", "worst", "mean"]),
            getValues: ({ score: { best, worst, mean } }) => ({
              best,
              worst,
              mean,
            }),
            cmp: (_f, a, b) => a - b,
            format: {
              mean: meanFmt,
            },
            deltaDirection: "positive",
          },
          rows: [
            {
              label: "Personal Best",
              display: "best",
              cmpField: "best",
              highlight: { best: "highest" },
            },
            {
              label: "Personal Worst",
              display: "worst",
              cmpField: "worst",
              highlight: { best: "highest", worst: -393 },
            },
            {
              label: "Average Score",
              display: "mean",
              cmpField: "mean",
              highlight: { best: "highest" },
            },
          ],
        } satisfies MultiFieldDef<
          { [K in "best" | "worst" | "mean"]: number },
          PlayerSummaryValues27
        >),
        normaliseFieldRows({
          label: "Real wins",
          value: ({ wins }) => wins.getWithAtLeast(realWinsPlayers.value).total,
          cmp: (a, b) => a - b,
          deltaDirection: "positive",
          highlight: (val, { highest }) => ({ best: val > 0 && val === highest }),
          fieldTooltip: () => [
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
        }),
        normaliseFieldRows({
          fields: {
            getValues: ({ wins }) => ({
              outright: wins.all.totalOutright,
              tiebreaks: wins.all.tiebreakWins,
              tiebreaksPlayed: wins.all.tiebreaksPlayed,
              rate: wins.all.mean,
            }),
            cmp: createRecord(
              ["outright", "tiebreaks", "rate", "tiebreaksPlayed"],
              () => (a: number, b: number) => a - b,
            ),
            format: {
              rate: rateFmt,
            },
            deltaDirection: "positive",
          },
          rows: [
            {
              label: "Outright Wins",
              display: "outright",
              cmpField: "outright",
              highlight: { best: "highest" },
            },
            {
              label: "Tiebreak Wins",
              display: "${tiebreaks} / ${tiebreaksPlayed}", // Will tiebreak delta ever happen? ({ tiebreaks, tiebreaksPlayed }, { tiebreaks: tbDelta }) => [],
              cmpField: "tiebreaks",
              highlight: { best: "highest" },
            },
            {
              label: "Win Rate",
              display: "rate",
              cmpField: "rate",
              highlight: { best: "highest" },
            },
          ],
        } satisfies MultiFieldDef<
          { [K in "outright" | "tiebreaks" | "rate" | "tiebreaksPlayed"]: number },
          PlayerSummaryValues27
        >),
        // Should this be part of the wins rows?
        normaliseFieldRows({
          label: "Total Games Played",
          value: ({ numGames }) => numGames,
          deltaDirection: "neutral",
          cmp: (a, b) => a - b,
          highlight: {},
        }),
        normaliseFieldRows({
          fields: {
            getValues: ({ fatNicks, numGames }) => ({
              count: fatNicks.count,
              furthest: fatNicks.furthest,
              rate: fatNicks.count / numGames,
            }),
            cmp: {
              count: (a, b) => a - b,
              furthest: (a, b) => a - b,
              rate: floatCompareFunc(rateFmt.maximumFractionDigits ?? 2),
            },
            format: {
              rate: rateFmt,
            },
            deltaDirection: "negative",
          },
          rows: [
            {
              label: "Fat Nicks",
              // display: ({ count, furthest }, deltas) => [
              //   count,
              //   deltas.count ?? 0,
              //   ...(count < 1 ? [" (furthest ", furthest, deltas.furthest, ")"] : []),
              // ],
              display: "${count} (furthest ${furthest})",
              cmpField: ({ count }) => (count > 0 ? "count" : "furthest"),
              highlight: (val, { highest }) => ({ worst: val > 0 && val === highest }),
            },
          ],
          extended: {
            label: "Fat Nicks",
            rows: [
              {
                label: "Count",
                display: "count",
                cmpField: "count",
                highlight: (val, { highest }) => ({ worst: val > 0 && val === highest }),
              },
              {
                label: "Furthest without hitting",
                display: "furthest",
                cmpField: "furthest",
                highlight: (val, { highest }) => ({ worst: val > 0 && val === highest }),
              },
              {
                label: "Rate",
                display: "rate",
                cmpField: "rate",
                highlight: (val, { highest }) => ({ worst: val > 0 && val === highest }),
              },
            ],
          },
        } satisfies MultiFieldDef<
          { [K in "count" | "furthest" | "rate"]: number },
          PlayerSummaryValues27
        >),
        normaliseFieldRows({
          fields: {
            keys: ["foo", "bar", "baz"],
            getValues: () => ({
              foo: Math.random(),
              bar: 2,
              baz: 128,
            }),
            cmp: (_, a, b) => a - b,
            format: {},
            deltaDirection: "positive",
          },
          rows: [
            {
              label: "TEST FIELD Simple",
              cmpField: "foo",
              highlight: {},
              display: row2<"foo" | "bar" | "baz">`Prefix - ${"foo:-d"} - Suffix`,
              // display: row<"foo" | "bar" | "baz">`Prefix - ${"foo"} - Suffix`,
            },
            {
              label: "TEST FIELD Dynamic",
              cmpField: "foo",
              highlight: {},
              display: (v, d) =>
                v.foo >= 0.5
                  ? row1<"foo" | "bar" | "baz">`Prefix - ${"bar"} - Suffix`(v, d)
                  : row1<"foo" | "bar" | "baz">`Prefix - ${"baz"} - Suffix`(v, d),
            },
            {
              label: "TEST FIELD row2",
              cmpField: "foo",
              highlight: {},
              display: row2<"foo" | "bar" | "baz">`Prefix - ${({ foo }) =>
                foo >= 0.5 ? row2`${"bar"}` : row2`${"baz"}`} - Suffix`,
            },
          ],
        } satisfies MultiFieldDef<{ [K in "foo" | "bar" | "baz"]: number }, PlayerSummaryValues27>),
      ] satisfies NormalisedSummaryRowsDef<any, PlayerSummaryValues27>[],
      fieldDataV2: summaryAccumulator27.rowFactory(
        ({ simpleField }) =>
          [
            simpleField("Personal Best", "score.best", { classes: ["best"] }),
            simpleField("Personal Worst", "score.worst", {
              classes: { best: "best", worst: -393 },
            }),
            simpleField("Average Score", "score.mean", { classes: ["best"], format: meanFmt }),
            {
              key: "wins.real",
              label: "Real wins",
              display: RowFormat.field(
                ({ wins }) => wins.getWithAtLeast(realWinsPlayers.value).total,
              ),
              highlight: {
                value: ({ wins }) => wins.getWithAtLeast(realWinsPlayers.value).total,
                cmp: "higher",
                classes: ["best"],
              },
              fieldTooltip: () => [
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
              group: "wins",
              label: "Wins",
              rows: [
                {
                  ...simpleField("Outright Wins", "wins.all.totalOutright", {
                    classes: ["best"],
                  }),
                  key: "outright",
                  showDefault: true,
                  showExtended: true,
                },
                //TODO: complex row fields
                {
                  key: "tiebreak",
                  label: "Tiebreak Wins",
                  display: row`${{
                    value: ({ wins }) => wins.all.tiebreakWins,
                    deltaSpec: "positive",
                  }} / ${{
                    value: ({ wins }) => wins.all.tiebreaksPlayed,
                    deltaSpec: "positive",
                  }}`, //TODO: (win rate if >0)?
                  showDefault: true,
                  showExtended: false,
                  highlight: {
                    value: ({ wins }) => wins.all.tiebreakWins,
                    cmp: "higher",
                    classes: ["best"],
                  },
                },
                {
                  ...simpleField("Tiebreak Wins", "wins.all.tiebreakWins", {
                    classes: ["best"],
                  }),
                  showDefault: false,
                  showExtended: true,
                },
                {
                  ...simpleField("Tiebreaks Played", "wins.all.tiebreaksPlayed", {
                    deltaOverride: "neutral",
                  }),
                  key: "tiebreak.played",
                  showDefault: false,
                  showExtended: true,
                },
                {
                  ...simpleField("Tiebreak Win Rate", "wins.all.tiebreakWinRate", {
                    classes: ["best"],
                  }),
                  key: "tiebreak.rate",
                  showDefault: false,
                  showExtended: true,
                },
                {
                  ...simpleField("Win Rate", "wins.all.mean", {
                    format: rateFmt,
                    classes: ["best"],
                  }),
                  key: "rate",
                  showDefault: true,
                  showExtended: true,
                },
              ],
            },
            // Should this be part of the wins rows?
            simpleField("Total Games Played", "numGames"),
            {
              group: "fatNick",
              label: "Fat Nicks",
              rows: [
                {
                  key: "combined",
                  label: "Fat Nicks",
                  display: row`${{
                    value: ({ fatNicks }) => fatNicks.count,
                    deltaSpec: "negative",
                  }}${({ fatNicks }) =>
                    fatNicks.count > 0
                      ? []
                      : row` (furthest ${{
                          value: ({ fatNicks }) => fatNicks.furthest,
                          deltaSpec: "negative",
                        }})`}`,
                  showDefault: true,
                  showExtended: false,
                  highlight: {
                    values: ({ fatNicks }) => [fatNicks.count, fatNicks.furthest],
                    cmp: "lower",
                    classes: ["worst"],
                  },
                  valueTooltip: ({ fatNicks, numGames }) =>
                    getVDNumFormat(rateFmt).value.format(fatNicks.count / numGames),
                },
                {
                  key: "count",
                  ...simpleField("Total", "fatNicks.count", {
                    classes: ["worst"],
                  }),
                  showDefault: false,
                  showExtended: true,
                },
                {
                  key: "furthest",
                  ...simpleField("Furthest without hitting", "fatNicks.furthest", {
                    classes: ["worst"],
                  }),
                  showDefault: false,
                  showExtended: true,
                },
                {
                  key: "rate",
                  label: "Rate",
                  display: RowFormat.field(({ fatNicks, numGames }) => fatNicks.count / numGames, {
                    format: rateFmt,
                    deltaSpec: "negative",
                  }),
                  showDefault: false,
                  showExtended: true,
                  highlight: {
                    value: ({ fatNicks, numGames }) => fatNicks.count / numGames,
                    cmp: "lower", //(a, b) => a > b ? "worse" : a < b ? "better" : "equal",
                    classes: ["worst"],
                  },
                },
              ],
            },
            {
              group: "cliffs",
              label: "Cliffs",
              rows: [
                //TODO: complex fields
                {
                  key: "combined",
                  label: "Cliff Rate",
                  display: row`${{ value: ({ cliffs }) => cliffs.rate, format: rateFmt, deltaSpec: "positive" }}${({ cliffs }) => (cliffs.total > 0 ? row` (${{ value: ({ cliffs }) => cliffs.total, deltaSpec: "positive" }})` : [])}`,
                  highlight: {
                    value: ({ cliffs }) => cliffs.rate as number,
                    cmp: "higher",
                    classes: ((cmp, { best }) => ({
                      best: cmp(0) === "better" && cmp(best) === "equal",
                    })) satisfies HighlightDef,
                  },
                  showDefault: true,
                  showExtended: false,
                },
                {
                  key: "rate",
                  ...simpleField("Rate", "cliffs.rate", {
                    classes: ["best"],
                  }),
                  showDefault: false,
                  showExtended: true,
                },
                {
                  key: "total",
                  ...simpleField("Total", "cliffs.total", {
                    classes: ["best"],
                  }),
                  showDefault: false,
                  showExtended: true,
                },
                {
                  key: "most",
                  ...simpleField("Most / game", "cliffs.most", {
                    classes: ["best"],
                  }),
                  showDefault: false,
                  showExtended: true,
                },
                {
                  key: "least",
                  ...simpleField("Least / game", "cliffs.least", {
                    classes: ["best"],
                  }),
                  showDefault: false,
                  showExtended: true,
                },
              ],
            },
            {
              group: "doubledoubles",
              label: "Double Doubles",
              rows: [
                {
                  key: "combined",
                  label: "Double Double Rate",
                  display: row`${{ value: ({ doubleDoubles }) => doubleDoubles.rate, format: rateFmt, deltaSpec: "positive" }}${({ doubleDoubles }) => (doubleDoubles.total > 0 ? row` (${{ value: ({ doubleDoubles }) => doubleDoubles.total, deltaSpec: "positive" }})` : [])}`,
                  highlight: {
                    value: ({ doubleDoubles }) => doubleDoubles.rate,
                    cmp: "higher",
                    classes: ((cmp, { best }) => ({
                      best: cmp(0) === "better" && cmp(best) === "equal",
                    })) satisfies HighlightDef,
                  },
                  showDefault: true,
                  showExtended: false,
                },
                {
                  key: "rate",
                  ...simpleField("Rate", "doubleDoubles.rate", {
                    classes: ["best"],
                  }),
                  showDefault: false,
                  showExtended: true,
                },
                {
                  key: "total",
                  ...simpleField("Total", "doubleDoubles.total", {
                    classes: ["best"],
                  }),
                  showDefault: false,
                  showExtended: true,
                },
                {
                  key: "most",
                  ...simpleField("Most / game", "doubleDoubles.most", {
                    classes: ["best"],
                  }),
                  showDefault: false,
                  showExtended: true,
                },
                {
                  key: "least",
                  ...simpleField("Least / game", "doubleDoubles.least", {
                    classes: ["best"],
                  }),
                  showDefault: false,
                  showExtended: true,
                },
              ],
            },
            {
              key: "hans",
              ...simpleField("Hans", "hans.total", {
                classes: ["best"],
                fieldTooltip: () => "Three consecutive double doubles",
              }),
            },
            {
              key: "goblins",
              ...simpleField("Goblins", "goblins.count", {
                classes: ["best"],
                fieldTooltip: () => "Only double doubles or cliffs hit in the game",
              }),
            },
            {
              key: "piranhas",
              ...simpleField("Piranhas", "piranhas.count", {
                classes: ["best"],
                fieldTooltip: () => "Only a single double 1 hit in the game",
              }),
            },
            {
              key: "jesus",
              ...simpleField("Jesus", "jesus.count", {
                classes: ["best"],
                fieldTooltip: () => "Only hit with the last dart of the game",
              }),
            },
            {
              group: "dream",
              label: "Dreams",
              rows: [
                {
                  key: "combined",
                  label: "Dreams",
                  display: row`${{ value: ({ dreams }) => dreams.count, deltaSpec: "positive" }}${({ dreams }) => (dreams.count < 1 ? row` (furthest ${{ value: ({ dreams }) => dreams.furthest, deltaSpec: "positive" }})` : [])}`,
                  highlight: {
                    values: ({ dreams }) => [dreams.count, dreams.furthest],
                    cmp: "higher",
                    classes: ["best"],
                  },
                  showDefault: true,
                  showExtended: false,
                },
                {
                  key: "total",
                  ...simpleField("Total", "dreams.count", {
                    classes: ["best"],
                  }),
                  showDefault: false,
                  showExtended: true,
                },
                {
                  key: "furthest",
                  ...simpleField("Furthest", "dreams.furthest", {
                    classes: ["best"],
                  }),
                  showDefault: false,
                  showExtended: true,
                },
              ],
            },
            {
              group: "allPos",
              label: "All Positives",
              rows: [
                {
                  key: "combined",
                  label: "All Positives",
                  display: row`${{ value: ({ allPos }) => allPos.count, deltaSpec: "positive" }}${({ allPos }) => (allPos.count < 1 ? row` (furthest ${{ value: ({ allPos }) => allPos.furthest, deltaSpec: "positive" }})` : [])}`,
                  highlight: {
                    values: ({ allPos }) => [allPos.count, allPos.furthest],
                    cmp: "higher",
                    classes: ["best"],
                  },
                  showDefault: true,
                  showExtended: false,
                },
                {
                  key: "total",
                  ...simpleField("Total", "allPos.count", {
                    classes: ["best"],
                  }),
                  showDefault: false,
                  showExtended: true,
                },
                {
                  key: "furthest",
                  ...simpleField("Furthest", "allPos.furthest", {
                    classes: ["best"],
                  }),
                  showDefault: false,
                  showExtended: true,
                },
              ],
            },
          ] satisfies SummaryFieldRow<PlayerSummaryValues27>[],
      ),
      roundField,
      roundsFields: computed(
        () =>
          ({
            field: roundField.value,
            display: rateFmt,
            labels: {
              cliffs: "Cliff Rate",
              doubleDoubles: "Double double rate",
              total: "Total hit rate",
              nonZero: "Nonzero hit rate",
            },
            rows: Array.from({ length: 20 }, (_, i) => ({
              key: `round.${i}`,
              label: (i + 1).toString(),
            })),
          }) satisfies RoundRowsMeta27,
      ),
    };
  },
});
</script>

<template>
  <Summary27Component
    :players="players"
    :summaries="summaries"
    :delta-game="deltaGame"
    :field-data="fieldData"
    :field-data-v2="fieldDataV2"
    :rounds-fields="roundsFields"
    @change-rounds-field="
      (f) => {
        roundField = f;
      }
    "
  />
  <!-- <Summary27
    :players="players"
    :games="games"
    :in-progress-game="inProgress"
    :delta-format="null"
  /> -->
  <SummaryV1 :players="players" :games="games" :in-progress-game="partialGame.v1.results" />
</template>
