<template>
  <SummaryTable
    :players="players"
    :games="games"
  />
</template>

<script lang="ts">
import { computed, defineComponent, onUpdated, watch } from "vue";
import { use27History } from "@/store/history27";
import { SummaryFieldKey, summaryFactory } from "@/games/27stats";
import { convertResult } from "@/games/summary/summary27";
import { SPGameStats } from "@/games/27v3";
import { usePrefs } from "@/store/clientPreferences";

const SummaryTable = summaryFactory.createSummaryComponent(
  "score.highest", "score.lowest", "score.mean",
  "numGames.count",
  // "wins.count", "numGames.count", "wins.rate",
  "fatNicks.count", "fatNicks.closest",
  "cliffs.total", "cliffs.meanTotal",
  "doubleDoubles.total", "doubleDoubles.meanTotal",
  "hans.total", "goblins.count", "piranhas.count", "jesus.count",
  "dreams.furthest", "positive.total", "positive.furthest",
  "hits.highest", "hits.lowest", "hits.mean",
  // ...Array.from({ length: 20 }, (_, i) => `round${i + 1}.totalRate` as SummaryFieldKey),
  ...Array.from({ length: 20 }, (_, i) =>
    `roundData.round${i + 1}${usePrefs().twentyseven.roundDisplay}Rate` as SummaryFieldKey),
);

export default defineComponent({
  components: {
    SummaryTable,
  },
  setup() {
    const history = use27History();
    const players = computed(() => history.summaryPlayers);
    const games = computed(() => history.games.map(game => ({
      playerResults: Object.entries(game.game).reduce(
        (obj, [pid, result]) => {
          obj[pid] = convertResult(result);
          return obj;
        },
        {} as Record<string, SPGameStats>),
    })));
    watch(() => [players, games], () => {
      onUpdated(() => {
        const els =
        [...document.querySelectorAll("td.favourite[data-summary-field^='roundData.round'")]
          .reduce(({ max, els }, el) => {
            const val = parseFloat(el.textContent!);
            if (val > max) {
              max = val;
              els.clear();
              els.add(el);
            } else if (val === max) {
              els.add(el);
            }
            return {
              max, els,
            };
          }, { max: 0, els: new Set<Element>() });
        for (const el of els.els) {
          el.classList.add("best");
        }
      });
    }, { immediate: true });
    return {
      players,
      games,
    };
  },
});
</script>

<style>
.playerName {
  font-weight: bold;
  white-space: nowrap;
}
.tooltip {
  display: none;
  position: absolute;
  z-index: 10;
  background-color: bisque;
  padding: 0.2em;
  border: 2px lightslategrey solid;
  margin-left: -4em;
  margin-top: 1.2em;
}
td:hover > .tooltip:not(:hover) {
  display: inline-block;
}
/* #playerSummary {
  margin-bottom: 4.5em;
} */
.tr[data-summary-field^="roundData"] {
  font-size: small;
}
.summaryTable tr:not([data-summary-field^="roundData"]) + tr[data-summary-field^="roundData"] > td {
  border-top: 1px dashed black;
}
.summaryTable .rowLabel {
  font-weight: bold;
  text-align: right;
  white-space: nowrap;
}
.summaryValue {
  text-align: center;
}
.summaryTable td.best {
  background-color: #7eff7e;
}
.summaryTable td.worst:not(.best) {
  background-color: #ff7e7e;
}
.summaryTable td.favourite:not(.best) {
  background-color: #ceff7e;
}
</style>
