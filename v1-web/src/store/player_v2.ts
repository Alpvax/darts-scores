import { Unsubscribe } from "@firebase/util";
import {
  collection, doc, DocumentReference, DocumentSnapshot,
  getDoc, getDocs, getFirestore, onSnapshot,
} from "firebase/firestore";
import { defineStore } from "pinia";
import { computed, reactive } from "vue";

export type Player = {
  name: string;
  id: string;
  defaultOrder: number;
}

export const usePlayerStore = defineStore("players", async () => {
  const db = getFirestore();

  const players = reactive(new Map<string, Player>());
  const onData = (data: DocumentSnapshot): Player => {
    const p: Player = {
      name: data.get("funName") as string,
      id: data.id,
      defaultOrder: data.get("defaultOrder") as number,
    };
    players.set(p.id, p);
    return p;
  };

  (await getDocs(collection(db, "players"))).forEach(onData);
  let allPlayersSubscription: Unsubscribe | null = null;
  const listenAllPlayers = (): void => {
    if (!allPlayersSubscription) {
      allPlayersSubscription = onSnapshot(collection(db, "players"), (docs) => {
        docs.docChanges().forEach((change) => {
          if (change.type === "removed") {
            players.delete(change.doc.id);
          } else {
            onData(change.doc);
          }
        });
      });
    }
  };

  const getPlayer = (pid: string): Player => players.get(pid) ||
    { id: pid, name: pid, defaultOrder: players.size };
  // const getPlayer = (pid: string): Player => {
  //   if (!players.has(pid)) {
  //     players.set(pid, loadPlayer(pid));
  //   }
  //   const p = players.get(pid);
  //   return isPlayer(p) ? p : { id: pid, loaded: false };
  // };
  const allPlayersOrdered = computed(() => {
    const arr = [...players.values()];
    arr.sort((a, b) => a.defaultOrder - b.defaultOrder);
    return arr;
  });
  return {
    getPlayer,
    getName: (pid: string) => {
      return getPlayer(pid).name;
    },
    listenAllPlayers,
    getDefaultGamePlayers: async (gameType: string): Promise<[Player[], string[]]> => {
      return [
        allPlayersOrdered.value,
        ((await getDoc(doc(getFirestore(), "game", gameType)))
          .get("defaultplayers") as DocumentReference[])
          .map(d => d.id),
      ];
    },
    allPlayerIds: computed(() => [...players.keys()]),
    allPlayersOrdered,
  };
});
