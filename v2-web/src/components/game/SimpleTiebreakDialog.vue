<template>
  <dialog ref="dialogEl">
    <h1>Tiebreak!</h1>
    <form method="dialog">
      <label for="tiebreakTypes">Tiebreak type:</label>
      <VueSelect
        v-model="tiebreakType"
        input-id="tiebreakTypes"
        :options="tiebreakTypes"
        @search="onSearchUpdate"
      >
        <template v-if="addable" #menu-header>
          <button type="button" @click="addType">Add type: {{ searchTerm }}</button>
        </template>
      </VueSelect>
      <label for="tieBreakWinner">Tiebreak winner:</label>
      <VueSelect
        id="playerWinnerSelect"
        v-model="winner"
        :options="players.map((pid) => ({ label: pid, value: pid }))"
        input-id="tieBreakWinner"
        placeholder="Select Winner..."
      >
        <template #value="{ option }">
          <PlayerName class="playerName" :player-id="option.value" />
        </template>
        <template #option="{ option }">
          <PlayerName class="playerName" :player-id="option.value" />
        </template>
      </VueSelect>
      <button id="tieBreakCancel" @click="cancel">Cancel</button>
      <button id="tieBreakSubmit" :disabled="!winner || winner.length < 1" @click="submit">
        Submit
      </button>
    </form>
    <ContextMenu />
  </dialog>
</template>

<script setup lang="ts">
import { useBasicConfig } from "@/config/baseConfigLayered";
import PlayerName from "../PlayerName";
import { computed, nextTick, ref, useTemplateRef, watch } from "vue";
import VueSelect from "vue3-select-component";

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

const tiebreakTypesSaved = useBasicConfig().tiebreakTypes.mutableRef("local");
const tiebreakTypes = computed(() =>
  tiebreakTypesSaved.value.map((label) => ({
    label,
    value: label /*.toLowerCase().replaceAll(/\s/, "_")*/,
  })),
);
const searchTerm = ref("");
const onSearchUpdate = (search: string) => (searchTerm.value = search);
const addable = computed(
  () => searchTerm.value.length > 0 && !tiebreakTypesSaved.value.includes(searchTerm.value),
);
const addType = () => {
  tiebreakTypesSaved.value = [searchTerm.value, ...tiebreakTypesSaved.value];
  tiebreakType.value = searchTerm.value;
};

const tiebreakType = ref(
  props.defaultTieType.length > 0
    ? props.defaultTieType
    : (tiebreakTypes.value[Math.floor(Math.random() * tiebreakTypes.value.length)].value ?? ""),
);

const winner = ref(props.defaultWinner);

watch(
  () => [props.defaultTieType, props.defaultWinner],
  ([pTieType, pWinner]) => {
    if (pTieType.length > 0) {
      if (!tiebreakTypesSaved.value.includes(pTieType)) {
        tiebreakTypesSaved.value.push(pTieType);
      }
      tiebreakType.value = pTieType;
    }
    if (pWinner.length > 0 && props.players.includes(pWinner)) {
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

const showModal = async () => {
  while (dialogEl.value === undefined) {
    await nextTick();
  }
  dialogEl.value!.showModal();
  if (props.defaultWinner.length > 0) {
    document.getElementById("tieBreakSubmit")!.focus();
  } else {
    document.getElementById("playerWinnerSelect")!.focus();
  }
};

defineExpose({
  showModal,
});
</script>

<style scoped>
dialog {
  width: 45%;
  translate: 50% 50%;

  & form {
    height: 48vh;
    width: 100%;
    display: grid;
    grid-template-columns: max-content minmax(max-content, auto);
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

:deep(#playerWinnerSelect .playerName) {
  width: 100%;
}
</style>
