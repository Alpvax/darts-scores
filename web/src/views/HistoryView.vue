<template>
  <div id="historyFilter">
    <div class="dateFilters">
      <label for="fromDateFilter">From:</label>
      <input
        id="fromDateFilter"
        v-model="fromDate"
        type="date"
      >
      <label for="toDateFilter">To:</label>
      <input
        id="toDateFilter"
        v-model="toDate"
        type="date"
      >
    </div>
    <PlayerSelection
      legend="Select required players"
      :available-players="all_players"
      @players="p => players = p"
    />
  </div>
  <div
    id="histBodyContainer"
    @click.prevent="selectedGame = null"
  >
    <Summary27
      :players="all_players"
      :filtered="players"
      :games="games"
      :scores="scores"
    />
    <table id="gameResults">
      <thead>
        <tr>
          <td class="tableHeader">
            Date
          </td>
          <!-- <td>&nbsp;</td> -->
          <td
            v-for="[player, id] in all_players"
            :key="id"
            class="playerName"
          >
            {{ player }}
          </td>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="game in games"
          :key="game.date"
          @click.stop.prevent="selectedGame = game"
        >
          <td class="date">
            {{ (new Date(game.date)).toLocaleDateString() }}
          </td>
          <td
            v-for="player in all_players
              // .filter(([_name, id]) => players.includes(id))
              .map(([_name, id]) => id)"
            :key="player"
            class="gameScore"
            :class="{
              winner: typeof game.winner === 'string'
                ? game.winner == player
                : game.winner.tie.includes(player),
              tie: typeof game.winner === 'object',
              allPos: Object.hasOwn(game.game, player) && game.game[player].allPositive,
            }"
          >
            {{ Object.hasOwn(game.game, player) ? game.game[player].score : "" }}
          </td>
        </tr>
      </tbody>
    </table>
    <div
      v-if="selectedGame != null"
      id="pastGameOverlay"
    >
      <Game27
        :players="all_players.filter(([_n, id]) => id in selectedGame!.game)"
        :date="new Date(selectedGame!.date)"
        :editable="false"
        :player-game-hits="selectedRounds"
        :display-winner="false"
      />
    </div>
  </div>
</template>

<script lang="ts">
import { computed, defineComponent, ref, watchEffect } from "vue";
import PlayerSelection from "@/components/PlayerSelection.vue";
import Summary27 from "@/components/27/Summary.vue";
import Game27 from "@/components/27/Game27.vue";
import {
  collection, doc, DocumentReference,
  getDoc, getDocs, getFirestore,
  orderBy, query, where,
} from "firebase/firestore";
import { PlayerGameResult27, Result27 } from "@/components/27/Game27.vue";

export default defineComponent({
  components: {
    PlayerSelection,
    Summary27,
    Game27,
  },
  async setup() {
    const gamesRef = collection(getFirestore(), "game/twentyseven/games");

    const today = new Date();
    const toDate = ref(today.toISOString().slice(0, 10));
    const fromDate = ref(`${today.getFullYear()}-01-01`);
    const games = ref([] as Result27[]);
    watchEffect(async (): Promise<void> => {
      games.value = [];
      if (fromDate.value <= toDate.value && new Date(fromDate.value) <= today) {
        const td = new Date(toDate.value);
        td.setDate(td.getDate() + 1);
        (await getDocs(query(gamesRef,
          orderBy("date", "asc"),
          where("date", ">=", fromDate.value),
          where("date", "<=", td.toISOString().slice(0, 10)),
        ))).forEach(d => games.value.push(d.data() as Result27));
      } else {
        //TODO display error
      }
    });

    const all_players: [string, string][] =
      await Promise.all(((await getDoc(doc(getFirestore(), "game/twentyseven")))
        .get("defaultplayers") as DocumentReference[])
        .map(async d => [(await getDoc(d)).get("funName") as string, d.id]),
      );
    const players = ref(all_players.map(([_name, id]) => id));

    const scores = computed(() => games.value.reduce((scores, game) => {
      for (const player of all_players) {
        const pid = player[1];
        scores[pid].push(Object.hasOwn(game.game, pid) ? game.game[pid] : null);
      }
      return scores;
    }, all_players.reduce((o, p) => {
      o[p[1]] = [];
      return o;
    }, {} as { [k: string]: (PlayerGameResult27 | null)[] })));

    const wins = computed(() => games.value.reduce((acc, game) => {
      const winner = typeof game.winner === "string" ? game.winner : game.winner.tiebreak.winner!;
      acc[winner].push(Object.keys(game.game));
      return acc;
    }, all_players.reduce((o, p) => {
      o[p[1]] = [];
      return o;
    }, {} as { [k: string]: string[][] })));

    const selectedGame = ref(null as Result27 | null);

    return {
      players,
      all_players,
      toDate, fromDate,
      games,
      scores,
      scoreSummary: computed(() => all_players
        .reduce((summary, [_name, player]) => {
          const playerScores = scores.value[player].filter(s => s != null) as PlayerGameResult27[];
          const [allWins, reqWins] = wins.value[player].reduce(([all, req], gamePlayers) => {
            all += 1;
            if (players.value.every(p => gamePlayers.includes(p))) {
              req += 1;
            }
            return [all, req];
          }, [0, 0]);
          const gamesPlayed = playerScores.length;
          const [totalScore, pb, pw, fn, cliffs, dd, pos] =
            playerScores.reduce(([totalScore, pb, pw, fn, cliffs, dd, pos], s) => {
              totalScore += s.score;
              if (s.score > pb) {
                pb = s.score;
              }
              if (s.score < pw) {
                pw = s.score;
              }
              if (s.score === -393) {
                fn += 1;
              }
              cliffs += s.cliffs;
              dd += s.rounds.filter(c => c == 2).length;
              if (s.allPositive) {
                pos += 1;
              }
              return [totalScore, pb, pw, fn, cliffs, dd, pos];
            }, [0, -394, 1288, 0, 0, 0, 0]);
          summary["Personal Best"].push(pb);
          summary["Personal Worst"].push(pw);
          summary["Average score"].push(parseFloat((totalScore / gamesPlayed).toFixed(2)));
          summary["Real Wins"].push(reqWins);
          summary["Total Wins"].push(allWins);
          summary["Fat Nicks"].push(fn);
          summary["Total games played"].push(gamesPlayed);
          summary["Win rate"].push(parseFloat((allWins / gamesPlayed * 100).toFixed(2)) + "%");
          summary["Cliffs"].push(cliffs);
          summary["Double Doubles"].push(dd);
          summary["All Positive"].push(pos);
          return summary;
        }, {
          "Personal Best": [] as number[],
          "Personal Worst": [] as number[],
          "Average score": [] as number[],
          "Real Wins": [] as number[],
          "Total Wins": [] as number[],
          "Total games played": [] as number[],
          "Win rate": [] as string[],
          "Fat Nicks": [] as number[],
          "Cliffs": [] as number[],
          "Double Doubles": [] as number[],
          "All Positive": [] as number[],
        })),
      selectedGame,
      selectedRounds: computed(() => Object.entries(selectedGame.value!.game)
        .reduce((o, [p, { rounds }]) => {
          o[p] = rounds;
          return o;
        }, {} as { [pid: string]: number[] })),
    };
  },
});
</script>

<style>
#histBodyContainer {
  position: relative;
  display: flex;
  width: 100%;
  align-items: flex-start;
}
#gameResults {
  order: 1
  /* grid-column-start: 1;
  grid-row-start: 1;
  align-self: center;
  justify-self: center; */
  /* float: left; */
}
#playerSummary {
  order: 2;
  margin-left: 10%;
  /* grid-column-start: 2;
  grid-row-start: 1;
  align-self: center;
  justify-self: center; */
  /* float: left; */
}
#histBodyContainer .playerName {
  width: 6em;
}
.playerName, .tableHeader {
  font-weight: bold;
}
.rowLabel {
  font-weight: bold;
  text-align: right;
  white-space: nowrap;
}
.summaryValue {
  text-align: center;
}
#historyFilter, .dateFilters {
  width: fit-content;
}
#histBodyContainer td {
  padding: 0.2em;
}
#histBodyContainer tbody tr:hover {
  background-color: bisque;
}
#gameResults td.tie.winner {
  background-color: #bbff66;
}
#gameResults td.winner {
  background-color: #00ff00;
}
#gameResults td.allPos::after {
  content: " (+)";
  color: #228b22;
}

#pastGameOverlay {
  position: absolute;
  top: 0%;
  z-index: 5;
  background: white;
  border: 2px lightslategrey solid;
  margin: 5em;
}
</style>
