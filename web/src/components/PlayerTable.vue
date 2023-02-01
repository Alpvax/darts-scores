<template>
  <table>
    <thead>
      <tr>
        <slot name="__column0header">
          <td>&nbsp;</td>
        </slot>
        <td
          v-for="{name, id} in playersIter"
          :key="id"
          class="playerName"
          :colspan="width"
        >
          {{ name }}
        </td>
      </tr>
    </thead>
    <tbody>
      <tr
        v-for="row in rows"
        :key="row.slotId"
      >
        <td class="rowLabel">
          {{ row.label }}
        </td>
        <slot
          v-for="id in playerIds"
          :key="id"
          class="rowValue"
          :class="{ ['rowValue_' + id]: true }"
          :name="row.slotId"
          :player="id"
        >
          <td :colspan="width">
            &nbsp;
          </td>
        </slot>
      </tr>
    </tbody>
  </table>
</template>

<script lang="ts">
import { getPlayerIds, iterPlayers, Player } from "@/util/player";
import { computed, defineComponent, PropType } from "vue";

export type RowMetadata = {
  label: string;
  slotId: string;
  width?: number;
};

export default defineComponent({
  props: {
    players: { type: Array as PropType<Player[]>, required: true },
    width: { type: Number, default: 1 },
    rows: { type: Array as PropType<RowMetadata[]>, required: true },
  },
  setup(props) {
    // const slotIds = computed(() => Object.keys(props.rows));
    return {
      // slotIds,
      playersIter: computed(() => iterPlayers(props.players)),
      playerIds: computed(() => getPlayerIds(props.players)),
    };
  },
});
</script>
