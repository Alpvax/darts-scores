<template>
  <td
    class="turnScore"
    :class="{
      taken: hits >= 0,
      cliff: hits == 3,
      doubledouble: hits == 2,
      miss: !editable && hits == 0,
      editable: editable,
      winner: !editable && targetNo === 20 && isWinner != 'none',
      tie: !editable && targetNo === 20 && isWinner == 'tie',
    }"
  >
    {{ score }}
    <sup>({{ numfmt.format(deltaScore ?? -2 * targetNo) }})</sup>
  </td>
  <td
    v-if="editable"
    ref="turnHitsEl"
    class="turnHits"
    :class="{
      empty: hits < 0
    }"
  >
    <input
      v-model="hitsInternal"
      class="hitsInput"
      type="number"
      min="0"
      max="3"
      placeholder="0"
      :autofocus="autofocus"
      @keydown="onKey"
    >
    <span />
  </td>
</template>

<script lang="ts">
import { computed, defineComponent, nextTick, PropType, Ref, ref } from "vue";

type WinState = "none" | "win" | "tie";

export default defineComponent({
  props: {
    editable: { type: Boolean, default: true },
    targetNo: { type: Number, required: true },
    score: { type: Number, required: true },
    hits: { type: Number, default: -1 },
    isWinner: { type: String as PropType<WinState>, default: "none" },
    autofocus: Boolean,
  },
  emits: ["update:hits", "focusNext", "focusPrev"],
  setup (props, { emit }) {
    const hitsInternal = computed({
      get: () => props.hits < 1 ? 0 : props.hits,
      set(val) {
        setHits(val, true);
      },
    });
    const deltaScore = computed(() =>
      2 * (hitsInternal.value > 0 ? hitsInternal.value * props.targetNo : -props.targetNo));
    const turnHitsEl: Ref<HTMLElement | null> = ref(null);
    function setHits(value: number, moveFocus: boolean): void {
      // Required because "" == 0
      if ((value === 0 || value > 0) && value < 4) {
        emit("update:hits", value);
        if (moveFocus) {
          nextTick(() => emit("focusNext"));
        }
      }
    }
    return {
      hitsInternal,
      deltaScore,
      numfmt: new Intl.NumberFormat("en-GB", { style: "decimal",  signDisplay: "always" }),
      turnHitsEl,
      onKey: (event: KeyboardEvent) => {
        if (event.shiftKey || event.ctrlKey || event.altKey || event.metaKey || [
          ...Array.from({ length: 20 }, (_, n) => `F${n + 1}`), // F-keys
        ].includes(event.key)) {
          return;
        }
        switch (event.key) {
          case "0":
            hitsInternal.value = 0;
            break;
          case "1":
            hitsInternal.value = 1;
            break;
          case "2":
            hitsInternal.value = 2;
            break;
          case "3":
            hitsInternal.value = 3;
            break;
          case "Tab":
          case "Enter":
            setHits(hitsInternal.value < 0 ? 0 : hitsInternal.value, true);
            break;
          case "ArrowLeft":
          case "Left":
          case "Backspace":
            nextTick(() => emit("focusPrev"));
            break;
          case "ArrowRight":
          case "Right":
            nextTick(() => emit("focusNext"));
            break;
          // default:
          //   return;
        }
        event.preventDefault();
      },
    };
  },
});
</script>

<style>
.turnScore {
  width: 4.5em;
  white-space: nowrap;
}
.turnScore.editable {
  text-align: right;
}
.turnScore:not(.taken) {
  color: #b0b0b0;
}
.hitsInput {
  width: 1.6em;
  font-size: 2vh;
}
.hitsInput:invalid + span::after {
  position: absolute;
  content: "✖";
  color: #ff0000;
  padding-left: 5px;
}
.cliff {
  color: #00cc00;
}
.doubledouble {
  color: #0000ff;
}
tbody > tr:has(.turnHits.empty) {
  background-color: bisque;
}
tbody > tr:has(.turnHits.empty) ~ tr:has(.turnHits.empty) {
  background-color: inherit;
}
td.miss {
  color: #a82828;
}
td.turnScore.tie.winner {
  background-color: #bbff66;
}
td.turnScore.winner {
  background-color: #00ff00;
}
/* .turnDelta {
  font-size: smaller;
} */
/* .turnDelta.empty, .turnHits.empty {
  color: grey;
} */
</style>
