import { z } from "zod";
import { binOpSchema } from "../utils";
import {
  conditionSchema,
  type ConditionalOperation,
  type ConditionalOperationInput,
} from "./conditional";
import { mathsSchema, mathsSchemas, type MathsOperation, type MathsOperationInput } from "./maths";

export const makeStringFieldSchema = <Fields extends string>(
  fieldValidator: (s: string) => s is Fields,
) =>
  z.custom<Fields>(
    (data) => (typeof data === "string" ? fieldValidator(data) : false),
    "Must be a valid string property key",
  );

type SimpleFieldObj<Fields extends string> = {
  type: "simple";
  field: Fields;
};

type BranchingFieldSpecOut<BasicField, DisplayField = BasicField> =
  | {
      type: "logical";
      condition: ConditionalOperation<FieldSpecT<BasicField>>;
      t: FieldSpecT<DisplayField>;
      f?: FieldSpecT<DisplayField>;
    }
  | {
      type: "min" | "max";
      operands: [FieldSpecT<BasicField>, FieldSpecT<BasicField>, ...FieldSpecT<BasicField>[]];
    };
type BranchingFieldSpecIn<BasicField, DisplayField = BasicField> =
  | {
      type: "logical";
      condition: ConditionalOperationInput<FieldSpecTIn<BasicField>>;
      t: FieldSpecTIn<DisplayField>;
      f?: FieldSpecTIn<DisplayField>;
    }
  | {
      type: "min" | "max";
      operands: [FieldSpecTIn<BasicField>, FieldSpecTIn<BasicField>, ...FieldSpecTIn<BasicField>[]];
    };

// type FieldSpecT<BasicField> = BasicField | MathFieldSpec<BasicField> | BranchingFieldSpec<BasicField>;
export type FieldSpecT<BasicField, DisplayField = BasicField> =
  | BasicField
  | MathsOperation<BasicField>
  | BranchingFieldSpecOut<BasicField, DisplayField>;
type FieldSpecTIn<BasicField, DisplayField = BasicField> =
  | BasicField
  | MathsOperationInput<BasicField>
  | BranchingFieldSpecIn<BasicField, DisplayField>;

type FieldSpec<Fields extends string> = FieldSpecT<SimpleFieldObj<Fields>>;
type FieldSpecInput<Fields extends string> = FieldSpecTIn<Fields | SimpleFieldObj<Fields>>;

export const makeSimpleObjFieldSchema = <Fields extends string>(
  fieldValidator: (s: string) => s is Fields,
) =>
  z
    .object({
      type: z.literal("simple"),
      field: makeStringFieldSchema(fieldValidator),
    })
    .passthrough();

export const makeSimpleFieldSchema = <Fields extends string>(
  fieldValidator: (s: string) => s is Fields,
) =>
  z.preprocess(
    (arg) =>
      typeof arg === "string" && fieldValidator(arg) ? { type: "simple", field: arg } : arg,
    makeSimpleObjFieldSchema(fieldValidator),
  ) as z.ZodType<SimpleFieldObj<Fields>, z.ZodTypeDef, Fields | SimpleFieldObj<Fields>>;

const minMaxSchema = <S extends z.ZodDiscriminatedUnion<"type", any>>(schema: S) =>
  z
    .object({
      type: z.enum(["min", "max"]),
      operands: binOpSchema(schema),
    })
    .passthrough();

// const makeBranchingFieldSchemas = <S extends z.ZodDiscriminatedUnionOption<"type">>(fieldSchema: S) => {
//   const field = z.lazy(() => fieldDef) as unknown as z.ZodDiscriminatedUnionOption<"type">;
//   const display = displaySchemaOpts.length > 0 ? makeFieldTSchema(z.discriminatedUnion("type", [field, ...displaySchemaOpts])) : field;
//   const minMaxSchema =

//   const logicalSchema = z
//     .object({
//       type: z.enum(["logical", "conditional", "if"]).transform<"logical">(() => "logical"),
//       condition: conditionSchema<z.infer<S>, S>(field),
//       t: display,
//       f: display.optional(),
//     });
//   // @ts-expect-error
//   const fieldDef: z.ZodType<T | U, z.ZodTypeDef, z.input<S> | z.input<D>> & z.ZodDiscriminatedUnionOption<"type"> = z.union([
//     logicalSchema.transform(
//       /*<z.infer<T> | { type: "logical", condition: ConditionalOperation<z.infer<T>>, t: z.infer<T>, f?: z.infer<T> }>*/ ({
//         type,
//         condition,
//         t,
//         f,
//       }) => (typeof condition === "boolean" ? (condition ? t : f) : { type, condition, t, f }),
//     ),
//     minMaxSchema,
//   ]).pipe(z.discriminatedUnion("type", [
//     logicalSchema,
//     minMaxSchema,
//   ]));
//     // z.object({
//     //   type: z.literal("min"),
//     //   operands: binOpSchema(fieldSchema),
//     // }).passthrough(),
// }
// z.discriminatedUnion("type", [
//   z
//     .object({
//       type: z.enum(["logical", "conditional", "if"]).transform<"logical">(() => "logical"),
//       condition: conditionSchema<z.infer<T>, T>(fieldSchema),
//       t: fieldSchema,
//       f: fieldSchema.optional(),
//     })
//     .transform(
//       /*<z.infer<T> | { type: "logical", condition: ConditionalOperation<z.infer<T>>, t: z.infer<T>, f?: z.infer<T> }>*/ ({
//         type,
//         condition,
//         t,
//         f,
//       }) => (typeof condition === "boolean" ? (condition ? t : f) : { type, condition, t, f }),
//     ),
// ]);

const dbg =
  (...args: any[]) =>
  <T>(val: T): T => {
    console.log(...args, val);
    return val;
  };
// export const makeFieldTSchema = <S extends z.ZodTypeAny & z.ZodDiscriminatedUnionOption<"type">>(basicFieldSchema: S) => {
//   const schema: z.ZodType<FieldSpecT<z.infer<S>>, z.ZodTypeDef, FieldSpecTIn<z.input<S>>> & z.ZodDiscriminatedUnionOption<"type"> = z.union(
//     [
//       basicFieldSchema.transform(dbg("Base field:")),
//       mathsSchema(z.lazy(() => schema)).transform(dbg("Maths field:")),
//       makeBranchingFieldSchemas(z.lazy(() => schema), z.lazy(() => schema)).transform(dbg("Logical field:")),
//     ],
//   );
//   return schema;
// };

// export const makeFieldSchemaForFields = <Fields extends string>(
//   fieldValidator: (s: string) => s is Fields,
// ) => makeFieldTSchema(makeSimpleFieldSchema(fieldValidator));

import type { Flatten } from "@/utils/nestedKeys";
import { makeFieldSchemasForFields } from "./fieldV2";
export const runV2FieldParseTests = () => {
  type TestFields = keyof Flatten<{
    foo: number;
    bar: { baz: number };
    qux: { quuz: number; nested: { deep: number } };
  }>;
  const isTestField = (s: string): s is TestFields => s.length > 0;
  const { displaySchema: fieldSchema } = makeFieldSchemasForFields<TestFields>(isTestField, true);
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
          { op: "not", operand: { op: ">", left: 2, right: 3 } },
          { op: ">", left: 2, right: 3 },
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
