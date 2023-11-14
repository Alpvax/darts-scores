import { extendClass, type ClassBindings, type MoveFocus } from "@/utils";
import type { PositionsOrder } from "./playerData";
import type { Ref, VNodeChild } from "vue";
import { hasStats, type Round } from "./round";
import type { IndexedRounds, TurnStats } from "./roundDeclaration";

export type ArrayGameMetadata<V, S extends TurnStats = {}> = {
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
  rounds: IndexedRounds<V, S>;
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

type TurnData<T, S extends TurnStats = {}, K extends string | number = string | number> = {
  playerId: string;
  roundKey: K;
  value: T | undefined;
  deltaScore: number;
  score: number;
  stats: S;
};
type WrappedRound<V, S extends TurnStats = {}> = {
  /** The html to display.
   * @param value is a ref that can be used as a v-model value for the round input. Setting it will automatically move the focus to the next unentered input
   */
  display: (turnProps: {
    score: number;
    deltaScore: number;
    value: Ref<V | undefined>;
    editable: boolean;
    focus: MoveFocus;
  }) => VNodeChild;
  label: string;
  deltaScore: (value: V | undefined, playerId: string, roundIndex: number) => number;
  /** CSS selector to use to focus the input element of a round. Defaults to using `input` to select the `<input>` element */
  inputFocusSelector: string;
  turnData: (
    value: V | undefined,
    score: number,
    playerId: string,
    roundIndex: number,
  ) => TurnData<V, S, number>;
  rowClass: (turns: TurnData<V, S>[]) => ClassBindings;
  cellClass: (data: TurnData<V, S>) => ClassBindings;
};

export const wrapRound = <V, S extends TurnStats>(roundMeta: Round<V, S>): WrappedRound<V, S> => {
  const turnData = (
    value: V | undefined,
    score: number,
    playerId: string,
    roundIndex: number,
  ): TurnData<V, S, number> => {
    const partial = {
      playerId,
      roundKey: roundIndex,
      score,
      deltaScore: roundMeta.deltaScore(value, playerId, roundIndex),
      value,
    };
    return {
      ...partial,
      stats: hasStats(roundMeta) ? roundMeta.stats(partial) : ({} as S),
    };
  };
  return {
    display: roundMeta.display,
    label: roundMeta.label,
    deltaScore: roundMeta.deltaScore,
    inputFocusSelector: roundMeta.inputFocusSelector ?? "input",
    turnData,
    rowClass: roundMeta.rowClass ? roundMeta.rowClass : () => undefined,
    cellClass: roundMeta.cellClass
      ? (data) =>
          extendClass(roundMeta.cellClass!(data), "turnInput", {
            unplayed: data.value === undefined,
          })
      : (data) => ({ turnInput: true, unplayed: data.value === undefined }),
  };
};
