import type { FixedLengthArray, NumericRange } from "@/utils/types";
import type { InitialStateFactory, Position } from "..";
import type { TurnMeta } from "../rounds";

export class FixedObjGameDefBuilder<
  GameId extends string,
  PlayerState,
  Rounds extends {
    [k: string | number | symbol]: TurnMeta<any, any, any>;
  },
  SoloStats extends {} = {},
  GameStats extends {} = {},
> {}

type ObjRoundState<
  RoundKey extends string | number | symbol,
  Rounds extends { [K in RoundKey]: TurnMeta<any, any, any> },
> = {};

type FixedObjGameRounds<
  M extends { [k: string | number | symbol]: TurnMeta<any, any, any> },
  Order extends (keyof M)[],
> = {
  roundType: "fixedObj";
  order: Order;
  meta: M;
};
type FixedArrGameRounds<V, Stats, UntakenVal extends V | undefined, Len extends number> = {
  roundType: "fixedArray";
  length: Len;
  rounds: FixedLengthArray<TurnMeta<V, Stats, UntakenVal>, Len>;
};
type DynamicGameRounds<V, Stats, UntakenVal extends V | undefined> = {
  roundType: "dynamic";
  factory: (index: number) => TurnMeta<any, any, any>;
};

type GameRounds = {}; //FixedObjGameRounds<any, any> | FixedArrGameRounds<any, any, any, any> | DynamicGameRounds<any, any, any>;

type RoundTypeLookup<Rounds extends GameRounds> =
  Rounds extends FixedObjGameRounds<infer M, infer O>
    ? {
        vLookup: { [K in keyof M]: M[K] extends TurnMeta<infer V, infer S, infer U> ? V : never };
        sLookup: { [K in keyof M]: M[K] extends TurnMeta<infer V, infer S, infer U> ? S : never };
        uLookup: { [K in keyof M]: M[K] extends TurnMeta<infer V, infer S, infer U> ? U : never };
        key: keyof M;
        metaLookup: { [K in keyof O]: M[O[K]] };
      }
    : Rounds extends FixedArrGameRounds<infer V, infer S, infer U, infer L>
      ? {
          vLookup: { [K in NumericRange<L>]: V };
          sLookup: { [K in NumericRange<L>]: S };
          uLookup: { [K in NumericRange<L>]: U };
          key: L;
          metaLookup: { [K in NumericRange<L>]: TurnMeta<V, S, U> };
        }
      : Rounds extends DynamicGameRounds<infer V, infer S, infer U>
        ? {
            vLookup: V[];
            sLookup: S[];
            uLookup: U[];
            key: number;
            metaLookup: TurnMeta<V, S, U>[];
          }
        : never; /*{
        vLookup: never;
        sLookup: never;
        uLookup: never;
        key: number;
        metaLookup: never;
      };*/

type T27R = FixedArrGameRounds<
  NumericRange<4>,
  { cliff: boolean; dd: boolean; hits: NumericRange<4> },
  NumericRange<4>,
  20
>;
type TOR = FixedObjGameRounds<
  {
    t1: TurnMeta<NumericRange<4>, { foo: boolean; bar: number }, any>;
    t3: TurnMeta<NumericRange<8>, { foo: boolean; baz: boolean }, any>;
    t2: TurnMeta<NumericRange<12>, { bar: number }, any>;
  },
  ["t1", "t2", "t3"]
>;

type TRTL27 = RoundTypeLookup<T27R>["metaLookup"];
type TRTLObj = RoundTypeLookup<TOR>["metaLookup"];

type PlayerData<
  PlayerId extends string | null,
  PlayerState,
  Rounds extends {},
  Stats,
> = (PlayerId extends string ? { playerId: PlayerId } : {}) &
  PlayerState &
  ({} extends Rounds
    ? {}
    : {
        rounds: Rounds;
      }) &
  Stats;

type GameDefinition<
  GameType extends string,
  PlayerState,
  Rounds extends GameRounds,
  SoloPlayerStats extends {},
  GamePlayerStats extends {},
> = {
  gameType: GameType;
  makeInitialState: InitialStateFactory<PlayerState>;
  calculatePositions: <PlayerId extends string = string>(
    playerData: Map<
      PlayerId,
      PlayerData<null, PlayerState, RoundTypeLookup<Rounds>["sLookup"], SoloPlayerStats>
    >,
  ) => {
    ordered: Position[];
    playerLookup: Map<PlayerId, Position>;
  };
  calculatePlayerData: <PlayerId extends string = string>(
    state: PlayerState,
    turns: RoundTypeLookup<Rounds>["uLookup"],
  ) => PlayerData<PlayerId, PlayerState, RoundTypeLookup<Rounds>["sLookup"], SoloPlayerStats>;
  calculateGameData: <PlayerId extends string = string>(
    turns: Map<PlayerId, PlayerState & RoundTypeLookup<Rounds>["uLookup"]> & { position: Position },
  ) => Map<
    PlayerId,
    PlayerData<
      null,
      PlayerState,
      RoundTypeLookup<Rounds>["sLookup"],
      SoloPlayerStats & GamePlayerStats
    >
  >;
  rounds: {
    type: "fixed" | "onDemand";
    get: (index: number) => TurnMeta<any, any, any> | null;
  };
};

type TGameDef27 = GameDefinition<
  "27",
  { score: number; jesus?: boolean },
  T27R,
  { hans: number; allPos: boolean },
  { foo: boolean }
>;
type TGD27Pos = TGameDef27["calculatePositions"] extends (pData: Map<any, infer PData>) => any
  ? { [K in keyof PData]: PData[K] }
  : unknown;
type TGD27GData =
  ReturnType<TGameDef27["calculateGameData"]> extends Map<any, infer PData>
    ? { [K in keyof PData]: PData[K] }
    : unknown;
type TGD27PData =
  ReturnType<TGameDef27["calculatePlayerData"]> extends infer PData
    ? { [K in keyof PData]: PData[K] }
    : unknown;
