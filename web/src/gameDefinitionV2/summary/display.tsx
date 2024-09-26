import { mapObjectValues, type ClassBindings } from "@/utils";
import type {
  SummaryAccumulatorParts,
  SummaryPartAccumulator,
  SummaryPartAccumulatorWithMeta,
} from ".";
import type { GameDefinition } from "../definition";
import type { ComparisonResult } from "./roundStats";
import { DeepMap } from "deep-equality-data-structures";
import type { VNodeChild } from "vue";

const formatCache = new DeepMap<
  Intl.NumberFormatOptions,
  {
    value: Intl.NumberFormat;
    delta: Intl.NumberFormat;
  }
>();
export const getVDNumFormat = (
  options: Intl.NumberFormatOptions,
): {
  value: Intl.NumberFormat;
  delta: Intl.NumberFormat;
} => {
  if (!formatCache.has(options)) {
    formatCache.set(options, {
      value: new Intl.NumberFormat(undefined, options),
      delta: new Intl.NumberFormat(undefined, { ...options, signDisplay: "exceptZero" }),
    });
  }
  return formatCache.get(options)!;
};

/**
 * The class to add to the delta element.
 * If "neutral", no values are better than others (e.g. numGames).
 * If undefined, delta will not be displayed (should return undefined when delta is zero or "equal").
 */
type DeltaDirection = "better" | "neutral" | "worse" | undefined;

type DeltaDirectionDef<T extends number> =
  | ((delta: T) => ComparisonResult)
  | "positive"
  | "negative"
  | "neutral";
type HighlightDef =
  | ((value: number, limits: { highest: number; lowest: number }) => ClassBindings)
  | {
      [clas: string]: "highest" | "lowest" | number | boolean;
    };
const normaliseHighlight = <T extends number>(
  def: HighlightDef,
  cmp: (a: T, b: T) => number,
): ((value: number, limits: { highest: number; lowest: number }) => ClassBindings) => {
  if (typeof def === "function") {
    return def;
  }
  return (val, { highest, lowest }) =>
    mapObjectValues(def, (criteria) => {
      if (criteria === "highest") {
        return cmp(val as T, highest as T) === 0;
      }
      if (criteria === "lowest") {
        return cmp(val as T, lowest as T) === 0;
      }
      if (typeof criteria === "number") {
        return cmp(val as T, criteria as T) === 0;
      }
      return criteria as boolean;
    });
};
type SingleValSummaryFieldDef<T extends number, PlayerGameStats extends {}> = {
  label: string;
  value: (playerData: PlayerGameStats, playerId: string) => T;
  cmp: (a: T, b: T) => number;
  /**
   * If "positive", higher values are better. If "negative", lower values are better. If "neutral", no values are better than others (e.g. numGames).
   * If a function returning "equal", the delta will not be displayed (i.e. there is no change). Otherwise return is self explanitary.
   */
  deltaDirection?: DeltaDirectionDef<T>;
  highlight: HighlightDef;
  display?:
    | Intl.NumberFormatOptions
    | ((value: T, isDelta: boolean /*, playerData: PlayerGameStats*/) => VNodeChild);
  /** Tooltip / hover over label */
  fieldTooltip?: () => VNodeChild;
  /** Tooltip / hover over value */
  valueTooltip?: (value: T, delta?: T /*, playerData: PlayerGameStats*/) => VNodeChild;
};
type MultiValFieldMeta<T extends number> = {
  cmp: (a: T, b: T) => number;
  /**
   * If "positive", higher values are better. If "negative", lower values are better. If "neutral", no values are better than others (e.g. numGames).
   * If a function returning "equal", the delta will not be displayed (i.e. there is no change). Otherwise return is self explanitary.
   */
  deltaDirection?: DeltaDirectionDef<T>;
  highlight?: HighlightDef;
  format?: Intl.NumberFormatOptions;
};
type MultiValRow<
  K extends keyof T,
  T extends { [k: string]: number },
  PlayerGameStats extends {},
> = {
  label: string;
  display: string | K | ((fields: T, isDelta: boolean) => VNodeChild);
  /** The field to use to calculate the limits for highlighting */
  valueField: K | ((fields: T) => K);
  /** Tooltip / hover over label */
  fieldTooltip?: () => VNodeChild;
  /** Tooltip / hover over value */
  valueTooltip?: (
    value: Pick<T, K>,
    delta: Pick<T, K> | undefined /*, playerData: PlayerGameStats*/,
  ) => VNodeChild;
};
type MultiValSummaryFieldDef<T extends { [k: string]: number }, PlayerGameStats extends {}> = {
  groupLabel: string;
  values:
    | {
        [K in keyof T]: (playerData: PlayerGameStats, playerId: string) => T[K];
      }
    | ((playerData: PlayerGameStats, playerId: string) => T);
  meta:
    | {
        fallback: MultiValFieldMeta<number>;
        field?: { [K in keyof T]?: Partial<MultiValFieldMeta<T[K]>> };
      }
    | {
        fallback?: undefined;
        fieldMeta:
          | { [K in keyof T]: MultiValFieldMeta<T[K]> }
          | (<K extends keyof T>(field: K) => MultiValFieldMeta<T[K]>);
      }
    | (<K extends keyof T>(field: K) => MultiValFieldMeta<T[K]>);
  rows: MultiValRow<keyof T, T, PlayerGameStats>[];
  extendedRows?: MultiValRow<keyof T, T, PlayerGameStats>[];
};
type SummaryFieldRow<T extends number | { [k: string]: number }> = {
  label: string;
  display: (val: T, isDelta: boolean) => VNodeChild;
  highlight: (val: T, limits: { highest: number; lowest: number }) => ClassBindings;
  cmpValue: (fields: T) => number;
  /** Tooltip / hover over label */
  fieldTooltip?: () => VNodeChild;
  /** Tooltip / hover over value */
  valueTooltip?: (value: T, delta?: T) => VNodeChild;
};
export type SummaryFieldDefV2<
  T extends number | { [k: string]: number },
  PlayerGameStats extends {},
> = T extends { [k: string]: number }
  ? MultiValSummaryFieldDef<T, PlayerGameStats>
  : T extends number
    ? SingleValSummaryFieldDef<T, PlayerGameStats>
    : never;

type SummaryRow<T extends { [k: string]: any }> = {
  label: () => VNodeChild;
  display: (vals: T, deltas: Partial<T>) => VNodeChild;
  cmpField: (vals: T) => keyof T;
  highlight: (vals: T, limits: { highest: number; lowest: number }) => ClassBindings;
  /** Tooltip / hover over label */
  fieldTooltip?: () => VNodeChild;
  /** Tooltip / hover over value */
  valueTooltip?: (vals: T, deltas: Partial<T>) => VNodeChild;
};
type NormalisedField<T, PlayerGameStats extends {}> = {
  value: (playerData: PlayerGameStats, playerId: string) => T;
  cmp: (a: T, b: T) => number;
  format: (val: T, isDelta: boolean) => VNodeChild;
};
type NormalisedFields<T extends { [k: string]: number }, PlayerGameStats extends {}> = {
  /** All the possible keys */
  keys: Set<keyof T>;
  getValues: (playerData: PlayerGameStats, playerId: string) => T;
  cmp: { [K in keyof T]: (a: T[K], b: T[K]) => number };
  format: { [K in keyof T]: (val: T[K], isDelta: boolean) => VNodeChild };
  /**
   * If "positive", higher values are better. If "negative", lower values are better. If "neutral", no values are better than others (e.g. numGames).
   * If a function returning "equal", the delta will not be displayed (i.e. there is no change). Otherwise return is self explanitary.
   */
  deltaDirection: { [K in keyof T]?: (delta: T[K]) => DeltaDirection };
};
export type NormalisedSummaryRowsDef<
  T extends { [k: string]: number },
  PlayerGameStats extends {},
> = {
  fields: NormalisedFields<T, PlayerGameStats>;
  rows: SummaryRow<T>[];
  extendedRows?: SummaryRow<T>[];
};
type SingleFieldDef<N extends number, PlayerGameStats extends {}> = {
  label: string | (() => VNodeChild);
  value: (playerData: PlayerGameStats, playerId: string) => N;
  cmp: (a: N, b: N) => N;
  /**
   * If "positive", higher values are better. If "negative", lower values are better. If "neutral", no values are better than others (e.g. numGames).
   * If a function returning "equal", the delta will not be displayed (i.e. there is no change). Otherwise return is self explanitary.
   */
  deltaDirection?: DeltaDirectionDef<N>;
  highlight: HighlightDef;
  display?:
    | Intl.NumberFormatOptions
    | ((value: N, isDelta: boolean /*, playerData: PlayerGameStats*/) => VNodeChild);
  /** Tooltip / hover over row. Overriden by `valueTooltip` if defined and hovering over value cell */
  fieldTooltip?: () => VNodeChild;
  /** Tooltip / hover over value */
  valueTooltip?: (value: N, delta?: N /*, playerData: PlayerGameStats*/) => VNodeChild;
};
type MultiFieldRowDef<T extends { [k: string]: number }> = {
  label: string | (() => VNodeChild);
  cmpField: keyof T | ((vals: T) => keyof T);
  highlight: HighlightDef;
  display: keyof T | string | ((vals: T, deltas: Partial<T>) => VNodeChild);
  /** Tooltip / hover over row. Overriden by `valueTooltip` if defined and hovering over value cell */
  fieldTooltip?: () => VNodeChild;
  /** Tooltip / hover over value */
  valueTooltip?: (vals: T, deltas: Partial<T> /*, playerData: PlayerGameStats*/) => VNodeChild;
};
const makeRow = <T extends { [k: string]: number }, PlayerGameStats extends {}>(
  {
    label,
    cmpField: cmpFieldDef,
    highlight,
    display,
    fieldTooltip,
    valueTooltip,
  }: MultiFieldRowDef<T>,
  fields: NormalisedFields<T, PlayerGameStats>,
): SummaryRow<T> => {
  const cmpField = typeof cmpFieldDef === "function" ? cmpFieldDef : () => cmpFieldDef;
  return {
    label: typeof label === "function" ? label : () => label,
    display:
      typeof display === "function"
        ? display
        : Object.hasOwn(fields.format, display)
          ? (vals, deltas) => {
              const f = display as keyof T;
              const fmt = fields.format[f];
              const delta = deltas[f];
              const deltaDir =
                delta !== undefined && fields.deltaDirection[f] !== undefined
                  ? fields.deltaDirection[f](delta)
                  : undefined;
              return (
                <>
                  {fmt(vals[f], false)}
                  {deltaDir !== undefined ? (
                    <span class={["summaryDeltaValue", deltaDir]}>{fmt(delta!, true)}</span>
                  ) : undefined}
                </>
              );
            }
          : (vals, deltas) => {
              const parts = (display as string).split(/(?<!\\)(\$?\{[^}]+\})/);
              return parts.map((s) => {
                const match = /^\$\{([^}])\}$/.exec(s);
                if (match && fields.keys.has(match[1])) {
                  const f = match[1] as keyof T;
                  const fmt = fields.format[f];
                  const delta = deltas[f];
                  const deltaDir =
                    delta !== undefined && fields.deltaDirection[f] !== undefined
                      ? fields.deltaDirection[f](delta)
                      : undefined;
                  return (
                    <>
                      {fmt(vals[f], false)}
                      {deltaDir !== undefined ? (
                        <span class={["summaryDeltaValue", deltaDir]}>{fmt(delta!, true)}</span>
                      ) : undefined}
                    </>
                  );
                }
                return s;
              });
            },
    cmpField,
    highlight: (vals, limits) => {
      const f = cmpField(vals);
      const val = vals[f];
      if (typeof highlight === "function") {
        return highlight(val, limits);
      }
      const cmp = fields.cmp[f];
      return mapObjectValues(highlight, (criteria) => {
        if (criteria === "highest") {
          return cmp(val, limits.highest as T[keyof T]) === 0;
        }
        if (criteria === "lowest") {
          return cmp(val, limits.lowest as T[keyof T]) === 0;
        }
        if (typeof criteria === "number") {
          return cmp(val, criteria as T[keyof T]) === 0;
        }
        return criteria as boolean;
      });
    },
    fieldTooltip,
    valueTooltip,
  };
};
const isRowRef = <T extends { [k: string]: number }>(
  row: MultiFieldRowDef<T> | { rowRef: number },
): row is { rowRef: number } => Object.hasOwn(row, "rowRef");
type FieldsMetaDef<T extends { [k: string]: any }, PlayerGameStats extends {}> = {
  getValues: (playerData: PlayerGameStats, playerId: string) => T;
} & (
  | {
      keys: Iterable<keyof T>;
      cmp:
        | (<K extends keyof T>(field: K, a: T[K], b: T[K]) => number)
        | { [K in keyof T]: (a: T[K], b: T[K]) => number };
      format:
        | (<K extends keyof T>(field: K, val: T[K], isDelta: boolean) => VNodeChild)
        | { [K in keyof T]: Intl.NumberFormat | ((val: T[K], isDelta: boolean) => VNodeChild) };
      /**
       * If "positive", higher values are better. If "negative", lower values are better. If "neutral", no values are better than others (e.g. numGames).
       * If a function returning "equal", the delta will not be displayed (i.e. there is no change). Otherwise return is self explanitary.
       */
      deltaDirection?:
        | (<K extends keyof T>(field: K, delta: T[K]) => DeltaDirection)
        | { [K in keyof T]?: DeltaDirectionDef<T[K]> };
    }
  | {
      cmp: { [K in keyof T]: (a: T[K], b: T[K]) => number };
      format: { [K in keyof T]: Intl.NumberFormat | ((val: T[K], isDelta: boolean) => VNodeChild) };
      /**
       * If "positive", higher values are better. If "negative", lower values are better. If "neutral", no values are better than others (e.g. numGames).
       * If a function returning "equal", the delta will not be displayed (i.e. there is no change). Otherwise return is self explanitary.
       */
      deltaDirection?: { [K in keyof T]?: DeltaDirectionDef<T[K]> };
    }
);
const hasSpecifiedKeys = <T extends { [k: string]: any }, PlayerGameStats extends {}>(
  def: FieldsMetaDef<T, PlayerGameStats>,
): def is {
  keys: Iterable<keyof T>;
  getValues: (playerData: PlayerGameStats, playerId: string) => T;
  cmp:
    | (<K extends keyof T>(field: K, a: T[K], b: T[K]) => number)
    | { [K in keyof T]: (a: T[K], b: T[K]) => number };
  format:
    | (<K extends keyof T>(field: K, val: T[K], isDelta: boolean) => VNodeChild)
    | { [K in keyof T]: Intl.NumberFormat | ((val: T[K], isDelta: boolean) => VNodeChild) };
  deltaDirection?:
    | (<K extends keyof T>(field: K, delta: T[K]) => DeltaDirection)
    | { [K in keyof T]?: DeltaDirectionDef<T[K]> };
} => Object.hasOwn(def, "keys");
type MultiFieldDef<T extends { [k: string]: any }, PlayerGameStats extends {}> = {
  fields: FieldsMetaDef<T, PlayerGameStats>;
  rows: MultiFieldRowDef<T>[];
  extendedRows: (MultiFieldRowDef<T> | { rowRef: number })[];
};
const isMultiDef = <N extends number, T extends { [k: string]: any }, PlayerGameStats extends {}>(
  def: SingleFieldDef<N, PlayerGameStats> | MultiFieldDef<T, PlayerGameStats>,
): def is MultiFieldDef<T, PlayerGameStats> => Object.hasOwn(def, "fields");
const normaliseFieldRows: {
  <N extends number, PlayerGameStats extends {}>(
    def: SingleFieldDef<N, PlayerGameStats>,
  ): NormalisedSummaryRowsDef<{ value: N }, PlayerGameStats>;
  <T extends { [k: string]: any }, PlayerGameStats extends {}>(
    def: MultiFieldDef<T, PlayerGameStats>,
  ): NormalisedSummaryRowsDef<T, PlayerGameStats>;
} = <N extends number, T extends { [k: string]: any }, PlayerGameStats extends {}>(
  def: SingleFieldDef<N, PlayerGameStats> | MultiFieldDef<T, PlayerGameStats>,
) => {
  if (isMultiDef(def)) {
    const keys = new Set(
      hasSpecifiedKeys(def.fields) ? def.fields.keys : Object.keys(def.fields.cmp),
    );
    const { getValues, cmp, format, deltaDirection } = def.fields;
    const fields: NormalisedSummaryRowsDef<T, PlayerGameStats>["fields"] = {
      keys,
      getValues: def.fields.getValues,
      cmp:
        typeof cmp === "function"
          ? [...keys].reduce(
              (acc, k) => {
                acc[k] = (a, b) => cmp(k, a, b);
                return acc;
              },
              {} as NormalisedFields<T, PlayerGameStats>["cmp"],
            )
          : cmp,
      format:
        typeof format === "function"
          ? [...keys].reduce(
              (acc, k) => {
                acc[k] = (val, isDelta) => format(k, val, isDelta);
                return acc;
              },
              {} as NormalisedFields<T, PlayerGameStats>["format"],
            )
          : // @ts-ignore
            mapObjectValues(format, (f) =>
              typeof f === "function"
                ? f
                : (val, isDelta) => {
                    const { value, delta } = getVDNumFormat(f as Intl.NumberFormatOptions);
                    return (isDelta ? delta : value).format(val);
                  },
            ),
      deltaDirection:
        deltaDirection !== undefined
          ? typeof deltaDirection === "function"
            ? [...keys].reduce(
                (acc, k) => {
                  acc[k] = (delta) => deltaDirection(k, delta);
                  return acc;
                },
                {} as NormalisedFields<T, PlayerGameStats>["deltaDirection"],
              )
            : // @ts-ignore
              mapObjectValues(deltaDirection, (deltaDirection) => {
                return deltaDirection !== undefined && typeof deltaDirection === "function"
                  ? (delta) => {
                      const res = (deltaDirection as (delta: N) => ComparisonResult)(delta);
                      return res === "equal" ? undefined : res;
                    }
                  : deltaDirection === "neutral"
                    ? () => "neutral"
                    : deltaDirection === "negative"
                      ? (delta) => (delta < 0 ? "better" : delta > 0 ? "worse" : undefined)
                      : deltaDirection === "positive"
                        ? (delta) => (delta > 0 ? "better" : delta < 0 ? "worse" : undefined)
                        : undefined;
              })
          : {},
    };
    return {
      fields,
      rows: [],
    } satisfies NormalisedSummaryRowsDef<T, PlayerGameStats>;
  } else {
    const { display, deltaDirection, label, highlight, fieldTooltip, valueTooltip } = def;
    const fields = {
      keys: new Set(["value"]),
      getValues: (pData, pid) => ({ value: def.value(pData, pid) }),
      cmp: { value: def.cmp },
      format: {
        value:
          display === undefined
            ? (val) => val
            : typeof display === "function"
              ? display
              : (val, isDelta) => {
                  const { value, delta } = getVDNumFormat(display);
                  return (isDelta ? delta : value).format(val);
                },
      },
      deltaDirection: {
        value:
          deltaDirection !== undefined && typeof deltaDirection === "function"
            ? (delta) => {
                const res = (deltaDirection as (delta: N) => ComparisonResult)(delta);
                return res === "equal" ? undefined : res;
              }
            : deltaDirection === "neutral"
              ? () => "neutral"
              : deltaDirection === "negative"
                ? (delta) => (delta < 0 ? "better" : delta > 0 ? "worse" : undefined)
                : deltaDirection === "positive"
                  ? (delta) => (delta > 0 ? "better" : delta < 0 ? "worse" : undefined)
                  : undefined,
      },
    } satisfies NormalisedSummaryRowsDef<{ value: N }, PlayerGameStats>["fields"];
    return {
      fields,
      rows: [
        makeRow(
          {
            label,
            display: "value",
            cmpField: "value",
            highlight,
            fieldTooltip,
            valueTooltip:
              valueTooltip && (({ value }, { value: delta }) => valueTooltip!(value, delta)),
          },
          fields,
        ),
      ],
    } satisfies NormalisedSummaryRowsDef<{ value: N }, PlayerGameStats>;
  }
};

type NormalisedSingleFieldDef<T extends number, PlayerGameStats extends {}> = {
  getFields: (
    playerData: PlayerGameStats,
    playerId: string,
  ) => {
    value: NormalisedField<T, PlayerGameStats>;
  };
  rows: [SummaryFieldRow<T>];
};
export type NormalisedSummaryFieldDef<
  T extends number | { [k: string]: number },
  PlayerGameStats extends {},
> = {
  getFields: (playerData: PlayerGameStats, playerId: string) => T;
  rows: SummaryFieldRow<T>[];
  extended?: {
    groupLabel: string;
    rows: SummaryFieldRow<T>[];
  };
};
// const isSingleDef = <S extends number, M extends { [k: string]: number }, PlayerGameStats extends {}>(def: SingleValSummaryFieldDef<S, PlayerGameStats> | MultiValSummaryFieldDef<M, PlayerGameStats>): def is SingleValSummaryFieldDef<S, PlayerGameStats> =>
//   Object.hasOwn(def, "label") && Object.hasOwn(def, "value");
// export const normaliseFieldDef: {
//   <T extends number, PlayerGameStats extends {}>(def: SingleValSummaryFieldDef<T, PlayerGameStats>): NormalisedSummaryFieldDef<T, PlayerGameStats>;
//   <T extends { [k: string]: number }, PlayerGameStats extends {}>(def: MultiValSummaryFieldDef<T, PlayerGameStats>): NormalisedSummaryFieldDef<T, PlayerGameStats>;
// } = <S extends number, M extends { [k: string]: number }, PlayerGameStats extends {}>(def: SingleValSummaryFieldDef<S, PlayerGameStats> | MultiValSummaryFieldDef<M, PlayerGameStats>): NormalisedSummaryFieldDef<S, PlayerGameStats> | NormalisedSummaryFieldDef<M, PlayerGameStats> => {
//   if (isSingleDef(def)) {
//     let display: (val: number, isDelta: boolean) => VNodeChild;
//     if (def.display === undefined) {
//       display = val => val;
//     } else if (typeof def.display === "function") {
//       display = def.display as typeof display;
//     } else {
//       const formats = getVDNumFormat(def.display);
//       display = (val, isDelta) => (isDelta ? formats.delta : formats.value).format(val);
//     }
//     return {
//       get: def.value,
//       rows: [{
//         label: def.label,
//         display: display as (val: S, isDelta: boolean) => VNodeChild,
//         highlight: normaliseHighlight(def.highlight, def.cmp),
//         cmpValue: v => v,
//         fieldTooltip: def.fieldTooltip,
//         valueTooltip: def.valueTooltip,
//       }],
//     } satisfies NormalisedSummaryFieldDef<S, PlayerGameStats>;
//   } else {
//     type MetaGetter = <K extends keyof M>(field: K) => MultiValFieldMeta<M[K]>;
//     let getMeta: MetaGetter;
//     if (typeof def.meta === "function") {
//       getMeta = def.meta;
//     } else if (Object.hasOwn(def.meta, "fieldMeta")) {
//       const meta = (def.meta as any).fieldMeta as { [K in keyof M]: MultiValFieldMeta<M[K]> } | MetaGetter;
//       if (typeof meta === "function") {
//         getMeta = meta;
//       } else {
//         getMeta = <K extends keyof M>(field: K) => meta[field];
//       }
//     } else {
//       const meta = def.meta as {
//         fallback: MultiValFieldMeta<number>;
//         field?: { [K in keyof M]?: Partial<MultiValFieldMeta<M[K]>> };
//       };
//       getMeta = <K extends keyof M>(field: K) => {
//         return meta.field && meta.field[field] ? {
//           cmp: meta.field[field].cmp ?? meta.fallback.cmp,
//           deltaDirection: meta.field[field].deltaDirection ?? meta.fallback.deltaDirection,
//           highlight: meta.field[field].highlight ?? meta.fallback.highlight,
//           format: meta.field[field].format ?? meta.fallback.format,
//         } : meta.fallback;
//       };
//     }
//     return {
//       // @ts-expect-error
//       get: typeof def.values === "function" ? def.values : (pData, pid) => mapObjectValues(def.values, f => f(pData, pid)),
//       rows: def.rows.map(({ label, display, valueField, fieldTooltip, valueTooltip }) => {
//         const fieldMeta = typeof valueField === "function"
//           ? (vals: M) => {
//             const field = valueField(vals);
//             return {
//               field,
//               meta: getMeta(field),
//             };
//           }
//           : () => ({
//             field: valueField,
//             meta: getMeta(valueField),
//           });
//         return {
//           label,
//           display: typeof display === "function"
//             ? display as (val: M, isDelta: boolean) => VNodeChild
//             : (vals, isDelta) => Object.hasOwn(vals, display)
//               ? ,
//           highlight: (vals, limits) => {
//             const {field, meta} = fieldMeta(vals);
//             return meta.highlight
//               ? normaliseHighlight(meta.highlight, meta.cmp)(vals[field], limits)
//               : undefined;
//           },
//           cmpValue: vals => vals[typeof valueField === "function" ? valueField(vals) : valueField],
//           fieldTooltip,
//           valueTooltip,
//         } satisfies SummaryFieldRow<M>;
//       }),
//     } satisfies NormalisedSummaryFieldDef<M, PlayerGameStats>;
//   }
// }
// type SummaryFieldRowTypes<
// G extends GameDefinition<any, any, any, any, any, any, any, any, any>,
// SummaryPartTypes extends { [k: string]: [any, string] | [any, any, string] },
// RoundsField extends string,
// > = {
//   [K in keyof]
// }
export type SummaryFieldRowTypes<
  G extends GameDefinition<any, any, any, any, any, any, any, any, any>,
  SummaryPartTypes extends { [k: string]: [any] | [any, any] },
  RoundsField extends string,
  Parts extends SummaryAccumulatorParts<G, SummaryPartTypes, RoundsField> = SummaryAccumulatorParts<
    G,
    SummaryPartTypes,
    RoundsField
  >,
> = {
  [K in keyof Parts]: Parts[K] extends SummaryPartAccumulatorWithMeta<any, infer T, infer M>
    ? [T, M]
    : Parts[K] extends SummaryPartAccumulator<any, infer T>
      ? [T]
      : never;
};
