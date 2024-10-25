import { z } from "zod";
import { makeFieldSchema, makeFieldObjSchema, type FieldSpec } from "./field";
import { formatOptionsSchema } from "./builtin";
import type { ClassBindings } from "@/utils";
import type { VNodeChild } from "vue";
import type { Flatten } from "@/utils/nestedKeys";
import { RowFormat, type SummaryFieldRow } from "../v2";
import { getVDNumFormat } from "..";

export { makeFieldSchema, isSameField } from "./field";

export const classBindingsSchema: z.ZodType<ClassBindings> = z
  .union([z.record(z.string().min(1), z.boolean()), z.array(z.string().min(1)), z.string().min(1)])
  .optional();

export const cmpResultSchema = z.enum(["better", "equal", "worse"]);
export type ComparisonResult = z.infer<typeof cmpResultSchema>;

export const cmpFnSchema = <S extends z.ZodType<number, any, any> | z.ZodType<number[], any, any>>(
  schema: S,
) => {
  type T = z.infer<S>;
  return z.union([
    z.function(z.tuple([schema, schema]), cmpResultSchema),
    z.enum(["higher", "lower"]).transform((direction) =>
      (([gt, lt]: [ComparisonResult, ComparisonResult]) => {
        return (a: T, b: T) => {
          if (typeof a === "number" && typeof b === "number") {
            const d = a - b;
            if (d > 0) {
              return gt;
            }
            if (d < 0) {
              return lt;
            }
            return "equal";
          }
          const arrA: number[] = Array.isArray(a) ? a : [a];
          const arrB: number[] = Array.isArray(b) ? b : [b];
          const aLen = arrA.length;
          const bLen = arrB.length;
          if (bLen !== aLen) {
            console.warn(
              `Array comparison with arrays of differing lengths! ${aLen} != ${bLen}`,
              arrA,
              arrB,
            );
          }
          let i = 0;
          while (i < aLen) {
            if (i >= bLen) {
              console.warn(`Ran out of values to compare (index ${i} / ${aLen})`, arrA, arrB);
              break;
            }
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
      })(direction === "higher" ? ["better", "worse"] : ["worse", "better"]),
    ),
  ]);
};

const makeHighlightClassesSchema = <T extends z.ZodTypeAny>(schema: T) =>
  z.union([
    z.array(z.enum(["best", "worst"])),
    z.record(z.string().min(1), z.union([z.enum(["best", "worst"]), z.boolean(), z.number()])),
    z.function(
      z.tuple([
        z.function(z.tuple([schema]), cmpResultSchema),
        z.object({ best: schema, worst: schema }),
        schema,
      ]),
      classBindingsSchema,
    ),
  ]);

const makeArrayRowHighlightSchema = <PData>() =>
  z.object({
    values: z.function(z.tuple([z.custom<PData>(), z.string()]), z.array(z.number())),
    cmp: z.union([cmpFnSchema(z.array(z.number())), z.array(cmpFnSchema(z.number()))]),
    classes: makeHighlightClassesSchema(z.array(z.number())),
  });
const makeNumRowHighlightSchema = <PData>() =>
  z.object({
    value: z.function(z.tuple([z.custom<PData>(), z.string()]), z.number()),
    cmp: cmpFnSchema(z.number()),
    classes: makeHighlightClassesSchema(z.number()),
  });

export const rowHighlightDefinition = <PData>() =>
  z.union([
    makeNumRowHighlightSchema<PData>(),
    makeArrayRowHighlightSchema<PData>(),
    // | ObjRowHighlight<PData, Record<any, number>>,
    z.object({
      getVal: z.function(z.tuple([z.custom<PData>(), z.string()]), z.array(z.number())),
      cmp: cmpFnSchema(z.array(z.number())),
      fn: z.function(
        z.tuple([z.array(z.number())]),
        z.function(
          z.tuple([z.object({ best: z.array(z.number()), worst: z.array(z.number()) })]),
          classBindingsSchema,
        ),
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
    value: formatOptionsSchema.nullable(),
    delta: formatOptionsSchema.nullable(),
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
type FormattedFieldT<PData extends {}, Extra extends z.ZodRawShape = {}> = z.infer<
  ReturnType<typeof makeFormattedFieldSchema<PData, Extra>>
>;

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
  const formattedField = makeFormattedFieldSchema(fieldValidator);
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

const baseRowSchema = <PData extends {}>(
  fieldValidator: (s: string) => s is keyof Flatten<PData> & string,
  allowRefs: boolean,
) =>
  z.object({
    label: z.union([z.string(), z.function(z.tuple([z.boolean()]), vNodeChildSchema)]),
    /** Tooltip / hover over row. Overriden by `valueTooltip` if defined and hovering over value cell */
    fieldTooltip: z
      .union([
        vNodeChildSchema.transform((content) => () => content),
        z.function(z.tuple([]), vNodeChildSchema),
      ])
      .optional(),
    /** Tooltip / hover over value */
    valueTooltip: z
      .union([
        displaySchema(fieldValidator, allowRefs),
        z.function(
          z.tuple([z.custom<PData>(), z.custom<Partial<PData>>(), z.string().length(20)]),
          vNodeChildSchema,
        ),
      ])
      .optional(),
  });

const singleFieldRowSchema = <PData extends {}>(
  fieldValidator: (s: string) => s is keyof Flatten<PData> & string,
) =>
  baseRowSchema(fieldValidator, false)
    .extend({
      field: makeFieldSchema(fieldValidator),
      delta: deltaOverrideSchema.optional(),
      format: fieldFormatSchema.optional(),
      ignoreClassValue: z.number().nullish(),
      classes: makeHighlightClassesSchema(z.number()).optional(),
    })
    .transform(({ field, delta, format, valueTooltip: vTooltipArgs, ...rest }, ctx) => {
      let errors = false;
      const valueTooltip =
        vTooltipArgs === undefined
          ? undefined
          : typeof vTooltipArgs === "function"
            ? vTooltipArgs
            : (values: PData, _deltas: Partial<PData>, playerId: string) =>
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
                      return evaluateField(part, values, playerId);
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
  return baseRowSchema(fieldValidator, true)
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
                  : (pData: PData, _deltas: Partial<PData>, playerId: string) =>
                      valueTooltip.map((part) => {
                        if (part.type === "raw") {
                          return part.value;
                        } else {
                          if (part.type === "ref") {
                            const field = getFieldDef(part.ref, "valueTooltip");
                            return field
                              ? evaluateField(field, pData, playerId)
                              : `@@INVALID_FIELD_REF:${part.ref}@@`;
                          } else {
                            return evaluateField(part, pData, playerId);
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

export const makeV2SummaryRowsSchema = <PData extends { numGames: number }>(
  fieldValidator: (s: string) => s is keyof Flatten<PData> & string,
) => {
  return z.union([
    singleFieldRowSchema<PData>(fieldValidator).transform(
      ({ label, field, classes, fieldTooltip, valueTooltip, ignoreClassValue }) =>
        ({
          key: field.type === "simple" ? field.field : undefined,
          label,
          display: RowFormat.field((pData, pid) => evaluateFieldNumeric(field, pData, pid), {
            deltaSpec: field.delta,
            format: field.format,
          }),
          highlight:
            classes === undefined
              ? undefined
              : {
                  value: (pData, pid) => evaluateFieldNumeric(field, pData, pid),
                  classes,
                  //TODO: fix defaulting to higher with no override
                  cmp: field.delta === "negative" ? "lower" : "higher",
                },
          fieldTooltip,
          valueTooltip,
        }) satisfies SummaryFieldRow<PData>,
    ),
    multiFieldRowSchema<PData>(fieldValidator).transform(
      ({ label, display, highlight, fieldTooltip, valueTooltip }) => {
        return {
          // key: ??,
          label,
          display: RowFormat.create(
            display.map((part) => {
              if (part.type === "raw") {
                return {
                  type: "literal",
                  value: part.value,
                };
              } else {
                const field = part as FormattedFieldT<PData>;
                const fmts = [field.format?.value, field.format?.delta];
                const vFmt = fmts[0] === null ? null : getVDNumFormat(fmts[0] ?? {}).value;
                const dFmt = fmts[1] === null ? null : getVDNumFormat(fmts[1] ?? {}).delta;
                return {
                  type: "field",
                  value: (values: PData, playerId: string, totalNumGames: number) =>
                    evaluateField(field, values, playerId),
                  valueFormat: vFmt === null ? undefined : (value: number) => vFmt.format(value),
                  deltaFormat: dFmt === null ? undefined : (delta: number) => dFmt.format(delta),
                };
              }
            }),
          ),
          highlight:
            highlight === undefined
              ? undefined
              : {
                  values: (pData, pid) =>
                    highlight.order.map((field) => evaluateFieldNumeric(field, pData, pid)),
                  classes: ["best"], //TODO: highlight.classes,
                  //TODO: fix defaulting to higher with no override
                  cmp: "higher",
                },
          fieldTooltip,
          valueTooltip,
        } satisfies SummaryFieldRow<PData>;
      },
    ),
  ]);
};

export type RowSchemaArgsSingleField<PData extends {}> = z.input<
  ReturnType<typeof singleFieldRowSchema<PData>>
>;
export type RowSchemaArgsMultiField<PData extends {}> = z.input<
  ReturnType<typeof multiFieldRowSchema<PData>>
>;
export type RowSchemaArgs<PData extends {}> = z.input<ReturnType<typeof makeRowSchema<PData>>>;

const evaluateFieldNumeric = <PData extends {}>(
  field: FieldSpec<keyof Flatten<PData> & string>,
  pData: PData,
  playerId: string,
  fallback?: number,
): number => {
  const val = evaluateField(field, pData, playerId);
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
  field: FieldSpec<keyof Flatten<PData> & string>,
  pData: PData,
  playerId: string,
): number | undefined => {
  if (pData === undefined || playerId === undefined) {
    // @ts-ignore
    return (pData, pid) => evaluateField(field, pData, pid);
  }
  switch (field.type) {
    case "div":
      return (
        evaluateFieldNumeric(field.numerator, pData, playerId, 1) /
        evaluateFieldNumeric(field.divisor, pData, playerId, 1)
      );
    case "mul":
      return field.fields.reduce(
        (total, f) => total * evaluateFieldNumeric(f, pData, playerId, 1),
        1,
      );
    case "add":
      return field.fields.reduce(
        (total, f) => total + evaluateFieldNumeric(f, pData, playerId, 0),
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
              evaluateFieldNumeric(condition.left, pData, playerId, 0) >
              evaluateFieldNumeric(condition.right, pData, playerId, 0)
            );
          case "lt":
            return (
              evaluateFieldNumeric(condition.left, pData, playerId, 0) <
              evaluateFieldNumeric(condition.right, pData, playerId, 0)
            );
          case "gte":
            return (
              evaluateFieldNumeric(condition.left, pData, playerId, 0) >=
              evaluateFieldNumeric(condition.right, pData, playerId, 0)
            );
          case "lte":
            return (
              evaluateFieldNumeric(condition.left, pData, playerId, 0) <=
              evaluateFieldNumeric(condition.right, pData, playerId, 0)
            );
          case "eq": {
            const val = evaluateFieldNumeric(condition.operands[0], pData, playerId, 0);
            for (let i = 1; i < condition.operands.length; i++) {
              if (val !== evaluateFieldNumeric(condition.operands[i], pData, playerId, 0)) {
                return false;
              }
            }
            return true;
          }
          case "neq": {
            const val = evaluateFieldNumeric(condition.operands[0], pData, playerId, 0);
            for (let i = 1; i < condition.operands.length; i++) {
              if (val === evaluateFieldNumeric(condition.operands[i], pData, playerId, 0)) {
                return false;
              }
            }
            return true;
          }
        }
      };
      return evalCondition(field.condition)
        ? evaluateField(field.t, pData, playerId)
        : field.f
          ? evaluateField(field.f, pData, playerId)
          : undefined;
    }
    case "max":
      return field.fields.reduce(
        (highest, f) => Math.max(highest, evaluateFieldNumeric(f, pData, playerId)),
        Number.MIN_SAFE_INTEGER,
      );
    case "min":
      return field.fields.reduce(
        (lowest, f) => Math.min(lowest, evaluateFieldNumeric(f, pData, playerId)),
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

export const runParseTests = () => {
  type TestPData = {
    numGames: number;
    foo: number;
    bar: { baz: number };
    qux: { quuz: number; nested: { deep: number } };
  };
  const isTestField = (s: string): s is keyof Flatten<TestPData> & string => s.length > 0;

  const testRowSchema = makeV2SummaryRowsSchema<TestPData>(isTestField);
  console.log(
    "parsedTestRowSingle:",
    // singleFieldRowSchema<TestPData>(isTestField).parse({
    testRowSchema.parse({
      label: "Test Single Field Row",
      field: "foo",
      delta: "positive",
      classes: ["best"],
      fieldTooltip: "Description of a test field",
      valueTooltip: "bar.baz",
    } satisfies RowSchemaArgsSingleField<TestPData>),
  );
  console.log(
    "parsedTestRowMultiple:",
    testRowSchema.parse({
      label: "Test Multiple Field Row",
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
};
