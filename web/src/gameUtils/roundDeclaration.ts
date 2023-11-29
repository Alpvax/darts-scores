import { extendClass, type ClassBindings, type MoveFocus } from "@/utils";
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
type IndexedTurnData<V /*, K extends number = number*/> = TurnDataBase<V>; /*& {
  roundKey?: never; //K;
};*/

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

export type TakenTurnData<V, S extends TurnStats = {}, K extends string = string> = Omit<
  TurnData<V, S, K>,
  "value"
> & {
  value: V;
};
export type IntoTaken<T extends TurnData<any, any, any>> = T extends TurnData<
  infer V,
  infer S,
  infer K
>
  ? TakenTurnData<V, S, K>
  : never;

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

export function isKeyed<V, S extends TurnStats = {}, K extends string = string>(
  data: TurnData<V, S, K>,
): data is KeyedTurnDataNoStats<V, K> | KeyedTurnDataStats<V, S, K>;
export function isKeyed<V, S extends TurnStats = {}, K extends string = string>(
  def: RoundDef<V, S, K>,
): def is KeyedRoundDefNoStats<V, K> | KeyedRoundDefStats<V, S, K>;
export function isKeyed<V, S extends TurnStats = {}, K extends string = string>(
  item: TurnData<V, S, K> | RoundDef<V, S, K>,
): item is
  | KeyedTurnDataNoStats<V, K>
  | KeyedTurnDataStats<V, S, K>
  | KeyedRoundDefNoStats<V, K>
  | KeyedRoundDefStats<V, S, K> {
  return Object.hasOwn(item, "key") || Object.hasOwn(item, "roundKey");
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

export type KeyedRoundDefNoStats<V, K extends string = string> = KeyedRoundDefBase<V, K> & {
  display: DisplayFactory<V, KeyedTurnDataNoStats<V, K>>;
  rowClass?: (rowData: KeyedTurnDataNoStats<V, K>[]) => ClassBindings;
  cellClass?: (data: KeyedTurnDataNoStats<V, K>) => ClassBindings;
};
export type KeyedRoundDefStats<
  V,
  S extends TurnStats,
  K extends string = string,
> = KeyedRoundDefBase<V, K> & {
  display: DisplayFactory<V, KeyedTurnDataStats<V, S, K>>;
  stats: (data: KeyedTurnData<V>) => S;
  rowClass?: (rowData: KeyedTurnDataStats<V, S, K>[]) => ClassBindings;
  cellClass?: (data: KeyedTurnDataStats<V, S, K>) => ClassBindings;
};

export type IndexedRoundDefNoStats<V> = IndexedRoundDefBase<V> & {
  display: DisplayFactory<V, IndexedTurnDataNoStats<V>>;
  rowClass?: (rowData: IndexedTurnDataNoStats<V>[]) => ClassBindings;
  cellClass?: (data: IndexedTurnDataNoStats<V>) => ClassBindings;
};
export type IndexedRoundDefStats<V, S extends TurnStats> = IndexedRoundDefBase<V> & {
  display: DisplayFactory<V, IndexedTurnDataStats<V, S>>;
  stats: (data: IndexedTurnData<V>) => S;
  rowClass?: (rowData: IndexedTurnDataStats<V, S>[]) => ClassBindings;
  cellClass?: (data: IndexedTurnDataStats<V, S>) => ClassBindings;
};

export type KeyedRoundDef<V, S extends TurnStats = {}, K extends string = string> =
  | KeyedRoundDefNoStats<V, K>
  | KeyedRoundDefStats<V, S, K>;

export type IndexedRoundDef<V, S extends TurnStats = {}> =
  | IndexedRoundDefNoStats<V>
  | IndexedRoundDefStats<V, S>;

export type RoundDef<V, S extends TurnStats = {}, K extends string = string> =
  | KeyedRoundDef<V, S, K>
  | IndexedRoundDef<V, S>;

export type TurnDataType<R extends RoundDef<any, any, any> | NormalisedRound<any, any, any>> =
  R["display"] extends DisplayFactory<any, infer T> ? T : never;

export type RoundStatsType<R extends RoundDef<any, any, any>> = R extends KeyedRoundDefStats<
  any,
  infer S,
  any
>
  ? S
  : R extends IndexedRoundDefStats<any, infer S>
    ? S
    : undefined;

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

// ============ Normalised Round ==================

type NormalisedRoundCore<
  T extends TurnData<V, S, K>,
  V,
  S extends TurnStats = {},
  K extends string = string,
> = {
  display: DisplayFactory<V, T>;
  label: string;
  // deltaScore,
  inputFocusSelector: string;
  turnData: (value: V | undefined, score: number, playerId: string, roundIndex: number) => T;
  rowClass: (data: T[]) => ClassBindings;
  cellClass: (data: T) => ClassBindings;
};

export type NormKRS<V, S extends TurnStats, K extends string> = NormalisedRoundCore<
  KeyedTurnDataStats<V, S, K>,
  V,
  S,
  K
> & { type: "keyed-stats" };
export type NormKRN<V, K extends string> = NormalisedRoundCore<
  KeyedTurnDataNoStats<V, K>,
  V,
  {},
  K
> & {
  type: "keyed-noStats";
};

export type NormIRS<V, S extends TurnStats> = NormalisedRoundCore<
  IndexedTurnDataStats<V, S>,
  V,
  S
> & {
  type: "indexed-stats";
};
export type NormIRN<V> = NormalisedRoundCore<IndexedTurnDataNoStats<V>, V> & {
  type: "indexed-noStats";
};

export type NormalisedRound<V, S extends TurnStats = {}, K extends string = string> =
  | NormIRN<V>
  | NormIRS<V, S>
  | NormKRN<V, K>
  | NormKRS<V, S, K>;

// export function normaliseIndexedRound<V>(roundDef: IndexedRoundDefNoStats<V>): NormIRN<V>;
// export function normaliseIndexedRound<V, S extends TurnStats = {}>(
//   roundDef: IndexedRoundDefStats<V, S>,
// ): NormIRS<V, S>;
// export function normaliseIndexedRound<V, S extends TurnStats = {}>(
//   roundDef: IndexedRoundDef<V, S>,
// ): NormIRS<V, S> | NormIRN<V> {
//   type TData = IndexedTurnDataNoStats<V> | IndexedTurnDataStats<V, S>;
//   return {
//     type: Object.hasOwn(roundDef, "stats") ? "indexed-stats" : "indexed-noStats",
//     display: roundDef.display,
//     label: roundDef.label,
//     // deltaScore,
//     inputFocusSelector: roundDef.inputFocusSelector ?? "input",
//     // @ts-ignore
//     turnData: (
//       value: V | undefined,
//       score: number,
//       playerId: string,
//       roundIndex: number,
//     ): TData => {
//       const deltaScore = roundDef.deltaScore(value, score, playerId, roundIndex);
//       const partial: IndexedTurnData<V> = {
//         playerId,
//         roundIndex,
//         score: score + deltaScore,
//         deltaScore,
//         value,
//       };
//       return Object.hasOwn(roundDef, "stats")
//         ? {
//             ...partial,
//             stats: (roundDef as IndexedRoundDefStats<V, S>).stats(partial as IndexedTurnData<V>),
//           }
//         : partial;
//     },
//     rowClass: roundDef.rowClass ? roundDef.rowClass : () => undefined,
//     cellClass: roundDef.cellClass
//       ? (data: TData) =>
//           extendClass((roundDef.cellClass as (data: TData) => ClassBindings)(data), "turnInput", {
//             unplayed: data.value === undefined,
//           })
//       : (data: TData) => ({ turnInput: true, unplayed: data.value === undefined }) as ClassBindings,
//   };
// }

export function normaliseRound<V>(roundDef: IndexedRoundDefNoStats<V>): NormIRN<V>;
export function normaliseRound<V, S extends TurnStats = {}>(
  roundDef: IndexedRoundDefStats<V, S>,
): NormIRS<V, S>;
export function normaliseRound<V, K extends string = string>(
  roundDef: KeyedRoundDefNoStats<V, K>,
): NormKRN<V, K>;
export function normaliseRound<V, S extends TurnStats = {}, K extends string = string>(
  roundDef: KeyedRoundDefStats<V, S, K>,
): NormKRS<V, S, K>;
export function normaliseRound<V, S extends TurnStats = {}, K extends string = string>(
  roundDef: RoundDef<V, S, K>,
): NormalisedRound<V, S, K> {
  const deltaScore = isKeyed<V, S, K>(roundDef)
    ? (value: V | undefined, score: number, playerId: string, index: number) =>
        roundDef.deltaScore(value, score, playerId, { key: roundDef.key, index })
    : (value: V | undefined, score: number, playerId: string, index: number) =>
        roundDef.deltaScore(value, score, playerId, index);
  // const turnData = (
  //   value: V | undefined,
  //   score: number,
  //   playerId: string,
  //   roundIndex: number,
  // ): TData => {
  //   if (isKeyed<V, S, K>(roundDef)) {
  //     const partial: KeyedTurnData<V, K> = {
  //       playerId,
  //       roundKey: roundDef.key,
  //       roundIndex,
  //       score,
  //       deltaScore: deltaScore(value, score, playerId, roundIndex),
  //       value,
  //     }
  //     return {
  //       ...partial,
  //       stats: Object.hasOwn(roundDef, "stats") ? (roundDef as KeyedRoundDefStats<V, S, K>).stats(partial) : ({} as S),
  //     } as unknown as TData;
  //   } else {
  //     const partial: IndexedTurnData<V> = {
  //       playerId,
  //       roundIndex,
  //       score,
  //       deltaScore: deltaScore(value, score, playerId, roundIndex),
  //       value,
  //     };
  //     return {
  //       ...partial,
  //       stats: Object.hasOwn(roundDef, "stats") ? (roundDef as IndexedRoundDefStats<V, S>).stats(partial) : ({} as S),
  //     } as unknown as TData;
  //   }
  // };
  function tryAddStats(
    partial: KeyedTurnData<V, K>,
  ): KeyedTurnDataNoStats<V, K> | KeyedTurnDataStats<V, S, K>;
  function tryAddStats(
    partial: IndexedTurnData<V>,
  ): IndexedTurnDataNoStats<V> | IndexedTurnDataStats<V, S>;
  function tryAddStats(partial: KeyedTurnData<V, K> | IndexedTurnData<V>): TurnData<V, S, K> {
    if (isKeyed<V, S, K>(roundDef) && isKeyed(partial)) {
      return {
        ...partial,
        stats: Object.hasOwn(roundDef, "stats")
          ? (roundDef as KeyedRoundDefStats<V, S, K>).stats(partial)
          : ({} as S),
      };
    } else {
      return {
        ...partial,
        stats: Object.hasOwn(roundDef, "stats")
          ? (roundDef as IndexedRoundDefStats<V, S>).stats(partial as IndexedTurnData<V>)
          : ({} as S),
      };
    }
  }
  const hasStats = Object.hasOwn(roundDef, "stats");
  type TData = ReturnType<NormalisedRound<V, S, K>["turnData"]>;
  // @ts-ignore
  return {
    type: isKeyed<V, S, K>(roundDef)
      ? hasStats
        ? "keyed-stats"
        : "keyed-noStats"
      : hasStats
        ? "indexed-stats"
        : "indexed-noStats",
    display: roundDef.display as NormalisedRound<V, S, K>["display"],
    label: roundDef.label,
    // deltaScore,
    inputFocusSelector: roundDef.inputFocusSelector ?? "input",
    turnData: (isKeyed<V, S, K>(roundDef)
      ? (value: V | undefined, score: number, playerId: string, roundIndex: number) => {
          const delta = deltaScore(value, score, playerId, roundIndex);
          return tryAddStats({
            playerId,
            roundKey: roundDef.key,
            roundIndex,
            score: score + delta,
            deltaScore: delta,
            value,
          } satisfies KeyedTurnData<V, K>);
        }
      : (value: V | undefined, score: number, playerId: string, roundIndex: number) => {
          const delta = deltaScore(value, score, playerId, roundIndex);
          return tryAddStats({
            playerId,
            roundIndex,
            score: score + delta,
            deltaScore: delta,
            value,
          } satisfies IndexedTurnData<V>);
        }) as NormalisedRound<V, S, K>["turnData"],
    rowClass: roundDef.rowClass ? roundDef.rowClass : () => undefined,
    cellClass: roundDef.cellClass
      ? (data: TData) =>
          extendClass((roundDef.cellClass as (data: TData) => ClassBindings)(data), "turnInput", {
            unplayed: data.value === undefined,
          })
      : (data: TData) => ({ turnInput: true, unplayed: data.value === undefined }) as ClassBindings,
  };
}

// ================ Array ======================

export type NormalisedRoundsArray<
  R extends RoundDef<V, S, K>[],
  V,
  S extends TurnStats = {},
  K extends string = string,
> = R extends KeyedRoundDefStats<V, S, K>[]
  ? NormKRS<V, S, K>[]
  : R extends KeyedRoundDefNoStats<V, K>[]
    ? NormKRN<V, K>[]
    : R extends IndexedRoundDefStats<V, S>[]
      ? NormIRS<V, S>[]
      : NormIRN<V>[];

export type NormTurnDataType<R extends NormalisedRound<any, any, any>[]> =
  R[number]["display"] extends DisplayFactory<any, infer T> ? T : never;
