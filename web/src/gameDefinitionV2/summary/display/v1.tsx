import { createRecord, extendClass, mapObjectValues, type ClassBindings } from "@/utils";
import type {
  SummaryAccumulatorParts,
  SummaryPartAccumulator,
  SummaryPartAccumulatorWithMeta,
} from "..";
import type { GameDefinition } from "../../definition";
import type { ComparisonResult } from "..";
import type { VNodeChild } from "vue";
import {
  getVDNumFormat,
  type DeltaDirection,
  type DeltaDirectionDef,
  type NumericHighlightDef,
} from ".";

type RowFieldDisplay<
  Fields extends string,
  T extends { [K in Fields]: number } = { [K in Fields]: number },
> = (vals: T, deltas: Partial<T>) => VNodeChild;
type RowDisplayPart<
  Field extends string,
  T extends { [K in Field]: number } = { [K in Field]: number },
> =
  | {
      type: "literal";
      value: VNodeChild;
    }
  | {
      type: "field";
      field: Field;
      displayValue: boolean; //(val: V) => boolean;
      displayDelta: boolean; //(delta: V) => boolean;
      deltaClass?: ClassBindings;
      // valueFmt: ((val: V) => VNodeChild) | null;
      // deltaFmt: ((delta: V) => VNodeChild) | null;
    }
  | {
      type: "func";
      func: (values: T, deltas: Partial<T>) => RowDisplayParts<Field, T>;
    };
class RowDisplayParts<
  Fields extends string,
  T extends { [K in Fields]: number } = { [K in Fields]: number },
> {
  constructor(readonly parts: RowDisplayPart<Fields, T>[]) {}
  display<PData extends {}>(
    fields: NormalisedFields<T, PData>,
  ): (values: T, deltas: Partial<T>) => VNodeChild {
    const parts = this.parts.flatMap((part) => {
      if (part.type === "literal") {
        return [part];
      } else if (part.type === "func") {
        return [part];
      } else if (!fields.keys.has(part.field)) {
        return [
          {
            type: "literal" as "literal",
            value: part.field,
          },
        ];
      } else {
        const f = part.field;
        const fmt = fields.format[f];
        const deltaDir = fields.deltaDirection[f];
        const fmtParts: (
          | RowDisplayPart<Fields, T>
          | {
              type: "fieldFormatted";
              delta: boolean;
              field: Fields;
              display: (val: T[Fields]) => VNodeChild;
            }
        )[] = [];
        if (part.displayValue) {
          fmtParts.push({
            type: "fieldFormatted" as "fieldFormatted",
            delta: false,
            field: f,
            display: (v) => fmt(v, false),
          });
        }
        if (part.displayDelta && deltaDir) {
          fmtParts.push({
            type: "fieldFormatted" as "fieldFormatted",
            delta: true,
            field: f,
            display: (v) => {
              const dir = deltaDir(v);
              return dir ? (
                <span class={extendClass(part.deltaClass, "summaryDeltaValue", dir)}>
                  {fmt(v, false)}
                </span>
              ) : undefined;
            },
          });
        }
        return fmtParts;
      }
    });
    console.log("Row display parts formatted:", parts); //XXX
    return (values, deltas) =>
      parts.flatMap((part) => {
        switch (part.type) {
          case "literal":
            return [part.value];
          case "func": {
            return part.func(values, deltas).display(fields)(values, deltas);
          }
          case "fieldFormatted": {
            const val = (part.delta ? deltas : values)[part.field];
            if (val !== undefined) {
              return part.display(val);
              // const res = part.display(val);
              // return res !== undefined ? [res] : []
            }
          }
        }
        return [];
      });
  }
}
class __RowFieldDisplayInst<
  Fields extends string,
  T extends { [K in Fields]: number } = { [K in Fields]: number },
> {
  protected readonly ROW_FIELD_DISPLAY = true;
}
type RowFieldKeys<Fields extends string> =
  | Fields
  | (keyof ({} & { [K in Fields as `${K}:d+`]: any } & { [K in Fields as `${K}:d-`]: any } & {
      [K in Fields as `${K}:dN`]: any;
    } & { [K in Fields as `${K}:delta+`]: any } & { [K in Fields as `${K}:delta-`]: any } & {
      [K in Fields as `${K}:deltaN`]: any;
    } & { [K in Fields as `${K}:-d`]: any } & { [K in Fields as `${K}:-delta`]: any } & {
      [K in Fields as `${K}:noDelta`]: any;
    }) &
      string);
export const row =
  <Fields extends string, T extends { [K in Fields]: number } = { [K in Fields]: number }>(
    template: TemplateStringsArray,
    ...params: RowFieldKeys<Fields>[]
  ): RowFieldDisplay<Fields, T> =>
  (vals, deltas) => {
    const ret: VNodeChild = [];
    let i = 0;
    while (i < params.length) {
      if (template[i].length > 0) {
        ret.push(template[i]);
      }
      const match =
        /(?<fieldStr>.+?)(?:(?<noDelta>(?::-d(?:elta)?|:noDelta|(?=$)))|(?::(?:d(?:elta)?)?(?<deltaDir>[+\-N])))$/i.exec(
          params[i],
        );
      if (match) {
        const { fieldStr, noDelta, deltaDir } = match.groups!;
        if (Object.hasOwn(vals, fieldStr)) {
          const field = fieldStr as Fields;
          const deltaDirection: DeltaDirection | undefined =
            noDelta === undefined
              ? undefined
              : deltaDir === "+"
                ? "better"
                : deltaDir === "-"
                  ? "worse"
                  : "neutral";
          ret.push(vals[field]);
          if (deltaDirection && Object.hasOwn(deltas, field)) {
            ret.push(
              <span class={["summaryDeltaValue", deltaDirection, "nonAbsSummaryDelta"]}>
                {deltas[field]}
              </span>,
            );
          }
        } else {
          ret.push(params[i]);
        }
      } else if (Object.hasOwn(vals, params[i])) {
        ret.push(vals[params[i] as Fields]);
      } else {
        ret.push(params[i]);
      }
      i++;
    }
    if (template[i].length > 0) {
      ret.push(template[i]);
    }
    return ret;
  };
export const row2 = <
  Fields extends string,
  T extends { [K in Fields]: number } = { [K in Fields]: number },
>(
  template: TemplateStringsArray,
  ...params: (
    | RowFieldKeys<Fields>
    | ((values: T, delta: Partial<T>) => RowDisplayParts<Fields, T>)
  )[]
): RowDisplayParts<Fields, T> => {
  const parts: RowDisplayPart<Fields, T>[] = [];
  let i = 0;
  while (i < params.length) {
    if (template[i].length > 0) {
      parts.push({
        type: "literal",
        value: template[i],
      });
    }
    const p = params[i];
    if (typeof p === "function") {
      parts.push({
        type: "func",
        func: p,
      });
    } else {
      const match =
        /(?<fieldStr>.+?)(?:(?<noDelta>(?::-d(?:elta)?|:noDelta|(?=$)))|(?::(?:d(?:elta)?)?(?<deltaDir>[+\-N])))$/i.exec(
          p,
        );
      if (match) {
        const { fieldStr, noDelta, deltaDir } = match.groups!;
        // console.log("MATCH:", match, match.groups);//XXX
        const field = fieldStr as Fields;
        const deltaDirection: DeltaDirection | undefined =
          noDelta !== undefined
            ? undefined
            : deltaDir === "+"
              ? "better"
              : deltaDir === "-"
                ? "worse"
                : "neutral";
        parts.push({
          type: "field",
          field: field,
          displayValue: true,
          displayDelta: deltaDirection !== undefined,
          deltaClass: "nonAbsSummaryDelta", // Is this correct?
        });
      } else {
        console.warn("How the hell did I get here? Regex should always succeed", p);
        // parts.push({
        //   type: "field",
        //   field: params[i],
        // });
      }
    }
    i++;
  }
  if (template[i].length > 0) {
    parts.push({
      type: "literal",
      value: template[i],
    });
  }
  console.log("Row display parts:", parts); //XXX
  return new RowDisplayParts(parts);
};

const normaliseHighlight = <T extends number>(
  def: NumericHighlightDef,
  cmp: (a: T, b: T) => number,
): ((value: number, limits: { highest: number; lowest: number }) => ClassBindings) => {
  if (typeof def === "function") {
    return (val, limits) => def(val, limits);
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
  highlight: NumericHighlightDef;
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
  highlight?: NumericHighlightDef;
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
  cmpField: (vals: T) => keyof T & string;
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
  extended?: {
    label: () => VNodeChild;
    rows: SummaryRow<T>[];
  };
};
export type SingleFieldDef<N extends number, PlayerGameStats extends {}> = {
  label: string | (() => VNodeChild);
  value: (playerData: PlayerGameStats, playerId: string) => N;
  cmp: (a: N, b: N) => N;
  /**
   * If "positive", higher values are better. If "negative", lower values are better. If "neutral", no values are better than others (e.g. numGames).
   * If a function returning "equal", the delta will not be displayed (i.e. there is no change). Otherwise return is self explanitary.
   */
  deltaDirection?: DeltaDirectionDef<N>;
  highlight: NumericHighlightDef;
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
  cmpField: (keyof T & string) | ((vals: T) => keyof T & string);
  highlight: NumericHighlightDef;
  display:
    | (keyof T & string)
    | string
    | RowDisplayParts<keyof T & string, T>
    | ((vals: T, deltas: Partial<T>) => VNodeChild);
  /** Tooltip / hover over row. Overriden by `valueTooltip` if defined and hovering over value cell */
  fieldTooltip?: () => VNodeChild;
  /** Tooltip / hover over value */
  valueTooltip?: (vals: T, deltas: Partial<T> /*, playerData: PlayerGameStats*/) => VNodeChild;
};
type RowRef = {
  rowRef: number;
  labelOverride: string | (() => VNodeChild);
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
        : display instanceof RowDisplayParts
          ? display.display(fields)
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
                  const match = /^\$\{([^}]+)\}$/.exec(s);
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
                          <span class={["summaryDeltaValue", deltaDir, "nonAbsSummaryDelta"]}>
                            {fmt(delta!, true)}
                          </span>
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
      if ([...Object.keys(vals)].every((k) => ["count", "furthest", "rate"].includes(k)))
        console.log(`Highlighting: field = ${f}; val = ${val}; limits:`, limits); //XXX
      const cmp = fields.cmp[f];
      if (typeof highlight === "function") {
        return highlight(val, limits);
      }
      return mapObjectValues(highlight, (criteria) => {
        if (criteria === "highest") {
          return cmp(val, limits.highest as T[keyof T & string]) === 0;
        }
        if (criteria === "lowest") {
          return cmp(val, limits.lowest as T[keyof T & string]) === 0;
        }
        if (typeof criteria === "number") {
          return cmp(val, criteria as T[keyof T & string]) === 0;
        }
        return criteria as boolean;
      });
    },
    fieldTooltip,
    valueTooltip,
  };
};
const isRowRef = <T extends { [k: string]: number }>(
  row: MultiFieldRowDef<T> | RowRef,
): row is RowRef => Object.hasOwn(row, "rowRef");
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
        | {
            [K in keyof T]?:
              | Intl.NumberFormat
              | Intl.NumberFormatOptions
              | ((val: T[K], isDelta: boolean) => VNodeChild);
          };
      /**
       * If "positive", higher values are better. If "negative", lower values are better. If "neutral", no values are better than others (e.g. numGames).
       * If a function returning "equal", the delta will not be displayed (i.e. there is no change). Otherwise return is self explanitary.
       */
      deltaDirection?:
        | (<K extends keyof T>(field: K, delta: T[K]) => DeltaDirection)
        | { [K in keyof T]?: DeltaDirectionDef<T[K]> }
        | "positive"
        | "negative"
        | "neutral";
    }
  | {
      cmp: { [K in keyof T]: (a: T[K], b: T[K]) => number };
      format: {
        [K in keyof T]?:
          | Intl.NumberFormat
          | Intl.NumberFormatOptions
          | ((val: T[K], isDelta: boolean) => VNodeChild);
      };
      /**
       * If "positive", higher values are better. If "negative", lower values are better. If "neutral", no values are better than others (e.g. numGames).
       * If a function returning "equal", the delta will not be displayed (i.e. there is no change). Otherwise return is self explanitary.
       */
      deltaDirection?:
        | { [K in keyof T]?: DeltaDirectionDef<T[K]> }
        | "positive"
        | "negative"
        | "neutral";
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
export type MultiFieldDef<T extends { [k: string]: any }, PlayerGameStats extends {}> = {
  fields: FieldsMetaDef<T, PlayerGameStats>;
  rows: MultiFieldRowDef<T>[];
  extended?: {
    label: string | (() => VNodeChild);
    rows: (MultiFieldRowDef<T> | RowRef)[];
  };
};
const isMultiDef = <N extends number, T extends { [k: string]: any }, PlayerGameStats extends {}>(
  def: SingleFieldDef<N, PlayerGameStats> | MultiFieldDef<T, PlayerGameStats>,
): def is MultiFieldDef<T, PlayerGameStats> => Object.hasOwn(def, "fields");
export const normaliseFieldRows: {
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
      getValues,
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
          : createRecord(keys, (k) => {
              const fmt = format as {
                [K in keyof T]?:
                  | Intl.NumberFormat
                  | Intl.NumberFormatOptions
                  | ((val: T[K], isDelta: boolean) => VNodeChild);
              };
              const f = fmt[k];
              if (typeof f === "function") {
                return f as <K extends keyof T>(val: T[K], isDelta: boolean) => VNodeChild;
              }
              const { value, delta } = getVDNumFormat(
                f === undefined
                  ? ({} as Intl.NumberFormatOptions)
                  : f instanceof Intl.NumberFormat
                    ? f.resolvedOptions()
                    : f,
              );
              return (val, isDelta) => (isDelta ? delta : value).format(val);
            }),
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
            : typeof deltaDirection === "string"
              ? [...keys].reduce(
                  (acc, k) => {
                    switch (deltaDirection) {
                      case "positive": {
                        acc[k] = (delta) =>
                          delta > 0 ? "better" : delta < 0 ? "worse" : undefined;
                        break;
                      }
                      case "negative": {
                        acc[k] = (delta: number) =>
                          delta < 0 ? "better" : delta > 0 ? "worse" : undefined;
                        break;
                      }
                      case "neutral": {
                        acc[k] = () => "neutral";
                        break;
                      }
                    }
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
    const rows = def.rows.map((row) => makeRow(row, fields));
    return {
      fields,
      rows,
      extended: def.extended
        ? {
            label:
              typeof def.extended.label === "function"
                ? def.extended.label
                : () => def.extended!.label as string,
            rows: def.extended.rows.map((row) =>
              isRowRef(row)
                ? row.labelOverride !== undefined
                  ? {
                      ...rows[row.rowRef],
                      label:
                        typeof row.labelOverride === "function"
                          ? row.labelOverride
                          : () => row.labelOverride as string,
                    }
                  : rows[row.rowRef]
                : makeRow(row, fields),
            ),
          }
        : undefined,
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
