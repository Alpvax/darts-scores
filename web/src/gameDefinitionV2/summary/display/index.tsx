import { mapObjectValues, type ClassBindings } from "@/utils";
import { DeepMap } from "deep-equality-data-structures";

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
 * The class to add to the delta element.
 * If "neutral", no values are better than others (e.g. numGames).
 * If undefined, delta will not be displayed (should return undefined when delta is zero or "equal").
 */
export type DeltaDirection = "better" | "neutral" | "worse" | undefined;
export type ComparisonResult = "better" | "equal" | "worse";
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
export type HighlightFn<T extends number = number> = (
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
export type HighlightDef =
  | HighlightGetter
  | ("best" | "worst")[]
  | {
      [clas: string]: "best" | "worst" | number | boolean;
    };
