import { computed, ref } from "vue";
import { usePrefs } from "../clientPreferences";

export { usePlayerStore as allPlayerStore, usePlayerStore } from "./allPlayers";
export { usePlayerStore as onDemandPlayerStore } from "./onDemand";


export type DBPlayer = {
  name: string;
  funName?: string;
  funNames?: string[];
  defaultOrder: number;
  guest?: boolean;
  guestLabel?: string;
  disabled?: boolean;
  handicap?: number;
}

export type LoadedPlayer = {
  // name: Ref<string>;
  name: string;
  id: string;
  defaultOrder: number;
  disabled: boolean;
  guest: boolean;
  guestLabel?: string;
  loaded: true;
  handicap: number;
}
type PartialPlayer = {
  // name: Ref<string>;
  name: string;
  id: string;
  loaded: false;
} & Partial<Omit<LoadedPlayer, "id" | "loaded">>;

export type Player = LoadedPlayer | PartialPlayer;

export const isPlayer = (p?: Player | Promise<Player>): p is Player =>
  p ? Object.hasOwn(p, "loaded") : false;
export const isLoadedPlayer = (p?: Player | Promise<Player>): p is LoadedPlayer =>
  isPlayer(p) && p.loaded;

export const partialPlayer = (playerId: string): PartialPlayer =>
  ({ id: playerId, loaded: false, name: ref(playerId).value });

export const loadedPlayer = (
  playerId: string,
  data: DBPlayer,
  clientPreferences?: ReturnType<typeof usePrefs>,
): LoadedPlayer => {
  // Will only work if called inside vue components
  const preferences = clientPreferences ?? usePrefs();
  const disabled = data.disabled || false;
  const __trueName = data.name ?? playerId;
  const funNames = data.funNames
    ?? [data.funName ?? __trueName];
  const funIdx = computed(() => funNames.length > 1
    ? Math.floor(Math.random() * funNames.length)
    : 0);
  const p = Object.assign(
    {
      __trueName,
      funIdx,
      funNames,
      name: computed(() => preferences.useFunNames ? funNames[funIdx.value] : __trueName).value,
    }, {
      id: playerId,
      defaultOrder: data.defaultOrder + (disabled ? 100 : 0),
      disabled,
      guest: data.guest ?? false,
      loaded: true as true,
      handicap: data.handicap ?? 0,
    },
  );
  if (data.guestLabel) {
    (p as LoadedPlayer).guestLabel = data.guestLabel;
  }
  if (preferences.debug.debugLoadedPlayers) {
    console.log("Loaded player:", p, p.__trueName, p.funNames);
  }
  return p;
};
