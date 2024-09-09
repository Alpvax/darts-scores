<template>
  <dialog ref="dialogEl">
    <h1>Tiebreak!</h1>
    <form method="dialog">
      <label>Tiebreak type:</label>
      <v-select v-model="tiebreakType" name="tieBreakType" :options="tiebreakTypes" />
      <label for="tieBreakWinner">Tiebreak winner:</label>&nbsp;
      <select id="tieBreakWinner" v-model="winner" name="tieBreakWinner" autofocus>
        <PlayerName v-for="pid in players" :key="pid" tag="option" :player-id="pid" :value="pid" />
      </select>
      <button v-if="winner.length > 0" @click="submit">Submit</button>
    </form>
  </dialog>
</template>

<script setup lang="ts">
import { useBasicConfig } from "@/config/baseConfig";
import PlayerName from "../PlayerName";
import { computed, nextTick, ref, useTemplateRef } from "vue";

/*const props = */ defineProps<{
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

const dialogEl = useTemplateRef<HTMLDialogElement>("dialogEl");
const showModal = computed(() =>
  dialogEl.value ? () => dialogEl.value!.showModal() : () => nextTick(showModal.value),
);

defineExpose({
  showModal,
});
</script>

<style scoped>
dialog {
  width: max-content;
  height: 50%;
  translate: 50% 50%;
}
</style>
