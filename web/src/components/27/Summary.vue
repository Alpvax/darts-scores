<template>
  <PlayerTable
    id="playerSummary"
    :players="players.filter(p => numGames[p.id] > 0)"
    :rows="rowMeta"
  >
    <template #pb="{player}">
      <!-- {{ best(player, "best") }} -->
      <td
        :class="{
          best: statLimits.best.max == playerStats[player].best,
        }"
      >
        {{ playerStats[player].best }}
      </td>
    </template>
    <template #pw="{player}">
      <td
        :class="{
          best: statLimits.worst.max == playerStats[player].worst,
          worst: statLimits.worst.min == playerStats[player].worst,
        }"
      >
        {{ playerStats[player].worst }}
      </td>
    </template>
    <template #mean="{player}">
      <td
        :class="{
          best: statLimits.mean.max == playerStats[player].mean,
        }"
      >
        {{ asFixed(playerStats[player].mean) }}
      </td>
    </template>
    <template #filteredW="{player}">
      <td
        :class="{
          best: isFiltered && mostWins.filtered.includes(player),
        }"
      >
        {{ isFiltered
          ? gameWinners[player]?.filter(
            opponents => filtered.every(p => opponents.includes(p))).length || 0
          : "&nbsp;" }}
      </td>
    </template>
    <template
      v-if="isFiltered"
      #filteredW_tooltip
    >
      <div class="tooltip">
        Wins where {{ filteredNames }} played
      </div>
    </template>
    <template #wins="{player}">
      <td
        :class="{
          best: mostWins.all.includes(player)
        }"
      >
        {{ gameWinners[player]?.length || 0 }}
      </td>
    </template>
    <template #gameCount="{player}">
      <td
        :class="{
          best: Math.max(...Object.values(numGames)) == numGames[player],
        }"
      >
        {{ numGames[player] }}
      </td>
    </template>
    <template #winR="{player}">
      <td
        :class="{
          best: (gameWinners[player]?.length || 0) / numGames[player] == mostWins.all_rate
        }"
      >
        {{ asRate(player, gameWinners[player]?.length || 0) }}
      </td>
    </template>
    <template #fn="{player}">
      <td
        :class="{
          worst: playerStats[player].fn > 0 && statLimits.fn.max == playerStats[player].fn,
        }"
      >
        {{ playerStats[player].fn }}
      </td>
    </template>
    <template #cliff="{player}">
      <td
        :class="{
          best: playerStats[player].cliffs > 0
            && statLimits.cliffs.max == playerStats[player].cliffs,
        }"
      >
        {{ playerStats[player].cliffs }}
      </td>
    </template>
    <template #cliffR="{player}">
      <td
        :class="{
          best: playerStats[player].cliffs > 0
            && statLimits.cliffR.max == playerStats[player].cliffR,
        }"
      >
        {{ asRate(player, playerStats[player].cliffs / 20) }}
      </td>
    </template>
    <template #dd="{player}">
      <td
        :class="{
          best: playerStats[player].dd > 0 && statLimits.dd.max == playerStats[player].dd,
        }"
      >
        {{ playerStats[player].dd }}
      </td>
    </template>
    <template #ddR="{player}">
      <td
        :class="{
          best: playerStats[player].dd > 0 && statLimits.ddR.max == playerStats[player].ddR,
        }"
      >
        {{ asRate(player, playerStats[player].dd / 20) }}
      </td>
    </template>
    <template
      #hans="{player}"
    >
      <td
        :class="{
          best: playerStats[player].hans > 0 && statLimits.hans.max == playerStats[player].hans,
        }"
      >
        {{ playerStats[player].hans }}
      </td>
    </template>
    <template
      #hans_tooltip
    >
      <div class="tooltip">
        Three double doubles in a row
      </div>
    </template>
    <template #goblins="{player}">
      <td
        :class="{
          best: playerStats[player].goblins > 0
            && statLimits.goblins.max == playerStats[player].goblins,
        }"
      >
        {{ playerStats[player].goblins }}
      </td>
    </template>
    <template #goblins_tooltip>
      <div class="tooltip">
        Games where only double doubles were hit
      </div>
    </template>
    <template #piranhas="{player}">
      <td
        :class="{
          best: playerStats[player].piranhas > 0
            && statLimits.piranhas.max == playerStats[player].piranhas,
        }"
      >
        {{ playerStats[player].piranhas }}
      </td>
    </template>
    <template #piranhas_tooltip>
      <div class="tooltip">
        Games where only double 1 was hit (so the score was -389)
      </div>
    </template>
    <template #jesus="{player}">
      <td
        :class="{
          best: playerStats[player].jesus > 0
            && statLimits.jesus.max == playerStats[player].jesus,
        }"
      >
        {{ playerStats[player].jesus }}
      </td>
    </template>
    <template #jesus_tooltip>
      <div class="tooltip">
        Games where the only hit was the very last dart of the game
      </div>
    </template>
    <template #ap="{player}">
      <td
        :class="{
          best: playerStats[player].allPos > 0
            && statLimits.allPos.max == playerStats[player].allPos,
        }"
      >
        {{ playerStats[player].allPos }}
      </td>
    </template>
    <template #farPos="{player}">
      <td
        :class="{/*TODO:
          best: playerStats[player].farPos > 0
            && statLimits.farPos.max == playerStats[player].farPos,
        */}"
      >
        {{ playerStats[player].farPos }}
      </td>
    </template>
    <template #farDream="{player}">
      <td
        :class="{
          best: playerStats[player].farDream > 0
            && statLimits.farDream.max == playerStats[player].farDream,
        }"
      >
        {{ playerStats[player].farDream }}
      </td>
    </template>
    <template #mostHits="{player}">
      <td
        :class="{
          best: playerStats[player].bestHits > 0
            && statLimits.bestHits.max == playerStats[player].bestHits,
        }"
      >
        {{ playerStats[player].bestHits }}
      </td>
    </template>
    <template #leastHits="{player}">
      <td
        :class="{
          best: playerStats[player].worstHits > 0
            && statLimits.worstHits.max == playerStats[player].worstHits,
        }"
      >
        {{ playerStats[player].worstHits }}
      </td>
    </template>
    <template #meanHits="{player}">
      <td
        :class="{
          best: playerStats[player].meanHits > 0
            && statLimits.meanHits.max == playerStats[player].meanHits,
        }"
      >
        {{ asFixed(playerStats[player].meanHits) }}
      </td>
    </template>
    <template
      v-for="round in 20"
      :key="round"
      #[round.toString()]="{player}"
    >
      <td
        class="roundSummaryCell"
        :class="{
          favourite: playerStats[player].roundData
            .favourites[roundFavouritesDisplay].targets.includes(round),
          favouriteTotal: playerStats[player].roundData.favourites.total.targets.includes(round),
          favouriteGames: playerStats[player].roundData.favourites.games.targets.includes(round),
          favouriteCliffs: playerStats[player].roundData.favourites.cliffs.targets.includes(round),
          favouriteDD: playerStats[player].roundData.favourites.dd.targets.includes(round),
          best: playerStats[player].roundData
            .favourites[roundFavouritesDisplay].targets.includes(round)
            && roundBest.bestPlayers.includes(player),
        }"
      >
        {{ asRate(player, playerStats[player].roundData[round][roundFavouritesDisplay]) }}
        <SummaryTooltip
          v-bind="playerStats[player].roundData[round]"
          :player="player"
          :num-games="playerStats[player].num"
        />
      </td>
    </template>
  </PlayerTable>
</template>

<script lang="ts">
import { computed, ComputedRef, defineComponent, PropType } from "vue";
import { storeToRefs } from "pinia";
import PlayerTable from "@/components/PlayerTable.vue";
import SummaryTooltip from "./SummaryTooltip.vue";
import { Player, usePlayerStore } from "@/store/player";
import { summaryFields } from "@/games/27";
import { use27History } from "@/store/history27";
import { usePrefs } from "@/store/clientPreferences";

export default defineComponent({
  components: {
    PlayerTable,
    SummaryTooltip,
  },
  props: {
    players: { type: Array as PropType<Player[]>, required: true },
    filtered: { type: Array as PropType<string[]>, required: true },
    // games: { type: Array as PropType<Result27[] | null>, default: null },
    // scores: {
    //   type: Object as PropType<{ [k: string]: (PlayerGameResult27 | null)[] } | null>,
    //   default: null,
    // },
  },
  setup(props) {
    const playerStore = usePlayerStore();
    const { playerStats, scores, games } = storeToRefs(use27History());
    function computedPlayers<T>(f: (player: string) => T): ComputedRef<{ [K: string]: T }> {
      return computed(() => props.players.reduce((obj, { id }) => {
        obj[id] = f(id);
        return obj;
      }, {} as { [K: string]: T }));
    }
    const numGames = computedPlayers(p => scores.value[p].filter(s => s != null).length);
    const gameWinners = computed(() => games.value.reduce((acc, game) => {
      const winner = typeof game.winner === "string" ? game.winner : game.winner.tiebreak.winner!;
      if (!Object.hasOwn(acc, winner)) {
        acc[winner] = [];
      }
      acc[winner].push(Object.keys(game.game));
      return acc;
    }, {} as { [k: string]: string[][] }));
    const roundData = computed(() => props.players.reduce(
      ({ bestRate, bestPlayers }, { id: player }) => {
        const stats = playerStats.value[player];
        if (stats.num > 0) {
          const pBR = stats.roundData.favourites.games.hits / stats.num;
          if (pBR > bestRate) {
            bestRate = pBR;
            bestPlayers = [player];
          } else if (pBR === bestRate) {
            bestPlayers.push(player);
          }
        }
        return { bestRate, bestPlayers };
      },
      {
        bestRate: 0,
        bestPlayers: [] as string[],
      },
    ));
    const statLimits = computed(() => Object.values(playerStats.value).reduce(
      (acc, s) => {
        for (const k of Object.keys(acc) as (keyof typeof acc)[]) {
          acc[k].min = Math.min(acc[k].min, s[k]);
          acc[k].max = Math.max(acc[k].max, s[k]);
        };
        return acc;
      }, {
        best: { min: 1288, max: -394 },
        worst: { min: 1288, max: -394 },
        mean: { min: 1288, max: -394 },
        fn: { min: 0, max: 0 },
        cliffs: { min: 0, max: 0 },
        cliffR: { min: 0, max: 0 },
        dd: { min: 0, max: 0 },
        ddR: { min: 0, max: 0 },
        hans: { min: 0, max: 0 },
        goblins: { min: 0, max: 0 },
        piranhas: { min: 0, max: 0 },
        allPos: { min: 0, max: 0 },
        farDream: { min: 0, max: 0 },
        bestHits: { min: 0, max: 0 },
        worstHits: { min: 0, max: 0 },
        meanHits: { min: 0, max: 0 },
      }));
    const rowMeta = [...summaryFields];
    for (let r = 1; r <= 20; r++) {
      rowMeta.push({
        label: r.toString(),
        slotId: r.toString(),
        additionalClass: ["specificRound"],
      });
    }
    const asFixed = (num: number, precision = 2): number => parseFloat(num.toFixed(precision));
    const asRate = (player: string, num: number, precision = 2): string =>
      asFixed(num / numGames.value[player] * 100, precision) + "%";
    return {
      rowMeta,
      numGames,
      isFiltered: computed(() =>
        props.filtered.length > 0 && props.players.some(p => !props.filtered.includes(p.id))),
      filteredNames: computed(() => {
        const arr = props.filtered.map(p => playerStore.getName(p));
        switch (arr.length) {
          case 0:
            return "";
          case 1:
            return arr[0];
          default:
            const l = arr.length - 1;
            return `${arr.slice(0, l).join(", ")} and ${arr[l]} all`;
        }
      }),
      gameWinners,
      mostWins: computed(() => Object.entries(gameWinners.value).reduce(
        ({ all, all_count, all_rate, filtered, filtered_count, filtered_rate }, [p, wins]) => {
          const a_wins = wins.length;
          const f_wins = wins.filter(
            opponents => props.filtered.every(p => opponents.includes(p))).length;
          const num = numGames.value[p];
          const a = a_wins > all_count
            ? { all: [p], all_count: a_wins }
            : a_wins == all_count
              ? { all: [...all, p], all_count }
              : { all_count, all };
          const f = f_wins > filtered_count
            ? { filtered: [p], filtered_count: f_wins }
            : f_wins == filtered_count
              ? { filtered: [...filtered, p], filtered_count }
              : { filtered, filtered_count };
          return {
            ...a, ...f,
            all_rate: num ? Math.max(all_rate, a_wins / num) : all_rate,
            filtered_rate: num ? Math.max(filtered_rate, f_wins / num) : filtered_rate,
          };
        }, {
          all: [] as string[], all_count: 0, all_rate: 0,
          filtered: [] as string[], filtered_count: 0, filtered_rate: 0,
        })),
      statLimits,
      asFixed,
      asRate,
      playerStats,
      roundBest: roundData,
      roundFavouritesDisplay: computed(() => usePrefs().twentyseven.roundDisplay),
    };
  },
});
</script>

<style>
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
.specificRound {
  font-size: small;
}
#playerSummary .rowLabel {
  font-weight: bold;
  text-align: right;
  white-space: nowrap;
}
.summaryValue {
  text-align: center;
}
#playerSummary td.best {
  background-color: #7eff7e;
}
#playerSummary td.worst:not(.best) {
  background-color: #ff7e7e;
}
#playerSummary td.favourite:not(.best) {
  background-color: #ceff7e;
}

</style>
