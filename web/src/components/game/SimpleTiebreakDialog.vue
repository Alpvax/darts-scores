<template>
  <dialog ref="dialogEl">
    <h1>Tiebreak!</h1>
    <form method="dialog">
      <label>Tiebreak type:</label>
      <v-select v-model="tiebreakType" name="tieBreakType" :options="tiebreakTypes" />
      <label for="tieBreakWinner">Tiebreak winner:</label>
      <select id="tieBreakWinner" ref="winnerEl" v-model="winner" name="tieBreakWinner">
        <option value="" disabled selected hidden>Select Winner...</option>
        <PlayerName v-for="pid in players" :key="pid" tag="option" :player-id="pid" :value="pid" />
      </select>
      <button id="tieBreakCancel" @click="cancel">Cancel</button>
      <button id="tieBreakSubmit" :disabled="winner.length < 1" @click="submit">Submit</button>
    </form>
  </dialog>
</template>

<script setup lang="ts">
import { useBasicConfig } from "@/config/baseConfig";
import PlayerName from "../PlayerName";
import { nextTick, ref, useTemplateRef, watch } from "vue";

const props = withDefaults(
  defineProps<{
    players: string[];
    defaultTieType?: string;
    defaultWinner?: string;
  }>(),
  {
    defaultTieType: "",
    defaultWinner: "",
  },
);

const tiebreakTypes = useBasicConfig().tiebreakTypes.mutableRef();
const tiebreakType = ref(
  props.defaultTieType.length > 0
    ? props.defaultTieType
    : (tiebreakTypes.value[Math.floor(Math.random() * tiebreakTypes.value.length)] ?? ""),
);

const winner = ref(props.defaultWinner);

watch(
  () => [props.defaultTieType, props.defaultWinner],
  ([pTieType, pWinner]) => {
    if (pTieType.length > 0) {
      if (!tiebreakTypes.value.includes(pTieType)) {
        tiebreakTypes.value.push(pTieType);
      }
      tiebreakType.value = pTieType;
    }
    if (pWinner.length > 0) {
      winner.value = pWinner;
    }
  },
);

const emit = defineEmits<{
  submit: [tiebreak: { type: string; winner: string }];
  cancel: [setValues: { tieType?: string; winner?: string }];
}>();

const submit = () => emit("submit", { type: tiebreakType.value, winner: winner.value });

const cancel = (e: Event) => {
  emit("cancel", {
    ...(tiebreakType.value.length > 0 ? { tieType: tiebreakType.value } : undefined),
    ...(winner.value.length > 0 ? { winner: winner.value } : undefined),
  });
  if (e instanceof MouseEvent) {
    e.preventDefault();
    dialogEl.value!.close();
  }
};

const dialogEl = useTemplateRef<HTMLDialogElement>("dialogEl");
watch(dialogEl, (el, old, onCleanup) => {
  if (old) {
    old.removeEventListener("cancel", cancel);
    old.removeEventListener("close", cancel);
  }
  if (el) {
    el.addEventListener("cancel", cancel);
    el.addEventListener("close", cancel);
  }
  onCleanup(() => {
    if (el) {
      el.removeEventListener("cancel", cancel);
      el.removeEventListener("close", cancel);
    }
  });
});

const winnerEl = ref<HTMLSelectElement>();

const showModal = async () => {
  while (winnerEl.value === undefined) {
    await nextTick();
  }
  dialogEl.value!.showModal();
  winnerEl.value.focus();
};

defineExpose({
  showModal,
});
</script>

<style scoped>
dialog {
  width: max-content;
  translate: 50% 50%;

  & form {
    height: 48vh;
    display: grid;
    grid-template-columns: max-content max-content;
    grid-template-rows: repeat(auto-fill, minmax(2em, 1fr));
    gap: 0.3em;

    & label {
      grid-column: 1;
      grid-row: auto;
    }
    & button {
      grid-row: -1;
    }
  }
}
</style>
