import type { VNodeChild } from "vue";
import {
  getVDNumFormat,
  type CmpFn,
  type DeltaDirection,
  type RowHighlightDefinition,
  type RowLabelDef,
} from ".";

export type SummaryRow<PData extends { numGames: number }> = {
  /** Added to type to allow using `group` as a descriminator */
  group?: never;
  /** added to row as data-summary-row, if undefined then label(.innerText if element) is used instead */
  key?: string;
  label: RowLabelDef;
  display: RowFormat<PData>;
  highlight?: RowHighlightDefinition<PData>;
  /** Tooltip / hover over row. Overriden by `valueTooltip` if defined and hovering over value cell */
  fieldTooltip?: () => VNodeChild;
  /** Tooltip / hover over value */
  valueTooltip?: (values: PData, deltas: Partial<PData>, playerId: string) => VNodeChild;
};
export type SummaryRowGroup<PData extends { numGames: number }> = {
  /** added to row as data-summary-row, if undefined then label(.innerText if element) is used instead */
  group: string;
  label: RowLabelDef;
  rows: (Omit<SummaryRow<PData>, "group"> & {
    showExtended: boolean;
    showDefault: boolean;
  })[];
  noExpand?: boolean;
  /** Fallback Tooltip / hover. Only used when no child hover is available */
  groupTooltip?: () => VNodeChild;
};
export type SummaryFieldRow<PData extends { numGames: number }> =
  | SummaryRow<PData>
  | SummaryRowGroup<PData>;

type LiteralDisplayPart = {
  type: "literal";
  value: VNodeChild;
};
type FieldDisplayPart<PData> = {
  type: "field";
  value: (values: PData, playerId: string, totalNumGames: number) => number | undefined;
  /**
   * Normalised function to convert the raw value to a displayable value for inserting into the cell.
   * If undefined, the value will not be displayed.
   */
  valueFormat?: (value: number) => VNodeChild;
  /**
   * Normalised function to convert the raw delta value to a displayable value for inserting into the cell.
   * If undefined, the delta value will not be displayed.
   */
  deltaFormat?: (delta: number) => VNodeChild;
};
type NestedDisplayPart<PData extends { numGames: number }> = {
  type: "nested";
  func: (
    values: PData,
    deltas: Partial<PData> | undefined,
    playerId: string,
  ) => RowDisplayPart<PData>[] | RowFormat<PData>;
};

type RowDisplayPart<PData extends { numGames: number }> =
  | LiteralDisplayPart
  | FieldDisplayPart<PData>
  | NestedDisplayPart<PData>;

type SplitFieldFormatSpec = {
  value: Intl.NumberFormatOptions | Intl.NumberFormat | null;
  delta: Intl.NumberFormatOptions | Intl.NumberFormat | null;
};
type FieldFormatSpec = SplitFieldFormatSpec | Intl.NumberFormatOptions | Intl.NumberFormat;
const isSplitFormat = (spec: FieldFormatSpec | undefined): spec is SplitFieldFormatSpec =>
  spec !== undefined && Object.hasOwn(spec, "value") && Object.hasOwn(spec, "delta");

type FieldOptsSpec = {
  cmp?: CmpFn<number>;
  format?: FieldFormatSpec;
  deltaSpec?: "positive" | "negative" | "neutral" | "none";
};

class RowFormatBuilder<PData extends { numGames: number }> {
  readonly parts: RowDisplayPart<PData>[] = [];
  literal(value: VNodeChild): this {
    this.parts.push({
      type: "literal",
      value,
    });
    return this;
  }
  nested(factory: NestedDisplayPart<PData>["func"]): this;
  nested(parts: RowDisplayPart<PData>[]): this;
  nested(builder: ThisType<PData>): this;
  nested(rowFmt: RowFormat<PData>): this;
  nested(
    arg:
      | NestedDisplayPart<PData>["func"]
      | RowDisplayPart<PData>
      | ThisType<PData>
      | RowFormat<PData>,
  ): this {
    if (typeof arg === "function") {
      this.parts.push({
        type: "nested",
        func: arg as NestedDisplayPart<PData>["func"],
      });
    } else {
      this.parts.push(
        ...(Array.isArray(arg)
          ? (arg as RowDisplayPart<PData>[])
          : (arg as RowFormatBuilder<PData> | RowFormat<PData>).parts),
      );
    }
    return this;
  }
  field(
    value: (values: PData, playerId: string, totalNumGames: number) => number,
    opts?: FieldOptsSpec,
  ): this {
    const { cmp, format, deltaSpec } = opts ?? {};
    let valueFormat: undefined | ((value: number) => VNodeChild);
    let deltaDir: undefined | ((delta: number) => DeltaDirection);
    let deltaFmt: undefined | ((value: number) => VNodeChild);
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
    } else if (cmp) {
      deltaDir = (d) => {
        const r = cmp!(d, 0);
        return r === "equal" ? undefined : r;
      };
    }
    if (isSplitFormat(format)) {
      if (format.value !== null) {
        const fmt =
          format.value instanceof Intl.NumberFormat
            ? format.value
            : getVDNumFormat(format.value).value;
        valueFormat = (v) => fmt.format(v);
      }
      if (deltaDir && format.delta !== null) {
        const fmt =
          format.delta instanceof Intl.NumberFormat
            ? format.delta
            : getVDNumFormat(format.delta).delta;
        deltaFmt = (d) => fmt.format(d);
      }
    } else {
      const { value, delta } = getVDNumFormat(format ?? {});
      valueFormat = (v) => value.format(v);
      if (deltaDir) {
        deltaFmt = (d) => delta.format(d);
      }
    }
    this.parts.push({
      type: "field",
      value,
      valueFormat,
      deltaFormat:
        deltaFmt && deltaDir
          ? (d) => (
              <span class={["summaryDeltaValue", deltaDir(d), "nonAbsSummaryDelta"]}>
                {deltaFmt(d)}
              </span>
            )
          : undefined,
    });
    return this;
  }
  build(): RowFormat<PData> {
    return RowFormat.create(this.parts);
  }
}
export const row = <PData extends { numGames: number }>(
  template: TemplateStringsArray,
  ...params: (
    | VNodeChild
    | ({
        value: (values: PData, playerId: string, totalNumGames: number) => number;
      } & FieldOptsSpec)
    | NestedDisplayPart<PData>["func"]
    | RowDisplayPart<PData>[]
    | RowDisplayPart<PData>
  )[]
): RowFormat<PData> => {
  const builder = RowFormat.builder<PData>();
  let i = 0;
  while (i < params.length) {
    if (template[i].length > 0) {
      builder.literal(template[i]);
    }
    const p = params[i];
    let unprocessed = true;
    if (typeof p === "function") {
      // Nested
      builder.nested(p);
      unprocessed = false;
    } else if (
      Array.isArray(p) &&
      p.every((p1) => typeof p1 === "object" && Object.hasOwn(p1 as object, "type"))
    ) {
      // Parts array
      builder.parts.push(...(p as RowDisplayPart<PData>[]));
      unprocessed = false;
    } else if (typeof p === "object") {
      const obj = p as object;
      if (Object.hasOwn(obj, "type")) {
        // Single part
        builder.parts.push(p as RowDisplayPart<PData>);
        unprocessed = false;
      } else if (Object.hasOwn(obj, "value") && typeof (obj as any)["value"] === "function") {
        // Field
        const { value, ...opts } = p as {
          value: (values: PData, playerId: string, totalNumGames: number) => number;
        } & FieldOptsSpec;
        builder.field(value, opts);
        unprocessed = false;
      }
    }
    if (unprocessed) {
      builder.literal(p as VNodeChild);
    }
    i++;
  }
  if (template[i].length > 0) {
    builder.literal(template[i]);
  }
  return builder.build();
};
export class RowFormat<PData extends { numGames: number }> {
  protected constructor(readonly parts: RowDisplayPart<PData>[]) {}
  static builder<PData extends { numGames: number }>() {
    return new RowFormatBuilder<PData>();
  }
  static create<PData extends { numGames: number }>(parts: RowDisplayPart<PData>[]) {
    return new RowFormat(parts);
  }
  /** Helper method to just create a simple single field display */
  static field<PData extends { numGames: number }>(
    value: (values: PData, playerId: string, totalNumGames: number) => number,
    opts?: FieldOptsSpec,
  ) {
    return this.builder<PData>().field(value, opts).build();
  }
  display(values: PData, deltas: Partial<PData> | undefined, playerId: string): VNodeChild {
    const display_part = (part: RowDisplayPart<PData>): VNodeChild[] => {
      switch (part.type) {
        case "field": {
          const parts: VNodeChild[] = [];
          if (part.valueFormat) {
            const value = part.value(values, playerId, values.numGames);
            if (value !== undefined) {
              parts.push(part.valueFormat(value));
            }
          }
          if (part.deltaFormat && deltas) {
            //TODO: Fix deltas being partial?
            try {
              const delta = part.value(deltas as PData, playerId, values.numGames);
              if (delta) {
                parts.push(part.deltaFormat(delta));
              }
            } catch {
              console.debug("Could not get delta from:", deltas);
            }
          }
          return parts;
        }
        case "literal":
          return [part.value as VNodeChild];
        case "nested":
          const child = part.func(values, deltas, playerId);
          return child instanceof RowFormat
            ? (child.display(values, deltas, playerId) as VNodeChild[])
            : child.flatMap(display_part);
      }
    };
    return this.parts.flatMap(display_part);
  }
}
