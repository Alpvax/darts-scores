import type { MoveFocus, ClassBindings } from "@/utils";
import { nextTick, type Ref, type VNodeChild } from "vue";

export type TurnStats = Record<string, boolean | number>;

export type TurnData<T> = {
  value: T;
  deltaScore: number;
  score: number;
};
export type FullTurnData<T, K extends string | number = string | number> = TurnData<T> & {
  playerId: string;
  roundKey: K;
};
export type TurnDataStats<T, S extends TurnStats> = TurnData<T> & {
  stats: S;
};

type RoundBase<V> = {
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
  inputFocusSelector?: string;
};
type RoundNoStatsExt<V> = {
  rowClass?: (rowData: FullTurnData<V | undefined>[]) => ClassBindings;
  cellClass?: (data: FullTurnData<V | undefined>) => ClassBindings;
};
export type RoundNoStats<V> = RoundBase<V> & RoundNoStatsExt<V>;
type RoundStatsExt<V, S extends TurnStats> = {
  stats: (data: FullTurnData<V | undefined>) => S;
  rowClass?: (rowData: TurnDataStats<V | undefined, S>[]) => ClassBindings;
  cellClass?: (data: TurnDataStats<V | undefined, S>) => ClassBindings;
};
export type RoundWStats<V, S extends TurnStats> = RoundBase<V> & RoundStatsExt<V, S>;
export type Round<V, S extends TurnStats = {}> = RoundNoStats<V> | RoundWStats<V, S>;

export const hasStats = <V = any, S extends TurnStats = any>(
  round: Round<V, S>,
): round is RoundWStats<V, S> => Object.hasOwn(round, "stats");

// ================= Array rounds ==============================
export type IterableRoundsBuilder<T extends Round<any, any>> = {
  build: (length: number) => T[];
  lazy: () => Generator<T, never, never>;
};
const makeArrayRoundsBuilder = <T extends Round<any, any>>(
  f: (index: number) => T,
): IterableRoundsBuilder<T> => ({
  build: (length: number) => Array.from({ length }, (_, i) => f(i)),
  *lazy(): Generator<T, never, never> {
    let i = 0;
    while (true) {
      yield f(i++);
    }
  },
});
export const arrayRoundsBuilder = <V>(
  factory: (index: number) => RoundBase<V>,
): IterableRoundsBuilder<RoundBase<V>> & {
  withClasses: (
    classFactory: (index: number) => RoundNoStatsExt<V>,
  ) => IterableRoundsBuilder<RoundNoStats<V>>;
  withStats: <S extends TurnStats>(
    statsFactory: (index: number) => RoundStatsExt<V, S>,
  ) => IterableRoundsBuilder<RoundWStats<V, S>>;
} => ({
  ...makeArrayRoundsBuilder(factory),
  withClasses: (classFactory) =>
    makeArrayRoundsBuilder((i) => ({ ...factory(i), ...classFactory(i) })),
  withStats: <S extends TurnStats>(statsFactory: (index: number) => RoundStatsExt<V, S>) =>
    makeArrayRoundsBuilder((i) => ({ ...factory(i), ...statsFactory(i) })),
});

// ================= Move focus ==============================
type MoveFocusFactory = {
  create: (playerIndex: number, roundIndex: number) => MoveFocus;
  focusEmpty: () => void;
};
/** Create moveFocus object
 * @param playerLength a reactive value returning the number of players in the current game.
 * @param allCompleted a reactive value returning true when there are no more untaken turns, to suppress the error log.
 * @param focusSelectorBase the css selector used to select all turns input elements.
 * Will be sub-selected using the round.inputFocusSelector selector, or `input` if not specified.
 * Defaults to `"td.turnInput"`
 */
export function makeMoveFocusFactory(
  rounds: Ref<Round<any, any>[]>,
  playerLength: Ref<number>,
  allCompleted: Ref<boolean>,
  focusSelectorBase = "td.turnInput",
): MoveFocusFactory {
  const focusEmpty = () => {
    nextTick(() => {
      const el = document.querySelector(
        focusSelectorBase + ".unplayed",
      ) as HTMLTableCellElement | null;
      if (el) {
        const row = parseInt(el.dataset.roundIndex!);
        const inputFocusSelector = rounds.value[row].inputFocusSelector ?? "input";
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
          if (roundIndex < rounds.value.length - 1) {
            focusInput(roundIndex + 1, 0);
          }
        } else {
          focusInput(roundIndex, playerIndex + 1);
        }
      };
      const focusInput = (row: number, col: number): void => {
        nextTick(() => {
          const inputFocusSelector = rounds.value[row].inputFocusSelector ?? "input";
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
}
