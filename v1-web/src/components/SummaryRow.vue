<template>
  <tr>
    <td class="rowLabel">
      {{ field.label }}
    </td>
    <td
      v-for="(player, index) in players"
      :key="player"
      :colspan="width === 1 ? undefined : width"
      class="rowValue"
      :class="limitClasses(values[player].raw)"
      :data-player="player"
      :data-playerIndex="index"
    >
      {{ values[player].display }}
    </td>
    <div
      v-if="field.tooltip"
      :id="field.id + '_tooltip'"
      class="tooltip"
    >
      {{ field.tooltip! }}
    </div>
  </tr>
</template>
<script lang="ts">
import { SummaryField } from "@/utils/display";
import { PropType, computed, defineComponent } from "vue";

export default defineComponent({
  props: {
    players: { type: Array as PropType<string[]>, required: true },
    width: { type: Number, default: 1 },
    field: { type: Object as PropType<SummaryField>, required: true },
    getter: { type: Function as PropType<(player: string) => number>, required: true },
    limits: { type: Object as PropType<{ [name: string]: number}>, default: () => ({}) },
    display: {
      type: Function as PropType<((value: number) => string) | undefined>,
      default: undefined,
    },
  },
  setup(props) {
    return {
      values: computed(() => props.players.reduce((obj, player) => {
        const raw = props.getter(player);
        const display = props.display ? props.display(raw) : raw;
        obj[player] = { raw, display };
        return obj;
      }, {} as { [player: string]: { raw: number; display: string | number }})),
      limitClasses: computed(() => (value: number) => Object.entries(props.limits)
        .reduce((obj, [className, limit]) => {
          obj[className] = value === limit;
          return obj;
        }, {} as { [className: string]: boolean })),
    };
  },
});
</script>
