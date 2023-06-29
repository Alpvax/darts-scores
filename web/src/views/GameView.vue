<template>
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
  </div>
  <div class="game">
    <Game27
      :players="all_players.filter(({ id }) => players.includes(id))"
      :date="new Date(date)"
    />
  </div>
</template>

<script lang="ts">
import { computed, defineComponent, ref } from "vue";
import PlayerSelection from "@/components/PlayerSelection.vue";
import Game27 from "@/components/27/Game27.vue";
import { usePlayerStore } from "@/store/player";
import { usePrefs } from "@/store/clientPreferences";

export default defineComponent({
  components: {
    PlayerSelection,
    Game27,
  },
  async setup() {
    const playerStore = usePlayerStore();
    const preferences = usePrefs();
    await playerStore.loadAllPlayers();
    const all_players = computed(() =>
      playerStore.availablePlayers.filter(p => preferences.displayGuestSelection || !p.guest));
    const players = ref((await playerStore.getDefaultPlayers("twentyseven")).map(({ id }) => id));
    return {
      players,
      all_players,
      date: ref((new Date()).toISOString().slice(0, 16)),
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
</style>
