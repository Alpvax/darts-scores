import { getFirestore, Unsubscribe, DocumentReference, doc, onSnapshot } from "firebase/firestore";
import { defineStore } from "pinia";
import { computed, reactive } from "vue";
import {
  DBPlayer, LoadedPlayer, Player,
  isLoadedPlayer, isPlayer, loadedPlayer, partialPlayer,
} from ".";

export const usePlayerStore = defineStore("players", () => {
  const db = getFirestore();

  const playerRef = (pid: string): DocumentReference => doc(db, "players", pid);

  const players = reactive(new Map<string, LoadedPlayer | Promise<LoadedPlayer>>());
  const subscriptions = reactive(new Map<string, Unsubscribe>());

  const getImmediatePlayer = (playerId: string): Player => {
    const p = players.get(playerId);
    return isPlayer(p) ? p : partialPlayer(playerId);
  };
  const loadPlayer = (playerId: string): Player => {
    if (!subscriptions.has(playerId)) {
      players.set(playerId, new Promise((resolve, reject) => {
        subscriptions.set(playerId, onSnapshot(playerRef(playerId), (snapshot) => {
          if (snapshot.exists()) {
            const p = loadedPlayer(playerId, snapshot.data() as DBPlayer);
            if (players.get(playerId) instanceof Promise) {
              resolve(p);
            }
            players.set(playerId, p);
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
      const p = loadPlayer(playerId);
      return isLoadedPlayer(p) ? p : await players.get(playerId)!;
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
