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
    <span id="summarySelect">
      <label for="summaryDisplaySelect">Display summary:</label>
      <select
        id="summaryDisplaySelect"
        v-model="summaryDisplay"
        name="summaryDisplay"
      >
        <option
          v-for="[opt, desc] in summaryPlayersOptions.filter(([k, _v]) => k !== 'current')"
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
      :games="history.games"
      :scores="history.scores"
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
import { toRaw } from "vue";//XXX

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

    preferences.$subscribe((m, s) => {
      console.log("subs.players:", s.twentyseven.ingameSummary.players);//XXX
    });

    await playerStore.loadAllPlayers();
    const all_players = computed(() =>
      playerStore.availablePlayers.filter(p => preferences.displayGuestSelection || !p.guest));
    const players = ref((await playerStore.getDefaultPlayers("twentyseven")).map(({ id }) => id));
    console.log(toRaw(players.value));//XXX
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
        console.log("players:", preferences.twentyseven.ingameSummary.players);//XXX
        switch (preferences.twentyseven.ingameSummary.players) {
          default:
          case "none": return [];
          case "current": return [];//TODO
          case "playing": return players.value.map(id => playerStore.getPlayer(id));
          case "common": return history.summaryPlayers.filter(({ guest }) => !guest);
          case "all": return history.summaryPlayers;
        }
      }),
      summaryPlayersOptions: Object.entries(SUMMARY_INGAME_OPTIONS),
      history,
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
    "players date a b summary"
    "players sumOpt a b summary"
    "game game game b summary"
  ;
  grid-template-columns: max-content max-content auto 1fr min-content;
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
#summarySelect {
  grid-area: sumOpt;
}
#summarySelect > label {
  margin-right: 0.5ch;
}
.gameViewBody .game {
  font-size: 2.5vh;
  grid-area: game;
  min-width: max-content;
}
.gameViewBody #playerSummary {
  grid-area: summary;
  margin-right: 2.5%;
}
</style>
