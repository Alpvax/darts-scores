<template>
  <fieldset v-context-menu.end="generalPlayerContextMenu" class="playerSelection">
    <legend>{{ legend }}</legend>

    <div
      v-for="{ name, id } in availablePlayers"
      :key="id"
      v-context-menu="nameContextMenuItems(id).value"
      class="playerCheckbox"
    >
      <input
        :id="'select_' + id"
        v-model="players"
        type="checkbox"
        :name="name"
        :value="id"
        @change="(e) => onCheckboxChange(id, (e.target! as HTMLInputElement).checked)"
      />
      <label :for="'select_' + id">{{ name ?? id }}</label>
    </div>
    <select
      v-if="allowGuests && (guestGroups.groups.size > 0 || guestGroups.ungrouped.length > 0)"
      v-model="addGuest"
      name="guestAdd"
    >
      <option value="" disabled>Select to add a guest player</option>
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
          <option v-for="[id, name] in group" :key="id" :value="id">
            {{ name }}
          </option>
        </optgroup>
        <option v-for="[id, name] in guestGroups.ungrouped" :key="id" :value="id">
          {{ name }}
        </option>
      </template>
    </select>
  </fieldset>
</template>

<script lang="ts">
import { LoadedPlayer, usePlayerStore } from "@/stores/player";
import { computed, customRef, defineComponent, type PropType, ref, watch } from "vue";

export default defineComponent({
  props: {
    legend: { type: String, required: true },
    available: { type: Array as PropType<string[]>, required: true },
    modelValue: { type: Array as PropType<string[] | null>, default: null },
    allowGuests: { type: Boolean, default: false },
  },
  emits: ["update:player", "update:modelValue"],
  setup(props, { emit }) {
    const playerStore = usePlayerStore();
    const allPlayers = computed(() => props.available.map((p) => playerStore.getPlayer(p)));
    const guests = ref(
      new Set<string>(
        props.modelValue !== null
          ? allPlayers.value.flatMap((p) =>
              p.loaded && p.guest && props.modelValue!.includes(p.id) ? [p.id] : [],
            )
          : [],
      ),
    );
    const availablePlayers = computed(() =>
      allPlayers.value.filter((p) => (p.loaded && !p.guest) || guests.value.has(p.id)),
    );
    const players = ref(props.modelValue ?? props.available);
    watch(
      () => props.modelValue,
      (val) => {
        if (val) {
          players.value = val;
        }
      },
    );
    const loadedPlayers = computed(
      () => allPlayers.value.filter((p) => p.loaded) as LoadedPlayer[],
    );
    const sendUpdate = (playerId: string, checked: boolean): void => {
      emit("update:player", playerId, checked);
      emit("update:modelValue", players.value);
    };
    return {
      allPlayers,
      availablePlayers,
      players,
      date: ref(new Date().toISOString().slice(0, 16)),
      onCheckboxChange: sendUpdate,
      guestGroups: computed(() =>
        loadedPlayers.value.reduce(
          (acc, { id, name, guest, guestLabel }) => {
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
          },
          {
            groups: new Map<string, [string, string][]>(),
            ungrouped: [] as [string, string][],
          },
        ),
      ),
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
      nameContextMenuItems: (pid: string) =>
        computed(() => {
          const player = playerStore.getPlayer(pid);
          return player.loaded ? player.names.contextMenuItems() : [];
        }),
      generalPlayerContextMenu: computed(() => {
        const themes = availablePlayers.value.flatMap((p) => (p.loaded ? p.names.themes : []));
        return [
          {
            label: "Randomise All Names",
            action: () => {
              availablePlayers.value.forEach((p) => {
                if (p.loaded) {
                  p.names.refreshName();
                }
              });
            },
          },
          ...(themes.length > 0
            ? [
                "separator",
                {
                  label: "Remove Name theme",
                  action: () => {
                    availablePlayers.value.forEach((p) => {
                      if (p.loaded) {
                        p.names.theme = null;
                      }
                    });
                  },
                },
                ...[...new Set(themes)].map((theme) => ({
                  label: `Theme = ${theme}`,
                  action: () => {
                    availablePlayers.value.forEach((p) => {
                      if (p.loaded && p.names.themes.includes(theme)) {
                        p.names.theme = theme;
                      }
                    });
                  },
                })),
              ]
            : []),
        ];
      }),
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
  white-space: nowrap;
}
</style>
