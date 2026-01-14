import { z } from "zod";
import {
  conditionSchema,
  type ConditionalOperation,
  type ConditionalOperationInput,
} from "./conditional";
import { mathsSchemas, type MathsOperation, type MathsOperationInput } from "./maths";
import { binOpSchema, errorMap } from "../utils";
import type { VNodeChild } from "vue";
import { isVNodeChild } from "..";

const simpleFieldSchema = <Fields extends string, S extends z.ZodType<Fields, any, any>>(
  fieldSpec: S,
) =>
  z
    .object(
      {
        type: z.literal("simple"),
        field: fieldSpec,
      },
      // errorMap("Simple object:"),
    )
    .passthrough();
const fieldRefSchema: {
  (): z.ZodObject<{
    type: z.ZodLiteral<"ref">;
    ref: z.ZodString;
  }>;
  <Refs extends string, S extends z.ZodType<Refs, any, any>>(
    refSpec: S,
  ): z.ZodObject<{
    type: z.ZodLiteral<"ref">;
    ref: S;
  }>;
} = (refSpec = z.string().min(1)) =>
  z
    .object(
      {
        type: z.literal("ref"),
        ref: refSpec,
      },
      // errorMap("Field ref obj:"),
    )
    .passthrough() satisfies z.ZodType<FieldRef, any, any>;

const rawValueSchema = z.object(
  {
    type: z.literal("raw"),
    value: z.custom(isVNodeChild),
  },
  // errorMap("Raw object:"),
) as z.ZodObject<
  {
    type: z.ZodLiteral<"raw">;
    value: z.ZodType<VNodeChild>;
  },
  "strip",
  z.ZodTypeAny,
  RawContent,
  RawContent
>;

type SimpleFieldObj<Fields extends string> = {
  type: "simple";
  field: Fields;
};
type RawContent<T extends VNodeChild = VNodeChild> = {
  type: "raw";
  value: T;
};
export type FieldRef<Refs extends string = string> = {
  type: "ref";
  ref: Refs;
};

type BranchingFieldSpecOut<ValueField, DisplayField = ValueField> =
  | {
      type: "logical";
      condition: ConditionalOperation<FieldSpecT<ValueField>>;
      t: FieldSpecT<DisplayField>;
      f?: FieldSpecT<DisplayField>;
    }
  | {
      type: "min" | "max";
      operands: [FieldSpecT<ValueField>, FieldSpecT<ValueField>, ...FieldSpecT<ValueField>[]];
    };
type BranchingFieldSpecIn<ValueField, DisplayField = ValueField> =
  | {
      type: "logical";
      condition: ConditionalOperationInput<FieldSpecTIn<ValueField>>;
      t: FieldSpecTIn<DisplayField>;
      f?: FieldSpecTIn<DisplayField>;
    }
  | {
      type: "min" | "max";
      operands: [FieldSpecTIn<ValueField>, FieldSpecTIn<ValueField>, ...FieldSpecTIn<ValueField>[]];
    };

export type FieldSpecT<ValueField, DisplayField = ValueField> =
  | DisplayField
  | MathsOperation<ValueField>
  | BranchingFieldSpecOut<ValueField, DisplayField>;
type FieldSpecTIn<ValueField, DisplayField = ValueField> =
  | DisplayField
  | MathsOperationInput<ValueField>
  | BranchingFieldSpecIn<ValueField, DisplayField>;

export type FieldSpecFor<Fields extends string, AllowRef extends boolean> = FieldSpecT<
  SimpleFieldObj<Fields> | (true extends AllowRef ? FieldRef : never),
  SimpleFieldObj<Fields> | RawContent | (true extends AllowRef ? FieldRef : never)
>;

// export const objectFieldSchema = <Fields extends string, F extends z.ZodType<Fields>, S extends z.>(stringFieldSpec: F, nonObjFieldSchema: S) => {
//   const schema: z.ZodType<FieldSpecT<SimpleFieldObj<Fields> | FieldRef, SimpleFieldObj<Fields> | FieldRef | RawContent>> = z.discriminatedUnion("type", [
//     simpleFieldSchema(stringFieldSpec),
//     fieldRefSchema(),
//     rawValueSchema,
//     ...mathsSchemas(z.lazy(() => schema)).output,
//     z.object({
//       type: z.enum(["min", "max"]),
//       operands: binOpSchema(() => schema),
//     }).passthrough(),
//   ]);
// };
// export const makeFieldTSchema = <S extends z.ZodTypeAny & z.ZodDiscriminatedUnionOption<"type">>(basicFieldSchema: S) => {
//   const schema: z.ZodType<FieldSpecT<z.infer<S>>, z.ZodTypeDef, FieldSpecTIn<z.input<S>>> & z.ZodDiscriminatedUnionOption<"type"> = z.union(
//     [
//       basicFieldSchema.transform(dbg("Base field:")),
//       mathsSchema(z.lazy(() => schema)).transform(dbg("Maths field:")),
//       makeBranchingFieldSchemas(z.lazy(() => schema)).transform(dbg("Logical field:")),
//     ],
//   );
//   return schema;
// };
export const makeFieldSchemas = <
  S extends z.ZodDiscriminatedUnionOption<"type">,
  Refs extends string,
  R extends z.ZodType<Refs, any, any>,
>(
  basicFieldSchema: S,
  { refs }: { refs: boolean | R },
) => {
  const { input: mathsIn, output: mathsOut } = mathsSchemas(
    z.union([
      z.lazy(() => valueSchema), // errorMap("Maths [lazy nested]:")),
      z.number(), // errorMap("Maths [number]:")),
      z.object(
        {
          type: z.literal("raw"),
          value: z.number(),
        },
        // errorMap("Maths [raw]:"),
      ),
    ]),
  );
  const baseSchemas = [
    basicFieldSchema,
    rawValueSchema,
    ...(!refs ? [] : [refs === true ? fieldRefSchema() : fieldRefSchema(refs)]),
    z
      .object(
        {
          type: z.enum(["min", "max"]),
          operands: binOpSchema(() => valueSchema),
        },
        // errorMap("MinMax:"),
      )
      .passthrough(),
  ];
  const baseInputs = [...mathsIn, ...baseSchemas] as const satisfies z.ZodTypeAny[];
  const baseOutputs = [
    ...mathsOut,
    ...baseSchemas,
  ] as const satisfies z.ZodDiscriminatedUnionOption<"type">[];
  const valueLogical = z
    .object(
      {
        type: z.enum(["logical", "if"]).transform<"logical">(() => "logical"),
        condition: conditionSchema(z.lazy(() => valueSchema)),
        t: z.lazy(() => valueSchema),
        f: z.lazy(() => valueSchema).optional(),
      },
      // errorMap("Value Logical:"),
    )
    .passthrough();
  const valueSchema: z.ZodType<FieldSpecT<z.infer<S>>, z.ZodTypeDef, FieldSpecTIn<z.input<S>>> = z
    .union([...baseInputs, valueLogical])
    .pipe(
      z.discriminatedUnion(
        "type",
        [...baseOutputs, valueLogical],
        // errorMap("Value discriminated:"),
      ),
    );
  const displayLogical = z
    .object(
      {
        type: z.enum(["logical", "if"]).transform<"logical">(() => "logical"),
        condition: conditionSchema(z.lazy(() => valueSchema)),
        t: z.lazy(() => displaySchema),
        f: z.lazy(() => displaySchema).optional(),
      },
      // errorMap("Display Logical"),
    )
    .passthrough();
  const displaySchema: z.ZodType<
    FieldSpecT<z.infer<S>, z.infer<S> | RawContent>,
    z.ZodTypeDef,
    FieldSpecTIn<z.input<S>, z.infer<S> | RawContent>
  > = z.union([...baseInputs, valueLogical]).pipe(
    z.discriminatedUnion(
      "type",
      [...baseOutputs, displayLogical],
      // errorMap("Display discriminated:"),
    ),
  );
  return { valueSchema, displaySchema };
};

// export const makeFieldSchemaForFields = <Fields extends string>(fieldValidator: (arg: string) => arg is Fields, allowRefs: boolean) => z.preprocess(
//   (arg, ctx) => {
//     if (arg !== null) {
//       if (typeof arg === "string") {
//         if (fieldValidator(arg)) {
//           return {
//             type: "simple",
//             field: arg,
//           } satisfies SimpleFieldObj<Fields>
//         } else if (allowRefs) {
//           return {
//             type: "ref",
//             ref: arg,
//           } satisfies FieldRef;
//         } else {
//           ctx.addIssue({
//             code: z.ZodIssueCode.custom,
//             fatal: true,
//             message: `Invalid Field identifier: "${arg}". Field references not allowed`,
//             params: {
//               recieved: arg,
//               allowRefs,
//             },
//           });
//         }
//       } else if (typeof arg === "object" && !("type" in arg)) {
//         if ("ref" in arg) {
//           if (typeof arg.ref !== "string") {
//             ctx.addIssue({
//               code: z.ZodIssueCode.custom,
//               fatal: true,
//               message: `Cannot use field reference, ref property is not a string`,
//               path: ["ref"],
//               params: {
//                 recieved: arg,
//                 ref: arg.ref,
//                 allowRefs,
//               },
//             });
//           }
//           if (allowRefs) {
//             return {
//               type: "ref",
//               ...arg as Omit<FieldRef, "type">,
//             } satisfies FieldRef;
//           } else {
//             ctx.addIssue({
//               code: z.ZodIssueCode.custom,
//               fatal: true,
//               message: `Cannot use field reference "${arg.ref}": Field references not allowed`,
//               path: ["ref"],
//               params: {
//                 recieved: arg,
//                 ref: arg.ref,
//                 allowRefs,
//               },
//             });
//           }
//         }
//         if ("raw" in arg || "literal" in arg || "value" in arg) {
//           // @ts-expect-error
//           const raw = arg["raw"] ?? arg["literal"] ?? arg["value"];
//           if (isVNodeChild(raw)) {
//             return {
//               type: "raw",
//               value: raw,
//             } satisfies RawContent;
//           } else {
//             ctx.addIssue({
//               code: z.ZodIssueCode.custom,
//               fatal: true,
//               message: `Cannot use raw object: value is not VNodeChild`,
//               path: ["raw"],
//               params: {
//                 recieved: arg,
//                 raw: raw,
//                 allowRefs,
//               },
//             });
//           }
//         }
//       }
//     }
//     return arg;
//   },
//   makeFieldSchemas(simpleFieldSchema(z.custom<Fields>(arg => typeof arg === "string" && fieldValidator(arg))), { refs: allowRefs }).displaySchema,
// );
export const makeFieldSchemasForFields = <Fields extends string>(
  fieldValidator: (arg: string) => arg is Fields,
  allowRefs: boolean,
) => {
  const rawTypePropSchema = z.enum(["raw", "literal"]).transform<"raw">(() => "raw");
  const stringField = z
    .string()
    .transform<SimpleFieldObj<Fields> | FieldRef | RawContent>((arg, ctx) => {
      if (fieldValidator(arg)) {
        return {
          type: "simple",
          field: arg,
        } satisfies SimpleFieldObj<Fields>;
      } else if (allowRefs) {
        return {
          type: "ref",
          ref: arg,
        } satisfies FieldRef;
      } else {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          fatal: true,
          message: `Invalid Field identifier: "${arg}". Field references not allowed`,
          params: {
            recieved: arg,
            allowRefs,
          },
        });
        return z.NEVER;
      }
    });
  const simpleField = simpleFieldSchema(
    z.custom<Fields>((arg) => typeof arg === "string" && fieldValidator(arg)),
  );
  const rawFieldIn = z.union(
    [
      z
        .object(
          {
            type: rawTypePropSchema.optional(),
            raw: z.custom(isVNodeChild),
          },
          // errorMap("RawSchema in[raw]:"),
        )
        .transform<RawContent>(({ raw: value }) => ({ type: "raw", value })),
      z
        .object(
          {
            type: rawTypePropSchema.optional(),
            literal: z.custom(isVNodeChild),
          },
          // errorMap("RawSchema in[literal]:"),
        )
        .transform<RawContent>(({ literal: value }) => ({ type: "raw", value })),
      rawValueSchema,
    ],
    errorMap("Basic field input:"),
  );
  const [refIn, refOut] = allowRefs
    ? [
        [
          z
            .object(
              {
                type: z.literal("ref").optional(),
                ref: z.string().min(1),
              },
              // errorMap("Ref input"),
            )
            .passthrough()
            .transform<FieldRef>(({ ref }) => ({ type: "ref", ref })),
        ],
        [fieldRefSchema()],
      ]
    : [[], []];
  const minMax = z
    .object(
      {
        type: z.enum(["min", "max"]),
        operands: binOpSchema(() => valueSchema),
      },
      // errorMap("MinMax:"),
    )
    .passthrough();
  const { input: mathsIn, output: mathsOut } = mathsSchemas(
    z.union([
      z.lazy(() => valueSchema), // errorMap("Maths [lazy nested]:")),
      z.number(), // errorMap("Maths [number]:")),
      z.object(
        {
          type: z.literal("raw"),
          value: z.number(),
        },
        // errorMap("Maths [raw]:"),
      ),
    ]),
  );
  const baseInputs = [
    stringField,
    simpleField,
    ...refIn,
    ...refOut,
    ...mathsIn,
    minMax,
  ] as const satisfies z.ZodTypeAny[];
  const baseOutputs = [
    simpleField,
    ...refOut,
    ...mathsOut,
    minMax,
  ] as const satisfies z.ZodDiscriminatedUnionOption<"type">[];
  type TO = SimpleFieldObj<Fields> | FieldRef;
  type TI = Fields | SimpleFieldObj<Fields> | { type?: "ref"; ref: string };
  const valueLogical = z
    .object(
      {
        type: z.enum(["logical", "if"]).transform<"logical">(() => "logical"),
        condition: conditionSchema(z.lazy(() => valueSchema)), //.transform<ConditionalOperation<TO>>(flattenCondition<TO>),
        t: z.lazy(() => valueSchema),
        f: z.lazy(() => valueSchema).optional(),
      },
      errorMap("Value Logical:"),
    )
    .passthrough();
  // @ts-expect-error
  const valueSchema: z.ZodType<FieldSpecT<TO>, z.ZodTypeDef, FieldSpecTIn<TI>> = z
    .union(
      [...baseInputs, valueLogical],
      errorMap("Value input schemas:", [...baseInputs, valueLogical]),
    )
    .pipe(
      z.discriminatedUnion(
        "type",
        [...baseOutputs, valueLogical],
        errorMap("Value discriminated:"),
      ),
    );
  const displayLogical = z
    .object(
      {
        type: z.enum(["logical", "if"]).transform<"logical">(() => "logical"),
        condition: conditionSchema(z.lazy(() => valueSchema)), //.transform<ConditionalOperation<TO>>(flattenCondition<TO>),
        t: z.lazy(() => displaySchema),
        f: z.lazy(() => displaySchema).optional(),
      },
      errorMap("Display Logical"),
    )
    .passthrough();
  // @ts-expect-error
  const displaySchema: z.ZodType<
    FieldSpecT<TO | RawContent>,
    z.ZodTypeDef,
    FieldSpecTIn<TI | RawContent, TI | RawContent | z.input<typeof rawFieldIn>>
  > = z
    .union(
      [...baseInputs, rawFieldIn, rawValueSchema, displayLogical],
      errorMap("Display inputs:", [...baseInputs, rawFieldIn, rawValueSchema, displayLogical]),
    )
    .pipe(
      z.discriminatedUnion(
        "type",
        [...baseOutputs, rawValueSchema, displayLogical],
        errorMap("Display discriminated:"),
      ),
    );
  return { valueSchema, displaySchema };
};

import type { Flatten } from "@/utils/nestedKeys";
export const runV2FieldParseTests = () => {
  type TestFields = keyof Flatten<{
    foo: number;
    bar: { baz: number };
    qux: { quuz: number; nested: { deep: number } };
  }>;
  const isTestField = (s: string): s is TestFields => s.length > 0;
  const fieldSchema = makeFieldSchemasForFields<TestFields>(isTestField, true).displaySchema;
  console.log("parseTestFieldV2SimpleStr:", fieldSchema.safeParse("foo"));
  console.log(
    "parseTestFieldV2SimpleObj:",
    fieldSchema.safeParse({ type: "simple", field: "foo" }),
  );
  console.log(
    "parseTestFieldV2MathAddArr:",
    fieldSchema.safeParse(["foo", "+", { type: "simple", field: "bar" }]),
  );
  console.log("parseTestFieldV2MathAddArrStrF:", fieldSchema.safeParse(["foo", "+", "bar"]));
  console.log(
    "parseTestFieldV2MathAddObj:",
    fieldSchema.safeParse({
      type: "add",
      operands: [
        { type: "simple", field: "foo" },
        { type: "simple", field: "bar" },
      ],
    }),
  );
  console.log(
    "parseTestFieldV2LogicalTOnly:",
    fieldSchema.safeParse({
      type: "logical",
      condition: [2, "<", 3],
      t: { type: "simple", field: "foo" },
    }),
  );
  console.log(
    "parseTestFieldV2LogicalTF:",
    fieldSchema.safeParse({
      type: "logical",
      condition: [2, "<", 3],
      t: "foo",
      f: { type: "simple", field: "bar" },
    }),
  );
  console.log(
    "parseTestFieldV2LogicalEqArr:",
    fieldSchema.safeParse({
      type: "logical",
      condition: [2, "==", 3],
      t: "foo",
      f: { type: "simple", field: "bar" },
    }),
  );
  console.log(
    "parseTestFieldV2LogicalEqLR:",
    fieldSchema.safeParse({
      type: "logical",
      condition: { op: "eq", left: 2, right: 3 },
      t: "foo",
      f: { type: "simple", field: "bar" },
    }),
  );
  console.log(
    "parseTestFieldV2LogicalEqAB:",
    fieldSchema.safeParse({
      type: "logical",
      condition: { op: "eq", a: 2, b: 3 },
      t: "foo",
      f: { type: "simple", field: "bar" },
    }),
  );
  console.log(
    "parseTestFieldV2LogicalEqOArr:",
    fieldSchema.safeParse({
      type: "logical",
      condition: { op: "eq", operands: [2, 3] },
      t: "foo",
      f: { type: "simple", field: "bar" },
    }),
  );
  console.log(
    "parseTestFieldV2LogicalNestedShallow:",
    fieldSchema.safeParse({
      type: "logical",
      condition: {
        op: "||",
        operands: [
          { op: "not", operand: { op: ">", left: "foo", right: 3 } },
          { op: ">", left: "foo", right: 3 },
        ],
      },
      t: { type: "simple", field: "foo" },
    }),
  );
  console.log(
    "parseNestedTestFieldV2NestedDeepTrue:",
    fieldSchema.safeParse({
      type: "logical",
      condition: {
        op: "not",
        operand: {
          op: "not",
          operand: {
            op: "or",
            operands: [
              {
                op: "or",
                operands: [
                  {
                    op: "and",
                    operands: [
                      {
                        op: "and",
                        operands: [
                          { op: "eq", a: "foo", b: "qux.quuz" },
                          { op: "neq", a: "foo", b: "qux.quuz" },
                        ],
                      },
                      { op: "eq", a: "foo", b: "qux.quuz" },
                    ],
                  },
                  {
                    op: "or",
                    operands: [
                      {
                        op: "gt",
                        left: "foo",
                        right: "bar.baz",
                      },
                      ["foo", "==", "bar.baz"],
                    ],
                  },
                ],
              },
              {
                op: "or",
                operands: [
                  {
                    op: "gte",
                    left: { type: "simple", field: "foo" },
                    right: "qux.nested.deep",
                  },
                  {
                    op: "eq",
                    operands: ["foo", "qux.nested.deep"],
                  },
                ],
              },
            ],
          },
        },
      },
      t: "foo",
    }), // satisfies z.input<typeof fieldSchema>),
  );
  console.log(
    "parseNestedTestFieldV2ConditionalFalse:",
    fieldSchema.safeParse({
      type: "logical",
      condition: {
        op: "not",
        operand: true,
      },
      t: "foo",
    } satisfies z.input<typeof fieldSchema>),
  );
  console.log(
    "parseNestedTestFieldV2MathC:",
    fieldSchema.safeParse({
      type: "logical",
      condition: ["foo", "gt", ["bar.baz", "+", "qux.quuz"]],
      t: "foo",
    } satisfies z.input<typeof fieldSchema>),
  );
};
