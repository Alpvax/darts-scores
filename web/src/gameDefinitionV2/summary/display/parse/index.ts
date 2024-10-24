import { z } from "zod";
import { makeFieldSchema, makeFieldObjSchema, type FieldSpec } from "./field";
import { formatOptionsSchema } from "./builtin";
import type { ClassBindings } from "@/utils";
import type { VNodeChild } from "vue";
import type { Flatten } from "@/utils/nestedKeys";

export { makeFieldSchema, isSameField } from "./field";

export const classBindingsSchema: z.ZodType<ClassBindings> = z
  .union([z.record(z.string().min(1), z.boolean()), z.array(z.string().min(1)), z.string().min(1)])
  .optional();

export const cmpResultSchema = z.enum(["better", "equal", "worse"]);
export const cmpFnSchema = <T extends z.ZodTypeAny>(schema: T) =>
  z.function().args(schema, schema).returns(cmpResultSchema);

const makeHighlightClassesSchema = <T extends z.ZodTypeAny>(schema: T) =>
  z.union([
    z.array(z.enum(["best", "worst"])),
    z.record(z.string().min(1), z.union([z.enum(["best", "worst"]), z.boolean(), z.number()])),
    z
      .function()
      .args(z.function().args(schema), z.object({ best: schema, worst: schema }), schema)
      .returns(classBindingsSchema),
  ]);

const makeArrayRowHighlightSchema = <PData>() =>
  z.object({
    values: z.function().args(z.custom<PData>(), z.string()).returns(z.array(z.number())),
    cmp: z.union([
      z.enum(["higher", "lower"]),
      cmpFnSchema(z.array(z.number())),
      z.array(cmpFnSchema(z.number())),
    ]),
    classes: makeHighlightClassesSchema(z.array(z.number())),
  });
const makeNumRowHighlightSchema = <PData>() =>
  z.object({
    value: z.function().args(z.custom<PData>(), z.string()).returns(z.number()),
    cmp: z.union([z.enum(["higher", "lower"]), cmpFnSchema(z.number())]),
    classes: makeHighlightClassesSchema(z.number()),
  });
// export type ObjRowHighlight<PData, T extends Record<any, number> = Record<any, number>> = {
//   values: (playerData: PData, playerId: string) => Partial<T>;
//   cmp:
//     | CmpFn<T>
//     | {
//         fields: "higher" | "lower" | { [K in keyof T]: CmpFn<T[K]> };
//         order: (keyof T)[];
//       };
//   classes:
//     | ((
//         cmp: (vals: T) => ComparisonResult,
//         limits: { [K in keyof T]: { best: T[K]; worst: T[K] } },
//         rawValues: T,
//       ) => ClassBindings)
//     | ("best" | "worst")[]
//     | {
//         [clas: string]: "best" | "worst" | Partial<T> | boolean;
//       };
// };
export const rowHighlightDefinition = <PData>() =>
  z.union([
    makeNumRowHighlightSchema<PData>(),
    makeArrayRowHighlightSchema<PData>(),
    // | ObjRowHighlight<PData, Record<any, number>>,
    z.object({
      getVal: z.function().args(z.custom<PData>(), z.string()).returns(z.array(z.number())),
      cmp: cmpFnSchema(z.array(z.number())),
      fn: z
        .function()
        .args(z.array(z.number()))
        .returns(
          z
            .function()
            .args(z.object({ best: z.array(z.number()), worst: z.array(z.number()) }))
            .returns(classBindingsSchema),
        ),
    }),
  ]);

type T = z.infer<ReturnType<typeof rowHighlightDefinition<{ numGames: number }>>>;

export const deltaOverrideSchema = z.enum(["none", "positive", "negative", "neutral"]);

export const fieldFormatSchema = z.union([
  formatOptionsSchema.transform((fmt) => ({
    value: fmt,
    delta: fmt,
  })),
  z.object({
    value: formatOptionsSchema,
    delta: formatOptionsSchema.optional(),
  }),
  z.object({
    value: formatOptionsSchema.optional(),
    delta: formatOptionsSchema,
  }),
]);

export const makeFormattedFieldSchema = <PData extends {}, Extra extends z.ZodRawShape = {}>(
  fieldValidator: (s: string) => s is keyof Flatten<PData> & string,
  extraFields?: Extra,
) =>
  z.preprocess(
    (arg) =>
      typeof arg === "string" && fieldValidator(arg) ? { type: "simple", field: arg } : arg,
    makeFieldObjSchema(fieldValidator).and(
      z.object({
        delta: deltaOverrideSchema.optional(),
        format: fieldFormatSchema.optional(),
        ...extraFields,
      }),
    ),
  );

type FormattedField<PData extends {}, Extra extends {} = {}> = FieldSpec<
  keyof Flatten<PData> & string
> & {
  delta?: z.infer<typeof deltaOverrideSchema>;
  format?: z.infer<typeof fieldFormatSchema>;
} & {
  [K in keyof Extra]: Extra[K] extends z.ZodTypeAny ? z.infer<Extra[K]> : Extra[K];
};

export const vNodeChildSchema = z.custom<VNodeChild>((data) => {
  const isVNodeChild = (data: any): boolean => {
    switch (typeof data) {
      case "string":
      case "number":
      case "boolean":
      case "undefined":
        return true;
      case "object":
        return (
          (Object.hasOwn(data, "type") &&
            Object.hasOwn(data, "shapeFlag") &&
            Object.hasOwn(data, "patchFlag")) ||
          (Array.isArray(data) && data.every(isVNodeChild))
        );
      case "bigint":
      case "symbol":
      case "function":
        return false;
    }
  };
  //TODO: implement VNodeChild checks
  return isVNodeChild(data);
});

const displaySchema = <PData extends {}>(
  fieldValidator: (s: string) => s is keyof Flatten<PData> & string,
  allowRefs: boolean,
) => {
  const rawPart = z.union([
    z
      .object({ raw: vNodeChildSchema })
      .transform(({ raw }) => ({ type: "raw" as "raw", value: raw })),
    z
      .object({ type: z.literal("raw"), value: vNodeChildSchema })
      .transform(({ value }) => ({ type: "raw" as "raw", value })),
  ]);
  const formattedField = makeFieldSchema(fieldValidator).and(
    z.object({
      delta: deltaOverrideSchema.optional(),
      format: fieldFormatSchema.optional(),
    }),
  );
  const fieldPart = allowRefs
    ? formattedField.or(
        z
          .object({ type: z.literal("ref").optional(), ref: z.string().min(1) })
          .transform(({ ref }) => ({ type: "ref" as "ref", ref })),
      )
    : formattedField;
  const displayPart = z.preprocess(
    (arg) =>
      typeof arg === "string"
        ? fieldValidator(arg)
          ? { type: "simple", field: arg }
          : { type: "raw", value: arg }
        : arg,
    fieldPart.or(rawPart),
  );
  return z
    .union([displayPart, z.array(displayPart)])
    .transform((part) => (Array.isArray(part) ? part : [part]));
};

const tooltipSchema = <PData extends {}>(
  fieldValidator: (s: string) => s is keyof Flatten<PData> & string,
  allowRefs: boolean,
) =>
  z
    .object({
      /** Tooltip / hover over row. Overriden by `valueTooltip` if defined and hovering over value cell */
      fieldTooltip: vNodeChildSchema
        .transform((content) => () => content)
        .or(z.function().args().returns(vNodeChildSchema)),
      /** Tooltip / hover over value */
      valueTooltip: displaySchema(fieldValidator, allowRefs).or(
        z
          .function()
          .args(z.custom<PData>(), z.custom<Partial<PData>>(), z.string().length(20))
          .returns(vNodeChildSchema),
      ),
    })
    .partial();

const singleFieldRowSchema = <PData extends {}>(
  fieldValidator: (s: string) => s is keyof Flatten<PData> & string,
) =>
  tooltipSchema(fieldValidator, false)
    .extend({
      field: makeFieldSchema(fieldValidator),
      delta: deltaOverrideSchema.optional(),
      format: fieldFormatSchema.optional(),
      ignoreClassValue: z.number().nullish(),
      classes: makeHighlightClassesSchema(z.number()),
    })
    .transform(({ field, delta, format, valueTooltip: vTooltipArgs, ...rest }, ctx) => {
      let errors = false;
      const valueTooltip =
        vTooltipArgs === undefined
          ? undefined
          : typeof vTooltipArgs === "function"
            ? vTooltipArgs
            : (pData: PData, playerId: string) =>
                vTooltipArgs.map((part) => {
                  if (part.type === "raw") {
                    return part.value;
                  } else {
                    if (part.type === "ref") {
                      errors = true;
                      ctx.addIssue({
                        code: z.ZodIssueCode.custom,
                        path: ["valueTooltip"],
                        message:
                          "Cannot use ref fields with single field schemas (no fieldDefs specified to reference)",
                        params: {
                          errorType: "singleField",
                          ref: part.ref,
                        },
                      });
                      `@@FIELD_REF:${part.ref}@@`;
                    } else {
                      return evaluateField(pData, playerId, part);
                    }
                  }
                });
      return errors
        ? z.NEVER
        : {
            field: {
              ...field,
              delta,
              format,
            },
            valueTooltip,
            ...rest,
          };
    });

const multiFieldRowSchema = <PData extends {}>(
  fieldValidator: (s: string) => s is keyof Flatten<PData> & string,
) => {
  const fieldOrRef = z.preprocess(
    (arg) =>
      typeof arg === "string"
        ? fieldValidator(arg)
          ? { type: "simple", field: arg }
          : { type: "ref", ref: arg }
        : arg,
    z.union([
      makeFieldObjSchema(fieldValidator),
      z
        .object({ type: z.literal("ref").optional(), ref: z.string().min(1) })
        .transform(({ ref }) => ({ type: "ref" as "ref", ref })),
    ]),
  );
  return tooltipSchema(fieldValidator, true)
    .extend({
      fieldDefs: z
        .record(
          z.string().min(1),
          makeFormattedFieldSchema(fieldValidator, {
            ignoreClassValue: z.number().nullish(),
          }),
        )
        .optional(),
      display: displaySchema(fieldValidator, true),
      highlight: z
        .object({
          order: z.array(fieldOrRef),
          classes: makeHighlightClassesSchema(z.array(z.number())),
        })
        .optional(),
    })
    .transform(({ fieldDefs, display, highlight, valueTooltip, ...rest }, ctx) => {
      let errors = false;
      const getFieldDef = (ref: string, ...path: string[]) => {
        if (fieldDefs === undefined) {
          errors = true;
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path,
            message: "No fieldDefs specified to reference",
            params: {
              errorType: "noDefs",
              ref,
            },
          });
          return undefined;
        } else {
          const def = fieldDefs[ref];
          if (def === undefined) {
            errors = true;
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path,
              message: `Attempting to reference fieldDef that doesn't exist: "${ref}"`,
              params: {
                errorType: "missing",
                ref,
              },
            });
          }
          return def;
        }
      };
      return errors
        ? z.NEVER
        : {
            display: display.map((part) => {
              if (part.type === "ref") {
                const field = getFieldDef(part.ref, "display");
                return field ?? { type: "raw", value: `@@INVALID_FIELD_REF:${part.ref}@@` };
              }
              return part;
            }),
            highlight:
              highlight === undefined
                ? undefined
                : {
                    order: highlight.order.flatMap((field) => {
                      if (field.type === "ref") {
                        const f = getFieldDef(field.ref, "highlight", "order");
                        return f === undefined ? [] : f;
                      }
                      return field;
                    }),
                    classes: highlight.classes,
                  },
            valueTooltip:
              valueTooltip === undefined
                ? undefined
                : typeof valueTooltip === "function"
                  ? valueTooltip
                  : (pData: PData, playerId: string) =>
                      valueTooltip.map((part) => {
                        if (part.type === "raw") {
                          return part.value;
                        } else {
                          if (part.type === "ref") {
                            const field = getFieldDef(part.ref, "valueTooltip");
                            return field
                              ? evaluateField(pData, playerId, field)
                              : `@@INVALID_FIELD_REF:${part.ref}@@`;
                          } else {
                            return evaluateField(pData, playerId, part);
                          }
                        }
                      }),
            ...rest,
          };
    });
};

export const makeRowSchema = <PData extends {}>(
  fieldValidator: (s: string) => s is keyof Flatten<PData> & string,
) =>
  z.union([
    singleFieldRowSchema<PData>(fieldValidator),
    multiFieldRowSchema<PData>(fieldValidator),
  ]);

export type RowSchemaArgsSingleField<PData extends {}> = z.input<
  ReturnType<typeof singleFieldRowSchema<PData>>
>;
export type RowSchemaArgsMultiField<PData extends {}> = z.input<
  ReturnType<typeof multiFieldRowSchema<PData>>
>;
export type RowSchemaArgs<PData extends {}> = z.input<ReturnType<typeof makeRowSchema<PData>>>;

const evaluateFieldNumeric = <PData extends {}>(
  pData: PData,
  playerId: string,
  field: FieldSpec<keyof Flatten<PData> & string>,
  fallback?: number,
): number => {
  const val = evaluateField(pData, playerId, field);
  if (typeof val === "number") {
    return val;
  }
  if (fallback) {
    console.warn("Attempted to evaluate field as numeric value. Using fallback", {
      field,
      value: val,
      fallbackValue: fallback,
    });
    return fallback;
  }
  throw new Error(
    `Attempted to evaluate field as numeric value, calculated: ${JSON.stringify(val)}`,
  );
};
const evaluateField = <PData extends {}>(
  pData: PData,
  playerId: string,
  field: FieldSpec<keyof Flatten<PData> & string>,
): VNodeChild => {
  switch (field.type) {
    case "div":
      return (
        evaluateFieldNumeric(pData, playerId, field.numerator, 1) /
        evaluateFieldNumeric(pData, playerId, field.divisor, 1)
      );
    case "mul":
      return field.fields.reduce(
        (total, f) => total * evaluateFieldNumeric(pData, playerId, f, 1),
        1,
      );
    case "add":
      return field.fields.reduce(
        (total, f) => total + evaluateFieldNumeric(pData, playerId, f, 0),
        0,
      );
    case "logical": {
      const evalCondition = (condition: typeof field.condition): boolean => {
        switch (condition.op) {
          case "and":
            return condition.conditions.every(evalCondition);
          case "or":
            return condition.conditions.some(evalCondition);
          case "not":
            return !evalCondition(condition.condition);
          case "gt":
            return (
              evaluateFieldNumeric(pData, playerId, condition.left, 0) >
              evaluateFieldNumeric(pData, playerId, condition.right, 0)
            );
          case "lt":
            return (
              evaluateFieldNumeric(pData, playerId, condition.left, 0) <
              evaluateFieldNumeric(pData, playerId, condition.right, 0)
            );
          case "gte":
            return (
              evaluateFieldNumeric(pData, playerId, condition.left, 0) >=
              evaluateFieldNumeric(pData, playerId, condition.right, 0)
            );
          case "lte":
            return (
              evaluateFieldNumeric(pData, playerId, condition.left, 0) <=
              evaluateFieldNumeric(pData, playerId, condition.right, 0)
            );
          case "eq": {
            const val = evaluateFieldNumeric(pData, playerId, condition.operands[0], 0);
            for (let i = 1; i < condition.operands.length; i++) {
              if (val !== evaluateFieldNumeric(pData, playerId, condition.operands[i], 0)) {
                return false;
              }
            }
            return true;
          }
          case "neq": {
            const val = evaluateFieldNumeric(pData, playerId, condition.operands[0], 0);
            for (let i = 1; i < condition.operands.length; i++) {
              if (val === evaluateFieldNumeric(pData, playerId, condition.operands[i], 0)) {
                return false;
              }
            }
            return true;
          }
        }
      };
      return evalCondition(field.condition)
        ? evaluateField(pData, playerId, field.t)
        : field.f
          ? evaluateField(pData, playerId, field.f)
          : undefined;
    }
    case "max":
      return field.fields.reduce(
        (highest, f) => Math.max(highest, evaluateFieldNumeric(pData, playerId, f)),
        Number.MIN_SAFE_INTEGER,
      );
    case "min":
      return field.fields.reduce(
        (lowest, f) => Math.min(lowest, evaluateFieldNumeric(pData, playerId, f)),
        Number.MAX_SAFE_INTEGER,
      );
    case "simple": {
      let val: any = pData;
      if (val === undefined) {
        return undefined;
      }
      for (const k of field.field.split(".")) {
        if (typeof val === "object" && k in val) {
          val = val[k];
        } else {
          console.error(
            `Error getting value for player "${playerId}": Bad field path: ${field.field}`,
            k,
            val,
          );
          break;
        }
      }
      return val;
    }
  }
};

(() => {
  type TestPData = {
    foo: number;
    bar: { baz: number };
    qux: { quuz: number; nested: { deep: number } };
  };
  const isTestField = (s: string): s is keyof Flatten<TestPData> & string => s.length > 0;

  console.log(
    "parsedTestRowSingle:",
    singleFieldRowSchema<TestPData>(isTestField).parse({
      field: "foo",
      delta: "positive",
      classes: ["best"],
      fieldTooltip: "Description of a test field",
      valueTooltip: "bar.baz",
    } satisfies RowSchemaArgsSingleField<TestPData>),
  );
  console.log(
    "parsedTestRowMultiple:",
    multiFieldRowSchema<TestPData>(isTestField).parse({
      fieldDefs: { fooOnly: "foo", delta: "positive" },
      display: { ref: "fooOnly" },
      highlight: {
        order: ["fooOnly"],
        classes: ["best"],
      },
      fieldTooltip: "Description of a test field",
      valueTooltip: "bar.baz",
    } satisfies RowSchemaArgsMultiField<TestPData>),
  );
})();
