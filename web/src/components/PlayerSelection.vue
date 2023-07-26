<template>
  <fieldset class="playerSelection">
    <legend>{{ legend }}</legend>

    <div
      v-for="{ name, id } in availablePlayers"
      :key="id"
      class="playerCheckbox"
    >
      <input
        :id="'select_' + id"
        v-model="players"
        type="checkbox"
        :name="name.value"
        :value="id"
        @change="e => onCheckboxChange(id, (e.target! as HTMLInputElement).checked)"
      >
      <label :for="'select_' + id">{{ name ?? id }}</label>
    </div>
    <select
      v-if="allowGuests
        && (guestGroups.groups.size > 0 || guestGroups.ungrouped.length > 0)"
      v-model="addGuest"
      name="guestAdd"
    >
      <option
        value=""
        disabled
      >
        Select to add a guest player
      </option>
      <!-- If there is only a single group, omit the label -->
      <template v-if="guestGroups.groups.size == 1 && guestGroups.ungrouped.length < 1">
        <option
          v-for="[id, name] in guestGroups.groups.values().next().value"
          :key="id"
          :value="id"
        >
          {{ name }}
        </option>
      </template>
      <template v-else>
        <optgroup
          v-for="[groupName, group] in guestGroups.groups"
          :key="groupName"
          :label="groupName"
        >
          <option
            v-for="[id, name] in group"
            :key="id"
            :value="id"
          >
            {{ name }}
          </option>
        </optgroup>
        <option
          v-for="[id, name] in guestGroups.ungrouped"
          :key="id"
          :value="id"
        >
          {{ name }}
        </option>
      </template>
    </select>
  </fieldset>
</template>

<script lang="ts">
import { Player, usePlayerStore } from "@/store/player";
import { computed, customRef, defineComponent, PropType, Ref, ref } from "vue";

export default defineComponent({
  props: {
    legend: { type: String, required: true },
    available: { type: Array as PropType<(Player | string)[]>, required: true },
    modelValue: { type: Array as PropType<string[] | null>, default: null },
    allowGuests: { type: Boolean, default: false },
  },
  emits: [ "update:player", "update:modelValue" ],
  async setup(props, { emit }) {
    const playerStore = usePlayerStore();
    const allPlayers = computed(() =>
      props.available.map(p => typeof p === "object" ? p : playerStore.getPlayer(p)));
    const guests = ref(new Set<string>(props.modelValue !== null
      ? allPlayers.value.flatMap(({ id, guest }) => guest && props.modelValue!.includes(id)
        ? [id]
        : [])
      : []));
    const availablePlayers = computed(() =>
      allPlayers.value.filter(({ id, guest }) => !guest || guests.value.has(id)));
    const players = ref(props.modelValue
      ?? props.available.map(p => typeof p === "object" ? p.id :p));
    const sendUpdate = (playerId: string, checked: boolean): void => {
      emit("update:player", playerId, checked);
      emit("update:modelValue", players.value);
    };
    return {
      allPlayers,
      availablePlayers,
      players,
      date: ref((new Date()).toISOString().slice(0, 16)),
      onCheckboxChange: sendUpdate,
      guestGroups: computed(() =>
        allPlayers.value.reduce((acc, { id, name, guest, guestLabel }) => {
          if (guest && !guests.value.has(id)) {
            if (guestLabel) {
              if (!acc.groups.has(guestLabel)) {
                acc.groups.set(guestLabel, [[id, name]]);
              } else {
                acc.groups.get(guestLabel)!.push([id, name]);
              }
            } else {
              acc.ungrouped.push([id, name]);
            }
          }
          return acc;
        }, {
          groups: new Map<string, [string, Ref<string>][]>(),
          ungrouped: [] as [string, Ref<string>][],
        })),
      guests,
      addGuest: customRef((track, trigger) => ({
        get: () => {
          track();
          return "";
        },
        set: (pid: string) => {
          guests.value.add(pid);
          players.value.push(pid);
          sendUpdate(pid, true);
          trigger();
        },
      })),
    };
  },
});
</script>

<style scoped>
fieldset.playerSelection {
  display: inline-block;
}
.playerSelection > .playerCheckbox {
  display: inline;
  padding: 0px 10px;
}
</style>
