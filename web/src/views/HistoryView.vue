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
      legend="Select players (unimplemented)"
      :available-players="all_players"
      @players="p => players = p"
    />
  </div>
  <!--
    PB	-149	17	-345	-191	-349
    Wins	0	1	0	0	0
    Real Wins	0	1	0	0	0	Real Wins = games where all Required players played
    Fat Nicks	0	0	0	0	0
    Games	1	1	1	1	1
    Win rate	0.0%	100.0%	0.0%	0.0%	0.0%
    Mean	-149	17	-345	-191	-349
    Cliffs	0	0	0	0	0
    All Positive	0	0	0	0	0
    Required	TRUE	TRUE	TRUE	FALSE	TRUE
    Date	<players>	Winner	TieBreak	RealWinner	Game total	Game avg
    05/01/2023	-149	17	-345	-191	-349	Hans		Hans	-1017	-203.4
   -->
  <table id="gameResults">
    <thead>
      <tr>
        <td class="tableHeader">
          Date
        </td>
        <!-- <td>&nbsp;</td> -->
        <td
          v-for="[player, id] in all_players.filter(([_name, id]) => players.includes(id))"
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
      >
        <td class="date">
          {{ (new Date(game.date)).toLocaleDateString() }}
        </td>
        <td
          v-for="player in all_players
            .filter(([_name, id]) => players.includes(id))
            .map(([_name, id]) => id)"
          :key="player"
          class="gameScore"
          :class="{
            winner: typeof game.winner === 'string'
              ? game.winner == player
              : game.winner.tie.includes(player),
            tie: typeof game.winner === 'object'
          }"
        >
          {{ Object.hasOwn(game.game, player) ? game.game[player].score : "" }}
        </td>
      </tr>
    </tbody>
  </table>
</template>

<script lang="ts">
import { computed, defineComponent, ref, watchEffect } from "vue";
import PlayerSelection from "@/components/PlayerSelection.vue";
import {
  collection, doc, DocumentReference,
  getDoc, getDocs, getFirestore,
  orderBy, query, where,
} from "firebase/firestore";
import { PlayerGameResult27, Result27 } from "@/components/Game27.vue";

export default defineComponent({
  components: {
    PlayerSelection,
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

    return {
      players,
      all_players,
      toDate, fromDate,
      games,
      scores: computed(() => games.value.reduce((scores, game) => {
        for (const player of players.value) {
          scores[player].push(Object.hasOwn(game.game, player) ? game.game[player] : null);
        }
        return scores;
      }, players.value.reduce((o, p) => {
        o[p] = [];
        return o;
      }, {} as { [k: string]: (PlayerGameResult27 | null)[] }))),
    };
  },
});
</script>

<style>
.playerName, .tableHeader {
  font-weight: bold;
}
#historyFilter, .dateFilters {
  width: fit-content;
}
#gameResults td {
  padding: 0.2em;
}
#gameResults tr:hover {
  background-color: bisque;
}
#gameResults td.tie.winner {
  background-color: #bbff66;
}
#gameResults td.winner {
  background-color: #00ff00;
}
</style>
