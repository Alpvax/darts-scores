import { getFirestore, Unsubscribe, DocumentReference, doc, onSnapshot } from "firebase/firestore";
import { defineStore } from "pinia";
import { Ref, computed, reactive } from "vue";
import {
  DBPlayer, LoadedPlayer, Player,
  isLoadedPlayer, isPlayer, loadedPlayer, partialPlayer,
} from ".";

export const usePlayerStore = defineStore("onDemandPlayers", () => {
  const db = getFirestore();

  const playerRef = (pid: string): DocumentReference => doc(db, "players", pid);

  const players = reactive(new Map<string, LoadedPlayer>());
  const loadingPlayers = new Map<string, Promise<LoadedPlayer>>();
  const subscriptions = new Map<string, Unsubscribe>();

  const getImmediatePlayer = (playerId: string): Ref<Player> => computed(() => {
    const p = players.get(playerId);
    return isPlayer(p) ? p : partialPlayer(playerId);
  });
  const loadPlayer = (playerId: string): Ref<Player> => {
    if (!subscriptions.has(playerId)) {
      loadingPlayers.set(playerId, new Promise((resolve, reject) => {
        subscriptions.set(playerId, onSnapshot(playerRef(playerId), (snapshot) => {
          if (snapshot.exists()) {
            const p = loadedPlayer(playerId, snapshot.data() as DBPlayer);
            players.set(playerId, p);
            if (players.get(playerId) instanceof Promise) {
              resolve(p);
            }
          } else {
            reject("nonexistent player");
            // Keep rejected promise
          }
        }));
      }));
    }
    return getImmediatePlayer(playerId);
  };
  const getLoadedPlayer = async (playerId: string): Promise<LoadedPlayer> => {
    const p = players.get(playerId);
    if (p === undefined) {
      const p = loadPlayer(playerId).value;
      return isLoadedPlayer(p) ? p : await loadingPlayers.get(playerId)!;
    }
    return isPlayer(p) ? p : await p;
  };
  return {
    loadPlayer,
    getLoadedPlayer,
    getImmediatePlayer,
    players,
    getPlayers: (playerIds: string[]) => computed(() => playerIds.map(loadPlayer)),
  };
});
