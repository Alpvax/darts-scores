import {
  collection, doc, DocumentReference, DocumentSnapshot,
  getDoc, getDocs, getFirestore,
} from "firebase/firestore";
import { defineStore } from "pinia";
import { computed, ComputedRef, reactive } from "vue";

export type LoadedPlayer = {
  name: string;
  id: string;
  defaultOrder: number;
  disabled: boolean;
  loaded: true;
}
type PartialPlayer = {
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
  const playerRef = (pid: string): DocumentReference => doc(db, "players", pid);

  const players = reactive(new Map<string, LoadedPlayer | Promise<LoadedPlayer>>());
  const onData = (data: DocumentSnapshot): LoadedPlayer => {
    const disabled = data.get("disabled") || false;
    const p: LoadedPlayer = {
      name: data.get("funName") as string,
      id: data.id,
      defaultOrder: data.get("defaultOrder") as number + (disabled ? 100 : 0),
      disabled,
      loaded: true,
    };
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
    return isLoadedPlayer(p) ? p : { id: pid, loaded: false };
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
    getName: (pid: string) => {
      const p = getPlayer(pid);
      return p.name ?? pid;
    },
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
