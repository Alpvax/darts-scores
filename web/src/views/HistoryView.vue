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
      legend="Select players"
      :available="allPlayers"
      :selected="playerIds"
      @players="p => playerIds = p"
    />
  </div>
  <div
    id="histBodyContainer"
    @click.prevent="selectedGame = null"
  >
    <Summary27
      :players="allPlayers"
      :filtered="playerIds"
      :games="games"
      :scores="scores"
    />
    <PlayerTable
      id="gameResults"
      :players="allPlayers"
      :rows="gamesRowMeta"
    >
      <template #__column0header>
        <td class="tableHeader">
          Date
        </td>
      </template>
      <template
        v-for="game in games"
        :key="game.gameId"
        #[game.gameId]="{player}"
      >
        <td
          class="gameScore"
          :class="{
            winner: typeof game.winner === 'string'
              ? game.winner == player
              : game.winner.tie.includes(player),
            tie: typeof game.winner === 'object',
            allPos: Object.hasOwn(game.game, player) && game.game[player].allPositive,
          }"
          @click.stop.prevent="selectedGame = game"
        >
          {{ Object.hasOwn(game.game, player) ? game.game[player].score : "" }}
        </td>
      </template>
    <!-- <table id="gameResults">
      <thead>
        <tr>
          <td class="tableHeader">
            Date
          </td>
          <td
            v-for="{ id, name } in allPlayers"
            :key="id"
            class="playerName"
          >
            {{ name }}
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
            v-for="player in allPlayerIds"
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
    </table> -->
    </PlayerTable>
    <div
      v-if="selectedGame != null"
      id="pastGameOverlay"
    >
      <Game27
        :players="allPlayers.filter(({ id }) => id in selectedGame!.game)"
        :date="new Date(selectedGame!.date)"
        :editable="false"
        :player-game-hits="selectedRounds"
        :display-date="true"
        :display-winner="false"
      />
      <input
        type="button"
        value="Share"
        @click="copySelectedToClipboard"
      >
    </div>
  </div>
</template>

<script lang="ts">
import { computed, defineComponent, ref, watchEffect } from "vue";
import PlayerSelection from "@/components/PlayerSelection.vue";
import PlayerTable, { RowMetadata } from "@/components/PlayerTable.vue";
import Summary27 from "@/components/27/Summary.vue";
import Game27 from "@/components/27/Game27.vue";
import {
  collection, doc,
  DocumentReference,
  getDoc, getDocs, getFirestore,
  orderBy, query, where,
} from "firebase/firestore";
import { PlayerGameResult27, Result27 } from "@/components/27/Game27.vue";
import { usePlayerStore } from "@/store/player";

export default defineComponent({
  components: {
    PlayerSelection,
    PlayerTable,
    // eslint-disable-next-line vue/no-unused-components
    Summary27,
    Game27,
  },
  async setup() {
    const db = getFirestore();
    const gamesRef = collection(db, "game/twentyseven/games");

    const playerStore = usePlayerStore();

    const today = new Date();
    const toDate = ref(today.toISOString().slice(0, 10));
    const fromDate = ref(`${today.getFullYear()}-01-01`);
    const games = ref([] as (Result27 & { gameId: string })[]);
    // const allPlayersPartial = ref(new Map<string, OrderedPlayer | null>());
    // const scores = ref({} as { [pid: string]: Map<Date, PlayerGameResult27> });
    // function addScore(date: Date | string, playerId: string, score: PlayerGameResult27): void {
    //   scores[playerId]
    // }
    watchEffect(async (): Promise<void> => {
      games.value = [];
      if (fromDate.value <= toDate.value && new Date(fromDate.value) <= today) {
        const td = new Date(toDate.value);
        td.setDate(td.getDate() + 1);
        (await getDocs(query(gamesRef,
          orderBy("date", "asc"),
          where("date", ">=", fromDate.value),
          where("date", "<=", td.toISOString().slice(0, 10)),
        ))).forEach(async (d) => {
          const gameData = Object.assign({ gameId: d.id } , d.data() as Result27);
          games.value.push(gameData);
          await Promise.all(Object.keys(gameData.game).map(playerStore.getPlayerAsync));
        });
      } else {
        //TODO display error
      }
    });
    const playerIds = ref(await Promise.all(((await getDoc(doc(db, "game/twentyseven")))
      .get("defaultplayers") as DocumentReference[]).map(d => d.id)));

    const scores = computed(() => games.value.reduce((scores, game) => {
      for (const id in scores) {
        scores[id].push(Object.hasOwn(game.game, id) ? game.game[id] : null);
      }
      return scores;
    }, playerStore.allPlayerIds.reduce((o, pid) => {
      o[pid] = [];
      return o;
    }, {} as { [k: string]: (PlayerGameResult27 | null)[] })));

    // const wins = computed(() => games.value.reduce((acc, game) => {
    //  const winner = typeof game.winner === "string" ? game.winner : game.winner.tiebreak.winner!;
    //   acc[winner].push(Object.keys(game.game));
    //   return acc;
    // }, [...allPlayers.value].reduce((o, p) => {
    //   o[p.id] = [];
    //   return o;
    // }, {} as { [k: string]: string[][] })));

    const selectedGame = ref(null as (Result27 & { gameId: string }) | null);

    return {
      playerIds,
      allPlayers: computed(() => playerStore.allPlayersOrdered),
      toDate, fromDate,
      games,
      gamesRowMeta: computed(() => games.value.map(g => ({
        label: (new Date(g.date)).toLocaleDateString(),
        slotId: g.gameId,
        onClick: (e) => {
          e.preventDefault();
          e.stopPropagation();
          selectedGame.value = g;
        },
      } as RowMetadata))),
      scores,
      selectedGame,
      selectedRounds: computed(() => Object.entries(selectedGame.value!.game)
        .reduce((o, [p, { rounds }]) => {
          o[p] = rounds;
          return o;
        }, {} as { [pid: string]: number[] })),
      copySelectedToClipboard: async () => {
        const link = `${window.location.origin}/game/${selectedGame.value!.gameId}`;
        console.info("Sharing link:", link);//XXX
        try {
          await navigator.clipboard.writeText(link);
          alert("Copied link to clipboard");
        } catch($e) {
          alert("Cannot copy to clipboard: share the following link:\n" + link);
        }
      },
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
  position: fixed;
  top: 10%;
  z-index: 5;
  background: white;
  border: 2px lightslategrey solid;
  margin: 5em;
}
</style>
