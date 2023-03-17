<template>
  <PlayerTable
    id="playerSummary"
    :players="players.filter(p => !p.disabled)"
    :rows="rowMeta"
  >
    <template #pb="{player}">
      <td>
        {{ scores[player].filter(s => s != null)
          .reduce((pb, s) => s!.score > pb ? s!.score : pb, -394) }}
      </td>
    </template>
    <template #pw="{player}">
      <td>
        {{ scores[player].filter(s => s != null)
          .reduce((pw, s) => s!.score < pw ? s!.score : pw, 1288) }}
      </td>
    </template>
    <template #mean="{player}">
      <td>
        {{ asFixed(sumScores[player] / numGames[player]) }}
      </td>
    </template>
    <template
      v-if="isFiltered"
      #filteredW="{player}"
    >
      <td>
        {{ gameWinners[player]?.filter(
          opponents => filtered.every(p => opponents.includes(p))).length || 0 }}
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
      <td>
        {{ gameWinners[player]?.length || 0 }}
      </td>
    </template>
    <template #gameCount="{player}">
      <td>
        {{ numGames[player] }}
      </td>
    </template>
    <template #winR="{player}">
      <td>
        {{ asRate(player, gameWinners[player]?.length || 0) }}
      </td>
    </template>
    <template #fn="{player}">
      <td>
        {{ scores[player].filter(s => s != null && s.score == -393).length }}
      </td>
    </template>
    <template #cliff="{player}">
      <td>
        {{ scores[player].reduce((t, s) => s == null ? t : t + s.cliffs, 0) }}
      </td>
    </template>
    <template #cliffR="{player}">
      <td>
        {{ asRate(player, scores[player].reduce((t, s) => s == null ? t : t + s.cliffs, 0) / 20) }}
      </td>
    </template>
    <template #dd="{player}">
      <td>
        {{ scores[player].reduce((t, s) => s == null ? t
          : t + s.rounds.filter(h => h == 2).length, 0) }}
      </td>
    </template>
    <template #ddR="{player}">
      <td>
        {{ asRate(player, scores[player].reduce((t, s) => s == null ? t
          : t + s.rounds.filter(h => h == 2).length, 0) / 20) }}
      </td>
    </template>
    <template #ap="{player}">
      <td>
        {{ scores[player].reduce((t, s) => s != null && s.allPositive ? t + 1 : t, 0) }}
      </td>
    </template>
    <template
      v-for="round in 20"
      :key="round"
      #[round.toString()]="{player}"
    >
      <td class="roundSummaryCell">
        {{ asRate(player, roundData(player, round).gamesWithHits) }}
        <SummaryTooltip
          v-bind="roundData(player, round)"
          :player="player"
          :num-games="numGames[player]"
        />
      </td>
    </template>
  </PlayerTable>
</template>

<script lang="ts">
import { computed, ComputedRef, defineComponent, PropType } from "vue";
import PlayerTable, { RowMetadata } from "@/components/PlayerTable.vue";
import SummaryTooltip from "./SummaryTooltip.vue";
import { PlayerGameResult27, Result27 } from "./Game27.vue";
import { Player, usePlayerStore } from "@/store/player";

export default defineComponent({
  components: {
    PlayerTable,
    SummaryTooltip,
  },
  props: {
    players: { type: Array as PropType<Player[]>, required: true },
    filtered: { type: Array as PropType<string[]>, required: true },
    games: { type: Array as PropType<Result27[]>, required: true },
    scores: {
      type: Object as PropType<{ [k: string]: (PlayerGameResult27 | null)[] }>,
      required: true,
    },
  },
  setup(props) {
    const playerStore = usePlayerStore();
    // function computedPlayers<T>(f: (player: string) => T): { [K: string]: ComputedRef<T> } {
    //   return getPlayerIds(props.players).reduce((obj, id) => {
    //     obj[id] = computed(() => f(id));
    //     return obj;
    //   }, {} as { [K: string]: ComputedRef<T> });
    // }
    function computedPlayers<T>(f: (player: string) => T): ComputedRef<{ [K: string]: T }> {
      return computed(() => props.players.reduce((obj, p) => {
        const id = typeof p === "object" ? p.id : p;
        obj[id] = f(id);
        return obj;
      }, {} as { [K: string]: T }));
    }
    const numGames = computedPlayers(p => props.scores[p].filter(s => s != null).length);
    const sumScores = computedPlayers(p =>
      props.scores[p].reduce((t, s) => s == null ? t : t + s.score, 0));
    const gameWinners = computed(() => props.games.reduce((acc, game) => {
      const winner = typeof game.winner === "string" ? game.winner : game.winner.tiebreak.winner!;
      if (!Object.hasOwn(acc, winner)) {
        acc[winner] = [];
      }
      acc[winner].push(Object.keys(game.game));
      return acc;
    }, {} as { [k: string]: string[][] }));
    const rowMeta: RowMetadata[] = [
      {
        label: "Personal Best",
        slotId: "pb",
      },
      {
        label: "Personal Worst",
        slotId: "pw",
      },
      {
        label: "Average score",
        slotId: "mean",
      },
      {
        label: "Real Wins",
        slotId: "filteredW",
      },
      {
        label: "Total Wins",
        slotId: "wins",
      },
      {
        label: "Total games played",
        slotId: "gameCount",
      },
      {
        label: "Win rate",
        slotId: "winR",
      },
      {
        label: "Fat Nicks",
        slotId: "fn",
      },
      {
        label: "Cliffs",
        slotId: "cliff",
      },
      {
        label: "Cliff Rate",
        slotId: "cliffR",
      },
      {
        label: "Double Doubles",
        slotId: "dd",
      },
      {
        label: "Double Double Rate",
        slotId: "ddR",
      },
      {
        label: "All Positive",
        slotId: "ap",
      },
    ];
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
      sumScores,
      isFiltered: computed(() =>
        props.filtered.length > 0 && props.filtered.length != props.players.length),
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
      asFixed,
      asRate,
      roundData: (player: string, round: number) => {
        const [totalHits, dd, c, g] = props.scores[player].reduce(([t, d, c, g], s) => {
          if (s == null) {
            return [t, d, c, g];
          }
          switch (s.rounds[round - 1]) {
            case 1:
              return [t + 1, d, c, g + 1];
            case 2:
              return [t + 2, d + 1, c, g + 1];
            case 3:
              return [t + 3, d, c + 1, g + 1];
            default:
              return [t, d, c, g];
          }
        }, [0, 0, 0, 0]);
        // const num = numGames.value[player] * 3;
        return {
          totalHits,
          gamesWithHits: g,
          doubleDoubles: dd,
          cliffs: c,
        };
      },
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
  margin-top: 1em;
}
td:hover > .tooltip {
  display: inline-block;
}
td:hover > .tooltip:hover {
  display: none;
}
#playerSummary {
  margin-bottom: 4.5em;
}
.specificRound {
  font-size: small;
}
</style>
