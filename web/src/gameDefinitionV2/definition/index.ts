import type { GameResult } from "../gameResult";
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
  TurnStatsType,
  TurnMetaTypeLookup,
} from "../types";
import type { Position } from "..";
import type { TurnMeta } from "../rounds";
import {
  SummaryAccumulator,
  type FixedSummaryAccumulatorParts,
  type PlayerSummaryValues,
  type StatsTypeFor,
  type SummaryAccumulatorFactory,
  type SummaryAccumulatorParts,
  type SummaryPartAccumulator,
  type SummaryPartAccumulatorWithMeta,
  type SummaryPartTypes,
} from "../summary";
import { expandRoundStats, type RoundsFieldDef } from "../summary/parts/roundStats";
import {
  makeNumGamesAccPart,
  makeScoreAccPart,
  makeSummaryParts,
  makeWinsAccPart,
  makeRoundStatsAccumulatorPart,
  type SummaryPartsFactoryHelper,
} from "../summary/parts";
import { summaryRowFactory } from "../summary/display/parts";
import { createSummaryComponent } from "../summary/summaryComponent";

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
  DBResult extends GameResult<PlayerDataRaw<PlayerState, TurnType>, PlayerId>,
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

  // @ts-expect-error
  private readonly roundMetaFactory: <K extends TurnKey<TurnType>>(key: K) => TurnMetaType<TurnType>[K]

  constructor(
    readonly gameType: GameType,
    readonly dbAdapter: DatabaseAdapter<DBConfig, DBResult>,
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
    roundMetaFactory: <K extends TurnKey<TurnType>>(key: K) => TurnMetaType<TurnType>[K],
  ) {
    this.roundMetaFactory = roundMetaFactory;
  }

  // private getRoundMeta<K extends keyof RoundMetaType>(key: K): RoundMetaType[K] {
  public getRoundMetaT<V, S, U extends V | undefined>(
    key: keyof TurnMetaType<TurnType>,
  ): TurnMeta<V, S, U> {
    if (!this.roundsCache.has(key)) {
      // @ts-expect-error
      this.roundsCache.set(key, this.roundMetaFactory(key));
    }
    // return this.roundsCache.get(key) as RoundMetaType[K];
    return this.roundsCache.get(key) as TurnMeta<V, S, U>;
  }
  public getRoundMeta<K extends TurnKey<TurnType>>(key: K): TurnMetaTypeLookup<TurnType, K> {
    // @ts-expect-error
    if (!this.roundsCache.has(key)) {
      // @ts-expect-error
      this.roundsCache.set(key, this.roundMetaFactory(key));
    }
    // @ts-expect-error
    return this.roundsCache.get(key) as TurnMetaTypeLookup<TurnType, K>;
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
        for (const [strKey, value] of Object.entries(turns) as [
          string,
          TurnValueType<TurnType>,
        ][]) {
          const key = (
            /\d+/.test(strKey) ? parseInt(strKey) : strKey
          ) as TurnKey<TurnType>;
          const r = this.getRoundMeta(key);
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
          roundStatsGameSummary: expandRoundStats<TurnStatsType<TurnType>>(
            // @ts-expect-error
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

  makeSummaryAccumulatorFactory<
    SummaryParts extends {
      [k: string]:
        | SummaryPartAccumulatorWithMeta<
            StatsTypeFor<
              TurnType,
              PlayerDataFull<PlayerState, TurnType, SoloStats, FullPlayerStats, PlayerId>
            >,
            any,
            any
          >
        | SummaryPartAccumulator<
            StatsTypeFor<
              TurnType,
              PlayerDataFull<PlayerState, TurnType, SoloStats, FullPlayerStats, PlayerId>
            >,
            any
          >;
    } & {
      [K in keyof FixedSummaryAccumulatorParts<this, RoundsField>]?: never;
    },
    RoundsField extends string,
  >(
    partsFactory: SummaryPartsFactoryHelper<this, SummaryParts, RoundsField>,
    roundsDef?: RoundsFieldDef<this, RoundsField>,
    scoreLimits?: {
      minimum?: number;
      maximum?: number;
    },
  ): SummaryAccumulatorFactory<this, SummaryParts, RoundsField>;
  makeSummaryAccumulatorFactory<
    SummaryParts extends {
      [k: string]:
        | SummaryPartAccumulatorWithMeta<
            StatsTypeFor<
              TurnType,
              PlayerDataFull<PlayerState, TurnType, SoloStats, FullPlayerStats, PlayerId>
            >,
            any,
            any
          >
        | SummaryPartAccumulator<
            StatsTypeFor<
              TurnType,
              PlayerDataFull<PlayerState, TurnType, SoloStats, FullPlayerStats, PlayerId>
            >,
            any
          >;
    } & {
      [K in keyof FixedSummaryAccumulatorParts<this, RoundsField>]?: never;
    },
    RoundsField extends string,
  >(
    summaryPartsAndScoreLimits: Omit<
      SummaryParts,
      keyof FixedSummaryAccumulatorParts<this, RoundsField>
    > & {
      score?: {
        minimum?: number;
        maximum?: number;
      };
    },
    roundsDef?: RoundsFieldDef<this, RoundsField>,
  ): SummaryAccumulatorFactory<this, SummaryParts, RoundsField>;
  makeSummaryAccumulatorFactory<
    SummaryParts extends {
      [k: string]:
        | SummaryPartAccumulatorWithMeta<
            StatsTypeFor<
              TurnType,
              PlayerDataFull<PlayerState, TurnType, SoloStats, FullPlayerStats, PlayerId>
            >,
            any,
            any
          >
        | SummaryPartAccumulator<
            StatsTypeFor<
              TurnType,
              PlayerDataFull<PlayerState, TurnType, SoloStats, FullPlayerStats, PlayerId>
            >,
            any
          >;
    } & {
      [K in keyof FixedSummaryAccumulatorParts<this, RoundsField>]?: never;
    },
    RoundsField extends string,
  >(
    summaryPartsAndScoreLimits: Omit<
      SummaryParts,
      keyof FixedSummaryAccumulatorParts<this, RoundsField>
    >,
    roundsDef?: RoundsFieldDef<this, RoundsField>,
    maybeScoreLimits?: {
      minimum?: number;
      maximum?: number;
    },
  ): SummaryAccumulatorFactory<this, SummaryParts, RoundsField>;
  makeSummaryAccumulatorFactory<
    SummaryParts extends {
      [k: string]:
        | SummaryPartAccumulatorWithMeta<
            StatsTypeFor<
              TurnType,
              PlayerDataFull<PlayerState, TurnType, SoloStats, FullPlayerStats, PlayerId>
            >,
            any,
            any
          >
        | SummaryPartAccumulator<
            StatsTypeFor<
              TurnType,
              PlayerDataFull<PlayerState, TurnType, SoloStats, FullPlayerStats, PlayerId>
            >,
            any
          >;
    } & {
      [K in keyof FixedSummaryAccumulatorParts<this, RoundsField>]?: never;
    },
    RoundsField extends string,
  >(
    arg0:
      | (Omit<SummaryParts, keyof FixedSummaryAccumulatorParts<this, RoundsField>> & {
          score?: {
            minimum?: number;
            maximum?: number;
          };
        })
      | SummaryPartsFactoryHelper<this, SummaryParts, RoundsField>,
    roundsDef?: RoundsFieldDef<this, RoundsField>,
    maybeScoreLimits?: {
      minimum?: number;
      maximum?: number;
    },
  ): SummaryAccumulatorFactory<this, SummaryParts, RoundsField> {
    let scoreLimits = maybeScoreLimits;
    let summaryParts;
    if (typeof arg0 === "function") {
      summaryParts = makeSummaryParts(arg0);
    } else {
      scoreLimits = {
        minimum: scoreLimits?.minimum ?? arg0.score?.minimum,
        maximum: scoreLimits?.maximum ?? arg0.score?.maximum,
      };
      summaryParts = arg0;
    }

    const numGamesAccumulator = makeNumGamesAccPart<this>();

    const scoreAccumulator = makeScoreAccPart<this>(
      this.positionOrder === "highestFirst" ? "positive" : "negative",
      {
        maximumValue: scoreLimits?.maximum,
        minimumValue: scoreLimits?.minimum,
      },
    );

    const winsAccumulator = makeWinsAccPart<this>();

    const roundsAccumulator = makeRoundStatsAccumulatorPart<this, RoundsField>(
      roundsDef ?? ({} as RoundsFieldDef<this, RoundsField>),
    );

    const parts = Object.assign(
      {
        numGames: numGamesAccumulator,
        score: scoreAccumulator,
        wins: winsAccumulator,
        rounds: roundsAccumulator,
      },
      summaryParts,
    ) as SummaryAccumulatorParts<
      this,
      SummaryPartTypes<this, SummaryParts, RoundsField>,
      RoundsField
    >;
    return {
      parts,
      create: () =>
        new SummaryAccumulator<
          this,
          SummaryPartTypes<this, SummaryParts, RoundsField>,
          RoundsField
        >(parts),
      createComponent: () =>
        createSummaryComponent<
          this,
          SummaryPartTypes<this, SummaryParts, RoundsField>,
          RoundsField
        >(parts),
      rowFactory: summaryRowFactory<
        this,
        SummaryPartTypes<this, SummaryParts, RoundsField>,
        RoundsField,
        typeof parts,
        PlayerSummaryValues<this, SummaryPartTypes<this, SummaryParts, RoundsField>, RoundsField>
      >(parts),
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

export type DBGameResultFor<G extends GameDefinition<any, any, any, any, any, any, any, any, any>> =
  G extends GameDefinition<
    any,
    any,
    any,
    infer PlayerState,
    any,
    infer TurnType,
    any,
    any,
    infer PlayerId
  >
    ? GameResult<PlayerDataRaw<PlayerState, TurnType>, PlayerId>
    : never;

export type GameTurnStatsType<
  G extends GameDefinition<any, any, any, any, any, any, any, any, any>,
> =
  G extends GameDefinition<any, any, any, any, any, infer TurnType, any, any, any>
    ? TurnStatsType<TurnType>
    : never;
export type GameTurnType<G extends GameDefinition<any, any, any, any, any, any, any, any, any>> =
  G extends GameDefinition<any, any, any, any, any, infer TurnType, any, any, any>
    ? TurnType
    : never;

export type FullPlayerDataFor<
  G extends GameDefinition<any, any, any, any, any, any, any, any, any>,
> =
  G extends GameDefinition<
    any,
    any,
    any,
    infer PlayerState,
    infer SharedState,
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
