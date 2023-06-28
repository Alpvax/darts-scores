import { usePrefs } from "@/clientPreferences";
import {
  collection, doc, DocumentReference, DocumentSnapshot,
  getDoc, getDocs, getFirestore,
} from "firebase/firestore";
import { defineStore } from "pinia";
import { computed, ComputedRef, reactive, ref, Ref } from "vue";

export type LoadedPlayer = {
  name: Ref<string>;
  id: string;
  defaultOrder: number;
  disabled: boolean;
  guest: boolean;
  loaded: true;
}
type PartialPlayer = {
  name: Ref<string>;
  id: string;
  loaded: false;
} & Partial<Omit<LoadedPlayer, "id" | "loaded">>;

export type Player = LoadedPlayer | PartialPlayer;

const isPlayer = (p?: Player | Promise<Player>): p is Player =>
  p ? Object.hasOwn(p, "loaded") : false;
const isLoadedPlayer = (p?: Player | Promise<Player>): p is LoadedPlayer =>
  isPlayer(p) && p.loaded;

export const usePlayerStore = defineStore("players", () => {
  const db = getFirestore();
  const preferences = usePrefs();
  const playerRef = (pid: string): DocumentReference => doc(db, "players", pid);

  const players = reactive(new Map<string, LoadedPlayer | Promise<LoadedPlayer>>());
  const onData = (data: DocumentSnapshot): LoadedPlayer => {
    const disabled = data.get("disabled") || false;
    const __trueName = data.get("name") as string ?? data.id;
    const funNames = data.get("funNames") as string[]
      ?? [data.get("funName") as string ?? __trueName];
    const funIdx = computed(() => funNames.length > 1
      ? Math.floor(Math.random() * funNames.length)
      : 0);
    const p: LoadedPlayer = Object.assign(
      {
        __trueName,
        funIdx,
        funNames,
        name: computed(() => preferences.useFunNames ? funNames[funIdx.value] : __trueName),
      }, {
        id: data.id,
        defaultOrder: data.get("defaultOrder") as number + (disabled ? 100 : 0),
        disabled,
        guest: data.get("guest") ?? false,
        loaded: true as true,
      },
    );
    if (preferences.debug.debugLoadedPlayers) {
      console.log("Loaded player:", p, __trueName, funNames);
    }
    players.set(p.id, p);
    return p;
  };
  const loadRef = async (d: DocumentReference): Promise<LoadedPlayer> => {
    let p = players.get(d.id);
    if (!p) {
      p = onData(await getDoc(d));
    }
    return p;
  };
  const loadPlayer = async (pid: string): Promise<LoadedPlayer> => await loadRef(playerRef(pid));
  const getPlayer = (pid: string, load = true): Player => {
    if (load && !players.has(pid)) {
      players.set(pid, loadPlayer(pid));
    }
    const p = players.get(pid);
    return isLoadedPlayer(p) ? p : { id: pid, loaded: false, name: ref(pid) };
  };
  const allPlayersOrdered = computed(() => {
    const arr = [...players.values()].filter(isLoadedPlayer);
    arr.sort((a, b) => a.defaultOrder - b.defaultOrder);
    return arr;
  });
  return {
    getPlayer,
    getPlayerAsync: async (pid: string): Promise<LoadedPlayer> => {
      const p = getPlayer(pid, true);
      return isLoadedPlayer(p) ? p : await (players.get(pid) as Promise<LoadedPlayer>);
    },
    getName: (pid: string) => getPlayer(pid).name,
    loadAllPlayers: async (): Promise<ComputedRef<LoadedPlayer[]>> => {
      (await getDocs(collection(db, "players"))).forEach(onData);
      return allPlayersOrdered;
    },
    getDefaultPlayers: async (gameType: string): Promise<LoadedPlayer[]> => {
      const docs = (await getDoc(doc(getFirestore(), "game", gameType)))
        .get("defaultplayers") as DocumentReference[];
      return Promise.all(docs.map(loadRef));
    },
    allPlayerIds: computed(() => [...players.keys()]),
    allPlayersOrdered,
    availablePlayers: computed(() => allPlayersOrdered.value.filter(p => !p.disabled)),
  };
});
