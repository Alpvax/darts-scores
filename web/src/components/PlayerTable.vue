<template>
  <table class="playerTable">
    <thead>
      <tr>
        <slot name="__column0header">
          <td>&nbsp;</td>
        </slot>
        <th
          v-for="{name, id} in playersIter"
          :key="id"
          class="playerName"
          :colspan="width"
        >
          {{ name ?? id }}
        </th>
      </tr>
    </thead>
    <tbody>
      <tr
        v-for="row in rows.filter(r => r.showIf === undefined || r.showIf.value)"
        :key="row.slotId"
        :class="row.additionalClass"
        @click="onClick(row.slotId, $event)"
      >
        <td class="rowLabel">
          {{ row.label }}
        </td>
        <slot
          v-for="(id, index) in playerIds"
          :key="id"
          class="rowValue"
          :class="{ ['rowValue_' + id]: true }"
          :name="row.slotId"
          :player="id"
          :index="index"
        >
          <td :colspan="width">
            &nbsp;
          </td>
        </slot>
        <slot
          class="tooltip"
          :name="row.slotId + '_tooltip'"
        />
      </tr>
    </tbody>
  </table>
</template>

<script lang="ts">
// import { getPlayerIds, iterPlayers, Player } from "@/util/player";
import { Player, usePlayerStore } from "@/store/player";
import { RowMetadata } from "@/utils/display";
import { computed, defineComponent, PropType } from "vue";

export default defineComponent({
  props: {
    players: { type: Array as PropType<(Player | string)[]>, required: true },
    width: { type: Number, default: 1 },
    rows: { type: Array as PropType<RowMetadata[]>, required: true },
  },
  setup(props) {
    const playerStore = usePlayerStore();
    // const slotIds = computed(() => Object.keys(props.rows));
    return {
      // slotIds,
      onClick: (rowId: string, event: MouseEvent) => {
        let handler = props.rows.find(({ slotId }) => slotId === rowId)?.onClick;
        if (handler) {
          return handler(event);
        }
      },
      playersIter: computed(() =>
        props.players.map(p => typeof p === "object" ? p : playerStore.getPlayer(p))),
      playerIds: computed(() =>
        props.players.map(p => typeof p === "object" ? p.id : p)),
    };
  },
});
</script>

<style>
.playerTable > tbody > tr:hover > .tooltip {
  /* display: none; */
  /* position: absolute; */
  left: 52%;
  /* z-index: 10; */
  /* background-color: bisque; */
  /* padding: 0.2em; */
  /* border: 2px lightslategrey solid; */
  margin-left: 0;
  margin-top: 1.5em;
}
.playerTable > tbody > tr:hover > .tooltip:not(:hover) {
  display: inline-block;
}
</style>
