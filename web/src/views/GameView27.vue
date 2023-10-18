<script setup lang="ts">
import createComponent from "@/components/game/FixedRounds";
const calcScore = (hits: number[]): number =>
  hits.reduce((s, h, i) => s + 2 * (i + 1) * (h <= 0 ? -1 : h), 27);
const RoundBased = createComponent<number[]>({
  positionOrder: "highestFirst",
  startScore: () => 27,
  rounds: Array.from({ length: 20 }, (_, i) => {
    const r = i + 1;
    return {
      label: r.toString(),
      display: (score, delta, hits) => `${score} (${hits.value} hits, delta score = ${delta})`,
      deltaScore: (h, i) => 2 * (i + 1) * (h === undefined || h <= 0 ? -1 : h),
    };
  }),
});
</script>

<template>
  <div>
    <RoundBased
      :players="[
        'y5IM9Fi0VhqwZ6gAjil6',
        '6LuRdib3wFxhbcjjh0au',
        'Gt8I7XPbPWiQ92FGsTtR',
        'jcfFkGCY81brr8agA3g3',
        'jpBEiBzn9QTVN0C6Hn1m',
        'k7GNyCogBy79JE4qhvAj',
      ]"
      :editable="true"
      :displayPositions="'head'"
    />
  </div>
</template>
