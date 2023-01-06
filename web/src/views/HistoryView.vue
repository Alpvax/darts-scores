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
  <table>
    <thead>
      <tr>
        <td class="tableHeader">
          Date
        </td>
        <!-- <td>&nbsp;</td> -->
        <td
          v-for="player in players"
          :key="player"
          class="playerName"
        >
          {{ all_players.find(([_name, id]) => id === player)![0] }}
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
          v-for="(score, player) in game.game"
          :key="player"
        >
          {{ score.score }}
        </td>
      </tr>
    </tbody>
  </table>
</template>

<script lang="ts">
import { defineComponent, ref, watchEffect } from "vue";
import PlayerSelection from "@/components/PlayerSelection.vue";
import {
  collection, doc, DocumentReference,
  getDoc, getDocs, getFirestore,
  orderBy, query, where,
} from "firebase/firestore";
import { Result27 } from "@/components/Game27.vue";

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
</style>
