import type { FixedLengthArray, NumericRange } from "@/utils/types";
import type { Position } from ".";
import type { TurnMeta } from "./rounds";
import type { RoundStatsExpanded } from "./summary/parts/roundStats";

type ArrayTurnDataType<V, S, Len extends number> = {
  valueType: V;
  statsType: S;
  length: Len;
};
type TupleTurnDataType<T extends [...{ value: any; stats: any }[]]> = T;
type ObjectTurnDataType<T extends Record<any, { value: any; stats: any }>> = T;
type TurnValueType<T> =
  T extends ArrayTurnDataType<infer V, any, infer Len>
    ? FixedLengthArray<V, Len>
    : T extends TupleTurnDataType<infer Tup>
      ? {
          [K in keyof Tup]: Tup[K]["value"];
        }
      : T extends ObjectTurnDataType<infer Obj>
        ? {
            [K in keyof Obj]: Obj[K]["value"];
          }
        : unknown & {};
type TurnStatsType<T> =
  T extends ArrayTurnDataType<any, infer S, infer Len>
    ? FixedLengthArray<S, Len>
    : T extends TupleTurnDataType<infer Tup>
      ? {
          [K in keyof Tup]: Tup[K]["stats"];
        }
      : T extends ObjectTurnDataType<infer Obj>
        ? {
            [K in keyof Obj]: Obj[K]["stats"];
          }
        : unknown;
type TurnKey<T> =
  T extends ArrayTurnDataType<any, any, infer Len>
    ? NumericRange<Len>
    : T extends TupleTurnDataType<infer Tup>
      ? keyof Tup
      : T extends ObjectTurnDataType<infer Obj>
        ? keyof Obj
        : unknown;
type TurnMetaType<T> =
  T extends ArrayTurnDataType<infer V, infer S, infer Len>
    ? FixedLengthArray<TurnMeta<V, S, V>, Len>
    : T extends TupleTurnDataType<infer Tup>
      ? {
          [K in keyof Tup]: TurnMeta<Tup[K]["value"], Tup[K]["stats"], Tup[K]["value"]>;
        }
      : T extends ObjectTurnDataType<infer Obj>
        ? {
            [K in keyof Obj]: TurnMeta<Obj[K]["value"], Obj[K]["stats"], Obj[K]["value"]>;
          }
        : Record<any, TurnMeta<any, any, any>>;
type PlayerTurnData<T> =
  T extends ArrayTurnDataType<infer V, infer S, infer Len>
    ? FixedLengthArray<
        {
          value: V;
          stats: S;
          deltaScore: number;
          endingScore: number;
        },
        Len
      >
    : T extends TupleTurnDataType<infer Tup>
      ? {
          [K in keyof Tup]: {
            value: Tup[K]["value"];
            stats: Tup[K]["stats"];
            deltaScore: number;
            endingScore: number;
          };
        }
      : T extends ObjectTurnDataType<infer Obj>
        ? {
            [K in keyof Obj]: {
              value: Obj[K]["value"];
              stats: Obj[K]["stats"];
              deltaScore: number;
              endingScore: number;
            };
          }
        : unknown;

export type PlayerDataRaw<PlayerState, TurnType> = PlayerState & {
  startScore: number;
  completed: boolean;
  turns: TurnValueType<TurnType>;
  displayName?: string;
  // handicap?: Handicap<Turns>
};
type PlayerDataForSolo<PlayerState, TurnType, PlayerId extends string = string> = PlayerState & {
  playerId: PlayerId;
  completed: boolean;
  turns: PlayerTurnData<TurnType>;
  score: number;
  roundStatsGameSummary: RoundStatsExpanded<TurnStatsType<TurnType>>;
  displayName?: string;
  // handicap?: Handicap<Turns>
};

type PlayerDataSolo<
  PlayerState,
  TurnType,
  SoloStats extends {},
  PlayerId extends string = string,
> = PlayerDataForSolo<PlayerState, TurnType, PlayerId> & SoloStats;
export type SoloStatsFactory<
  PlayerState,
  TurnType,
  SoloStats extends {},
  PlayerId extends string = string,
> = (playerData: PlayerDataForSolo<PlayerState, TurnType, PlayerId>) => SoloStats;
type PlayerDataForFull<
  PlayerState,
  TurnType,
  SoloStats extends {},
  PlayerId extends string = string,
> = PlayerDataSolo<PlayerState, TurnType, SoloStats, PlayerId> & {
  position: Position;
};
export type PlayerDataFull<
  PlayerState,
  TurnType,
  SoloStats extends {},
  FullPlayerStats extends {},
  PlayerId extends string = string,
> = PlayerDataForFull<PlayerState, TurnType, SoloStats, PlayerId> & FullPlayerStats;
export type FullStatsFactory<
  PlayerState,
  SharedState,
  TurnType,
  SoloStats extends {},
  FullPlayerStats extends {},
  PlayerId extends string = string,
> = (
  playerData: PlayerDataForFull<PlayerState, TurnType, SoloStats, PlayerId>,
  shared: SharedState,
  positions: {
    ordered: Position[];
    playerLookup: Map<PlayerId, Position>;
  },
) => FullPlayerStats;

export type CalculatedResult<
  PlayerState,
  SharedState,
  TurnType,
  SoloStats extends {},
  FullPlayerStats extends {},
  PlayerId extends string = string,
> = {
  date: Date;
  playerOrder: PlayerId[];
  tiebreak?: {
    players: PlayerId[];
    type: string;
    winner: PlayerId;
  };
  results: {
    [K in PlayerId]: PlayerDataFull<PlayerState, TurnType, SoloStats, FullPlayerStats, PlayerId>;
  };
  shared?: SharedState;
};

export type GameInstanceData<
  PlayerState,
  SharedState,
  TurnType,
  SoloStats extends {},
  FullPlayerStats extends {},
  PlayerId extends string = string,
> = (
  playerData: Map<PlayerId, PlayerDataRaw<PlayerState, TurnType>>,
  shared: SharedState,
) => {
  players: Map<
    PlayerId,
    PlayerDataFull<PlayerState, TurnType, SoloStats, FullPlayerStats, PlayerId>
  >;
  positionsOrdered: Position[];
};
