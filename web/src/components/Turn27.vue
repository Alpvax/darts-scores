<template>
  <td
    class="turnScore"
    :class="{ taken: hits != null, cliff: hits == 3 }"
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
      @blur="hits = hits ?? 0"
      @keydown="onKey"
      @change="$emit('score', score)"
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
    return {
      hits,
      deltaScore,
      score,
      numfmt: new Intl.NumberFormat("en-GB", { style: "decimal",  signDisplay: "always" }),
      turnHitsEl,
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
          case "Enter":
          case "Tab":
            if (hits.value == null) {
              hits.value = 0;
            }
            break;
          default:
            return;
        }
        event.preventDefault();
        emit("score", score.value);
        turnHitsEl.value!.classList.remove("empty");
        emit("update:hits", hits.value);
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
  color: rgb(160, 160, 160);
}
.hitsInput {
  width: 1.7em;
}
.hitsInput:invalid + span::after {
  position: absolute;
  content: "✖";
  color: red;
  padding-left: 5px;
}
.cliff {
  color: green;
}
/* .turnDelta {
  font-size: smaller;
} */
/* .turnDelta.empty, .turnHits.empty {
  color: grey;
} */
</style>
