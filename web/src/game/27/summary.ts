import PlayerName from "@/components/PlayerName";
import { getVDNumFormat, type HighlightDef } from "@/gameDefinitionV2/summary/display";
import { row, RowFormat, type SummaryFieldRow } from "@/gameDefinitionV2/summary/display/v2";
import { computed, h, type Ref } from "vue";
import {
  summaryAccumulator27,
  type PlayerSummaryValues27,
  type RoundRowsMeta27,
} from "./gameDefv2";
import { use27Config } from "./config";

const listFormat = new Intl.ListFormat(undefined, { type: "conjunction", style: "long" });
export const defaultFieldData = (realWinsPlayers: Ref<string[]>, filteredWinsLabel = "Real wins") =>
  summaryAccumulator27.rowFactory(
    ({ simpleField }) =>
      [
        simpleField("Personal Best", "score.best", { classes: ["best"] }),
        simpleField("Personal Worst", "score.worst", {
          classes: { best: "best", worst: -393 },
        }),
        simpleField("Average Score", "score.mean", {
          classes: ["best"],
          format: {
            maximumFractionDigits: 2,
          },
        }),
        {
          key: "wins.real",
          label: filteredWinsLabel,
          display: RowFormat.field(({ wins }) => wins.getWithAtLeast(realWinsPlayers.value).total),
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
                getVal: ({ wins }) => [wins.all.tiebreakWins],
                cmp: ([a]: number[], [b]: number[]) => (a - b > 0 ? "better" : a - b < 0 ? "worse" : "equal"),
                fn: ([val]) => ({ best: [best] }) => ({ best: val > 0 && val === best }),
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
                format: {
                  maximumFractionDigits: 2,
                  style: "percent",
                },
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
                getVDNumFormat({
                  maximumFractionDigits: 2,
                  style: "percent",
                }).value.format(fatNicks.count / numGames),
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
                format: {
                  maximumFractionDigits: 2,
                  style: "percent",
                },
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
              display: row`${{
                value: ({ cliffs }) => cliffs.rate,
                format: {
                  maximumFractionDigits: 2,
                  style: "percent",
                },
                deltaSpec: "positive",
              }}${({ cliffs }) => (cliffs.total > 0 ? row` (${{ value: ({ cliffs }) => cliffs.total, deltaSpec: "positive" }})` : [])}`,
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
              display: row`${{
                value: ({ doubleDoubles }) => doubleDoubles.rate,
                format: {
                  maximumFractionDigits: 2,
                  style: "percent",
                },
                deltaSpec: "positive",
              }}${({ doubleDoubles }) => (doubleDoubles.total > 0 ? row` (${{ value: ({ doubleDoubles }) => doubleDoubles.total, deltaSpec: "positive" }})` : [])}`,
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
        simpleField("Most Hits", "hits.most", { classes: ["best"] }),
        simpleField("Least Hits", "hits.least", { classes: ["best"] }),
        simpleField("Average Hits", "hits.perGameMean", {
          classes: ["best"],
          format: {
            maximumFractionDigits: 2,
          },
        }),
      ] satisfies SummaryFieldRow<PlayerSummaryValues27>[],
  );

export const use27RoundsField = () => {
  const config = use27Config();
  const roundField = config.summaryRoundsField.mutableRef("local");
  const roundsFields = computed(
    () =>
      ({
        field: roundField.value,
        display: {
          maximumFractionDigits: 2,
          style: "percent",
        },
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
  );
  return { roundField, roundsFields };
};
