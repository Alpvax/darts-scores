<template>
  <td
    class="turnScore"
    :class="{ taken: hits != null, cliff: hits == 3, doubledouble: hits == 2 }"
  >
    {{ score }}
    <sup>({{ numfmt.format(deltaScore ?? -2 * targetNo) }})</sup>
  </td>
  <!-- <td
    class="turnDelta"
    :class="{ empty: hits == null }"
  >
    <sup>({{ numfmt.format(deltaScore ?? -2 * targetNo) }})</sup>
  </td> -->
  <td
    ref="turnHitsEl"
    class="turnHits empty"
  >
    <input
      v-model.number="hits"
      class="hitsInput"
      type="number"
      min="0"
      max="3"
      placeholder="0"
      :autofocus="autofocus"
      @keydown="onKey"
      @change="emitScore(false)"
    >
    <span />
  </td>
</template>

<script lang="ts">
import { computed, defineComponent, Ref, ref } from "vue";

export default defineComponent({
  props: {
    targetNo: { type: Number, required: true },
    scoreIn: { type: Number, default: 27 },
    autofocus: Boolean,
  },
  emits: ["score", "update:hits"],
  setup (props, { emit }) {
    const hits = ref(null as number | null);
    const delta = (hits: number): number =>
      hits == 0 ? props.targetNo * -2 : hits * props.targetNo * 2;
    const deltaScore = computed(() => hits.value == null ? null : delta(hits.value));
    const score = computed(() => props.scoreIn + (deltaScore.value ?? delta(0)));
    const turnHitsEl: Ref<HTMLElement | null> = ref(null);
    function emitScore(moveFocus: boolean): void {
      emit("score", score.value);
      turnHitsEl.value!.classList.remove("empty");
      emit("update:hits", hits.value, moveFocus);
    }
    return {
      hits,
      deltaScore,
      score,
      numfmt: new Intl.NumberFormat("en-GB", { style: "decimal",  signDisplay: "always" }),
      turnHitsEl,
      emitScore,
      onKey: (event: KeyboardEvent) => {
        switch (event.key) {
          case "0":
            hits.value = 0;
            break;
          case "1":
            hits.value = 1;
            break;
          case "2":
            hits.value = 2;
            break;
          case "3":
            hits.value = 3;
            break;
          case "Tab":
            if (event.shiftKey) {
              return;
            }
          case "Enter":
            if (hits.value == null) {
              hits.value = 0;
            }
            break;
          default:
            return;
        }
        event.preventDefault();
        emitScore(true);
      },
    };
  },
});
</script>

<style>
.turnScore {
  text-align: right;
  padding-left: 10px;
  width: 5em;
}
.turnScore:not(.taken) {
  color: #b0b0b0;
}
.hitsInput {
  width: 1.3em;
  font-size: 2vh;
}
.hitsInput:invalid + span::after {
  position: absolute;
  content: "✖";
  color: red;
  padding-left: 5px;
}
.cliff {
  color: #00aa00;
}
.doubledouble {
  color: #0000aa;
}
/* .turnDelta {
  font-size: smaller;
} */
/* .turnDelta.empty, .turnHits.empty {
  color: grey;
} */
</style>
