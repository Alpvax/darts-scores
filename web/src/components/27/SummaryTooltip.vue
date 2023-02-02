<template>
  <div class="tooltip">
    Total hits: {{ totalHits }} / {{ numDarts }} darts<br>
    Mean hit chance: {{ hitRate }}%<br>
    Double Doubles: {{ doubleDoubles }} ({{ ddR }}%)<br>
    Cliffs: {{ cliffs }} ({{ cR }}%)
  </div>
</template>

<script lang="ts">import { computed, defineComponent } from "vue";

export default defineComponent({
  props: {
    player: { type: String, required: true },
    numGames: { type: Number, required: true },
    totalHits: { type: Number, required: true },
    doubleDoubles: { type: Number, required: true },
    cliffs: { type: Number, required: true },
  },
  setup(props) {
    const asFixed = (num: number, precision = 2): number => parseFloat(num.toFixed(precision));
    const numDarts = computed(() => props.numGames * 3);
    return {
      numDarts,
      hitRate: computed(() => asFixed(props.totalHits / props.numGames * 100)),
      ddR: computed(() => asFixed(props.doubleDoubles / props.numGames * 100)),
      cR: computed(() => asFixed(props.cliffs / props.numGames * 100)),
    };
  },
});
</script>

<style>
/* .tooltip {
  display: none;
}
.roundSummaryCell:hover:after {
  display: absolute;
} */
</style>
