import { nextTick, type Ref } from "vue";
import type { NormalisedRoundsArray } from "../gameUtils/roundDeclaration";

export type ClassBindings = undefined | string | Record<string, boolean> | string[];

export const extendClass = (
  bindings: ClassBindings | (() => ClassBindings),
  ...extended: ClassBindings[]
): ClassBindings => {
  const c = typeof bindings === "function" ? bindings() : bindings;
  if (extended === undefined || extended.length < 1) {
    return c;
  } else {
    return extended.reduce((a, b) => {
      if (a === undefined) {
        return b;
      }
      if (b === undefined) {
        return a;
      }
      const isStrB = typeof b === "string";
      const isArrB = Array.isArray(b);
      if (typeof a === "string") {
        return isStrB
          ? `${a} ${b}`
          : isArrB
            ? [...a.split(" "), ...b]
            : {
                [a]: true,
                ...b,
              };
      } else if (Array.isArray(a)) {
        return isStrB
          ? [...a, ...b.split(" ")]
          : isArrB
            ? [...a, ...b]
            : a.reduce((acc, clas) => {
                acc[clas] = true;
                return acc;
              }, b);
      } else {
        return isStrB
          ? { ...a, [b]: true }
          : isArrB
            ? b.reduce((acc, clas) => {
                acc[clas] = true;
                return acc;
              }, a)
            : { ...a, ...b };
      }
    }, c);
  }
};

// ================= Move focus ==============================
export type MoveFocus = {
  /** Change focus to the next round input */
  next: () => void;
  /** Change focus to the previous round input */
  prev: () => void;
  /** Change focus to the first unentered round input */
  empty: () => void;
};

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
  rounds: Ref<NormalisedRoundsArray<any, any, any>>,
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

// ================= General utility functions ===================

export function* nonEmptyPowerSet<T>(array: T[]) {
  let calculated: T[][] = [];
  for (const item of array) {
    yield [item];
    const toAdd = calculated.map((it) => [...it, item]);
    yield* toAdd;
    calculated = [...calculated, [item], ...toAdd];
  }
}

type SSReduceCallback<T, I> = (
  abort: (result: T) => T,
  previousValue: T,
  currentValue: I,
  currentIndex: number,
) => T;
export function shortCircuitReduce<T>(
  items: Iterator<T> | Iterable<T>,
  callback: SSReduceCallback<T, T>,
  initial?: T,
): T;
export function shortCircuitReduce<T, I>(
  items: Iterator<I> | Iterable<I>,
  callback: SSReduceCallback<T, I>,
  initial: T,
): T;
export function shortCircuitReduce<T, I>(
  items: Iterator<I> | Iterable<I>,
  callback: SSReduceCallback<T, I>,
  initial?: T,
): T {
  const iter = "next" in items ? items : items[Symbol.iterator]();
  let result = iter.next();
  if (result.done) {
    if (initial !== undefined) {
      return initial;
    } else {
      // Undefined calling without initial value with no items
      return undefined as T;
    }
  } else {
    let exit = false;
    let exitResult: T | undefined = undefined;
    const abort = (result: T) => {
      exit = true;
      exitResult = result;
      return result;
    };
    let i = 0;
    let acc: T;
    if (initial === undefined) {
      acc = result.value as unknown as T;
      result = iter.next();
      i++;
    } else {
      acc = initial;
    }
    while (!result.done) {
      acc = callback(abort, acc, result.value, i);
      if (exit) {
        return exitResult!;
      }
      result = iter.next();
    }
    return acc;
  }
}

/** Shuffle array in-place, and return the array for convenience */
export const shuffleArray = <T>(array: T[], inPlace = true): T[] => {
  const arr = inPlace ? array : [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

export const numberOrdinal = (num: number) => {
  if (num < 4 || num > 20) {
    switch (num % 10) {
      case 1:
        return "st";
      case 2:
        return "nd";
      case 3:
        return "rd";
    }
  }
  return "th";
};
