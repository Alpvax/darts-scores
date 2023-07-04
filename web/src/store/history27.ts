import {
  collection, getFirestore, onSnapshot,
  orderBy, query, Unsubscribe, where,
} from "firebase/firestore";
import { defineStore } from "pinia";
import { ref, watchEffect, computed, reactive } from "vue";
import { usePlayerStore } from "./player";
import { PlayerGameResult27, Result27 } from "@/games/27";
import { usePrefs } from "./clientPreferences";

type FavouriteTargets = {
  hits: number;
  targets: number[];
}
export type PlayerStats = {
  num: number;
  best: number;
  worst: number;
  sum: number;
  mean: number;
  fn: number;
  cliffs: number;
  cliffR: number;
  dd: number;
  ddR: number;
  goblins: number;
  piranhas: number;
  hans: number;
  allPos: number;
  farDream: number;
  bestHits: number;
  worstHits: number;
  meanHits: number;
  sumHits: number;
  roundData: {
    [r: number]: {
      totalHits: number;
      gamesWithHits: number;
      doubleDoubles: number;
      cliffs: number;
    };
    favourites: {
      /** Most hit numbers, total hits (i.e. up to 3 per game) */
      total: FavouriteTargets;
      /** Most cliffed numbers */
      cliffs: FavouriteTargets;
      /** Most double doubled numbers */
      dd: FavouriteTargets;
      /** Most hit numbers, number of games (i.e. up to 1 per game) */
      games: FavouriteTargets;
    };
  };
}

export const use27History = defineStore("history27", () => {
  const db = getFirestore();
  const gamesRef = collection(db, "game/twentyseven/games");

  const playerStore = usePlayerStore();

  const today = new Date();
  const toDate = ref(today.toISOString().slice(0, 10));
  const fromDate = ref(`${today.getFullYear()}-01-01`);
  let subscription: Unsubscribe | null = null;
  const games = ref([] as (Result27 & { gameId: string })[]);
  const playerStats: { [pid: string]: PlayerStats } = reactive({});
  const addPlayerStats = (pid: string, result: PlayerGameResult27): void => {
    const stats = playerStats[pid] ?? {
      num: 0,
      best: -394,
      worst: 1288,
      sum: 0,
      mean: 0,
      fn: 0,
      cliffs: 0,
      cliffR: 0,
      dd: 0,
      ddR: 0,
      goblins: 0,
      piranhas: 0,
      hans: 0,
      allPos: 0,
      farDream: 0,
      bestHits: 0,
      worstHits: 60,
      meanHits: 0,
      sumHits: 0,
      roundData: {
        bestHits: {
          games: 0,
          total: 0,
        },
        favourites: {
          total: { hits: 0, targets: []},
          games: { hits: 0, targets: []},
          dd: { hits: 0, targets: []},
          cliffs: { hits: 0, targets: []},
        },
        ...Array.from({ length: 20 }, _ => ({
          totalHits: 0,
          gamesWithHits: 0,
          doubleDoubles: 0,
          cliffs: 0,
        })).reduce((obj, round, i) => Object.assign(obj, { [i + 1]: round }), {}),
      },
    };
    const num = stats.num + 1;
    const sum = stats.sum + result.score;
    const cliffs = stats.cliffs + result.cliffs;
    const dd = stats.dd + result.rounds.filter(h => h === 2).length;
    const hits = result.rounds.reduce((a, b) => a + b);
    const sumHits = stats.sumHits + hits;
    const roundData = stats.roundData;
    for (let r = 1; r <= 20; r++) {
      const h = result.rounds[r - 1];
      roundData[r].totalHits += h;
      if (h > 0) {
        roundData[r].gamesWithHits += 1;
        const totalHits = roundData[r].totalHits;
        if (totalHits > roundData.favourites.total.hits) {
          roundData.favourites.total = {
            hits: totalHits,
            targets: [r],
          };
        } else if (totalHits === roundData.favourites.total.hits) {
          roundData.favourites.total.targets.push(r);
        }
        const gamesWithHits = roundData[r].gamesWithHits;
        if (gamesWithHits > roundData.favourites.games.hits) {
          roundData.favourites.games = {
            hits: gamesWithHits,
            targets: [r],
          };
        } else if (gamesWithHits === roundData.favourites.games.hits) {
          roundData.favourites.games.targets.push(r);
        }
      }
      if (h === 2) {
        roundData[r].doubleDoubles += 1;
        const ddH = roundData[r].doubleDoubles;
        if (ddH > roundData.favourites.dd.hits) {
          roundData.favourites.dd = {
            hits: ddH,
            targets: [r],
          };
        } else if (ddH === roundData.favourites.dd.hits) {
          roundData.favourites.dd.targets.push(r);
        }
      }
      if (h === 3) {
        roundData[r].cliffs += 1;
        const c = roundData[r].cliffs;
        if (c > roundData.favourites.cliffs.hits) {
          roundData.favourites.cliffs = {
            hits: c,
            targets: [r],
          };
        } else if (c === roundData.favourites.cliffs.hits) {
          roundData.favourites.cliffs.targets.push(r);
        }
      }
    }
    playerStats[pid] = {
      num,
      best: Math.max(stats.best, result.score),
      worst: Math.min(stats.worst, result.score),
      sum,
      mean: sum / num,
      fn: stats.fn + (result.score == -393 ? 1 : 0),
      cliffs,
      cliffR: cliffs / num,
      dd,
      ddR: dd / num,
      goblins: stats.goblins +
            ((result.rounds.filter(h => h === 2).length + result.cliffs) > 0
              && result.rounds.filter(h => h === 1).length < 1
              ? 1
              : 0),
      piranhas: stats.piranhas + (result.score == -389 ? 1 : 0),
      hans: stats.hans + result.rounds.reduce(([hans, count], hits) => {
        if (hits > 1) {
          count += 1;
          return count >= 3 ? [hans + 1, count] : [hans, count];
        } else {
          return [hans, 0];
        }
      }, [0, 0])[0],
      allPos: stats.allPos + (result.allPositive ? 1 : 0),
      farDream: Math.max(stats.farDream, result.rounds.findIndex(h => h < 1)),
      bestHits: Math.max(stats.bestHits, hits),
      worstHits: Math.min(stats.worstHits, hits),
      meanHits: sumHits / num,
      sumHits,
      roundData,
    };
  };
  watchEffect(async (): Promise<void> => {
    games.value = [];
    if (subscription) {
      subscription();
    }
    if (fromDate.value <= toDate.value && new Date(fromDate.value) <= today) {
      const td = new Date(toDate.value);
      td.setDate(td.getDate() + 1);
      subscription = onSnapshot(
        query(
          gamesRef,
          orderBy("date", "desc"),
          where("date", ">=", fromDate.value),
          where("date", "<=", td.toISOString().slice(0, 10)),
        ),
        snapshot => snapshot.docChanges().forEach(async (change) => {
          if (change.type === "removed") {
            games.value.splice(change.oldIndex, 1);
            //TODO: remove player Stats
          } else {
            const d = change.doc;
            const gameData = Object.assign({ gameId: d.id } , d.data() as Result27);
            if (change.type == "added") {
              games.value.push(gameData);
              Object.entries(gameData.game).forEach(([pid, result]) => addPlayerStats(pid, result));
            } else {
              //TODO: adjust player Stats
              if (change.oldIndex !== change.newIndex) {
                games.value.splice(change.oldIndex, 1).splice(change.newIndex, 0, gameData);
              } else {
                games.value[change.oldIndex] = gameData;
              }
            }
            await Promise.all(Object.keys(gameData.game).map(playerStore.getPlayerAsync));
          }
        }),
      );
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
    summaryPlayers: computed(() => usePrefs().displayGuestSummary
      ? allPlayers.value.filter(({ disabled }) => !disabled)
      : allPlayers.value.filter(({ disabled, guest }) => !disabled && !guest)),
    toDate, fromDate,
    setToDate: (date: string) => toDate.value = date,
    setFromDate: (date: string) => fromDate.value = date,
    games,
    scores,
    playerStats,
  };
});
