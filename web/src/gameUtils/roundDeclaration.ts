import type { ClassBindings, MoveFocus } from "@/utils";
import type { Ref, VNodeChild } from "vue";

export type TurnStats = Record<string, boolean | number>;

type TurnDataBase<V> = {
  playerId: string;
  roundIndex: number;
  value: V | undefined;
  deltaScore: number;
  score: number;
};

type KeyedTurnData<V, K extends string = string> = TurnDataBase<V> & {
  roundKey: K;
};
type IndexedTurnData<V /*, K extends number = number*/> = TurnDataBase<V> & {
  roundKey?: never; //K;
};

type TurnDataStats<S extends TurnStats> = {
  stats: S;
};
type TurnDataNoStats = {
  stats?: never;
};

type KeyedTurnDataNoStats<V, K extends string = string> = KeyedTurnData<V, K> & TurnDataNoStats;
type KeyedTurnDataStats<V, S extends TurnStats, K extends string = string> = KeyedTurnData<V, K> &
  TurnDataStats<S>;
type IndexedTurnDataNoStats<V> = IndexedTurnData<V> & TurnDataNoStats;
type IndexedTurnDataStats<V, S extends TurnStats> = IndexedTurnData<V> & TurnDataStats<S>;

export type TurnData<V, S extends TurnStats = {}, K extends string = string> =
  | KeyedTurnDataNoStats<V, K>
  | KeyedTurnDataStats<V, S, K>
  | IndexedTurnDataNoStats<V>
  | IndexedTurnDataStats<V, S>;

export function hasStats<V, S extends TurnStats = {}, K extends string = string>(
  keyed: KeyedTurnDataNoStats<V, K> | KeyedTurnDataStats<V, S, K>,
): keyed is KeyedTurnDataStats<V, S, K>;
export function hasStats<V, S extends TurnStats = {}>(
  indexed: IndexedTurnDataNoStats<V> | IndexedTurnDataStats<V, S>,
): indexed is IndexedTurnDataStats<V, S>;
export function hasStats<V, S extends TurnStats = {}>(
  data: TurnData<V, S>,
): data is TurnDataBase<V> & TurnDataStats<S> {
  return Object.hasOwn(data, "stats");
}

// ========= Round Declaration =============

/** The html to display.
 * @param value is a ref that can be used as a v-model value for the round input. Setting it will automatically move the focus to the next unentered input
 * @param extra is a combination of the TurnData (except for the value) and:
 *  `editable`: whether the rendered cell should allow editing the value, used to conditionally render input elements
 *  `focus`: a {@link MoveFocus} object to allow changing focus to different turns
 */
type DisplayFactory<V, T extends TurnData<V, any>> = (
  value: Ref<V | undefined>,
  extra: Omit<T, "value"> & {
    editable: boolean;
    focus: MoveFocus;
  },
) => VNodeChild;

type TurnDataFactory<V, S extends TurnStats> = (
  value: V | undefined,
  score: number,
  playerId: string,
  roundIndex: number,
) => TurnData<V, S>;

type RoundDefBase = {
  label: string;
  /** CSS selector to use to focus the input element of a round. Defaults to using `input` to select the `<input>` element */
  inputFocusSelector?: string;
};

type KeyedRoundDefBase<V, K extends string = string> = RoundDefBase & {
  key: K;
  /**
   * Function called to calculate the score change for this turn
   * @param value The value input (possibly undefined if this turn has not yet been taken)
   * @param score The score before this turn is taken. Useful when the score change is dependant on the start score (e.g. score is halved) or when the player's score should not change (already won / knocked out)
   * @param playerId The id of the player taking the turn. Useful for handicaps
   * @param round An object of { key, index } for the round. Only applicable for keyed rounds
   * @returns
   */
  deltaScore: (
    value: V | undefined,
    score: number,
    playerId: string,
    round: { key: K; index: number },
  ) => number;
};
type IndexedRoundDefBase<V> = RoundDefBase & {
  /**
   * Function called to calculate the score change for this turn
   * @param value The value input (possibly undefined if this turn has not yet been taken)
   * @param score The score before this turn is taken. Useful when the score change is dependant on the start score (e.g. score is halved) or when the player's score should not change (already won / knocked out)
   * @param playerId The id of the player taking the turn. Useful for handicaps
   * @param roundIndex The index of the round (0-based). Only applicable for indexed rounds
   * @returns
   */
  deltaScore: (value: V | undefined, score: number, playerId: string, roundIndex: number) => number;
};

type KeyedRoundDefNoStats<V, K extends string = string> = KeyedRoundDefBase<V, K> & {
  display: DisplayFactory<V, KeyedTurnDataNoStats<V, K>>;
  rowClass?: (rowData: KeyedTurnDataNoStats<V, K>[]) => ClassBindings;
  cellClass?: (data: KeyedTurnDataNoStats<V, K>) => ClassBindings;
};
type KeyedRoundDefStats<V, S extends TurnStats, K extends string = string> = KeyedRoundDefBase<
  V,
  K
> & {
  display: DisplayFactory<V, KeyedTurnDataStats<V, S, K>>;
  stats: (data: KeyedTurnData<V>) => S;
  rowClass?: (rowData: KeyedTurnDataStats<V, S, K>[]) => ClassBindings;
  cellClass?: (data: KeyedTurnDataStats<V, S, K>) => ClassBindings;
};

type IndexedRoundDefNoStats<V> = IndexedRoundDefBase<V> & {
  display: DisplayFactory<V, IndexedTurnDataNoStats<V>>;
  rowClass?: (rowData: IndexedTurnDataNoStats<V>[]) => ClassBindings;
  cellClass?: (data: IndexedTurnDataNoStats<V>) => ClassBindings;
};
type IndexedRoundDefStats<V, S extends TurnStats> = IndexedRoundDefBase<V> & {
  display: DisplayFactory<V, IndexedTurnDataStats<V, S>>;
  stats: (data: IndexedTurnData<V>) => S;
  rowClass?: (rowData: IndexedTurnDataStats<V, S>[]) => ClassBindings;
  cellClass?: (data: IndexedTurnDataStats<V, S>) => ClassBindings;
};

export type RoundDef<V, S extends TurnStats = {}, K extends string = string> =
  | KeyedRoundDefNoStats<V, K>
  | KeyedRoundDefStats<V, S, K>
  | IndexedRoundDefNoStats<V>
  | IndexedRoundDefStats<V, S>;

export type TurnDataType<R extends RoundDef<any, any, any>> = R["display"] extends DisplayFactory<
  any,
  infer T
>
  ? T
  : never;


// ============== Rounds definition list types ================

/**
 * A list of rounds which match the passed in types
 * @param T a record of { key: value type } for each round
 * @param S a record of { key: stats type } for each round
 */
export type KeyedRounds<
  T extends Record<string, any>,
  S extends { [K in keyof T]?: TurnStats } = {},
> = {
  [K in keyof T & string]: S[K] extends TurnStats
    ? KeyedRoundDefStats<T[K], S[K], K>
    : KeyedRoundDefNoStats<T[K], K>;
}[];

/**
 * A list of rounds which match the passed in types
 * @param V the value type for all rounds
 * @param S the stats type for all rounds
 */
export type IndexedRounds<V, S extends TurnStats | undefined = undefined> = (S extends TurnStats
  ? IndexedRoundDefStats<V, S>
  : IndexedRoundDefNoStats<V>)[];
