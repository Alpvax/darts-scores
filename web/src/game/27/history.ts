import type { GameResult, PlayerDataForStats } from "@/gameUtils/summary";
import { gameMeta, type TurnData27 } from "../27";
import { makeGameResultFactory, makePlayerPositions } from "@/gameUtils/playerData";
import {
  QuerySnapshot,
  Timestamp,
  addDoc,
  collection,
  getFirestore,
  limit,
  onSnapshot,
  orderBy,
  query,
  where,
  type Unsubscribe,
} from "firebase/firestore";
import { computed, reactive, ref, watch } from "vue";
import { defineStore } from "pinia";
import { usePlayerConfig } from "@/config/playerConfig";

type Result27v1 = {
  dataVersion: 1;
  date: string;
  winner:
    | string
    | {
        tie: string[];
        tiebreak: {
          //TODO: implement tiebreak
          winner?: string;
          // [k: string | number]: any;
        };
      };
  game: {
    [player: string]: {
      rounds: number[];
      cliffs: number;
      score: number;
      allPositive: boolean;
      jesus?: boolean;
      fnAmnesty?: boolean;
      handicap?: number;
    };
  };
};

type Result27v2 = {
  dataVersion: 2;
  date: Timestamp;
  /** Players in order of play */
  players: string[];
  winner:
    | string
    | {
        tie: string[];
        tiebreak: {
          type: string;
          winner: string;
        };
      };
  game: {
    [player: string]: {
      rounds: (number | undefined)[];
      score: number;
      jesus?: boolean;
      handicap?: number;
      displayName?: string;
    };
  };
};

// const databaseAdapter: FirestoreDataConverter<GameResult<TurnData27>, Result27> = {
//   toFirestore: (gameResult) => {
//     const result: WithFieldValue<Result27v2> = {
//       version: 2,
//     };
//     if (gameResult.date) {
//       result.date = Timestamp.fromDate(gameResult.date as Date);
//     }
//     if (typeof gameResult.tiebreakWinner === "string") {
//       if (gameResult.results !== undefined) {
//         const winner = (gameResult.results as GameResult<TurnData27>["results"]).get(gameResult.tiebreakWinner)!;
//         result.winner = {
//           tie: winner.tied,
//           tiebreak: {
//             type: "UNKNOWN",
//             winner: gameResult.tiebreakWinner,
//           },
//         };
//       } else {
//         // Partial set
//         result.winner = { tiebreak: { winner: gameResult.tiebreakWinner }};
//       }
//     }
//     if (gameResult.results !== undefined) {
//       result.game = [...gameResult.results as GameResult<TurnData27>["results"]].reduce((acc, [pid, data]) => Object.assign(acc, {
//         [pid]: {
//           rounds: [...data.allTurns.values()].map(t => t.value),
//           score: data.score,
//         }
//       }), {});
//     }
//     return result;
//   },
//   fromFirestore: (snapshot, options) => intoGameResult(snapshot.data(options)! as Result27),
// }

export type Result27 = Result27v1 | Result27v2;

const gameResultFactory = makeGameResultFactory(gameMeta);

export const intoGameResult = (result: Result27): GameResult<TurnData27> => {
  const defaultOrder = usePlayerConfig.getValue("defaultOrder");

  const gameResult: GameResult<TurnData27> = {
    date: result.dataVersion === 2 ? result.date.toDate() : new Date(result.date),
    players:
      result.dataVersion === 2
        ? result.players.map((pid) => ({
            pid,
            displayName: result.game[pid].displayName,
            handicap: result.game[pid].handicap,
          }))
        : Object.keys(result.game)
            .toSorted((a, b) => (defaultOrder[a] ?? 999) - (defaultOrder[b] ?? 999))
            .map((pid) => ({ pid })),
    results: gameResultFactory(
      Object.entries(result.game).map(([pid, { rounds }]) => [pid, rounds]),
    ) as Map<string, PlayerDataForStats<TurnData27>>,
  };
  if (typeof result.winner === "object") {
    gameResult.tiebreakWinner = result.winner.tiebreak.winner;
  }
  return gameResult;
};

export const intoDBResult = <P extends string>(
  gameResult: GameResult<TurnData27, P>,
  extras: {
    players: {
      pid: P;
      displayName?: string;
      handicap?: number;
      jesus?: boolean;
    }[];
    tiebreakType?: string;
  },
): Result27v2 => {
  const { game, players } = extras.players.reduce(
    ({ game, players }, { pid, displayName, handicap, jesus }) => {
      players.push(pid);
      const data = gameResult.results.get(pid)!;
      const pRes: Result27v2["game"][string] = {
        rounds: Array.from({ length: 20 }, (_, i) => data.allTurns.get(i)?.value),
        score: data.score,
      };
      if (displayName && displayName.length > 0) {
        pRes.displayName = displayName;
      }
      if (handicap !== undefined) {
        pRes.handicap = handicap;
      }
      if (jesus !== undefined) {
        pRes.jesus = jesus;
      }
      return {
        game: Object.assign(game, { [pid]: pRes }),
        players,
      };
    },
    {
      game: {} as Result27v2["game"],
      players: [] as string[],
    },
  );
  let winner: Result27v2["winner"];
  if (gameResult.tiebreakWinner !== undefined) {
    winner = {
      tie: [gameResult.tiebreakWinner, ...gameResult.results.get(gameResult.tiebreakWinner)!.tied],
      tiebreak: {
        type: extras.tiebreakType ?? "UNKNOWN",
        winner: gameResult.tiebreakWinner,
      },
    };
  } else {
    const orderedPos = makePlayerPositions(
      ref(new Map(extras.players.map(({ pid }) => [pid, game[pid].score]))),
      gameMeta.positionOrder,
    ).playerPositions.value.ordered;
    if (orderedPos.length < 1) {
      console.error("Unable to get first player position!", game);
      winner = "ERROR: No first place player";
    } else {
      const first = orderedPos[0].players;
      switch (first.length) {
        case 0:
          console.error("IMPOSSIBLE: No players in first place!", orderedPos[0]);
          winner = "ERROR: No first place player";
          break;
        case 1:
          winner = first[0];
          break;
        default:
          winner = {
            tie: first,
            tiebreak: {
              type: extras.tiebreakType ? `UNPLAYED ${extras.tiebreakType} tiebreak` : "UNPLAYED",
              winner: "NO TIEBREAK PLAYED!",
            },
          };
          break;
      }
    }
  }
  return {
    dataVersion: 2,
    date: Timestamp.fromDate(gameResult.date),
    players,
    winner,
    game,
  };
};

export const use27History = defineStore("27History", () => {
  const db = getFirestore();
  const gamesRef = collection(db, "game/twentyseven/games");

  const today = new Date();
  const toDate = ref(today.toISOString().slice(0, 10));
  const fromDate = ref(`${today.getFullYear()}-01-01`);

  let subscriptions: Unsubscribe[] = [];
  const games = reactive(new Map<string, GameResult<TurnData27>>());

  const handleSnapshot = (snapshot: QuerySnapshot, isDebugGame?: boolean) =>
    snapshot.docChanges().forEach(async (change) => {
      const gameId = change.doc.id;
      if (change.type === "removed") {
        games.delete(gameId);
      } else {
        const data = change.doc.data() as Result27;
        const gameData = intoGameResult(data);
        if (isDebugGame) {
          gameData.isDebugGame = true;
        }
        games.set(gameId, gameData);
      }
    });

  watch(
    [fromDate, toDate],
    async ([fromDate, toDate], _, onCleanup): Promise<void> => {
      onCleanup(() => {
        subscriptions.forEach((unsub) => unsub());
        subscriptions = [];
        console.debug("[cleanup] Refreshed history subscriptions");
      });
      games.clear();
      if (subscriptions.length > 0) {
        subscriptions.forEach((unsub) => unsub());
        subscriptions = [];
        console.debug("Refreshed history subscriptions"); //XXX
      }
      const fd = new Date(fromDate);
      if (fromDate <= toDate && fd <= today) {
        const td = new Date(toDate);
        td.setDate(td.getDate() + 1);
        console.debug(
          `Updating history date range: From = ${fd.toISOString().slice(0, 10)}, To = ${td.toISOString().slice(0, 10)}`,
        ); //XXX
        // Version 1 results
        subscriptions.push(
          onSnapshot(
            query(
              gamesRef,
              where("dataVersion", "==", 1),
              orderBy("date", "desc"),
              where("date", ">=", fromDate),
              where("date", "<=", td.toISOString().slice(0, 10)),
            ),
            handleSnapshot,
          ),
        );
        // Version 2 results
        subscriptions.push(
          onSnapshot(
            query(
              gamesRef,
              where("dataVersion", "==", 2),
              orderBy("date", "desc"),
              where("date", ">=", Timestamp.fromDate(fd)),
              where("date", "<=", Timestamp.fromDate(td)),
            ),
            handleSnapshot,
          ),
        );
        if (import.meta.env.DEV) {
          subscriptions.push(
            onSnapshot(
              query(collection(db, "27testgames"), orderBy("date", "desc"), limit(50)),
              (s) => handleSnapshot(s, true),
            ),
          );
        }
      } else {
        console.warn("toDate is earlier than fromDate!");
      }
    },
    {
      immediate: true,
    },
  );

  return {
    toDate,
    fromDate,
    dateError: computed(() =>
      toDate.value < fromDate.value
        ? "Start date is greater than end date"
        : fromDate.value > today.toISOString().slice(0, 10)
          ? "Start date is later than the current date"
          : null,
    ),
    games: computed(
      () =>
        [...games]
          .map(([gameId, game]) => Object.freeze({ gameId, ...game }))
          .toSorted(({ date: a }, { date: b }) =>
            a > b ? -1 : a < b ? 1 : 0,
          ) as (GameResult<TurnData27> & { gameId: string })[],
    ),
    allPlayers: computed(() =>
      [...games.values()].reduce((s, { players }) => {
        players.forEach(({ pid }) => s.add(pid));
        return s;
      }, new Set<string>()),
    ),
    saveGame: async (result: Result27) => {
      await addDoc(
        collection(db, import.meta.env.DEV ? "27testgames" : "game/twentyseven/games"),
        result,
      );
    },
  };
});
