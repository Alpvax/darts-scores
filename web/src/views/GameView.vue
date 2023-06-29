<template>
  <div class="gameArea">
    <div class="gameAreaLeft">
      <div class="playerSelect">
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
          id="enableSummary"
          v-model="summaryEnabled"
          type="checkbox"
        >
        <label for="enableSummary">{{ summaryEnabled ? "Disable" : "Enable" }} Summary view</label>
      </div>
      <div class="game">
        <Game27
          :players="all_players.filter(({ id }) => players.includes(id))"
          :date="new Date(date)"
        />
      </div>
    </div>
    <Summary27
      v-if="summaryEnabled"
      :players="all_players.filter(({ id }) => players.includes(id) && id in history.scores)"
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
import { usePrefs } from "@/store/clientPreferences";
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
    let history = use27History();

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
      summaryEnabled: computed({
        get: () => preferences.twentyseven.ingameSummary.players !== "none",
        set: enabled => preferences.$patch(state => state.twentyseven.ingameSummary = {
          ...state.twentyseven.ingameSummary,
          players: enabled ? "playing" : "none",
        }),
      }),
      summaryPlayers: computed(() => {
        switch (preferences.twentyseven.ingameSummary.players) {
          default:
          case "none": return [];
          case "all": return playerStore.allPlayerIds;
          case "current": return [];//TODO
          case "playing": return players.value;
        }
      }),
      history,
    };
  },
});
</script>

<style>
.playerSelect {
  width: fit-content;
}
.playerCheckbox {
  display: inline;
  padding: 0px 10px;
}
.game {
  font-size: 2.5vh;
}
.playerSelect fieldset {
  display: inline-block;
}
#dateInput {
  font-size: 2vh;
}
.gameArea {
  position: relative;
  display: flex;
  min-width: 100%;
  align-items: flex-start;
  justify-content: space-between;
}
.gameAreaLeft {
  width: max-content;
}
/* .gameArea > table {
  margin: 2%;
} */
</style>
