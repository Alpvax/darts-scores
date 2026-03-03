import { h, type VNodeChild } from "vue";
import type {
  StatsTypeForGame,
  PlayerSummaryValues,
  PlayerSummaryValuesNoRounds,
  SummaryAccumulatorParts,
  ComparisonResult,
} from "..";
import type { Flatten } from "@/utils/nestedKeys";
import {
  getVDNumFormat,
  type CmpFn,
  type DeltaDirection,
  type HighlightFn,
  type RowLabelDef,
} from ".";
import { GameDefinition } from "@/gameDefinitionV2/definition";
import { floatCompareFunc, mapObjectValues } from "@/utils";
import { RowFormat, type SummaryFieldRow, type SummaryRow } from "./v2";

type FormatSpec = Intl.NumberFormat | Intl.NumberFormatOptions;

export type BestDirection = "positive" | "negative" | "neutral";
type DeltaOverride = BestDirection | "none";

type SPDSpec = {
  /**
   * The direction of the best value for this part (i.e. whether the part represents a positive, negative or neutral stat).
   */
  direction: BestDirection;
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

export type SummaryPartDisplay<PlayerData, SummaryPart> = SPDSpec &
  (SummaryPart extends {}
    ? {
        overrides?: {
          [K in keyof SummaryPart]?: Partial<SPDSpec>;
        };
      }
    : {});

type SPDGetters<Key extends string | undefined> = /*Key extends undefined
? {
  [K in keyof SPDSpec & string as `get${Capitalize<K>}`]-?: () => Exclude<SPDSpec[K], undefined>;
}
: {
  [K in keyof SPDSpec & string as `get${Capitalize<K>}`]-?: (
    key: Key,
  ) => Exclude<SPDSpec[K], undefined>;
}*/ {
  [K in keyof SPDSpec & string as `get${Capitalize<K>}`]-?: (
    key?: Key,
  ) => Exclude<SPDSpec[K], undefined>;
};

const spdGetters /*: {
  (partDisplay?: undefined): SPDGetters<undefined>;
  <PlayerData, SummaryPart extends number>(partDisplay: SummaryPartDisplay<PlayerData, SummaryPart>): SPDGetters<undefined>;
  <PlayerData, SummaryPart extends Record<string, any>>(partDisplay: SummaryPartDisplay<PlayerData, SummaryPart>): SPDGetters<keyof SummaryPart & string>;
}*/ = <PlayerData, SummaryPart>(
  partDisplay?: SummaryPartDisplay<PlayerData, SummaryPart>,
): SPDGetters<keyof SummaryPart & string> => {
  if (partDisplay === undefined) {
    return {
      getDirection: () => "neutral", //TODO: Should this be something other than `"neutral"`?
      getFormat: () => ({}),
      getDelta: () => true,
      getZero: () => 0,
    } satisfies SPDGetters<undefined>;
  }
  if (Object.hasOwn(partDisplay, "overrides")) {
    // @ts-expect-error
    const overrides = partDisplay["overrides"] as {
      [K in keyof SummaryPart]?: Partial<
        SPDSpec & {
          /** The "zero" value of the field. If the value is equal to this value, the best/worst highlighting rules are ignored.
           * If this is set to null, best/worst highlighting rules are always applied. [default = `0`]
           */
          zero?: number | null;
        }
      >;
    };
    return {
      getDirection: (key) => overrides[key]?.direction ?? partDisplay.direction,
      getFormat: (key) => overrides[key]?.format ?? partDisplay.format ?? {},
      getDelta: (key) => overrides[key]?.delta ?? partDisplay.delta ?? true,
      getZero: (key) =>
        overrides[key]?.zero !== undefined
          ? overrides[key].zero
          : partDisplay.zero !== undefined
            ? partDisplay.zero
            : 0,
    };
  }
  return {
    getDirection: () => partDisplay.direction,
    getFormat: () => partDisplay.format ?? {},
    getDelta: () => partDisplay.delta ?? true,
    getZero: () => (partDisplay.zero !== undefined ? partDisplay.zero : 0),
  };
};

type FieldHighlightSpec<PData, T extends number | number[]> = {
  getVal: (pData: PData, pid: string) => T;
  cmp: CmpFn<T>;
  fn: HighlightFn<T>;
};

export type SummaryRowFactory<
  G extends GameDefinition<any, any, any, any, any, any, any, any, any>,
  SummaryPartTypes extends { [k: string]: [any] | [any, any] },
  RoundsField extends string,
> = (
  factory: (helpers: {
    simpleField: ReturnType<typeof simpleField<G, SummaryPartTypes, RoundsField>>;
  }) => SummaryFieldRow<PlayerSummaryValues<G, SummaryPartTypes, RoundsField>>[],
) => SummaryFieldRow<PlayerSummaryValues<G, SummaryPartTypes, RoundsField>>[];
export const summaryRowFactory = <
  G extends GameDefinition<any, any, any, any, any, any, any, any, any>,
  SummaryPartTypes extends { [k: string]: [any] | [any, any] },
  RoundsField extends string,
  Parts extends SummaryAccumulatorParts<G, SummaryPartTypes, RoundsField>,
  PData extends PlayerSummaryValues<G, SummaryPartTypes, RoundsField> = PlayerSummaryValues<
    G,
    SummaryPartTypes,
    RoundsField
  >,
>(
  parts: Parts,
): SummaryRowFactory<G, SummaryPartTypes, RoundsField> => {
  return (factory) =>
    factory({
      simpleField: simpleField(parts),
    });
};

type FieldOpts = {
  format?: FormatSpec;
  deltaOverride?: DeltaOverride;
  classes?:
    | ("best" | "worst")[]
    | {
        [klass: string]: "best" | "worst" | number | boolean;
      };
  /** Value to not add best/worst highlighting. Overrrides the field `displayDefaults.zero`. @see SummaryPartDisplay.zero */
  ignoreClassValue?: number | null;
};
type TooltipOpts<PData> = {
  /** Tooltip / hover over row. Overriden by `valueTooltip` if defined and hovering over value cell */
  fieldTooltip?: () => VNodeChild;
  /** Tooltip / hover over value */
  valueTooltip?: (values: PData, deltas: Partial<PData>, playerId: string) => VNodeChild;
};
type SubKeys<T extends Record<string, any>, Key extends keyof T = keyof T> = {
  [K in keyof T]: (x: T[K] extends {} ? Flatten<T[K]> : {}) => void;
}[Key] extends (x: infer R) => any
  ? keyof R & string
  : never;

export const simpleField =
  <
    G extends GameDefinition<any, any, any, any, any, any, any, any, any>,
    SummaryPartTypes extends { [k: string]: [any] | [any, any] },
    RoundsField extends string,
    PData extends PlayerSummaryValues<G, SummaryPartTypes, RoundsField> = PlayerSummaryValues<
      G,
      SummaryPartTypes,
      RoundsField
    >,
  >(
    parts: SummaryAccumulatorParts<G, SummaryPartTypes, RoundsField>,
  ): {
    <
      Key extends keyof { [K in keyof PData & string as PData[K] extends {} ? never : K]: any } &
        string,
    >(
      label: RowLabelDef,
      key: Key,
      opts?: FieldOpts & TooltipOpts<PData>,
    ): SummaryRow<PData>;
    <
      // PartKey extends keyof { [K in keyof PData & string as PData[K] extends {} ? K : never]: PData[K] } & string,
      // SubKey extends SubKeys<{ [K in keyof PData & string as PData[K] extends {} ? K : never]: PData[K] }, PartKey>,
      // Key extends keyof { [K in SubKeys<PData, PartKey> as `${PartKey}.${K}`]: any } & string,
      Key extends keyof Flatten<PData> & string,
    >(
      label: RowLabelDef,
      key: Key,
      opts?: FieldOpts & TooltipOpts<PData>,
    ): SummaryRow<PData>;
  } =>
  (label: RowLabelDef, key: string, opts?: FieldOpts & TooltipOpts<PData>) => {
    const { fieldTooltip, valueTooltip } = opts ?? {};
    const dotIdx = key.indexOf(".");
    const {
      direction,
      deltaSpec,
      valueFmt,
      deltaFmt,
      zero,
      partKey,
      fieldKeys,
    }: {
      direction: BestDirection;
      deltaSpec: DeltaOverride;
      valueFmt: Intl.NumberFormat;
      deltaFmt: Intl.NumberFormat;
      zero: number | null;
      partKey: keyof typeof parts & string;
      fieldKeys: string[];
    } =
      dotIdx < 0
        ? (() => {
            const partKey = key as keyof typeof parts & string;
            const part = parts[partKey];
            const partDisplay = spdGetters(part.displayDefaults);
            const { value: valueFmt, delta: deltaFmt } = getVDNumFormat(
              opts?.format ?? partDisplay.getFormat(),
            );
            return {
              direction:
                opts?.deltaOverride === "positive" || opts?.deltaOverride === "negative"
                  ? opts.deltaOverride
                  : partDisplay.getDirection(),
              valueFmt,
              deltaFmt,
              deltaSpec:
                opts?.deltaOverride ??
                (partDisplay.getDelta() ? partDisplay.getDirection() : "none"),
              zero: opts?.ignoreClassValue ?? partDisplay.getZero(),
              partKey,
              fieldKeys: [],
            };
          })()
        : (() => {
            const [partKey, ...fieldKeys] = key.split(".");
            const part = parts[partKey];
            const partDisplay = spdGetters<StatsTypeForGame<G>, Record<string, any>>(
              part.displayDefaults,
            );
            const { value: valueFmt, delta: deltaFmt } = getVDNumFormat(
              opts?.format ?? partDisplay.getFormat(fieldKeys[0]),
            );
            return {
              direction:
                opts?.deltaOverride === "positive" || opts?.deltaOverride === "negative"
                  ? opts.deltaOverride
                  : partDisplay.getDirection(fieldKeys[0]),
              valueFmt,
              deltaFmt,
              deltaSpec:
                opts?.deltaOverride ??
                (partDisplay.getDelta(fieldKeys[0])
                  ? partDisplay.getDirection(fieldKeys[0])
                  : "none"),
              zero: opts?.ignoreClassValue ?? partDisplay.getZero(fieldKeys[0]),
              partKey,
              fieldKeys,
            };
          })();
    let deltaDir: undefined | ((delta: number) => DeltaDirection);
    if (deltaSpec) {
      switch (deltaSpec) {
        case "none":
          break;
        case "neutral":
          deltaDir = () => "neutral";
          break;
        case "positive":
          deltaDir = (d) => (d > 0 ? "better" : d < 0 ? "worse" : undefined);
          break;
        case "negative":
          deltaDir = (d) => (d < 0 ? "better" : d > 0 ? "worse" : undefined);
          break;
      }
    }
    const value = (pData: PlayerSummaryValues<G, SummaryPartTypes, RoundsField>, pid: string) => {
      let obj: any = pData[partKey];
      if (obj === undefined) {
        return undefined;
      }
      for (const k of fieldKeys) {
        if (typeof obj === "object" && k in obj) {
          obj = obj[k];
        } else {
          console.error(
            `Error getting value for player "${pid}": Bad field path: ${partKey}:${fieldKeys.join(".")}`,
            k,
            obj,
          );
          break;
        }
      }
      return typeof obj === "number"
        ? obj
        : (console.warn(
            `Error getting value for player "${pid}": Field: "${partKey}:${fieldKeys.join(".")}" is non numeric value, using "undefined" instead:`,
            obj,
          ),
          undefined);
    };
    let highlight:
      | undefined
      | FieldHighlightSpec<PlayerSummaryValues<G, SummaryPartTypes, RoundsField>, number[]>;
    if (opts?.classes !== undefined && direction !== "neutral") {
      const cmpRaw = floatCompareFunc(valueFmt.resolvedOptions().maximumFractionDigits ?? 0);
      const cmp: CmpFn<number> = (([gt, lt]: [ComparisonResult, ComparisonResult]) => {
        return (a, b) => {
          const d = cmpRaw(a, b);
          if (d > 0) {
            return gt;
          }
          if (d < 0) {
            return lt;
          }
          return "equal";
        };
      })(direction === "positive" ? ["better", "worse"] : ["worse", "better"]);
      const classes = opts.classes;
      highlight = {
        getVal: (pData, pid) => {
          const val = value(pData, pid);
          return val !== undefined ? [val] : [];
        },
        cmp: ([a], [b]) => cmp(a, b),
        fn: Array.isArray(classes)
          ? ([val]) =>
              ({ best, worst }) =>
                zero === null || cmp(val, zero) !== "equal"
                  ? {
                      best: classes.includes("best") && cmp(val, best[0]) === "equal",
                      worst: classes.includes("worst") && cmp(val, worst[0]) === "equal",
                    }
                  : undefined
          : ([val]) =>
              ({ best, worst }) => {
                const include = zero === null || cmp(val, zero) !== "equal";
                return mapObjectValues(classes, (criteria) => {
                  if (criteria === "best") {
                    return include && cmp(val, best[0]) === "equal";
                  }
                  if (criteria === "worst") {
                    return include && cmp(val, worst[0]) === "equal";
                  }
                  if (typeof criteria === "number") {
                    return cmp(val, criteria) === "equal";
                  }
                  return criteria as boolean;
                });
              },
      };
    }
    return {
      key,
      label,
      display: RowFormat.create([
        {
          type: "field",
          value,
          valueFormat: valueFmt.format,
          deltaFormat: deltaDir
            ? (d) =>
                h(
                  "span",
                  {
                    class: ["summaryDeltaValue", deltaDir(d), "nonAbsSummaryDelta"],
                  },
                  deltaFmt.format(d),
                )
            : undefined,
        },
      ]),
      highlight,
      fieldTooltip,
      valueTooltip,
    } satisfies SummaryRow<PData>;
  };
export const compoundField = <Parts extends PlayerSummaryValuesNoRounds<any, any>>(
  partSelectors: (keyof Parts & string) | (keyof Parts & string)[],
) => {};
// export const complexField = <Parts extends PlayerSummaryValuesNoRounds<any, any>>(partSelectors: keyof Parts & string | (keyof Parts & string)[], ) => {}
