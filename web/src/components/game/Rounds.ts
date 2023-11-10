import type { ClassBindings, MoveFocus } from "@/utils";
import { nextTick, type Ref, type VNodeChild } from "vue";

type TurnStats = Record<string, boolean | number>;

export type TurnData<T> = {
  score: number;
  deltaScore: number;
  value: T;
};
export type PlayerTurnData<T> = TurnData<T> & {
  playerId: string;
};
export type PlayerTurnDataStats<T, S extends TurnStats> = PlayerTurnData<T> & {
  stats: S;
};

export type RoundBase<T, S extends TurnStats> = {
  /** The html to display.
   * @param value is a ref that can be used as a v-model value for the round input. Setting it will automatically move the focus to the next unentered input
   */
  display: (turnProps: {
    score: number;
    deltaScore: number;
    value: Ref<T | undefined>;
    editable: boolean;
    focus: MoveFocus;
  }) => VNodeChild;
  label: string;
  deltaScore: (value: T | undefined, playerId: string, roundIndex: number) => number;
  stats?: (data: PlayerTurnData<T | undefined>) => S;
  rowClass?: (rowData: PlayerTurnDataStats<T | undefined, S>[]) => ClassBindings;
  cellClass?: (data: PlayerTurnDataStats<T | undefined, S>) => ClassBindings;
  /** CSS selector to use to focus the input element of a round. Defaults to using `input` to select the `<input>` element */
  inputFocusSelector?: string;
};
export type KeyedRound<T, S extends Record<string, boolean | number>, K extends string> = RoundBase<
  T,
  S
> & {
  key: K;
};
export type IndexedRound<
  T,
  S extends Record<string, boolean | number>,
  I extends number,
> = RoundBase<T, S> & {
  index: I;
};
export type Round<T, S extends Record<string, boolean | number>> =
  | KeyedRound<T, S, string>
  | IndexedRound<T, S, number>;

export const isKeyedRound = <K extends string>(
  round: Round<any, any>,
): round is KeyedRound<any, any, K> => Object.hasOwn(round, "key");

export type RoundShape<T = any, S extends Record<string, boolean | number> = any> = {
  value: T;
  stats: S;
};

export type RoundShapes = readonly [...RoundShape[]] | Record<string, RoundShape>;

export type RoundsList<R extends RoundShapes> = R extends [...RoundShape[]]
  ? {
      [I in keyof R & number]: RoundBase<R[I]["value"], R[I]["stats"]>;
    }
  : R extends Record<string, RoundShape<any, any>>
  ? {
      [K in keyof R & string]: KeyedRound<R[K]["value"], R[K]["stats"], K>;
    } extends Record<string, infer KR>
    ? KR[]
    : [never, "unreachable", "R is a record of non-keyed rounds"]
  : [never, "unreachable", "R is neither array or object"];

/** Create moveFocus object
 * @param playerLength a reactive value returning the number of players in the current game.
 * @param allCompleted a reactive value returning true when there are no more untaken turns, to suppress the error log.
 * @param focusSelectorBase the css selector used to select all turns input elements.
 * Will be sub-selected using the round.inputFocusSelector selector, or `input` if not specified.
 * Defaults to `"td.turnInput"`
 */
type MakeMoveFocusFactory = (
  playerLength: Ref<number>,
  allCompleted: Ref<boolean>,
  focusSelectorBase?: string,
) => {
  create: (playerIndex: number, roundIndex: number) => MoveFocus;
  focusEmpty: () => void;
};
const makeMoveFocusFactory =
  (rounds: Round<any, any>[]): MakeMoveFocusFactory =>
  (playerLength: Ref<number>, allCompleted: Ref<boolean>, focusSelectorBase = "td.turnInput") => {
    const focusEmpty = () => {
      nextTick(() => {
        const el = document.querySelector(
          focusSelectorBase + ".unplayed",
        ) as HTMLTableCellElement | null;
        if (el) {
          const row = parseInt(el.dataset.roundIndex!);
          const inputFocusSelector = rounds[row].inputFocusSelector ?? "input";
          (el.querySelector(inputFocusSelector) as HTMLElement | null)?.focus();
        } else if (!allCompleted.value) {
          console.log("Unable to find el!"); //XXX
        }
      });
    };
    return {
      focusEmpty,
      create: (playerIndex: number, roundIndex: number): MoveFocus => {
        let prev = () => {};
        if (playerIndex <= 0) {
          if (roundIndex > 0) {
            prev = () => focusInput(roundIndex - 1, playerLength.value - 1);
          }
        } else {
          prev = () => focusInput(roundIndex, playerIndex - 1);
        }
        const next = () => {
          if (playerIndex >= playerLength.value - 1) {
            if (roundIndex < rounds.length - 1) {
              focusInput(roundIndex + 1, 0);
            }
          } else {
            focusInput(roundIndex, playerIndex + 1);
          }
        };
        const focusInput = (row: number, col: number): void => {
          nextTick(() => {
            const inputFocusSelector = rounds[row].inputFocusSelector ?? "input";
            // eslint-disable-next-line no-undef
            const tds = document.querySelectorAll(
              focusSelectorBase,
            ) as NodeListOf<HTMLTableCellElement>;
            const idx = playerLength.value * (row as number) + col;
            const el = tds.item(idx)?.querySelector(inputFocusSelector) as HTMLElement | null;
            if (el) {
              el.focus();
            } else {
              console.log("Unable to find el!");
            }
          });
        };
        return {
          next,
          prev,
          empty: focusEmpty,
        };
      },
    };
  };

type NormalisedRecordRounds<R extends Record<string, RoundShape>> = {
  type: "object";
  roundsLookup: { [K in keyof R & string]: KeyedRound<R[K]["value"], R[K]["stats"], K> };
  ordered: KeyedRound<any, any, keyof R & string>[];
  makeMoveFocusFactory: MakeMoveFocusFactory;
};
export const normaliseRecordRounds = <R extends Record<string, RoundShape>>(
  rounds: KeyedRound<any, any, keyof R & string>[],
): NormalisedRecordRounds<R> => {
  const obj = rounds.reduce(
    (acc, round) => {
      acc[round.key] = round;
      return acc;
    },
    {} as { [K in keyof R & string]: KeyedRound<R[K]["value"], R[K]["stats"], K> },
  );
  return {
    type: "object",
    roundsLookup: obj,
    ordered: rounds,
    makeMoveFocusFactory: makeMoveFocusFactory(rounds),
  };
};

type NormalisedTupleRounds<R extends readonly [...RoundShape[]]> = {
  type: "tuple";
  roundsLookup: { [K in keyof R & number]: IndexedRound<R[K]["value"], R[K]["stats"], K> };
  ordered: IndexedRound<any, any, keyof R & number>[];
  makeMoveFocusFactory: MakeMoveFocusFactory;
};
export const normaliseTupleRounds = <R extends readonly [...RoundShape[]]>(
  rounds: RoundBase<any, any>[],
): NormalisedTupleRounds<R> => {
  const ordered = rounds.map((round, index) => ({ index, ...round }));
  const obj = ordered.reduce(
    (acc, round, index) => {
      acc[index] = round;
      return acc;
    },
    {} as { [K in keyof R & number]: IndexedRound<R[K]["value"], R[K]["stats"], K> },
  );
  return {
    type: "tuple",
    roundsLookup: obj,
    ordered,
    makeMoveFocusFactory: makeMoveFocusFactory(ordered),
  };
};

export function normaliseRounds<R extends Record<string, RoundShape>>(
  rounds: KeyedRound<any, any, keyof R & string>[],
): NormalisedRecordRounds<R>;
export function normaliseRounds<R extends readonly [...RoundShape[]]>(
  rounds: RoundBase<any, any>[],
): NormalisedTupleRounds<R>;
export function normaliseRounds<R extends RoundShapes>(rounds: RoundsList<R>) {
  if (isKeyedRound(rounds[0])) {
    return normaliseRecordRounds(rounds as KeyedRound<any, any, keyof R & string>[]);
  } else {
    return normaliseTupleRounds(rounds as RoundBase<any, any>[]);
  }
}

export type RoundKey<R extends RoundShapes> = R extends [...any[]]
  ? keyof R & number
  : keyof R & string;

export const roundKey = <R extends RoundShapes>(round: Round<any, any>): RoundKey<R> =>
  (isKeyedRound(round) ? round.key : round.index) as RoundKey<R>;

type ExtractShape<R extends RoundShapes, Key extends keyof RoundShape> = R extends [...RoundShape[]]
  ? {
      [I in keyof R & number]: R[I][Key];
    }
  : R extends Record<string, RoundShape>
  ? {
      [K in keyof R & string]: R[K][Key];
    }
  : [never, "unreachable", "R is neither array or object"];
export type RoundsValues<R extends RoundShapes> = ExtractShape<R, "value">;
export type RoundsStats<R extends RoundShapes> = ExtractShape<R, "stats">;

type Test = RoundsValues<{ value: number; stats: {} }[]>;

export type RoundsValuesMap<R extends RoundShapes> = R extends [...RoundShape<infer T>[]]
  ? Map<keyof R & number, T>
  : R extends Record<string, RoundShape<infer T>>
  ? Map<keyof R & string, T>
  : [never, "unreachable", "R is neither array or object"];
export type RoundsStatsMap<R extends RoundShapes> = R extends [...RoundShape<any, infer S>[]]
  ? Map<keyof R & number, S>
  : R extends Record<string, RoundShape<any, infer S>>
  ? Map<keyof R & string, S>
  : [never, "unreachable", "R is neither array or object"];

export type AnyRoundValue<R extends RoundShapes> = R extends [...RoundShape<infer T>[]]
  ? T
  : R extends Record<string, RoundShape<infer T>>
  ? T
  : [never, "unreachable", "R is neither array or object"];

export type AnyRoundStats<R extends RoundShapes> = R extends [...RoundShape<any, infer S>[]]
  ? S
  : R extends Record<string, RoundShape<any, infer S>>
  ? S
  : [never, "unreachable", "R is neither array or object"];

export type AnyPlayerTurnData<R extends RoundShapes> = R extends [...RoundShape<infer T, infer S>[]]
  ? PlayerTurnDataStats<T, S>
  : R extends Record<string, RoundShape<infer T, infer S>>
  ? PlayerTurnDataStats<T, S>
  : [never, "unreachable", "R is neither array or object"];

// export type PickRound<
//   R extends RoundShapes,
//   K extends R extends [...any[]] ? keyof R & number : keyof R & string,
// > = R[K] extends RoundShape<infer T, infer S>
//   ? K extends number
//     ? IndexedRound<T, S, K>
//     : KeyedRound<T, S, K>
//   : [never, "unreachable", "R is no RoundShapes"];
// type PickIndexedRound<
//   R extends readonly [...RoundShape[]],
//   I extends keyof R & number,
// > = R[I] extends RoundShape<infer T, infer S>
//   ? IndexedRound<T, S, I>
//   : [never, "unreachable", "R is not RoundShape[]"];
// type PickKeyedRound<
//   R extends Record<string, RoundShape>,
//   K extends keyof R & string,
// > = R[K] extends RoundShape<infer T, infer S>
//   ? KeyedRound<T, S, K>
//   : [never, "unreachable", "R is not Record<string, RoundShape>"];

// const getRoundTup = <R extends readonly [...RoundShape[]], K extends keyof R & number>(
//   rounds: RoundsList<R>,
//   key: K,
// ) => rounds[key] as unknown as PickIndexedRound<R, K>;
// const getRoundRec = <R extends Record<string, RoundShape>, K extends keyof R & string>(
//   rounds: RoundsList<R>,
//   key: K,
// ) => rounds[key as keyof typeof rounds] as unknown as PickKeyedRound<R, K>;
// export function getRound<R extends readonly [...RoundShape[]], K extends keyof R & number>(
//   rounds: RoundsList<R>,
//   key: K,
// ): PickIndexedRound<R, K>;
// export function getRound<R extends Record<string, RoundShape>, K extends keyof R & string>(
//   rounds: RoundsList<R>,
//   key: K,
// ): PickKeyedRound<R, K>;
// export function getRound<
//   R extends RoundShapes,
//   K extends R extends [...any[]] ? keyof R & number : keyof R & string,
// >(rounds: RoundsList<R>, key: K): PickRound<R, K> {
//   const { value, stats } = rounds[key];
//   throw Error("Not Implemented"); //TODO
// }
