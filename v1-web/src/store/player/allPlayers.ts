import {
  collection, doc, DocumentReference,
  getDoc, getFirestore, onSnapshot, query, Unsubscribe,
} from "firebase/firestore";
import { defineStore } from "pinia";
import { computed, reactive, ref, Ref, watchEffect } from "vue";
import { DBPlayer, isLoadedPlayer, loadedPlayer, LoadedPlayer, Player } from ".";

export const usePlayerStore = defineStore("allPlayers", () => {
  const db = getFirestore();
  const playersRef = collection(db, "players");

  let subscription: Unsubscribe | null = null;
  // const playerRef = (pid: string): DocumentReference => doc(db, "players", pid);

  const players = reactive(new Map<string, LoadedPlayer>());

  watchEffect((): void => {
    players.clear();
    if (subscription) {
      subscription();
    }
    subscription = onSnapshot(
      query(
        playersRef,
        // orderBy("defaultOrder", "asc"),
      ),
      snapshot => snapshot.docChanges().forEach(async (change) => {
        const d = change.doc;
        switch (change.type) {
          case "added":
          case "modified":
            const p = loadedPlayer(d.id, d.data() as DBPlayer);
            players.set(p.id, p);
            break;
          case "removed":
            players.delete(d.id);
            break;
        }
      }),
    );
  });

  const allPlayersOrdered = computed(() => {
    const arr = [...players.values()].filter(isLoadedPlayer);
    arr.sort((a, b) => a.defaultOrder - b.defaultOrder);
    return arr;
  });
  const getPlayer = (pid: string): Player =>
    players.get(pid) ?? { id: pid, loaded: false, name: ref(pid).value };
  return {
    getPlayer,
    getName: (pid: string) => getPlayer(pid).name,
    getDefaultPlayers: async (gameType: string): Promise<Ref<Player>[]> => {
      const docs = (await getDoc(doc(getFirestore(), "game", gameType)))
        .get("defaultplayers") as DocumentReference[];
      return Promise.all(docs.map(({ id }) => computed(() => getPlayer(id))));
    },
    allPlayerIds: computed(() => [...players.keys()]),
    allPlayersOrdered,
    availablePlayers: computed(() => allPlayersOrdered.value.filter(p => !p.disabled)),
  };
});
