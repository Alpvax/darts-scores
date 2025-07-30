import {
  collection,
  doc,
  DocumentReference,
  getFirestore,
  Timestamp,
  type DocumentSnapshot,
  type FirestoreDataConverter,
  type SnapshotOptions,
} from "firebase/firestore";
import type { DatabaseAdapter } from "@/gameDefinitionV2/definition";
import { usePlayerConfig } from "@/config/playerConfig";
import { mapObjectValues } from "@/utils";
import type { ArrayTurnDataType, PlayerDataRaw } from "@/gameDefinitionV2/types";
import type { NumericRange } from "@/utils/types";
import type { GameResult } from "@/gameDefinitionV2/gameResult";

type DBResultv1 = {
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
const parseV1Result = (snapshot: DocumentSnapshot, options: SnapshotOptions): RawGameResult27 => {
  if ((snapshot.get("dataVersion", options) ?? 1) !== 1) {
    throw new Error(
      `Attempted to parse non-v1 game result as a v1 result. doc : ${snapshot.ref.path}, data: ${JSON.stringify(snapshot.data(options))}`,
    );
  }
  const resultV1 = snapshot.data(options) as DBResultv1;
  const defaultOrder = usePlayerConfig.getValue("defaultOrder");

  const result: RawGameResult27 = {
    date: new Date(resultV1.date),
    playerOrder: Object.keys(resultV1.game)
      .toSorted((a, b) => (defaultOrder[a] ?? 999) - (defaultOrder[b] ?? 999))
      .map((pid) => pid),
    results: Object.entries(resultV1.game).reduce(
      (acc, [pid, pData]) =>
        Object.assign(acc, {
          [pid]: {
            startScore: 27,
            completed: pData.rounds.length === 20 && pData.rounds.every((v) => v !== undefined),
            turns: pData.rounds,
            jesus: pData.jesus,
          },
        }),
      {} as RawGameResult27["results"],
    ),
  };
  return result;
};

type DBResultv2 = {
  dataVersion: 2;
  date: Timestamp;
  /** Player ids in order of play */
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
const parseV2Result = (snapshot: DocumentSnapshot, options: SnapshotOptions): RawGameResult27 => {
  if ((snapshot.get("dataVersion", options) ?? 1) !== 1) {
    throw new Error(
      `Attempted to parse non-v1 game result as a v1 result. doc : ${snapshot.ref.path}, data: ${JSON.stringify(snapshot.data(options))}`,
    );
  }
  const resultV2 = snapshot.data(options) as DBResultv2;

  const result: RawGameResult27 = {
    date: resultV2.date.toDate(),
    playerOrder: resultV2.players,
    results: Object.entries(resultV2.game).reduce(
      (acc, [pid, pData]) =>
        Object.assign(acc, {
          [pid]: {
            startScore: 27 + (pData.handicap ?? 0),
            completed: pData.rounds.length === 20 && pData.rounds.every((v) => v !== undefined),
            turns: pData.rounds,
            jesus: pData.jesus,
            displayName: pData.displayName,
          },
        }),
      {} as RawGameResult27["results"],
    ),
  };
  return result;
};

type DBResultv3 = {
  dataVersion: 3;
  timestamp: Timestamp;
  /** Player ids in order of play */
  players: string[];
  tiebreak?: {
    players: string[];
    type: string;
    winner: string;
  };
  game: {
    [player: string]: {
      rounds: (number | undefined)[];
      displayName?: string;
      jesus?: boolean;
      startScore?: number;
      //TODO: implement additional handicap?
      // handicap?: number;
    };
  };
};
const parseV3Result = (snapshot: DocumentSnapshot, options: SnapshotOptions): RawGameResult27 => {
  if ((snapshot.get("dataVersion", options) ?? 1) !== 1) {
    throw new Error(
      `Attempted to parse non-v1 game result as a v1 result. doc: ${snapshot.ref.path}, data: ${JSON.stringify(snapshot.data(options))}`,
    );
  }
  const resultV3 = snapshot.data(options) as DBResultv3;

  const result: RawGameResult27 = {
    date: resultV3.timestamp.toDate(),
    playerOrder: resultV3.players,
    results: Object.entries(resultV3.game).reduce(
      (acc, [pid, pData]) =>
        Object.assign(acc, {
          [pid]: {
            startScore: pData.startScore ?? 27,
            completed: pData.rounds.length === 20 && pData.rounds.every((v) => v !== undefined),
            turns: pData.rounds,
            jesus: pData.jesus,
            displayName: pData.displayName,
          },
        }),
      {} as RawGameResult27["results"],
    ),
  };
  return result;
};

type DBResult = DBResultv1 | DBResultv2 | DBResultv3;
export type RawGameResult27 = GameResult<
  PlayerDataRaw<
    { startScore: number; jesus?: boolean },
    ArrayTurnDataType<NumericRange<4>, any, 20>
  >
>;

export const parseDBResult = (
  snapshot: DocumentSnapshot,
  options: SnapshotOptions,
): RawGameResult27 => {
  const dataVersion = snapshot.get("dataVersion", options) as number | undefined;
  switch (dataVersion) {
    case 1:
      return parseV1Result(snapshot, options);
    case 2:
      return parseV2Result(snapshot, options);
    case 3:
      return parseV3Result(snapshot, options);
    default:
      throw new Error(
        `Unexpected dataVersion: ${dataVersion}. doc: ${snapshot.ref.path}, data: ${JSON.stringify(snapshot.data(options))}`,
      );
  }
};

export const intoDBResult = (gameResult: RawGameResult27): DBResultv3 => {
  const result: DBResultv3 = {
    dataVersion: 3,
    timestamp: Timestamp.fromDate(gameResult.date),
    players: gameResult.playerOrder,
    game: mapObjectValues(gameResult.results, (pData) => ({
      rounds: pData.turns,
      displayName: pData.displayName,
      jesus: pData.jesus,
      startScore: pData.startScore,
    })),
  };
  return result;
};

export const gameDBConverter: FirestoreDataConverter<RawGameResult27, DBResult> = {
  toFirestore: intoDBResult,
  fromFirestore: parseDBResult,
};

export type DBConfig = {
  defaultPlayers: string[];
  requiredPlayers: string[];
};
export const configConverter = (
  db = getFirestore(),
): FirestoreDataConverter<
  DBConfig,
  {
    defaultplayers: DocumentReference[];
    defaultrequired: DocumentReference[];
  }
> => ({
  toFirestore: (model) => ({
    defaultplayers: ((model.defaultPlayers ?? []) as string[]).flatMap((pid) =>
      pid === undefined ? [] : [doc(db, "players", pid)],
    ),
    defaultrequired: ((model.requiredPlayers ?? []) as string[]).flatMap((pid) =>
      pid === undefined ? [] : [doc(db, "players", pid)],
    ),
  }),
  fromFirestore: (snapshot, options) => ({
    defaultPlayers: snapshot.get("defaultplayers", options),
    requiredPlayers: snapshot.get("defaultrequired", options),
  }),
});

export const dbAdapter27 = (db = getFirestore()): DatabaseAdapter<DBConfig, RawGameResult27> => {
  const gameRoot = doc(db, "game/twentyseven").withConverter(configConverter(db));
  return {
    gameRoot,
    gamesCollection: collection(gameRoot, "games").withConverter(gameDBConverter),
  };
};
export default dbAdapter27;
