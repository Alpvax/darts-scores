import { type ClassBindings } from "@/utils";
import type { PlayerDataT, PositionsOrder } from "./playerData";
import type { Ref } from "vue";
import {
  type TurnStats,
  normaliseIndexedRound,
  type IndexedRoundDefNoStats,
  type NormalisedRoundsArray,
  type IndexedRoundDefStats,
  type TurnData,
} from "./roundDeclaration";
import type { ArrayGameStats, GameStatsForRounds } from "./statsAccumulator";

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
  gameStatsFactory?: (
    accumulatedStats: ArrayGameStats<RS>,
    turns: { all: TurnData<V, RS, string>[]; taken: TurnData<V, RS>[] },
  ) => GS;
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

export function createArrayGameMeta<V>(
  meta: GameMetaCore & { rounds: IndexedRoundDefNoStats<V>[] },
): GameMetaCore & {
  hasRoundStats: false;
  rounds: NormalisedRoundsArray<IndexedRoundDefNoStats<V>[], V>;
};
export function createArrayGameMeta<V, S extends TurnStats>(
  meta: GameMetaCore & { rounds: IndexedRoundDefStats<V, S>[] },
): GameMetaCore & {
  hasRoundStats: true;
  rounds: NormalisedRoundsArray<IndexedRoundDefStats<V, S>[], V, S>;
};
export function createArrayGameMeta<V, S extends TurnStats>(
  meta: GameMetaCore & {
    rounds: IndexedRoundDefNoStats<V>[] | IndexedRoundDefStats<V, S>[];
  },
): ArrayGameMetadata<V, S> {
  const rounds = meta.rounds.map((r) => normaliseIndexedRound<V, S>(r));
  // @ts-expect-error
  return rounds[0].type === "indexed-stats"
    ? {
        startScore: meta.startScore,
        positionOrder: meta.positionOrder,
        hasRoundStats: true,
        rounds,
      }
    : {
        startScore: meta.startScore,
        positionOrder: meta.positionOrder,
        hasRoundStats: false,
        rounds,
      };
}

export const metaWithStats = <V, RS extends TurnStats, GS extends GameStatsForRounds<RS>>(
  meta: ArrayGameMetadata<V, RS>,
  def: GameMetaWithStats<V, RS, GS>,
) => ({
  ...meta,
  ...def,
});

export interface WrappedMeta<V> {
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
  rounds: Ref<V[]>;
  playerNameClass: (playerId: string) => ClassBindings;
  rowClass: (roundIndex: number) => ClassBindings;
  cellClass: (roundIndex: number, playerId: string) => ClassBindings;
  gameStats: (playerId: string) => any;
}

// type TurnData<T, S extends TurnStats = {}, K extends string | number = string | number> = {
//   playerId: string;
//   roundKey: K;
//   value: T | undefined;
//   deltaScore: number;
//   score: number;
//   stats: S;
// };
// type WrappedRound<V, S extends TurnStats = {}> = {
//   /** The html to display.
//    * @param value is a ref that can be used as a v-model value for the round input. Setting it will automatically move the focus to the next unentered input
//    */
//   display: (turnProps: {
//     score: number;
//     deltaScore: number;
//     value: Ref<V | undefined>;
//     editable: boolean;
//     focus: MoveFocus;
//   }) => VNodeChild;
//   label: string;
//   deltaScore: (value: V | undefined, playerId: string, roundIndex: number) => number;
//   /** CSS selector to use to focus the input element of a round. Defaults to using `input` to select the `<input>` element */
//   inputFocusSelector: string;
//   turnData: (
//     value: V | undefined,
//     score: number,
//     playerId: string,
//     roundIndex: number,
//   ) => TurnData<V, S, number>;
//   rowClass: (turns: TurnData<V, S>[]) => ClassBindings;
//   cellClass: (data: TurnData<V, S>) => ClassBindings;
// };

// export const wrapRound = <V, S extends TurnStats>(roundMeta: Round<V, S>): WrappedRound<V, S> => {
//   const turnData = (
//     value: V | undefined,
//     score: number,
//     playerId: string,
//     roundIndex: number,
//   ): TurnData<V, S, number> => {
//     const partial = {
//       playerId,
//       roundKey: roundIndex,
//       score,
//       deltaScore: roundMeta.deltaScore(value, playerId, roundIndex),
//       value,
//     };
//     return {
//       ...partial,
//       stats: hasStats(roundMeta) ? roundMeta.stats(partial) : ({} as S),
//     };
//   };
//   return {
//     display: roundMeta.display,
//     label: roundMeta.label,
//     deltaScore: roundMeta.deltaScore,
//     inputFocusSelector: roundMeta.inputFocusSelector ?? "input",
//     turnData,
//     rowClass: roundMeta.rowClass ? roundMeta.rowClass : () => undefined,
//     cellClass: roundMeta.cellClass
//       ? (data) =>
//           extendClass(roundMeta.cellClass!(data), "turnInput", {
//             unplayed: data.value === undefined,
//           })
//       : (data) => ({ turnInput: true, unplayed: data.value === undefined }),
//   };
// };
