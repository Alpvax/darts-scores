<template>
  <table class="summaryTable playerTable">
    <thead>
      <tr>
        <slot name="__column0header">
          <td>&nbsp;</td>
        </slot>
        <th
          v-for="{name, id} in players"
          :key="id"
          class="playerName"
          :colspan="width"
        >
          {{ name }}
        </th>
      </tr>
    </thead>
    <tbody>
      <slot />
    </tbody>
  </table>
</template>

<script lang="ts">
import { Player } from "@/store/player";
import { PropType, defineComponent } from "vue";

export default defineComponent({
  props: {
    players: { type: Array as PropType<Player[]>, required: true },
    fieldsOrder: { type: Array as PropType<string[]>, default: () => ["pb", "pw", "mean", "wins"]},
    // fields: { type: Object as PropType<SummaryField>, required: true },
  },
  setup(props) {
    return {
      width: 1,
    };
  },
});
</script>

<style>
.tooltip {
  display: none;
  position: absolute;
  z-index: 10;
  background-color: bisque;
  padding: 0.2em;
  border: 2px lightslategrey solid;
  margin-left: -4em;
  margin-top: 1.2em;
}
td:hover > .tooltip:not(:hover) {
  display: inline-block;
}
/* #playerSummary {
  margin-bottom: 4.5em;
} */
.specificRound {
  font-size: small;
}
.summaryTable .rowLabel {
  font-weight: bold;
  text-align: right;
  white-space: nowrap;
}
.summaryValue {
  text-align: center;
}
.summaryTable td.best {
  background-color: #7eff7e;
}
.summaryTable td.worst:not(.best) {
  background-color: #ff7e7e;
}
.summaryTable td.favourite:not(.best) {
  background-color: #ceff7e;
}

</style>
