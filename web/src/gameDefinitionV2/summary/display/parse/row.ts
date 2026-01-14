import { z } from "zod";
import {
  cmpFnSchema,
  deltaOverrideSchema,
  fieldFormatSchema,
  makeHighlightClassesSchema,
  vNodeChildSchema,
} from ".";
import { makeFieldSchemasForFields, type FieldRef } from "./field/fieldV2";
import type { WithExtraObjProps } from "@/utils/types";

const fieldDisplayOptsSchema = z.object({
  delta: deltaOverrideSchema.optional(),
  format: fieldFormatSchema.optional(),
});

const fieldHighlightOptsSchema = z.object({
  cmp: cmpFnSchema(z.number()),
  ignoreClassValue: z.number().nullish(),
});

const fieldDefsOptions = z.object({
  ...fieldDisplayOptsSchema.shape,
  ...fieldHighlightOptsSchema.shape,
});

// const displayFieldSchema = <S extends z.ZodTypeAny>(simpleFieldSchema: S) => {
//   const rawSchema = z.union([
//     z
//       .object({ type: z.enum(["raw", "literal"]).optional(), raw: vNodeChildSchema })//.passthrough()
//       .transform<{ type: "raw"; value: VNodeChild }>(({ type: _typ, raw, ...rest }) => ({ type: "raw", value: raw, ...rest })),
//     z
//       .object({ type: z.enum(["raw", "literal"]).optional(), literal: vNodeChildSchema })//.passthrough()
//       .transform<{
//         type: "raw";
//         value: VNodeChild;
//       }>(({ type: _typ, literal, ...rest }) => ({ type: "raw", value: literal, ...rest })),
//     z
//       .object({ type: z.enum(["raw", "literal"]), value: vNodeChildSchema })//.passthrough()
//       .transform<{ type: "raw"; value: VNodeChild }>(({ type: _typ, value, ...rest }) => ({ type: "raw", value, ...rest })),
//   ]);
//   const displayField = makeFieldTSchema(simpleFieldSchema/*, simpleFieldSchema*/.or(rawSchema)).pipe(
//     fieldDisplayOptsSchema().passthrough(),
//   );
//   return z.union([displayField.transform((val) => [val]), z.array(displayField)]);
// };
const displayFieldSchema = <S extends z.ZodTypeAny>(displaySchema: S) => {
  const opts = fieldDisplayOptsSchema; //.passthrough();
  type opts = typeof opts;
  type NonRawTypeFilter = { type: Exclude<z.infer<S>["type"], "raw"> };
  const displayField = displaySchema.pipe(opts.passthrough()) as unknown as z.ZodType<
    WithExtraObjProps<z.infer<S>, z.infer<opts>, NonRawTypeFilter>,
    z.ZodTypeDef,
    WithExtraObjProps<z.input<S>, z.input<opts>, NonRawTypeFilter>
  >;
  return z.union([displayField.transform((val) => [val]), z.array(displayField)]) as z.ZodType<
    WithExtraObjProps<
      z.infer<S>,
      z.infer<typeof fieldDisplayOptsSchema>,
      { type: Exclude<z.infer<S>["type"], "raw" | undefined> }
    >[],
    z.ZodTypeDef,
    | WithExtraObjProps<
        z.input<S>,
        z.input<typeof fieldDisplayOptsSchema>,
        { type: Exclude<z.infer<S>["type"], "raw" | undefined> }
      >[]
    | WithExtraObjProps<
        z.input<S>,
        z.input<typeof fieldDisplayOptsSchema>,
        { type: Exclude<z.infer<S>["type"], "raw" | undefined> }
      >
  >;
};

const baseRowSchema = <S extends z.ZodTypeAny, PData extends {} = {}>(displaySchema: S) =>
  z.object({
    label: z.union([z.string(), z.function(z.tuple([z.boolean()]), vNodeChildSchema)]),
    /** Tooltip / hover over row. Overriden by `valueTooltip` if defined and hovering over value cell */
    rowTooltip: z
      .union([
        vNodeChildSchema.transform((content) => () => content),
        z.function(
          z.tuple([z.custom<PData>(), z.custom<Partial<PData>>(), z.string().length(20)]),
          vNodeChildSchema,
        ),
      ])
      .optional(),
    /** Tooltip / hover over value */
    cellTooltip: displayFieldSchema(displaySchema).optional(),
  });

// type SingleRowDef<T> = z.infer<ReturnType<typeof baseRowSchema<z.ZodType<T>>>> & {
//   display: (FieldSpecT<T> | { type: "raw"; value: VNodeChild })[];
//   highlight?: {
//     order: {
//       field: FieldSpecT<T>;
//       cmp: z.infer<ReturnType<typeof cmpFnSchema<z.ZodNumber>>>;
//     }[];
//     classes: z.infer<ReturnType<typeof makeHighlightClassesSchema<z.ZodArray<z.ZodNumber>>>>;
//   };
// };

// const fieldDefsRowSchema = <
//   T extends { type: string },
//   S extends z.ZodType<T, any, any>,
//   DefKey extends string,
//   DS extends z.ZodType<DefKey, any, any>,
// >(
//   simpleFieldSchema: S,
//   defKeySchema: DS,
// ) => {
//   const refSchema = z
//     .object({ type: z.literal("ref").optional(), ref: defKeySchema }).passthrough()
//     .transform<{ type: "ref"; ref: DefKey }>(({ type: _typ, ref, ...rest }) => ({ type: "ref", ref: ref!, ...rest }));
//   const fieldSchema = z.union([simpleFieldSchema, refSchema]);
//   const fieldDefSchema = makeFieldTSchema(fieldSchema).pipe(
//     fieldDefsOptions().partial().passthrough(),
//   );
//   const highlightRefSchema = refSchema.pipe(fieldHighlightOptsSchema().partial().passthrough());
//   return baseRowSchema(fieldSchema)
//     .extend({
//       defs: z.record(defKeySchema, fieldDefSchema),
//       highlight: z
//         .object({
//           order: z.union([highlightRefSchema, z.array(highlightRefSchema)]),
//           classes: makeHighlightClassesSchema(z.number()),
//         })
//         .optional(),
//       display: displayFieldSchema(fieldSchema),
//     })
//     .transform<SingleRowDef<T>>(({ label, rowTooltip, cellTooltip, defs, display, highlight }) => {
//       console.log("Raw FDR:", { label, rowTooltip, cellTooltip, defs, display, highlight }); //XXX
//       return {
//         label,
//         rowTooltip,
//         cellTooltip,
//         display: display.map((part) => {
//           if (part.type === "ref") {
//             const { type, ref, ...field } = part as unknown as { type: "ref"; ref: DefKey };
//             return {
//               ...defs![ref],
//               ...field,
//             };
//           }
//           return part;
//         }),
//         highlight:
//           highlight === undefined
//             ? undefined
//             : {
//                 order: Array.isArray(highlight.order)
//                   ? highlight.order.map((field) =>
//                       field.type === "ref"
//                         ? {
//                             field: defs![field.ref],
//                             cmp: field.cmp,
//                           }
//                         : field,
//                     )
//                   : [
//                       highlight.order.type === "ref"
//                         ? {
//                             field: defs![highlight.order.ref],
//                             cmp: highlight.order.cmp,
//                           }
//                         : highlight.order,
//                     ],
//               },
//       };
//     });
// };

// type SingleRowDef<S extends z.ZodTypeAny, D extends z.ZodTypeAny> = z.infer<ReturnType<typeof baseRowSchema<S, D>>> & {
//   display: (FieldSpecT<T> | { type: "raw"; value: VNodeChild })[];
//   highlight?: {
//     order: {
//       field: FieldSpecT<T>;
//       cmp: z.infer<ReturnType<typeof cmpFnSchema<z.ZodNumber>>>;
//     }[];
//     classes: z.infer<ReturnType<typeof makeHighlightClassesSchema<z.ZodArray<z.ZodNumber>>>>;
//   };
// };

// type SingleRowDefFor<Fields extends string> = z.infer<ReturnType<typeof baseRowSchema<S, D>>> & {
//   display: (FieldSpecT<T> | { type: "raw"; value: VNodeChild })[];
//   highlight?: {
//     order: {
//       field: FieldSpecT<T>;
//       cmp: z.infer<ReturnType<typeof cmpFnSchema<z.ZodNumber>>>;
//     }[];
//     classes: z.infer<ReturnType<typeof makeHighlightClassesSchema<z.ZodArray<z.ZodNumber>>>>;
//   };
// };

const fieldDefsRowSchema = <
  Fields extends string,
  // DefKey extends string = string,
  // DS extends z.ZodType<DefKey, any, any> = z.ZodType<DefKey, any, any>,
>(
  fieldValidator: (arg: string) => arg is Fields,
  // defKeySchema?: DS,
) => {
  const schemas = makeFieldSchemasForFields(fieldValidator, true);
  const fieldDefOpts = fieldDefsOptions.partial();
  type fieldDefOpts = typeof fieldDefOpts;
  const fieldHighlightOpts = fieldHighlightOptsSchema.partial();
  type fieldHighlightOpts = typeof fieldHighlightOpts;
  type TO = z.infer<typeof schemas.displaySchema>;
  type TI = z.input<typeof schemas.displaySchema>;
  const highlightRefSchema = schemas.valueSchema.pipe(
    fieldHighlightOpts.passthrough(),
  ) as unknown as z.ZodType<
    WithExtraObjProps<TO, z.infer<fieldHighlightOpts>>,
    z.ZodTypeDef,
    WithExtraObjProps<TI, z.input<fieldHighlightOpts>>
  >;
  return baseRowSchema(schemas.displaySchema)
    .extend({
      // defs: z.record(defKeySchema, fieldDefSchema),
      defs: z.record(
        z.string().min(1),
        schemas.displaySchema.pipe(fieldDefOpts.passthrough()) as unknown as z.ZodType<
          WithExtraObjProps<TO, z.infer<fieldDefOpts>>,
          z.ZodTypeDef,
          WithExtraObjProps<TI, z.input<fieldDefOpts>>
        >,
      ),
      highlight: z
        .object({
          order: z.union([highlightRefSchema, z.array(highlightRefSchema)]),
          classes: makeHighlightClassesSchema(z.number()),
        })
        .optional(),
      display: displayFieldSchema(schemas.displaySchema),
    })
    .transform(({ label, rowTooltip, cellTooltip, defs, display, highlight }) => {
      console.log("Raw FDR:", { label, rowTooltip, cellTooltip, defs, display, highlight }); //XXX
      return {
        label,
        rowTooltip,
        cellTooltip,
        display: display.map((part) => {
          if (part.type === "ref") {
            const { type, ref, ...field } = part as unknown as {
              type: "ref";
              ref: string /*DefKey*/;
            };
            return {
              ...defs![ref],
              ...field,
            };
          }
          return part;
        }),
        highlight:
          highlight === undefined
            ? undefined
            : {
                order: Array.isArray(highlight.order)
                  ? highlight.order.map((field) =>
                      field.type === "ref"
                        ? {
                            field: defs![field.ref as keyof typeof defs],
                            cmp: field.cmp,
                          }
                        : field,
                    )
                  : [
                      highlight.order.type === "ref"
                        ? {
                            field: defs![highlight.order.ref as keyof typeof defs],
                            cmp: highlight.order.cmp,
                          }
                        : highlight.order,
                    ],
              },
      };
    });
};
const noDefsRowSchema = <
  Fields extends string,
  // DefKey extends string = string,
  // DS extends z.ZodType<DefKey, any, any> = z.ZodType<DefKey, any, any>,
>(
  fieldValidator: (arg: string) => arg is Fields,
  // defKeySchema?: DS,
) => {
  const schemas = makeFieldSchemasForFields(fieldValidator, false);
  const fieldHighlightOpts = fieldHighlightOptsSchema.partial();
  type fieldHighlightOpts = typeof fieldHighlightOpts;
  type TO = z.infer<typeof schemas.displaySchema>;
  type TI = z.input<typeof schemas.displaySchema>;
  const highlightRefSchema = schemas.valueSchema.pipe(
    fieldHighlightOpts.passthrough(),
  ) as unknown as z.ZodType<
    WithExtraObjProps<TO, z.infer<fieldHighlightOpts>>,
    z.ZodTypeDef,
    WithExtraObjProps<TI, z.input<fieldHighlightOpts>>
  >;
  return baseRowSchema(schemas.displaySchema)
    .extend({
      highlight: z
        .object({
          order: z.union([highlightRefSchema, z.array(highlightRefSchema)]),
          classes: makeHighlightClassesSchema(z.number()),
        })
        .optional(),
      display: displayFieldSchema(schemas.displaySchema),
    })
    .transform(({ label, rowTooltip, cellTooltip, display, highlight }, ctx) => {
      console.log("Raw FDR:", { label, rowTooltip, cellTooltip, display, highlight }); //XXX
      return {
        label,
        rowTooltip,
        cellTooltip,
        display: display.flatMap((part, i) => {
          if (part.type === "ref") {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: ["display", i],
              message: "Attempted to use refs when none defined!",
              params: {
                ref: part.ref,
                part,
              },
            });
            return [];
          }
          return [part];
        }),
        highlight:
          highlight === undefined
            ? undefined
            : {
                order: Array.isArray(highlight.order)
                  ? highlight.order.flatMap((field, i) =>
                      field.type === "ref"
                        ? (ctx.addIssue({
                            code: z.ZodIssueCode.custom,
                            path: ["highlight", "order", i],
                            message: "Attempted to use refs when none defined!",
                            params: {
                              ref: field.ref,
                              part: field,
                            },
                          }),
                          [])
                        : [field],
                    )
                  : [
                      highlight.order.type === "ref"
                        ? (ctx.addIssue({
                            code: z.ZodIssueCode.custom,
                            path: ["highlight", "order"],
                            message: "Attempted to use refs when none defined!",
                            params: {
                              ref: highlight.order.ref,
                              part: highlight.order,
                            },
                          }),
                          [])
                        : highlight.order,
                    ],
              },
      };
    });
};

export const singleRowSchema = <Fields extends string>(
  fieldValidator: (arg: string) => arg is Fields,
) => {
  const schemas = makeFieldSchemasForFields(fieldValidator, true);
  const fieldDefOpts = fieldDefsOptions.partial();
  type fieldDefOpts = typeof fieldDefOpts;
  const fieldHighlightOpts = fieldHighlightOptsSchema.partial();
  type fieldHighlightOpts = typeof fieldHighlightOpts;
  type TO = z.infer<typeof schemas.displaySchema>;
  type TI = z.input<typeof schemas.displaySchema>;
  type HighlightFieldSpec = WithExtraObjProps<TO, z.infer<fieldHighlightOpts>>;
  const highlightRefSchema = schemas.valueSchema.pipe(
    fieldHighlightOpts.passthrough(),
  ) as unknown as z.ZodType<
    HighlightFieldSpec,
    z.ZodTypeDef,
    WithExtraObjProps<TI, z.input<fieldHighlightOpts>>
  >;
  return baseRowSchema(schemas.displaySchema)
    .extend({
      defs: z
        .record(
          z.string().min(1),
          schemas.displaySchema.pipe(fieldDefOpts.passthrough()) as unknown as z.ZodType<
            WithExtraObjProps<TO, z.infer<fieldDefOpts>>,
            z.ZodTypeDef,
            WithExtraObjProps<TI, z.input<fieldDefOpts>>
          >,
        )
        .optional()
        .default({}),
      highlight: z
        .object({
          order: z.union([highlightRefSchema, z.array(highlightRefSchema)]),
          classes: makeHighlightClassesSchema(z.number()),
        })
        .optional(),
      display: displayFieldSchema(schemas.displaySchema),
    })
    .transform(({ label, rowTooltip, cellTooltip, defs, display, highlight }, ctx) => {
      type DefKey = keyof typeof defs;
      console.log("Raw FDR:", { label, rowTooltip, cellTooltip, defs, display, highlight }); //XXX
      const getRef = <F extends FieldRef>(part: F, path: z.ZodIssue["path"]) => {
        const { type, ref, ...field } = part as {
          type: "ref";
          ref: DefKey;
        };
        if (ref in defs) {
          return {
            ...defs![ref],
            ...field,
          };
        } else {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path,
            message: `Attempted to use ref: "${ref}" when not defined in defs!`,
            params: {
              ref: ref,
              options: [...Object.keys(defs)],
              part,
            },
          });
          return { type: "raw", value: `!!!BAD_REF:${ref}!!!` };
        }
      };
      return {
        label,
        rowTooltip,
        cellTooltip,
        display: display.map((part, i) => {
          if (part.type === "ref") {
            return (
              getRef(part, ["display", i]) ?? { type: "raw", value: `!!!BAD_REF:${part.ref}!!!` }
            );
          }
          return part;
        }),
        highlight:
          highlight === undefined
            ? undefined
            : {
                order: Array.isArray(highlight.order)
                  ? highlight.order.flatMap((part, i) => {
                      if (part.type === "ref") {
                        const ret = getRef(part, ["highlight", "order", i]);
                        return ret ? [ret] : [];
                      }
                      return [part as Exclude<HighlightFieldSpec, { type: "ref" }>];
                    })
                  : highlight.order.type === "ref"
                    ? [getRef(highlight.order, ["highlight", "order"])]
                    : [highlight.order as Exclude<HighlightFieldSpec, { type: "ref" }>],
              },
      };
    });
};

import type { Flatten } from "@/utils/nestedKeys";
export const runV2RowParseTests = () => {
  type TestFields = keyof Flatten<{
    foo: number;
    bar: { baz: number };
    qux: { quuz: number; nested: { deep: number } };
  }>;
  const isTestField = (s: string): s is TestFields => s.length > 0;
  const displaySchema = displayFieldSchema(
    makeFieldSchemasForFields<TestFields>(isTestField, true).displaySchema,
  );
  console.log("Test row display [foo]:", displaySchema.safeParse("foo"));
  console.log(
    "Test row display [{foo}]:",
    displaySchema.safeParse({ type: "simple", field: "foo" }),
  );
  console.log(
    "Test row display [[foo, +, bar.baz]]:",
    displaySchema.safeParse(["foo", "+", "bar.baz"]),
  );
  console.log(
    "Test row display [foo, (, [foo, +, bar.baz], )]:",
    displaySchema.safeParse(["foo", { raw: "(" }, ["foo", "+", "bar.baz"], { raw: ")" }]),
  );
  // const defsRowSchema = fieldDefsRowSchema<
  //   z.infer<typeof fieldSchema>,
  //   typeof fieldSchema,
  //   string,
  //   z.ZodString
  // >(fieldSchema, z.string().min(1));
  const defsRowSchema = fieldDefsRowSchema<TestFields>(isTestField);
  // type TO = z.infer<typeof defsRowSchema>["display"];
  // type TI = z.input<typeof defsRowSchema>["display"];
  // type TD = z.infer<typeof displaySchema>;
  // type TID = z.input<typeof displaySchema>;
  // type TDE = Extract<TD, any[]> extends (infer D)[] ? D : never;
  // type TDQuery<T extends Extract<TDE, { type?: any }>["type"]> = {
  //   [K in keyof Extract<TDE, { type: T }>]: Extract<TDE, { type: T }>[K]
  // }
  // type T = /*Extract<TDE, { type: "simple" }>;/*/TDQuery<"simple">
  // type NonRawTypes = Exclude<Extract<TDE, { type?: any }>["type"], "raw">;
  // type NonRawTypeFilter = { type: NonRawTypes };
  // type TOE = Extract<TO, any[]> extends (infer D)[] ? D : never;
  // type TIE = Extract<TI, any[]> extends (infer D)[] ? D : never;
  // type TQuery<T extends Extract<TIE, { type?: any }>["type"]> = {
  //   [K in keyof Extract<TIE, { type: T }>]: Extract<TIE, { type: T }>[K]
  // }
  // type T = TQuery<"simple">;
  // type T = TQuery<"raw">;
  // type T = {
  //   [K in keyof Extract<TIE, { ref: string }>]: Extract<TIE, { ref: string }>[K]
  // };
  // type T = TQuery<"logical">;
  // type T = {
  //   [K in keyof Extract<TIE, { type: "add" }>]: Extract<TIE, { type: "add" }>[K]
  // };
  console.log(
    "Test defsRow:",
    defsRowSchema.safeParse({
      label: "Test fieldDefs row",
      defs: {
        foo: { type: "simple", field: "foo", delta: "negative" },
        fooBar: {
          type: "add",
          operands: [
            { type: "simple", field: "foo" },
            { type: "simple", field: "bar.baz" },
          ],
        },
      },
      display: [{ ref: "foo", delta: "neutral" }, { raw: " ( " }, { ref: "fooBar" }, { raw: " )" }],
    } satisfies z.input<typeof defsRowSchema>),
  );
  const rowSchema = singleRowSchema<TestFields>(isTestField);
  console.log(
    "Test noDefsRow [hasRef]:",
    rowSchema.safeParse({
      label: "Test row [hasRef, noDefs]",
      display: [{ ref: "foo", delta: "neutral" }, { raw: " ( " }, { ref: "fooBar" }, { raw: " )" }],
    } satisfies z.input<typeof rowSchema>),
  );
  console.log(
    "Test noDefsRow [noRef]:",
    rowSchema.safeParse({
      label: "Test row [noRef]",
      display: [
        { type: "simple", field: "foo", delta: "neutral" },
        { raw: " ( " },
        {
          type: "add",
          operands: [
            { type: "simple", field: "foo" },
            { type: "simple", field: "bar.baz" },
          ],
        },
        { raw: " )" },
      ],
    } satisfies z.input<typeof rowSchema>),
  );
  console.log(
    "Test singleField defs row:",
    rowSchema.safeParse({
      label: "Test row [hasRef, hasDefs]",
      defs: {
        foo: { type: "simple", field: "foo", delta: "negative" },
        fooBar: {
          type: "add",
          operands: [
            { type: "simple", field: "foo" },
            { type: "simple", field: "bar.baz" },
          ],
        },
      },
      display: [{ ref: "foo", delta: "neutral" }, { raw: " ( " }, { ref: "fooBar" }, { raw: " )" }],
    } satisfies z.input<typeof rowSchema>),
  );
};

// // const singleRowDefinition = <S extends z.ZodTypeAny>(simpleFieldSchema: S) => {
// //   const basicFieldSchema = makeFieldTSchema(simpleFieldSchema);
// //   return z.union([
// //     z.object({
// //       fieldDefs: z.record()
// //     }),
// //   ]);
// //   return baseRowSchema(simpleFieldSchema).extend({

// //   });
// // }
