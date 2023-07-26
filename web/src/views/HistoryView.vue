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
      v-model="playerIds"
      legend="Select players to filter &quot;Real Wins&quot;"
      :available="allPlayers.filter(({disabled, guest}) => !disabled && !guest)"
    />
  </div>
  <div
    id="histBodyContainer"
    @click.prevent="selectedGame = null"
  >
    <Summary27
      :players="summaryPlayers"
      :filtered="playerIds"
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
        <!-- eslint-disable vue/html-quotes -->
        <td
          class="gameScore"
          :class="{
            winner: typeof game.winner === 'string'
              ? game.winner == player
              : game.winner.tie.includes(player),
            tie: typeof game.winner === 'object',
            allPos: Object.hasOwn(game.game, player) && game.game[player].allPositive,
            fatNickGame: Object.hasOwn(game.game, player) && game.game[player].score <= -393,
            cliffGame: Object.hasOwn(game.game, player) && game.game[player].cliffs > 0,
            ddGame: Object.hasOwn(game.game, player)
              && game.game[player].rounds.find(h => h === 2) != undefined,
          }"
          :data-notables='Object.hasOwn(game.game, player) && (" ("
            + (game.game[player].allPositive ? "+" : "")
            + (game.game[player].cliffs > 0 ? "c" : "")
            + (game.game[player].rounds.find(h => h === 2) != undefined ? "d" : "")
            + ")"
          )'
          @click.stop.prevent="selectedGame = game"
        >
          <!-- eslint-enable vue/html-quotes -->
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
import { computed, defineComponent, ref } from "vue";
import PlayerSelection from "@/components/PlayerSelection.vue";
import PlayerTable from "@/components/PlayerTable.vue";
import { RowMetadata } from "@/utils/display";
import Summary27 from "@/components/27/Summary.vue";
import Game27 from "@/components/27/Game27.vue";
import { usePrefs } from "@/store/clientPreferences";
import { use27History } from "@/store/history27";
import { Result27 } from "@/games/27";
import { getDoc, doc, DocumentReference, getFirestore } from "firebase/firestore";
import { storeToRefs } from "pinia";

export default defineComponent({
  components: {
    PlayerSelection,
    PlayerTable,
    Summary27,
    Game27,
  },
  async setup() {
    const preferences = usePrefs();
    const {
      allPlayers, summaryPlayers, toDate, fromDate, games,
    } = storeToRefs(use27History());

    const playerIds = ref(await Promise.all(((await getDoc(doc(getFirestore(), "game/twentyseven")))
      .get("defaultrequired") as DocumentReference[]).map(d => d.id)));

    const selectedGame = ref(null as (Result27 & { gameId: string }) | null);

    return {
      playerIds,
      allPlayers,
      summaryPlayers,
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
      toDate,
      fromDate,
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
#gameResults td.fatNickGame {
  background-color: #ff7e7e;
}
#gameResults td.allPos::after, #gameResults td.cliffGame::after, #gameResults td.ddGame::after {
  content: attr(data-notables);
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
