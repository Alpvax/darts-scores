import type { VNodeChild } from "vue";
import type { GameInstance } from "../gameInstance";
import type { GameResult, PlayerGameData } from "../gameResult";
import { CollectionReference, DocumentReference } from "firebase/firestore";
import type {
  PlayerDataRaw,
  PlayerDataFull,
  CalculatedResult,
  SoloStatsFactory,
  FullStatsFactory,
  PlayerTurnData,
  TurnValueType,
  PlayerDataForSolo,
  PlayerDataSolo,
  TurnMetaType,
  TurnKey,
} from "../types";
import type { Position } from "..";
import type { TurnMeta } from "../rounds";
import { expandRoundStats } from "../summary/roundStats";

type PositionRowLocation = "head" | "body" | "foot" | "none";

export type GameDefinitionT<
  GameType extends string,
  Instance extends GameInstance<any, any, any, any, PlayerId>,
  DBTurns extends {} | [],
  DBExtra extends {} = {},
  PlayerId extends string = string,
> = {
  gameType: GameType;
  createGame(players: PlayerId[]): Instance;
  loadGame(gameResult: GameResult<PlayerGameData<DBTurns, DBExtra>>): Instance;
  config?: any; //TODO: game config?
  mutableGameComponent(
    players: PlayerId[],
    mutable: boolean,
    posRowLocation: PositionRowLocation,
  ): VNodeChild;
  immutableGameComponent(
    gameResult: GameResult<PlayerGameData<DBTurns, DBExtra>>,
    posRowLocation: PositionRowLocation,
  ): VNodeChild;
};

export type DatabaseAdapter<
  Config,
  Result extends GameResult<any, PlayerId>,
  PlayerId extends string = string,
> = {
  gameRoot: DocumentReference<Config>;
  gamesCollection: CollectionReference<Result>;
};

type CachedGameResult<
  DBResult extends GameResult<any, PlayerId>,
  CalculatedResult extends GameResult<any, PlayerId>,
  PlayerId extends string = string,
> =
  | {
      type: "dbRaw";
      result: DBResult;
    }
  | {
      type: "calculated";
      result: CalculatedResult;
    };

export class GameDefinition<
  GameType extends string,
  DBConfig,
  DBResult extends GameResult<any, PlayerId>,
  PlayerState extends {},
  SharedState extends {},
  TurnType,
  SoloStats extends {},
  FullPlayerStats extends {},
  PlayerId extends string = string,
> {
  private gamesCache: Map<
    string,
    CachedGameResult<
      DBResult,
      CalculatedResult<PlayerState, SharedState, TurnType, SoloStats, FullPlayerStats, PlayerId>,
      PlayerId
    >
  > = new Map();

  private roundsCache: Map<
    keyof TurnMetaType<TurnType>,
    TurnMetaType<TurnType>[keyof TurnMetaType<TurnType>]
  > = new Map();

  constructor(
    readonly gameType: GameType,
    readonly dbAdapter: DatabaseAdapter<DBConfig, DBResult> /*TODO:*/ | undefined,
    readonly positionOrder: "highestFirst" | "lowestFirst",
    readonly initSharedState: (result?: DBResult) => SharedState,
    readonly initPlayerData: (
      playerId: PlayerId,
      result?: DBResult,
    ) => PlayerState & { startScore: number },
    readonly soloStatsFactory: SoloStatsFactory<PlayerState, TurnType, SoloStats, PlayerId>,
    readonly fullStatsFactory: FullStatsFactory<
      PlayerState,
      SharedState,
      TurnType,
      SoloStats,
      FullPlayerStats,
      PlayerId
    >,
    // @ts-expect-error
    readonly roundMetaFactory: <K extends TurnKey<TurnType>>(key: K) => TurnMetaType<TurnType>[K],
  ) {}

  // private getRoundMeta<K extends keyof RoundMetaType>(key: K): RoundMetaType[K] {
  private getRoundMeta<V, S, U extends V | undefined>(
    key: keyof TurnMetaType<TurnType>,
  ): TurnMeta<V, S, U> {
    if (!this.roundsCache.has(key)) {
      // @ts-expect-error
      this.roundsCache.set(key, this.roundMetaFactory(key));
    }
    // return this.roundsCache.get(key) as RoundMetaType[K];
    return this.roundsCache.get(key) as TurnMeta<V, S, U>;
  }

  private makePositions(
    playerDataSolo: Map<PlayerId, PlayerDataSolo<PlayerState, TurnType, SoloStats, PlayerId>>,
  ) {
    const isBefore: (a: number, b: number) => boolean =
      this.positionOrder === "highestFirst" ? (a, b) => a > b : (a, b) => a < b;
    const { orderedScores, scorePlayerLookup } = [...playerDataSolo].reduce(
      ({ orderedScores, scorePlayerLookup }, [pid, { score }]) => {
        let low = 0;
        let high = orderedScores.length;

        while (low < high) {
          const mid = (low + high) >> 1;
          if (isBefore(orderedScores[mid], score)) {
            low = mid + 1;
          } else {
            high = mid;
          }
        }
        orderedScores.splice(low, 0, score);
        if (scorePlayerLookup.has(score)) {
          scorePlayerLookup.get(score)!.push(pid);
        } else {
          scorePlayerLookup.set(score, [pid]);
        }
        return { orderedScores, scorePlayerLookup };
      },
      {
        orderedScores: [] as number[],
        scorePlayerLookup: new Map<number, PlayerId[]>(),
      },
    );

    const { ordered, playerLookup } = orderedScores.reduce(
      ({ scores, ordered, playerLookup }, score, idx) => {
        const pos = idx + 1;
        if (!scores.has(score)) {
          scores.add(score);
          const players = scorePlayerLookup.get(score)!;
          ordered.push({ pos, players });
          for (const p of players) {
            playerLookup.set(p, { pos, players });
          }
        }
        return { scores, ordered, playerLookup };
      },
      {
        scores: new Set<number>(),
        ordered: [] as Position[],
        playerLookup: new Map<PlayerId, Position>(),
      },
    );

    return { ordered, playerLookup };
  }

  calculateGameResult(
    playerData: Map<PlayerId, PlayerDataRaw<PlayerState, TurnType>>,
    shared: SharedState,
  ): {
    players: Map<
      PlayerId,
      PlayerDataFull<PlayerState, TurnType, SoloStats, FullPlayerStats, PlayerId>
    >;
    positionsOrdered: Position[];
  } {
    const pDataSolo = new Map(
      [...playerData].map(([pid, { startScore, turns, ...raw }]) => {
        let score = startScore;
        const newTurns = (Array.isArray(turns) ? [] : {}) as PlayerTurnData<TurnType>;
        for (const [key, value] of Object.entries(turns) as [
          keyof TurnValueType<TurnType>,
          TurnValueType<TurnType>,
        ][]) {
          const r = this.getRoundMeta(key as keyof TurnMetaType<TurnType>);
          const deltaScore = r.deltaScore(value);
          score += deltaScore;
          // @ts-expect-error
          newTurns[key] = {
            value,
            stats: r.turnStats(value),
            deltaScore,
            endingScore: score,
          };
        }
        const dataForSolo = {
          ...raw,
          playerId: pid,
          turns: newTurns,
          score,
          // @ts-expect-error
          roundStatsGameSummary: expandRoundStats(
            Object.values(newTurns).map(({ stats }) => stats),
          ),
        } as PlayerDataForSolo<PlayerState, TurnType, PlayerId>;
        return [pid, Object.assign(dataForSolo, this.soloStatsFactory(dataForSolo))]; // as [PlayerId, PlayerDataSolo<PlayerState, TurnKey, TurnValues, TurnStats, SoloStats, PlayerId>]
      }),
    );
    const positions = this.makePositions(pDataSolo);
    return {
      players: new Map(
        [...pDataSolo].map(([pid, soloData]) => {
          const dataForFull = {
            position: positions.playerLookup.get(pid)!,
            ...soloData,
          };
          return [
            pid,
            Object.assign(dataForFull, this.fullStatsFactory(dataForFull, shared, positions)),
          ];
        }),
      ),
      positionsOrdered: positions.ordered,
    };
  }
}

export type PlayerDataForGame<
  G extends GameDefinition<any, any, any, any, any, any, any, any, any>,
> =
  G extends GameDefinition<
    any,
    any,
    any,
    infer PlayerState,
    any,
    infer TurnType,
    infer SoloStats,
    infer FullPlayerStats,
    infer PlayerId
  >
    ? PlayerDataFull<PlayerState, TurnType, SoloStats, FullPlayerStats, PlayerId>
    : never;

// export class FixedGameDefinition<
// GameType extends string,
// DBConfig,
// DBResult extends GameResult<any, PlayerId>,
// CalculatedResult extends GameResult<any, PlayerId>,
// SharedState extends {},
// PlayerState extends {},
// PlayerId extends string = string,
// > extends GameDefinition<
// GameType,
// DBConfig,
// DBResult,
// CalculatedResult,
// SharedState,
// PlayerState,
// PlayerId,
// > {
//   rounds:
// }
