<template>
  <fieldset class="playerSelection">
    <legend>{{ legend }}</legend>

    <div
      v-for="{ name, id } in availablePlayers"
      :key="id"
      class="playerCheckbox"
    >
      <input
        :id="'select_' + id"
        v-model="players"
        type="checkbox"
        :name="name.value"
        :value="id"
        @change="e => onCheckboxChange(id, (e.target! as HTMLInputElement).checked, e as InputEvent)"
      >
      <label :for="'select_' + id">{{ name ?? id }}</label>
    </div>
  </fieldset>
</template>

<script lang="ts">
import { Player, usePlayerStore } from "@/store/player";
import { computed, defineComponent, PropType, ref } from "vue";

export default defineComponent({
  props: {
    legend: { type: String, required: true },
    available: { type: Array as PropType<(Player | string)[]>, required: true },
    selected: { type: Array as PropType<string[] | null>, default: null },
  },
  emits: [ "update:player", "players" ],
  async setup(props, { emit }) {
    const playerStore = usePlayerStore();
    const players = ref(props.selected
      ?? props.available.map(p => typeof p === "object" ? p.id :p));
    console.log("selected:", players.value);//XXX
    return {
      availablePlayers: computed(() =>
        props.available.map(p => typeof p === "object" ? p : playerStore.getPlayer(p))),
      players,
      date: ref((new Date()).toISOString().slice(0, 16)),
      onCheckboxChange(playerId: string, checked: boolean, e: InputEvent): void {
        console.log("Selection", playerId, checked, (e.target! as any).checked);//XXX
        emit("update:player", playerId, checked);
        emit("players", players.value);
      },
    };
  },
});
</script>

<style scoped>
fieldset.playerSelection {
  display: inline-block;
}
.playerSelection > .playerCheckbox {
  display: inline;
  padding: 0px 10px;
}
</style>
