<template>
  <PlayerTable
    id="playerSummary"
    :players="players.filter(p => !p.disabled)"
    :rows="rowMeta"
  >
    <template #pb="{player}">
      <!-- {{ best(player, "best") }} -->
      <td
        :class="{
          best: statLimits.best.max == scoreStats[player].best
        }"
      >
        {{ scoreStats[player].best }}
      </td>
    </template>
    <template #pw="{player}">
      <td
        :class="{
          worst: statLimits.worst.min == scoreStats[player].worst
        }"
      >
        {{ scoreStats[player].worst }}
      </td>
    </template>
    <template #mean="{player}">
      <td
        :class="{
          best: statLimits.mean.max == scoreStats[player].mean
        }"
      >
        {{ asFixed(scoreStats[player].mean) }}
      </td>
    </template>
    <template
      v-if="isFiltered"
      #filteredW="{player}"
    >
      <td
        :class="{
          best: mostWins.filtered.includes(player)
        }"
      >
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
      <td
        :class="{
          best: mostWins.all.includes(player)
        }"
      >
        {{ gameWinners[player]?.length || 0 }}
      </td>
    </template>
    <template #gameCount="{player}">
      <td>
        {{ numGames[player] }}
      </td>
    </template>
    <template #winR="{player}">
      <td
        :class="{
          best: mostWins.all.includes(player)
        }"
      >
        {{ asRate(player, gameWinners[player]?.length || 0) }}
      </td>
    </template>
    <template #fn="{player}">
      <td
        :class="{
          worst: scoreStats[player].fn > 0 && statLimits.fn.max == scoreStats[player].fn
        }"
      >
        {{ scoreStats[player].fn }}
      </td>
    </template>
    <template #cliff="{player}">
      <td
        :class="{
          best: scoreStats[player].cliffs > 0 && statLimits.cliffs.max == scoreStats[player].cliffs
        }"
      >
        {{ scoreStats[player].cliffs }}
      </td>
    </template>
    <template #cliffR="{player}">
      <td
        :class="{
          best: scoreStats[player].cliffs > 0 && statLimits.cliffs.max == scoreStats[player].cliffs
        }"
      >
        {{ asRate(player, scoreStats[player].cliffs / 20) }}
      </td>
    </template>
    <template #dd="{player}">
      <td
        :class="{
          best: scoreStats[player].dd > 0 && statLimits.dd.max == scoreStats[player].dd
        }"
      >
        {{ scoreStats[player].dd }}
      </td>
    </template>
    <template #ddR="{player}">
      <td
        :class="{
          best: scoreStats[player].dd > 0 && statLimits.dd.max == scoreStats[player].dd
        }"
      >
        {{ asRate(player, scoreStats[player].dd / 20) }}
      </td>
    </template>
    <template
      #hans="{player}"
    >
      <td
        :class="{
          best: scoreStats[player].hans > 0 && statLimits.hans.max == scoreStats[player].hans
        }"
      >
        {{ scoreStats[player].hans }}
      </td>
    </template>
    <template
      #hans_tooltip
    >
      <div class="tooltip">
        Three double doubles in a row
      </div>
    </template>
    <template #ap="{player}">
      <td
        :class="{
          best: scoreStats[player].allPos > 0 && statLimits.allPos.max == scoreStats[player].allPos
        }"
      >
        {{ scoreStats[player].allPos }}
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

<script lang="tsx">
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
    const scoreStats = computedPlayers(p => props.scores[p].reduce(
      (acc, s) => {
        if (s == null) {
          return acc;
        }
        const num = acc.num + 1;
        const sum = acc.sum + s.score;
        return {
          num,
          best: Math.max(acc.best, s.score),
          worst: Math.min(acc.worst, s.score),
          sum,
          mean: sum / num,
          fn: acc.fn + (s.score == -393 ? 1 : 0),
          cliffs: acc.cliffs + s.cliffs,
          dd: acc.cliffs + s.rounds.filter(h => h === 2).length,
          hans: acc.hans + s.rounds.reduce(([hans, count], hits) => {
            if (hits > 1) {
              count += 1;
              return count >= 3 ? [hans + 1, count] : [hans, count];
            } else {
              return [hans, 0];
            }
          }, [0, 0])[0],
          allPos: acc.allPos + (s.allPositive ? 1 : 0),
        };
      }, {
        num: 0,
        best: -394,
        worst: 1288,
        sum: 0,
        mean: 0,
        fn: 0,
        cliffs: 0,
        dd: 0,
        hans: 0,
        allPos: 0,
      }));
    const statLimits = computed(() => Object.values(scoreStats.value).reduce(
      (acc, s) => {
        for (const k of Object.keys(acc).map(k => k as keyof typeof acc)) {
          acc[k].min = Math.min(acc[k].min, s[k]);
          acc[k].max = Math.max(acc[k].max, s[k]);
        };
        return acc;
      }, {
        best: { min: 1288, max: -394 },
        worst: { min: 1288, max: -394 },
        mean: { min: 1288, max: -394 },
        fn: { min: 0, max: 0 },
        cliffs:  { min: 0, max: 0 },
        dd:  { min: 0, max: 0 },
        hans:  { min: 0, max: 0 },
        allPos:  { min: 0, max: 0 },
      }));
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
        label: "Hans",
        slotId: "hans",
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
      mostWins: computed(() => Object.entries(gameWinners.value).reduce(
        ({ all, all_count, filtered, filtered_count }, [p, wins]) => {
          const a_wins = wins.length;
          const f_wins = wins.filter(
            opponents => props.filtered.every(p => opponents.includes(p))).length;
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
          return { ...a, ...f };
        }, { all_count: 0, all: [] as string[], filtered_count: 0, filtered: [] as string[] })),
      scoreStats,
      statLimits,
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
      // best: (player: string,
      //   key: keyof typeof statLimits.value,
      //   format?: (value: number) => string) => {
      //   const value = scoreStats.value[player][key];
      //   const best = statLimits.value[key].max == value;
      //   const valF = format ? format(value) : value;
      //   return best
      //     ? <td class="best"> { valF } </td>
      //     : <td> { valF } </td>;
      // },
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
#playerSummary {
  margin-bottom: 4.5em;
}
.specificRound {
  font-size: small;
}
#playerSummary td.best {
  background-color: #7eff7e;
}
#playerSummary td.worst {
  background-color: #ff7e7e;
}

</style>
