import { mapObjectValues, type ClassBindings } from "@/utils";
import { DeepMap } from "deep-equality-data-structures";
import type { ComparisonResult } from "..";
import type { VNodeChild } from "vue";

const formatCache = new DeepMap<
  Intl.NumberFormatOptions,
  {
    value: Intl.NumberFormat;
    delta: Intl.NumberFormat;
  }
>();
const resolvedFormatCache = new DeepMap<
  Intl.NumberFormatOptions,
  {
    value: Intl.NumberFormat;
    delta: Intl.NumberFormat;
  }
>();
/**
 *
 * @param options NumberFormatOptions
 * @returns a pair of {
 *    `value`: cached format with specified options;
 *    `delta`: cached format with specified options and additionally signDisplay set to "exceptZero".
 * If signDisplay is already "exceptZero", then the same format instance will be returned for both;
 * }
 */
export const getVDNumFormat = (
  options: Intl.NumberFormatOptions | Intl.ResolvedNumberFormatOptions | Intl.NumberFormat,
): {
  value: Intl.NumberFormat;
  delta: Intl.NumberFormat;
} => {
  const isFmt = options instanceof Intl.NumberFormat;
  const resolved = isFmt
    ? options.resolvedOptions()
    : Object.hasOwn(options, "locale")
      ? (options as Intl.ResolvedNumberFormatOptions)
      : undefined;
  if (resolved) {
    if (!resolvedFormatCache.has(resolved)) {
      if (isFmt) {
        resolvedFormatCache.set(resolved, {
          value: options,
          delta:
            resolved.signDisplay === "exceptZero"
              ? options
              : new Intl.NumberFormat(resolved.locale, resolved),
        });
      } else {
        const fmt = new Intl.NumberFormat(resolved.locale, resolved);
        resolvedFormatCache.set(resolved, {
          value: fmt,
          delta:
            resolved.signDisplay === "exceptZero"
              ? fmt
              : new Intl.NumberFormat(resolved.locale, resolved),
        });
      }
    }
    return resolvedFormatCache.get(resolved)!;
  } else {
    const opts = options as Intl.NumberFormatOptions;
    if (!formatCache.has(opts)) {
      const fmt = new Intl.NumberFormat(undefined, opts);
      formatCache.set(opts, {
        value: fmt,
        delta:
          opts.signDisplay === "exceptZero"
            ? fmt
            : new Intl.NumberFormat(undefined, { ...opts, signDisplay: "exceptZero" }),
      });
    }
    return formatCache.get(opts)!;
  }
};

/**
 * The label for the row.
 * If a function, allows specifying a different label depending on
 * whether or not the row is being displayed in an extended group.
 */
export type RowLabelDef = VNodeChild | ((extended: boolean) => VNodeChild);

/**
 * The class to add to the delta element.
 * If "neutral", no values are better than others (e.g. numGames).
 * If undefined, delta will not be displayed (should return undefined when delta is zero or "equal").
 */
export type DeltaDirection = "better" | "neutral" | "worse" | undefined;
/**
 * @returns whether `a` is `"better"`, `"equal"` or `"worse"` than `b`
 */
export type CmpFn<T> = (a: T, b: T) => ComparisonResult;
export type DeltaDirectionDef<T extends number> =
  | ((delta: T) => ComparisonResult)
  | "positive"
  | "negative"
  | "neutral";
export type NumericHighlightDef =
  | ((val: number, limits: { highest: number; lowest: number }) => ClassBindings)
  | {
      [clas: string]: "highest" | "lowest" | number | boolean;
    };
export type HighlightFn<T extends number | number[] = number> = (
  value: T,
) => (limits: { best: T; worst: T }) => ClassBindings;
export const makeHighlightFn = <T extends number = number>(
  def: HighlightDef,
): ((cmp: CmpFn<T>) => HighlightFn<T>) =>
  typeof def === "function"
    ? (cmp) => (val) => (limits) => def((v) => cmp(val, v as T), limits, val)
    : Array.isArray(def)
      ? (cmp) =>
          (val) =>
          ({ best, worst }) => ({
            best: def.includes("best") && cmp(val, best) === "equal",
            worst: def.includes("worst") && cmp(val, worst) === "equal",
          })
      : (cmp) =>
          (val) =>
          ({ best, worst }) =>
            mapObjectValues(def, (criteria) => {
              if (criteria === "best") {
                return cmp(val, best) === "equal";
              }
              if (criteria === "worst") {
                return cmp(val, worst) === "equal";
              }
              if (typeof criteria === "number") {
                return cmp(val, criteria as T) === "equal";
              }
              return criteria as boolean;
            });
export type HighlightGetter<T extends number = number> = (
  cmp: (val: T) => ComparisonResult,
  limits: { best: T; worst: T },
  rawValue: T,
) => ClassBindings;
export type HighlightDef<T extends number = number> =
  | HighlightGetter<T>
  | ("best" | "worst")[]
  | {
      [clas: string]: "best" | "worst" | number | boolean;
    };

export type ArrayRowHighlight<PData, T extends [...number[]] = number[]> = {
  values: (playerData: PData, playerId: string) => T;
  cmp: CmpFn<T> | "higher" | "lower" | { [K in keyof T & number]: CmpFn<T[K]> };
  classes:
    | ((
        cmp: (vals: T) => ComparisonResult,
        limits: { [K in keyof T]: { best: T[K]; worst: T[K] } },
        rawValues: T,
      ) => ClassBindings)
    | ("best" | "worst")[]
    | {
        [clas: string]: "best" | "worst" | Partial<T> | boolean;
      };
};
export type NumRowHighlight<PData, T extends number = number> = {
  value: (playerData: PData, playerId: string) => T;
  cmp: CmpFn<T> | "higher" | "lower";
  classes:
    | ((
        cmp: (val: T) => ComparisonResult,
        limits: { best: T; worst: T },
        rawValue: T,
      ) => ClassBindings)
    | ("best" | "worst")[]
    | {
        [clas: string]: "best" | "worst" | Partial<T> | boolean;
      };
};
export type RowHighlightDefinition<PData> =
  | NumRowHighlight<PData, number>
  | ArrayRowHighlight<PData, number[]>
  | {
      getVal: (data: PData, playerId: string) => number[];
      cmp: CmpFn<number[]>;
      fn: HighlightFn<number[]>;
    };

export const makeRowHighlightFn = <PData extends {}>(
  def: RowHighlightDefinition<PData> | undefined,
):
  | {
      getVal: (data: PData, playerId: string) => number[];
      cmp: CmpFn<number[]>;
      fn: HighlightFn<number[]>;
    }
  | undefined => {
  if (def === undefined) {
    return undefined;
  } else if (Object.hasOwn(def, "getVal")) {
    return def as {
      getVal: (data: PData, playerId: string) => number[];
      cmp: CmpFn<number[]>;
      fn: HighlightFn<number[]>;
    };
  } else if (Object.hasOwn(def, "value")) {
    const { value, cmp: cmpDef, classes } = def as NumRowHighlight<PData>;
    const cmp: CmpFn<number> =
      typeof cmpDef === "function"
        ? cmpDef
        : cmpDef === "higher"
          ? (a, b) => (a - b > 0 ? "better" : a - b < 0 ? "worse" : "equal")
          : (a, b) => (a - b < 0 ? "better" : a - b > 0 ? "worse" : "equal");
    const fn = makeHighlightFn(classes)(cmp);
    return {
      getVal: (data, pid) => [value(data, pid)],
      cmp: ([a], [b]) => cmp(a, b),
      fn:
        ([val]) =>
        ({ best: [best], worst: [worst] }) =>
          fn(val)({ best, worst }),
    };
  } else {
    const { values, cmp: cmpDef, classes } = def as ArrayRowHighlight<PData>;
    const cmp: CmpFn<number[]> =
      typeof cmpDef === "function"
        ? cmpDef
        : (([gt, lt]: [ComparisonResult, ComparisonResult]) => {
            return (arrA, arrB) => {
              const l = arrA.length;
              if (arrB.length !== arrA.length) {
                console.warn(
                  `Array comparison with arrays of differing lengths! ${arrA.length} != ${arrB.length}`,
                  arrA,
                  arrB,
                );
              }
              let i = 0;
              while (i < l) {
                const d = arrA[i] - arrB[i];
                if (d > 0) {
                  return gt;
                }
                if (d < 0) {
                  return lt;
                }
                i++;
              }
              return "equal";
            };
          })(cmpDef === "higher" ? ["better", "worse"] : ["worse", "better"]);
    return {
      getVal: values,
      cmp,
      fn: (typeof classes === "function"
        ? (vals) =>
            ({ best, worst }) =>
              classes(
                (v) => cmp(vals, v),
                Array.from({ length: vals.length }, (_, i) => ({ best: best[i], worst: worst[i] })),
                vals,
              )
        : Array.isArray(classes)
          ? (val) =>
              ({ best, worst }) => ({
                best: classes.includes("best") && cmp(val, best) === "equal",
                worst: classes.includes("worst") && cmp(val, worst) === "equal",
              })
          : (val) =>
              ({ best, worst }) =>
                mapObjectValues(classes, (criteria) => {
                  if (criteria === "best") {
                    return cmp(val, best) === "equal";
                  }
                  if (criteria === "worst") {
                    return cmp(val, worst) === "equal";
                  }
                  if (typeof criteria === "number") {
                    return cmp(val, criteria) === "equal";
                  }
                  return criteria as boolean;
                })) as HighlightFn<number[]>,
    };
  }
};
