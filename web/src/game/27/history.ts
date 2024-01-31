import type { GameResult, PlayerDataForStats } from "@/gameUtils/summary";
import { gameMeta, type TurnData27 } from "../27";
import { makeGameResultFactory, makePlayerPositions } from "@/gameUtils/playerData";
import { Timestamp } from "firebase/firestore";
import { ref } from "vue";

type Result27v1 = {
  version?: 1;
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
  version: 2;
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
  const gameResult: GameResult<TurnData27> = {
    date: result.version === 2 ? result.date.toDate() : new Date(result.date),
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
    version: 2,
    date: Timestamp.fromDate(gameResult.date),
    players,
    winner,
    game,
  };
};
