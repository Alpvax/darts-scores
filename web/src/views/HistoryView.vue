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
      legend="Select players to filter &quot;Real Wins&quot;"
      :available="allPlayers.filter(({disabled, guest}) => !disabled && !guest)"
      :selected="playerIds"
      @players="p => playerIds = p"
    />
  </div>
  <div
    id="histBodyContainer"
    @click.prevent="selectedGame = null"
  >
    <Summary27
      :players="summaryPlayers"
      :filtered="playerIds"
      :games="games"
      :scores="scores"
    />
    <PlayerTable
      id="gameResults"
      :players="gamesPlayers"
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
import PlayerTable from "@/components/PlayerTable.vue";
import { RowMetadata } from "@/utils/display";
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
import { usePrefs } from "@/clientPreferences";

export default defineComponent({
  components: {
    PlayerSelection,
    PlayerTable,
    Summary27,
    Game27,
  },
  async setup() {
    const db = getFirestore();
    const gamesRef = collection(db, "game/twentyseven/games");

    const playerStore = usePlayerStore();
    const preferences = usePrefs();

    const today = new Date();
    const toDate = ref(today.toISOString().slice(0, 10));
    const fromDate = ref(`${today.getFullYear()}-01-01`);
    const games = ref([] as (Result27 & { gameId: string })[]);
    watchEffect(async (): Promise<void> => {
      games.value = [];
      if (fromDate.value <= toDate.value && new Date(fromDate.value) <= today) {
        const td = new Date(toDate.value);
        td.setDate(td.getDate() + 1);
        (await getDocs(query(gamesRef,
          orderBy("date", "desc"),
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
      .get("defaultrequired") as DocumentReference[]).map(d => d.id)));

    const scores = computed(() => games.value.reduce((scores, game) => {
      for (const id in scores) {
        scores[id].push(Object.hasOwn(game.game, id) ? game.game[id] : null);
      }
      return scores;
    }, playerStore.allPlayerIds.reduce((o, pid) => {
      o[pid] = [];
      return o;
    }, {} as { [k: string]: (PlayerGameResult27 | null)[] })));

    const allPlayers = computed(() => playerStore.allPlayersOrdered
      .filter(p => scores.value[p.id].filter(s => s).length > 0));

    const selectedGame = ref(null as (Result27 & { gameId: string }) | null);

    return {
      playerIds,
      allPlayers,
      summaryPlayers: computed(() => preferences.displayGuestSummary
        ? allPlayers.value.filter(({ disabled }) => !disabled)
        : allPlayers.value.filter(({ disabled, guest }) => !disabled && !guest)),
      gamesPlayers: computed(() => {
        let res = allPlayers.value;
        if (!preferences.displayDisabledPlayerGames) {
          res = res.filter(({ disabled }) => !disabled);
        }
        if (!preferences.displayGuestGames) {
          res = res.filter(({ guest }) => !guest);
        }
        return res;
      }),
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
  font-size: small;
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
