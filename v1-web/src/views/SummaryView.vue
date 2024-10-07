<template>
  <SummaryTable
    :players="players"
  >
    <SummaryRow
      :players="playerIds"
      :width="1"
      :field="{ id: 'pb', label: 'PB', }"
      :getter="(p) => history.playerStats[p].best"
      :limits="{ best: 237 }"
    />
  </SummaryTable>
</template>

<script lang="ts">
import { computed, defineComponent } from "vue";
import { use27History } from "@/store/history27";
import SummaryTable from "@/components/Summary.vue";
import SummaryRow from "@/components/SummaryRow.vue";

export default defineComponent({
  components: {
    SummaryTable,
    SummaryRow,
  },
  setup() {
    const history = use27History();
    const players = computed(() => history.allPlayers);
    return {
      players,
      playerIds: computed(() => players.value.map(({ id }) => id)),
      history,
    };
  },
});
</script>
