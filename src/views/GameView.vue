<template>
  <div class="playerSelect">
    <fieldset>
      <legend>Select who is playing:</legend>

      <div
        v-for="player in all_players"
        :key="player"
        class="playerCheckbox"
      >
        <input
          :id="'select_' + player"
          v-model="players"
          type="checkbox"
          :name="player"
          :value="player"
        >
        <label :for="'select_' + player">{{ player }}</label>
      </div>
    </fieldset>
  </div>
  <div class="game">
    <Game27 :players="players" />
  </div>
</template>

<script lang="ts">
import { defineComponent, ref } from "vue";
import Game27 from "@/components/Game27.vue"; // @ is an alias to /src

export default defineComponent({
  components: {
    Game27,
  },
  setup() {
    const players = ref(["Cliff", "Hans", "Fat Nick", "Javelin", "Barron von Sprk"]);
    return {
      players,
      all_players: ["Cliff", "Hans", "Fat Nick", "Javelin", "Barron von Sprk"],
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
</style>
