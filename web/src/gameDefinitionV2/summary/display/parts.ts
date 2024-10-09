import type { VNodeChild } from "vue";
import { type PlayerSummaryValuesNoRounds } from "..";
import type { Flatten } from "@/utils/nestedKeys";

type FallbackSpec<Keys extends string | number | symbol, T> = {
  fallback: T;
};
type FullySpec<Keys extends string | number | symbol, T> = {
  overrides: {
    [K in Keys]: T;
  };
};
type PartiallySpec<Keys extends string | number | symbol, T> = {
  fallback: T;
  overrides: {
    [K in Keys]?: T;
  };
};
type AnySpec<Keys extends string | number | symbol, T> =
  | FallbackSpec<Keys, T>
  | FullySpec<Keys, T>
  | PartiallySpec<Keys, T>;

type NumFmt = Intl.NumberFormat | Intl.NumberFormatOptions;
type FormatSpec =
  | NumFmt
  | ((val: number, isDelta: boolean) => NumFmt | ((val: number) => VNodeChild));

type BestDirection = "positive" | "negative" | "neutral";
type DeltaOverride = BestDirection | "none";

type SPDSpec<PlayerData, SummaryPart> = {
  /**
   * The direction of the best value for this part (i.e. whether the part represents a positive, negative or neutral stat).
   */
  direction: "positive" | "negative" | "neutral";
  /** The format to use for values.
   * If `Intl.NumberFormatOptions` or `Intl.NumberFormat`, is split into the passed options/format and a copy of the options/format with `signDisplay` set to `"exceptZero"`.
   * If a function that returns `Intl.NumberFormatOptions`, the same logic is applied.
   * If custom formats are returned from a function, the delta format is not calculated.
   * If a curried function is returned, the function will be cached and used to format the values.
   * If undefined, defaults to the empty number format (`{}` which will be converted into the cached split formats: `{ value: NumberFormat({}), delta: NumberFormat({ signDisplay: "exceptZero"})}`)
   * @see getVDNumFormat for more info on the value, delta format split.
   */
  format?: FormatSpec;
  /** Whether to display the delta value. [default = `true`] */
  delta?: boolean;
  /** The "zero" value of the field. If the value is equal to this value, the best/worst highlighting rules are ignored.
   * If this is set to null, best/worst highlighting rules are always applied. [default = `0`]
   */
  zero?: number | null;
};

export type SummaryPartDisplay<PlayerData, SummaryPart> = SPDSpec<PlayerData, SummaryPart> &
  (SummaryPart extends {}
    ? {
        overrides?: {
          [K in keyof SummaryPart]?: Partial<
            SPDSpec<PlayerData, SummaryPart> & {
              /** The "zero" value of the field. If the value is equal to this value, the best/worst highlighting rules are ignored.
               * If this is set to null, best/worst highlighting rules are always applied. [default = `0`]
               */
              zero?: number | null;
            }
          >;
        };
      }
    : {});

export const singleField = <
  Parts extends PlayerSummaryValuesNoRounds<any, any>,
  K extends keyof Flatten<Parts> & string,
>(
  key: K,
  opts?: {
    format?: FormatSpec;
    deltaOverride?: DeltaOverride;
    classes?: {
      [klass: string]: "best" | "worst" | number | boolean;
    };
    /** Value to not add best/worst highlighting. Overrrides the field `displayDefaults.zero`. @see SummaryPartDisplay.zero */
    ignoreClassValue?: number | null;
  },
) => {
  const [partKey, path] = key.split(".", 1);
};
export const compoundField = <Parts extends PlayerSummaryValuesNoRounds<any, any>>(
  partSelectors: (keyof Parts & string) | (keyof Parts & string)[],
) => {};
// export const complexField = <Parts extends PlayerSummaryValuesNoRounds<any, any>>(partSelectors: keyof Parts & string | (keyof Parts & string)[], ) => {}
