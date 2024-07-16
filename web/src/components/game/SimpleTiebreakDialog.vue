<template>
  <dialog>
    <h1>Tiebreak!</h1>
    <form method="dialog">
      <label for="tieBreakType">Tiebreak type:</label>
      <v-select name="tieBreakType" :options="tiebreakTypes" v-model="tiebreakType" />
      <label for="winner">Tiebreak winner:</label>&nbsp;
      <select name="winner" v-model="winner">
        <PlayerName tag="option" v-for="pid in players" :key="pid" :player-id="pid" :value="pid" />
      </select>
      <button @click="submit">Submit</button>
    </form>
  </dialog>
</template>

<script setup lang="ts">
import { useBasicConfig } from "@/config/baseConfig";
import PlayerName from "../PlayerName";
import { ref } from "vue";

const props = defineProps<{
  players: string[];
}>();

const tiebreakTypes = useBasicConfig().tiebreakTypes.mutableRef();
const tiebreakType = ref(
  tiebreakTypes.value[Math.floor(Math.random() * tiebreakTypes.value.length)] ?? "",
);

const winner = ref("");

const emit = defineEmits<{
  submit: [tiebreak: { type: string; winner: string }];
}>();

const submit = () => emit("submit", { type: tiebreakType.value, winner: winner.value });
</script>

<style scoped>
dialog {
  width: max-content;
  height: 50%;
  translate: 50% 50%;
}
</style>
