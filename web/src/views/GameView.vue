<template>
  <div class="gameViewBody">
    <PlayerSelection
      legend="Select who is playing:"
      :available="all_players"
      :selected="players"
      @players="p => players = p"
    />
    <input
      id="dateInput"
      v-model="date"
      type="datetime-local"
    >
    <input
      v-if="saveGamesInProgress"
      id="resetGameBtn"
      type="button"
      value="Reset Game"
      @click.prevent="clearGame"
    >
    <span id="summarySelect">
      <label for="summaryDisplaySelect">Display summary:</label>
      <select
        id="summaryDisplaySelect"
        v-model="summaryDisplay"
        name="summaryDisplay"
      >
        <option
          v-for="[opt, desc] in summaryPlayersOptions"
          :key="opt"
          :value="opt"
        >
          {{ desc }}
        </option>
      </select>
    </span>
    <div class="game">
      <Game27
        :players="all_players.filter(({ id }) => players.includes(id))"
        :date="new Date(date)"
      />
    </div>
    <Summary27
      v-if="summaryEnabled"
      :players="summaryPlayers"
      :filtered="[]"
    />
  </div>
</template>

<script lang="ts">
import { computed, defineComponent, ref } from "vue";
import PlayerSelection from "@/components/PlayerSelection.vue";
import Game27 from "@/components/27/Game27.vue";
import Summary27 from "@/components/27/Summary.vue";
import { usePlayerStore } from "@/store/player";
import { usePrefs, SUMMARY_INGAME_OPTIONS } from "@/store/clientPreferences";
import { use27History } from "@/store/history27";

export default defineComponent({
  components: {
    PlayerSelection,
    Game27,
    Summary27,
  },
  async setup() {
    const playerStore = usePlayerStore();
    const preferences = usePrefs();
    const history = use27History();

    // await playerStore.loadAllPlayers();
    const all_players = computed(() =>
      playerStore.availablePlayers.filter(p => preferences.displayGuestSelection || !p.guest));
    const players = ref((await playerStore.getDefaultPlayers("twentyseven"))
      .map(({ value:{ id }}) => id));
    return {
      players,
      all_players,
      date: ref((new Date()).toISOString().slice(0, 16)),
      ingameSummary: computed(() => preferences.twentyseven.ingameSummary),
      summaryEnabled: computed(() => preferences.twentyseven.ingameSummary.players !== "none"),
      summaryDisplay: computed({
        get: () => preferences.twentyseven.ingameSummary.players,
        set: val => preferences.$patch(state => state.twentyseven.ingameSummary = {
          ...state.twentyseven.ingameSummary,
          players: val,
        }),
      }),
      summaryPlayers: computed(() => {
        switch (preferences.twentyseven.ingameSummary.players) {
          default:
          case "none": return [];
          case "current": return [];//TODO
          case "playing":
            return history.summaryPlayers.filter(({ id }) => players.value.includes(id));
          case "common": return history.summaryPlayers.filter(({ guest }) => !guest);
          case "all": return history.summaryPlayers;
        }
      }),
      summaryPlayersOptions: computed(() => Object.entries(SUMMARY_INGAME_OPTIONS)
        .filter(([k, _v]) => {
          switch (k) {
            case "current": // Not yet implemented
              return false;
            case "all": // Non functional if guest display is disabled (identical to common)
              return preferences.displayGuestSummary;
            default:
              return true;
          }
        })),
      saveGamesInProgress: computed(() => preferences.saveGamesInProgress),
      clearGame: () => {
        window.sessionStorage.clear(); //TODO: only clear relevant?
        window.location.reload();
      },
    };
  },
});
</script>

<style>
.gameViewBody {
  position: relative;
  display: grid;
  min-width: 100%;
  grid-template-areas:
    "players date reset ."
    "players sumOpt sumOpt ."
    "game game summary summary"
  ;
  grid-template-columns: max-content max-content min-content 1fr;
  grid-template-rows: min-content min-content auto;
  align-items: center;
  justify-content: stretch;
}
.gameViewBody .playerSelection {
  grid-area: players;
}
#dateInput {
  margin-top: 0.45rem;
  width: fit-content;
  grid-area: date;
  justify-self: start;
}
#resetGameBtn {
  font-size: small;
  margin-top: 0.45rem;
  width: fit-content;
  grid-area: reset;
  justify-self: end;
}
#summarySelect {
  grid-area: sumOpt;
}
#summarySelect > label {
  margin-right: 0.5ch;
}
.gameViewBody .game {
  font-size: 2.4vh;
  grid-area: game;
  min-width: max-content;
  align-self: start;
}
.gameViewBody #playerSummary {
  grid-area: summary;
  margin-right: 2.5%;
  font-size: 0.8em;
}
.gameViewBody .playerSelection label {
  width: min-content;
}
</style>
