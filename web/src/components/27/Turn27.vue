<template>
  <td
    class="turnScore"
    :class="{
      taken: hits >= 0,
      cliff: hits == 3,
      doubledouble: hits == 2,
      editable: editable,
    }"
  >
    {{ score }}
    <sup>({{ numfmt.format(deltaScore ?? -2 * targetNo) }})</sup>
  </td>
  <td
    v-if="editable"
    ref="turnHitsEl"
    class="turnHits empty"
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
import { computed, defineComponent, Ref, ref } from "vue";

export default defineComponent({
  props: {
    editable: { type: Boolean, default: true },
    targetNo: { type: Number, required: true },
    score: { type: Number, required: true },
    hits: { type: Number, default: -1 },
    autofocus: Boolean,
  },
  emits: ["update:hits", "focusNext"],
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
      turnHitsEl.value!.classList.remove("empty");
      // Required because "" == 0
      if ((value === 0 || value > 0) && value < 4) {
        console.log(`Setting hits for round ${props.targetNo} to "${value}"\n >= 0: ${value >= 0}`);//XXX
        emit("update:hits", value);
        if (moveFocus) {
          emit("focusNext");
        }
      }
    }
    return {
      hitsInternal,
      deltaScore,
      numfmt: new Intl.NumberFormat("en-GB", { style: "decimal",  signDisplay: "always" }),
      turnHitsEl,
      onKey: (event: KeyboardEvent) => {
        if (event.shiftKey || event.ctrlKey || event.altKey || event.metaKey) {
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
  padding-left: 10px;
  width: 5em;
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
/* .turnDelta {
  font-size: smaller;
} */
/* .turnDelta.empty, .turnHits.empty {
  color: grey;
} */
</style>
