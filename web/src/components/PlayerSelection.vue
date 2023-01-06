<template>
  <fieldset>
    <legend>{{ legend }}</legend>

    <div
      v-for="player in availablePlayers"
      :key="player[0]"
      class="playerCheckbox"
    >
      <input
        :id="'select_' + player[1]"
        v-model="players"
        type="checkbox"
        :name="player[0]"
        :value="player[1]"
        @change="e => onCheckboxChange(player[1], (e.target! as HTMLInputElement).checked)"
      >
      <label :for="'select_' + player[1]">{{ player[0] }}</label>
    </div>
  </fieldset>
</template>

<script lang="ts">
import { defineComponent, PropType, ref } from "vue";

export default defineComponent({
  props: {
    legend: { type: String, required: true },
    availablePlayers: { type: Array as PropType<[string, string][]>, required: true },
  },
  emits: [ "update:player", "players" ],
  async setup(props, { emit }) {
    const players = ref(props.availablePlayers.map(([_name, id]) => id));
    return {
      players,
      date: ref((new Date()).toISOString().slice(0, 16)),
      onCheckboxChange(playerId: string, checked: boolean): void {
        emit("update:player", playerId, checked);
        emit("players", players.value);
      },
    };
  },
});
</script>

<style scoped>
fieldset {
  display: inline-block;
}
</style>
