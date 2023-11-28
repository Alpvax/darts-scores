import { extendClass, type ClassBindings } from "@/utils";
import type { PlayerDataT, PositionsOrder } from "./playerData";
import {
  type TurnStats,
  type IndexedRoundDefNoStats,
  type NormalisedRoundsArray,
  type IndexedRoundDefStats,
  type TurnData,
  type NormIRN,
  type NormalisedRound,
  type NormIRS,
  type NormKRN,
  type NormKRS,
  type RoundDef,
  type KeyedRoundDefNoStats,
  type KeyedRoundDefStats,
  normaliseRound,
} from "./roundDeclaration";
import type { ArrayGameStats, GameStatsForRounds } from "./statsAccumulatorGame";

export type ArrayGameMetadata<V, S extends TurnStats = {}> = GameMetaCore &
  (
    | {
        hasRoundStats: false;
        rounds: NormalisedRoundsArray<IndexedRoundDefNoStats<V>[], V, S>;
      }
    | {
        hasRoundStats: true;
        rounds: NormalisedRoundsArray<IndexedRoundDefStats<V, S>[], V, S>;
      }
  );

export type GameMetaWithStats<
  V,
  RS extends TurnStats,
  GS extends GameStatsForRounds<RS>,
  K extends string = string,
> = {
  gameStatsFactory?: GameStatsFactory<GS, TurnData<V, RS, K>, RS>;
  playerNameClass?: (data: PlayerDataT<RS, TurnData<V, RS, K>, GS>) => ClassBindings;
};
// export type RecordGameMetadata<R> = {
//   /**
//    * The start score for each game.
//    * Can use a factory function to allow for player handicaps.
//    */
//   startScore: (playerId: string) => number;
//   /**
//    * Which direction to sort the positions.<br/>
//    * `"highestFirst"` means the player(s) with the highest score are in first place.<br/>
//    * `"lowestFirst"` means the player(s) with the lowest score are in first place.<br/>
//    */
//   positionOrder: PositionsOrder;
//   rounds: Rounds;
// }
type GameMetaCore = {
  /**
   * The start score for each game.
   * Can use a factory function to allow for player handicaps.
   */
  startScore: (playerId: string) => number;
  /**
   * Which direction to sort the positions.<br/>
   * `"highestFirst"` means the player(s) with the highest score are in first place.<br/>
   * `"lowestFirst"` means the player(s) with the lowest score are in first place.<br/>
   */
  positionOrder: PositionsOrder;
};

// export function createArrayGameMeta<V>(
//   meta: GameMetaCore & { rounds: IndexedRoundDefNoStats<V>[] },
// ): GameMetaCore & {
//   hasRoundStats: false;
//   rounds: NormalisedRoundsArray<IndexedRoundDefNoStats<V>[], V>;
// };
// export function createArrayGameMeta<V, S extends TurnStats>(
//   meta: GameMetaCore & { rounds: IndexedRoundDefStats<V, S>[] },
// ): GameMetaCore & {
//   hasRoundStats: true;
//   rounds: NormalisedRoundsArray<IndexedRoundDefStats<V, S>[], V, S>;
// };
// export function createArrayGameMeta<V, S extends TurnStats>(
//   meta: GameMetaCore & {
//     rounds: IndexedRoundDefNoStats<V>[] | IndexedRoundDefStats<V, S>[];
//   },
// ): ArrayGameMetadata<V, S> {
//   const rounds = meta.rounds.map((r) => normaliseIndexedRound<V, S>(r));
//   return rounds[0].type === "indexed-stats"
//     ? {
//         startScore: meta.startScore,
//         positionOrder: meta.positionOrder,
//         hasRoundStats: true,
//         rounds,
//       }
//     : {
//         startScore: meta.startScore,
//         positionOrder: meta.positionOrder,
//         hasRoundStats: false,
//         rounds,
//       };
// }

export const metaWithStats = <V, RS extends TurnStats, GS extends GameStatsForRounds<RS>>(
  meta: ArrayGameMetadata<V, RS>,
  def: GameMetaWithStats<V, RS, GS>,
) => ({
  ...meta,
  ...def,
});

export type GameStatsFactory<
  GS extends GameStatsForRounds<RS>,
  T extends TurnData<any, RS, any>,
  RS extends TurnStats,
> = (
  accumulatedStats: ArrayGameStats<RS>,
  turns: {
    all: T[];
    taken: (Omit<T, "value"> & { value: T extends TurnData<infer V, any, any> ? V : never })[];
  },
) => GS;

type GameMetadataArgs<
  R extends RoundDef<V, RS, K> | NormalisedRound<V, RS, K>,
  GS extends GameStatsForRounds<RS>,
  V,
  RS extends TurnStats = {},
  K extends string = string,
> = GameMetaCore & {
  rounds: R[];
  playerNameClass?: (data: PlayerDataT<RS, TurnData<V, RS, K>, GS>) => ClassBindings;
} & (GS extends Record<any, never>
    ? {
        gameStatsFactory?: never;
      }
    : {
        gameStatsFactory: GameStatsFactory<GS, TurnData<V, RS, K>, RS>;
      });

export type GameMetaArgsINS<V, GS extends GameStatsForRounds<{}>> = GameMetadataArgs<
  IndexedRoundDefNoStats<V> | NormIRN<V>,
  GS,
  V
>;
export type GameMetaArgsIRS<
  V,
  RS extends TurnStats,
  GS extends GameStatsForRounds<RS>,
> = GameMetadataArgs<IndexedRoundDefStats<V, RS> | NormIRS<V, RS>, GS, V, RS>;
export type GameMetaArgsKNS<
  V,
  GS extends GameStatsForRounds<{}>,
  K extends string = string,
> = GameMetadataArgs<KeyedRoundDefNoStats<V, K> | NormKRN<V, K>, GS, V, {}, K>;
export type GameMetaArgsKRS<
  V,
  RS extends TurnStats,
  GS extends GameStatsForRounds<RS>,
  K extends string = string,
> = GameMetadataArgs<KeyedRoundDefStats<V, RS, K> | NormKRS<V, RS, K>, GS, V, RS, K>;

type GameMetadata<
  R extends NormalisedRound<V, RS, K>,
  GS extends GameStatsForRounds<RS>,
  V,
  RS extends TurnStats = {},
  K extends string = string,
> = GameMetaCore & {
  rounds: R[];
  gameStatsFactory: GameStatsFactory<GS, TurnData<V, RS, K>, RS>;
  playerNameClass: (data: PlayerDataT<RS, TurnData<V, RS, K>, GS>) => ClassBindings;
};

export type GameMetaINS<V, GS extends GameStatsForRounds<{}>> = GameMetadata<NormIRN<V>, GS, V>;
export type GameMetaIRS<V, RS extends TurnStats, GS extends GameStatsForRounds<RS>> = GameMetadata<
  NormIRS<V, RS>,
  GS,
  V,
  RS
>;
export type GameMetaKNS<
  V,
  GS extends GameStatsForRounds<{}>,
  K extends string = string,
> = GameMetadata<NormKRN<V, K>, GS, V, {}, K>;
export type GameMetaKRS<
  V,
  RS extends TurnStats,
  GS extends GameStatsForRounds<RS>,
  K extends string = string,
> = GameMetadata<NormKRS<V, RS, K>, GS, V, RS, K>;

export type AnyGameMetadata<
  V,
  RS extends TurnStats,
  GS extends GameStatsForRounds<RS>,
  K extends string = string,
> = [GS, RS] extends [infer G extends GameStatsForRounds<{}>, Record<any, never>]
  ? GameMetaINS<V, G> | GameMetaKNS<V, G, K>
  : GameMetaIRS<V, RS, GS> | GameMetaKRS<V, RS, GS, K>;

export function normaliseGameMetadata<V, GS extends GameStatsForRounds<{}>>(
  meta: GameMetaArgsINS<V, GS>,
): GameMetaINS<V, GS>;
export function normaliseGameMetadata<V, RS extends TurnStats, GS extends GameStatsForRounds<RS>>(
  meta: GameMetaArgsIRS<V, RS, GS>,
): GameMetaIRS<V, RS, GS>;
export function normaliseGameMetadata<
  V,
  GS extends GameStatsForRounds<{}>,
  K extends string = string,
>(meta: GameMetaArgsKNS<V, GS>): GameMetaKNS<V, GS, K>;
export function normaliseGameMetadata<
  V,
  RS extends TurnStats,
  GS extends GameStatsForRounds<RS>,
  K extends string = string,
>(meta: GameMetaArgsKRS<V, RS, GS, K>): GameMetaKRS<V, RS, GS, K>;
export function normaliseGameMetadata<
  V,
  RS extends TurnStats,
  GS extends GameStatsForRounds<RS>,
  K extends string = string,
>(meta: GameMetadataArgs<any, GS, V, RS, K>): GameMetadata<any, GS, V, RS, K> {
  return {
    startScore: meta.startScore,
    positionOrder: meta.positionOrder,
    rounds: meta.rounds.map(normaliseRound),
    gameStatsFactory: meta.gameStatsFactory
      ? (meta.gameStatsFactory as GameStatsFactory<GS, TurnData<V, RS, K>, RS>)
      : () => ({}) as GS, //TODO: error if missing when GS != {}
    playerNameClass: meta.playerNameClass
      ? (data) => extendClass(meta.playerNameClass!(data), "playerName")
      : () => "playerName",
  };
}

// ================ Builder allowing for specifying types individually ============

type NormaliserBuilder<V, K extends string = string> = {
  withRoundStats: {
    <RS extends TurnStats>(meta: GameMetaArgsIRS<V, RS, any>): GameMetaIRS<V, RS, any>;
    <RS extends TurnStats>(meta: GameMetaArgsKRS<V, RS, any, K>): GameMetaKRS<V, RS, any, K>;
    <RS extends TurnStats>(): {
      withGameStats: {
        <GS extends GameStatsForRounds<RS>>(
          meta: GameMetaArgsIRS<V, RS, GS>,
        ): GameMetaIRS<V, RS, GS>;
        <GS extends GameStatsForRounds<RS>>(
          meta: GameMetaArgsKRS<V, RS, GS, K>,
        ): GameMetaKRS<V, RS, GS, K>;
      };
    };
  };
  withGameStats: {
    <GS extends GameStatsForRounds<{}>>(meta: GameMetaArgsIRS<V, {}, GS>): GameMetaIRS<V, {}, GS>;
    <GS extends GameStatsForRounds<{}>>(
      meta: GameMetaArgsKRS<V, {}, GS, K>,
    ): GameMetaKRS<V, {}, GS, K>;
  };
};
// @ts-expect-error
export function createGameMetadata<V, GS extends GameStatsForRounds<{}>>(
  meta: GameMetaArgsINS<V, GS>,
): GameMetaINS<V, GS>;
export function createGameMetadata<V, RS extends TurnStats, GS extends GameStatsForRounds<RS>>(
  meta: GameMetaArgsIRS<V, RS, GS>,
): GameMetaIRS<V, RS, GS>;
export function createGameMetadata<V, GS extends GameStatsForRounds<{}>, K extends string = string>(
  meta: GameMetaArgsKNS<V, GS>,
): GameMetaKNS<V, GS, K>;
export function createGameMetadata<
  V,
  RS extends TurnStats,
  GS extends GameStatsForRounds<RS>,
  K extends string = string,
>(meta: GameMetaArgsKRS<V, RS, GS, K>): GameMetaKRS<V, RS, GS, K>;
export function createGameMetadata<V, K extends string = string>(): NormaliserBuilder<V, K>;
export function createGameMetadata<
  V,
  RS extends TurnStats,
  GS extends GameStatsForRounds<RS>,
  K extends string = string,
>(meta?: GameMetadataArgs<any, GS, V, RS, K>) {
  if (meta === undefined) {
    return {
      withRoundStats: (meta?: GameMetadataArgs<any, GS, V, RS, K>) =>
        meta !== undefined
          ? normaliseGameMetadata(meta)
          : {
              withGameStats: normaliseGameMetadata,
            },
      withGameStats: normaliseGameMetadata,
    };
  } else {
    return normaliseGameMetadata(meta);
  }
}
