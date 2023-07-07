<template>
  <div class="tooltip">
    Hit in {{ games }} / {{ numGames }} games ({{ gR }}%)<br>
    Total hits: {{ total }} / {{ numDarts }} darts ({{ hitRate }}%)<br>
    Double Doubles: {{ dd }} ({{ ddR }}%)<br>
    Cliffs: {{ cliffs }} ({{ cR }}%)
  </div>
</template>

<script lang="ts">import { computed, defineComponent } from "vue";

export default defineComponent({
  props: {
    player: { type: String, required: true },
    numGames: { type: Number, required: true },
    total: { type: Number, required: true },
    games: { type: Number, required: true },
    dd: { type: Number, required: true },
    cliffs: { type: Number, required: true },
  },
  setup(props) {
    const asFixed = (num: number, precision = 2): number => parseFloat(num.toFixed(precision));
    const numDarts = computed(() => props.numGames * 3);
    return {
      numDarts,
      hitRate: computed(() => asFixed(props.total / numDarts.value * 100)),
      gR: computed(() => asFixed(props.games / props.numGames * 100)),
      ddR: computed(() => asFixed(props.dd / props.numGames * 100)),
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
