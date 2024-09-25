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

type DeltaDirectionDef<T extends number> = ((delta: T) => ComparisonResult) | "positive" | "negative" | "neutral";
type HighlightDef = ((value: number, limits: { highest: number; lowest: number }) => ClassBindings) | {
  [clas: string]: "highest" | "lowest" | number | boolean;
};
const normaliseHighlight = <T extends number>(def: HighlightDef, cmp: (a: T, b: T) => number): (value: number, limits: { highest: number; lowest: number }) => ClassBindings => {
  if (typeof def === "function") {
    return def;
  }
  return (val, {highest, lowest}) => mapObjectValues(def, (criteria) => {
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
  })
}
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
  display?: Intl.NumberFormatOptions | ((value: T, isDelta: boolean/*, playerData: PlayerGameStats*/) => VNodeChild);
  /** Tooltip / hover over label */
  fieldTooltip?: () => VNodeChild;
  /** Tooltip / hover over value */
  valueTooltip?: (value: T, delta?: T/*, playerData: PlayerGameStats*/) => VNodeChild;
}
type MultiValFieldMeta<T extends number> = {
  cmp: (a: T, b: T) => number;
  /**
   * If "positive", higher values are better. If "negative", lower values are better. If "neutral", no values are better than others (e.g. numGames).
   * If a function returning "equal", the delta will not be displayed (i.e. there is no change). Otherwise return is self explanitary.
   */
  deltaDirection?: DeltaDirectionDef<T>;
  highlight?: HighlightDef;
  format?: Intl.NumberFormatOptions; 
}
type MultiValRow<K extends keyof T, T extends { [k: string]: number }, PlayerGameStats extends {}> = {
  label: string;
  display: string | K | ((fields: T) => VNodeChild);
  highlightField: K | ((fields: T) => K);
  /** Tooltip / hover over label */
  fieldTooltip?: () => VNodeChild;
  /** Tooltip / hover over value */
  valueTooltip?: (value: Pick<T, K>, delta: Pick<T, K> | undefined/*, playerData: PlayerGameStats*/) => VNodeChild;
}
type MultiValSummaryFieldDef<T extends { [k: string]: number }, PlayerGameStats extends {}> = {
  groupLabel: string;
  values: {
    [K in keyof T]: (playerData: PlayerGameStats, playerId: string) => T[K];
  } | ((playerData: PlayerGameStats, playerId: string) => T);
  meta: {
    fallback: MultiValFieldMeta<number>;
    field?: { [K in keyof T]?: Partial<MultiValFieldMeta<T[K]>> };
  } | {
    fallback?: undefined;
    fieldMeta: { [K in keyof T]: MultiValFieldMeta<T[K]> } | (<K extends keyof T>(field: K) => MultiValFieldMeta<T[K]>);
  } | (<K extends keyof T>(field: K) => MultiValFieldMeta<T[K]>);
  rows: MultiValRow<keyof T, T, PlayerGameStats>[];
  extendedRows?: MultiValRow<keyof T, T, PlayerGameStats>[];
}
type SummaryFieldRow<T extends number | { [k: string]: number }> = {
  label: string;
  display: (val: T, isDelta: boolean) => VNodeChild;
  highlight: (val: T, limits: { highest: number; lowest: number }) => ClassBindings;
  value: (fields: T) => number;
  /** Tooltip / hover over label */
  fieldTooltip?: () => VNodeChild;
  /** Tooltip / hover over value */
  valueTooltip?: (value: T, delta?: T) => VNodeChild;
}
export type SummaryFieldDefV2<T extends number | { [k: string]: number }, PlayerGameStats extends {}> =
  T extends { [k: string]: number } ? MultiValSummaryFieldDef<T, PlayerGameStats>
  : T extends number ? SingleValSummaryFieldDef<T, PlayerGameStats> : never;
export type NormalisedSummaryFieldDef<T extends number | { [k: string]: number }, PlayerGameStats extends {}> = {
  get: (playerData: PlayerGameStats, playerId: string) => T;
  rows: SummaryFieldRow<T>[];
  extended?: {
    groupLabel: string;
    rows: SummaryFieldRow<T>[];
  };
}
const isSingleDef = <S extends number, M extends { [k: string]: number }, PlayerGameStats extends {}>(def: SingleValSummaryFieldDef<S, PlayerGameStats> | MultiValSummaryFieldDef<M, PlayerGameStats>): def is SingleValSummaryFieldDef<S, PlayerGameStats> =>
  Object.hasOwn(def, "label") && Object.hasOwn(def, "value");
export const normaliseFieldDef: {
  <T extends number, PlayerGameStats extends {}>(def: SingleValSummaryFieldDef<T, PlayerGameStats>): NormalisedSummaryFieldDef<T, PlayerGameStats>;
  <T extends { [k: string]: number }, PlayerGameStats extends {}>(def: MultiValSummaryFieldDef<T, PlayerGameStats>): NormalisedSummaryFieldDef<T, PlayerGameStats>;
} = <S extends number, M extends { [k: string]: number }, PlayerGameStats extends {}>(def: SingleValSummaryFieldDef<S, PlayerGameStats> | MultiValSummaryFieldDef<M, PlayerGameStats>): NormalisedSummaryFieldDef<S, PlayerGameStats> | NormalisedSummaryFieldDef<M, PlayerGameStats> => {
  if (isSingleDef(def)) {
    let display: (val: number, isDelta: boolean) => VNodeChild;
    if (def.display === undefined) {
      display = val => val;
    } else if (typeof def.display === "function") {
      display = def.display as typeof display;
    } else {
      const formats = getVDNumFormat(def.display);
      display = (val, isDelta) => (isDelta ? formats.delta : formats.value).format(val);
    }
    return {
      get: def.value,
      rows: [{
        label: def.label,
        display: display as (val: S, isDelta: boolean) => VNodeChild,
        highlight: normaliseHighlight(def.highlight, def.cmp),
        value: v => v,
        fieldTooltip: def.fieldTooltip,
        valueTooltip: def.valueTooltip,
      }],
    } satisfies NormalisedSummaryFieldDef<S, PlayerGameStats>;
  } else {
    type MetaGetter = <K extends keyof M>(field: K) => MultiValFieldMeta<M[K]>;
    let getMeta: MetaGetter;
    if (typeof def.meta === "function") {
      getMeta = def.meta;
    } else if (Object.hasOwn(def.meta, "fieldMeta")) {
      const meta = (def.meta as any).fieldMeta as { [K in keyof M]: MultiValFieldMeta<M[K]> } | MetaGetter;
      if (typeof meta === "function") {
        getMeta = meta;
      } else {
        getMeta = <K extends keyof M>(field: K) => meta[field];
      }
    } else {
      const meta = def.meta as {
        fallback: MultiValFieldMeta<number>;
        field?: { [K in keyof M]?: Partial<MultiValFieldMeta<M[K]>> };
      };
      getMeta = <K extends keyof M>(field: K) => {
        return meta.field && meta.field[field] ? {
          cmp: meta.field[field].cmp ?? meta.fallback.cmp,
          deltaDirection: meta.field[field].deltaDirection ?? meta.fallback.deltaDirection,
          highlight: meta.field[field].highlight ?? meta.fallback.highlight,
          format: meta.field[field].format ?? meta.fallback.format,
        } : meta.fallback;
      };
    }
    return {
      // @ts-expect-error
      get: typeof def.values === "function" ? def.values : (pData, pid) => mapObjectValues(def.values, f => f(pData, pid)),
      rows: def.rows.map(({ label, display, highlightField, fieldTooltip, valueTooltip }) => {
        const fieldMeta = typeof highlightField === "function"
          ? (vals: M) => {
            const field = highlightField(vals);
            return {
              field,
              meta: getMeta(field),
            };
          }
          : () => ({
            field: highlightField,
            meta: getMeta(highlightField),
          });
        return {
          label,
          display: typeof display === "function"
            ? display as (val: M, isDelta: boolean) => VNodeChild
            : (val, isDelta) => val,
          highlight: (vals, limits) => {
            const {field, meta} = fieldMeta(vals);
            return meta.highlight
              ? normaliseHighlight(meta.highlight, meta.cmp)(vals[field], limits)
              : undefined;
          },
          value: typeof value === "string" ? vals => vals[value] : value,
          fieldTooltip,
          valueTooltip,
        } satisfies SummaryFieldRow<M>;
      }),
    } satisfies NormalisedSummaryFieldDef<M, PlayerGameStats>;
  }
}
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
