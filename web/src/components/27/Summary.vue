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
          best: statLimits.best.max == scoreStats[player].best,
        }"
      >
        {{ scoreStats[player].best }}
      </td>
    </template>
    <template #pw="{player}">
      <td
        :class="{
          best: statLimits.worst.max == scoreStats[player].worst,
          worst: statLimits.worst.min == scoreStats[player].worst,
        }"
      >
        {{ scoreStats[player].worst }}
      </td>
    </template>
    <template #mean="{player}">
      <td
        :class="{
          best: statLimits.mean.max == scoreStats[player].mean,
        }"
      >
        {{ asFixed(scoreStats[player].mean) }}
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
          worst: scoreStats[player].fn > 0 && statLimits.fn.max == scoreStats[player].fn,
        }"
      >
        {{ scoreStats[player].fn }}
      </td>
    </template>
    <template #cliff="{player}">
      <td
        :class="{
          best: scoreStats[player].cliffs > 0 && statLimits.cliffs.max == scoreStats[player].cliffs,
        }"
      >
        {{ scoreStats[player].cliffs }}
      </td>
    </template>
    <template #cliffR="{player}">
      <td
        :class="{
          best: scoreStats[player].cliffs > 0 && statLimits.cliffR.max == scoreStats[player].cliffR,
        }"
      >
        {{ asRate(player, scoreStats[player].cliffs / 20) }}
      </td>
    </template>
    <template #dd="{player}">
      <td
        :class="{
          best: scoreStats[player].dd > 0 && statLimits.dd.max == scoreStats[player].dd,
        }"
      >
        {{ scoreStats[player].dd }}
      </td>
    </template>
    <template #ddR="{player}">
      <td
        :class="{
          best: scoreStats[player].dd > 0 && statLimits.ddR.max == scoreStats[player].ddR,
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
          best: scoreStats[player].hans > 0 && statLimits.hans.max == scoreStats[player].hans,
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
    <template #goblins="{player}">
      <td
        :class="{
          best: scoreStats[player].goblins > 0
            && statLimits.goblins.max == scoreStats[player].goblins,
        }"
      >
        {{ scoreStats[player].goblins }}
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
          best: scoreStats[player].piranhas > 0
            && statLimits.piranhas.max == scoreStats[player].piranhas,
        }"
      >
        {{ scoreStats[player].piranhas }}
      </td>
    </template>
    <template #piranhas_tooltip>
      <div class="tooltip">
        Games where only double 1 was hit (so the score was -389)
      </div>
    </template>
    <template #ap="{player}">
      <td
        :class="{
          best: scoreStats[player].allPos > 0 && statLimits.allPos.max == scoreStats[player].allPos,
        }"
      >
        {{ scoreStats[player].allPos }}
      </td>
    </template>
    <template #farDream="{player}">
      <td
        :class="{
          best: scoreStats[player].farDream > 0
            && statLimits.farDream.max == scoreStats[player].farDream,
        }"
      >
        {{ scoreStats[player].farDream }}
      </td>
    </template>
    <template #mostHits="{player}">
      <td
        :class="{
          best: scoreStats[player].bestHits > 0
            && statLimits.bestHits.max == scoreStats[player].bestHits,
        }"
      >
        {{ scoreStats[player].bestHits }}
      </td>
    </template>
    <template #leastHits="{player}">
      <td
        :class="{
          best: scoreStats[player].worstHits > 0
            && statLimits.worstHits.max == scoreStats[player].worstHits,
        }"
      >
        {{ scoreStats[player].worstHits }}
      </td>
    </template>
    <template #meanHits="{player}">
      <td
        :class="{
          best: scoreStats[player].meanHits > 0
            && statLimits.meanHits.max == scoreStats[player].meanHits,
        }"
      >
        {{ asFixed(scoreStats[player].meanHits) }}
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
          favourite: roundData[player].favourites.includes(round),
          best: roundData[player].favourites.includes(round) && roundBest[1] === player,
        }"
      >
        {{ asRate(player, roundData[player][round].gamesWithHits) }}
        <SummaryTooltip
          v-bind="roundData[player][round]"
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
        const cliffs = acc.cliffs + s.cliffs;
        const dd = acc.dd + s.rounds.filter(h => h === 2).length;
        const hits = s.rounds.reduce((a, b) => a + b);
        const sumHits = acc.sumHits + hits;
        return {
          num,
          best: Math.max(acc.best, s.score),
          worst: Math.min(acc.worst, s.score),
          sum,
          mean: sum / num,
          fn: acc.fn + (s.score == -393 ? 1 : 0),
          cliffs,
          cliffR: cliffs / num,
          dd,
          ddR: dd / num,
          goblins: acc.goblins +
            ((s.rounds.filter(h => h === 2).length + s.cliffs) > 0
              && s.rounds.filter(h => h === 1).length < 1
              ? 1
              : 0),
          piranhas: acc.piranhas + (s.score == -389 ? 1 : 0),
          hans: acc.hans + s.rounds.reduce(([hans, count], hits) => {
            if (hits > 1) {
              count += 1;
              return count >= 3 ? [hans + 1, count] : [hans, count];
            } else {
              return [hans, 0];
            }
          }, [0, 0])[0],
          allPos: acc.allPos + (s.allPositive ? 1 : 0),
          farDream: Math.max(acc.farDream, s.rounds.findIndex(h => h < 1)),
          bestHits: Math.max(acc.bestHits, hits),
          worstHits: Math.min(acc.worstHits, hits),
          meanHits: sumHits / num,
          sumHits,
        };
      }, {
        num: 0,
        best: -394,
        worst: 1288,
        sum: 0,
        mean: 0,
        fn: 0,
        cliffs: 0,
        cliffR: 0,
        dd: 0,
        ddR: 0,
        goblins: 0,
        piranhas: 0,
        hans: 0,
        allPos: 0,
        farDream: 0,
        bestHits: 0,
        worstHits: 60,
        meanHits: 0,
        sumHits: 0,
      },
    ));
    const roundData = computed(() => Object.entries(props.scores).reduce(
      ({ best, obj }, [player, scores]) => {
        let roundData = scores.reduce(
          (roundData, s) => {
            if (s) {
              for (const [rIdx, hits] of s.rounds.entries()) {
                if (!roundData[rIdx]) {
                  roundData[rIdx] = {
                    totalHits: 0,
                    gamesWithHits: 0,
                    doubleDoubles: 0,
                    cliffs: 0,
                  };
                }
                roundData[rIdx].totalHits += hits;
                if (hits > 0) {
                  roundData[rIdx].gamesWithHits += 1;
                }
                if (hits == 2) {
                  roundData[rIdx].doubleDoubles += 1;
                }
                if (hits == 3) {
                  roundData[rIdx].cliffs += 1;
                }
              }
            }
            return roundData;
          },
          [] as {
            totalHits: number;
            gamesWithHits: number;
            doubleDoubles: number;
            cliffs: number;
          }[],
        );
        let { h: bestN, f: favourites } = roundData.reduce(({ h, f }, { gamesWithHits }, rIdx) => {
          if (gamesWithHits > h) {
            return { h: gamesWithHits, f: [rIdx + 1]};
          }
          if (gamesWithHits == h) {
            return { h, f: [...f, rIdx + 1]};
          }
          return { h, f };
        }, { h: 0, f: [] as number[] });
        let playerRoundData: {
          [r: number]: {
            totalHits: number;
            gamesWithHits: number;
            doubleDoubles: number;
            cliffs: number;
          };
          favourites: number[];
        } = {
          favourites,
        };
        for (const [i, r] of roundData.entries()) {
          playerRoundData[i + 1] = r;
        }
        bestN /= numGames.value[player];
        return {
          best: (bestN > best[0] ? [bestN, player] : best) as [number, string | null],
          obj: Object.assign(obj, {
            [player]: playerRoundData,
          }),
        };
      },
      {
        best: [0, null] as [number, string | null],
        obj: {} as {
          [k: keyof typeof props.scores]: {
            [r: number]: {
              totalHits: number;
              gamesWithHits: number;
              doubleDoubles: number;
              cliffs: number;
            };
            favourites: number[];
          };
        },
      },
    ));
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
        label: "Goblins",
        slotId: "goblins",
      },
      {
        label: "Piranhas",
        slotId: "piranhas",
      },
      {
        label: "All Positive",
        slotId: "ap",
      },
      {
        label: "Furthest Dream",
        slotId: "farDream",
      },
      {
        label: "Most Hits",
        slotId: "mostHits",
      },
      {
        label: "Least Hits",
        slotId: "leastHits",
      },
      {
        label: "Average Hits",
        slotId: "meanHits",
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
      scoreStats,
      statLimits,
      asFixed,
      asRate,
      roundData: roundData.value.obj,
      roundBest: roundData.value.best,
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
#playerSummary td.favourite:not(.best) {
  background-color: #ceff7e;
}

</style>
