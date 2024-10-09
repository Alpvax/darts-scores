import type { VNodeChild } from "vue";
import {
  getVDNumFormat,
  makeHighlightFn,
  type CmpFn,
  type DeltaDirection,
  type DeltaDirectionDef,
  type HighlightDef,
  type HighlightFn,
  type RowHighlightDefinition,
} from ".";

type RowLabelDef = VNodeChild | ((extended: boolean) => VNodeChild);

type SimpleSummaryRow<PData> = {
  /** added to row as data-summary-row, if undefined then label(.innerText if element) is used instead */
  key?: string;
  label: RowLabelDef;
  value: (playerData: PData, playerId: string) => number;
  cmp: (a: number, b: number) => number;
  /**
   * If "positive", higher values are better. If "negative", lower values are better. If "neutral", no values are better than others (e.g. numGames).
   * If a function returning "equal", the delta will not be displayed (i.e. there is no change). Otherwise return is self explanitary.
   */
  deltaDirection?: DeltaDirectionDef<number>;
  highlight?: HighlightDef;
  format?:
    | Intl.NumberFormatOptions
    | ((value: number, isDelta: boolean /*, playerData: PlayerGameStats*/) => VNodeChild);
  /** Tooltip / hover over row. Overriden by `valueTooltip` if defined and hovering over value cell */
  fieldTooltip?: () => VNodeChild;
  /** Tooltip / hover over value */
  valueTooltip?: (value: number, delta?: number /*, playerData: PlayerGameStats*/) => VNodeChild;
};

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
  value: (values: PData, playerId: string, totalNumGames: number) => number;
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
  /**
   * If value has highlights, an object with the comparison function
   */
  highlight?: {
    cmp: CmpFn<number>;
    f: HighlightFn;
  };
};
type NestedDisplayPart<PData extends { numGames: number }> = {
  type: "nested";
  func: (
    values: PData,
    deltas: Partial<PData>,
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

const test: FieldOptsSpec = {
  format: {
    value: {},
    delta: {},
  },
  // cmp: (a, b) => "equal",
};

type FieldOptsSpec = {
  cmp?: CmpFn<number>;
  format?: FieldFormatSpec;
  highlightSpec?: HighlightDef;
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
    const { cmp, format, deltaSpec, highlightSpec } = opts ?? {};
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
    let highlightFn: undefined | HighlightFn;
    if (highlightSpec !== undefined) {
      if (cmp === undefined) {
        console.warn("Cannot specify highlightSpec without specifying cmp function:", {
          highlightSpec,
          cmp,
        });
      } else {
        highlightFn = makeHighlightFn(highlightSpec)(cmp);
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
      highlight:
        cmp && highlightFn
          ? {
              cmp,
              f: highlightFn,
            }
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
  display(values: PData, deltas: Partial<PData>, playerId: string): VNodeChild {
    const display_part = (part: RowDisplayPart<PData>): VNodeChild[] => {
      switch (part.type) {
        case "field": {
          const parts: VNodeChild[] = [];
          if (part.valueFormat) {
            parts.push(part.valueFormat(part.value(values, playerId, values.numGames)));
          }
          if (part.deltaFormat) {
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
          if (part.highlight) {
            console.log("TODO: implement highlight (probably not at this level!)", part.highlight);
            // return [<span class={part.highlight.f()}>{parts}</span>]
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
