import {
  collection, getDocs, getFirestore,
  orderBy, query, where,
} from "firebase/firestore";
import { defineStore } from "pinia";
import { ref, watchEffect, computed } from "vue";
import { usePlayerStore } from "./player";
import { PlayerGameResult27, Result27 } from "@/games/27";

export const use27History = defineStore("history27", () => {
  const db = getFirestore();
  const gamesRef = collection(db, "game/twentyseven/games");

  const playerStore = usePlayerStore();

  const today = new Date();
  const toDate = ref(today.toISOString().slice(0, 10));
  const fromDate = ref(`${today.getFullYear()}-01-01`);
  const games = ref([] as (Result27 & { gameId: string })[]);
  watchEffect(async (): Promise<void> => {
    games.value = [];
    if (fromDate.value <= toDate.value && new Date(fromDate.value) <= today) {
      const td = new Date(toDate.value);
      td.setDate(td.getDate() + 1);
      (await getDocs(query(gamesRef,
        orderBy("date", "desc"),
        where("date", ">=", fromDate.value),
        where("date", "<=", td.toISOString().slice(0, 10)),
      ))).forEach(async (d) => {
        const gameData = Object.assign({ gameId: d.id } , d.data() as Result27);
        games.value.push(gameData);
        await Promise.all(Object.keys(gameData.game).map(playerStore.getPlayerAsync));
      });
    } else {
      //TODO display error
    }
  });

  const scores = computed(() => games.value.reduce((scores, game) => {
    for (const id in scores) {
      scores[id].push(Object.hasOwn(game.game, id) ? game.game[id] : null);
    }
    return scores;
  }, playerStore.allPlayerIds.reduce((o, pid) => {
    o[pid] = [];
    return o;
  }, {} as { [k: string]: (PlayerGameResult27 | null)[] })));

  const allPlayers = computed(() => playerStore.allPlayersOrdered
    .filter(p => scores.value[p.id].filter(s => s).length > 0));

  return {
    allPlayers,
    toDate, fromDate,
    setToDate: (date: string) => toDate.value = date,
    setFromDate: (date: string) => fromDate.value = date,
    games,
    scores,
  };
});
