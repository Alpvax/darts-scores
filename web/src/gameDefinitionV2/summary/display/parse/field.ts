import type { Flatten } from "@/utils/nestedKeys";
import { z } from "zod";
type BinOp<T> = [T, T, ...T[]];

export type FieldSpec<Fields extends string> =
  | MathSpec<Fields>
  | FieldSpecBranching<Fields>
  | SimpleFieldSpec<Fields>;
export type FieldSpecOrField<Fields extends string> =
  | MathSpec<Fields>
  | FieldSpecBranching<Fields>
  | SimpleFieldSpec<Fields>
  | Fields;
type BinOpFields<Fields extends string> = BinOp<FieldSpec<Fields>>;
type SimpleFieldSpec<Fields extends string> = {
  type: "simple";
  field: Fields;
};
/** For subtract, use "add" and negate the corresponding value(s) */
type MathSpec<Fields extends string> =
  | {
      type: "div"; // | "/";
      numerator: FieldSpec<Fields>;
      divisor: FieldSpec<Fields>;
    }
  | {
      type: "mul"; // | "*";
      fields: BinOpFields<Fields>;
    }
  | {
      type: "add"; // | "+";
      fields: BinOpFields<Fields>;
    };

// type ConditionSpec<T> = BoolOperationSpec<T> | "highest" | "lowest"
type BoolOperationSpec<T> =
  | {
      op: "and"; // | "&&";
      conditions: BinOp<BoolOperationSpec<T>>;
    }
  | {
      op: "or"; // | "||";
      conditions: BinOp<BoolOperationSpec<T>>;
    }
  | {
      op: "not"; // | "!";
      condition: BoolOperationSpec<T>;
    }
  | {
      op: "gt"; // | ">";
      left: T;
      right: T;
    }
  | {
      op: "lt"; // | "<";
      left: T;
      right: T;
    }
  | {
      op: "gte"; // | ">=";
      left: T;
      right: T;
    }
  | {
      op: "lte"; // | "<=";
      left: T;
      right: T;
    }
  | {
      op: "eq"; // | "==";
      operands: BinOp<T>;
    }
  | {
      op: "neq"; // | "!=";
      operands: BinOp<T>;
    };
type FieldSpecBranching<Fields extends string> =
  | {
      type: "logical";
      condition: BoolOperationSpec<FieldSpec<Fields>>;
      t: FieldSpec<Fields>;
      f?: FieldSpec<Fields>;
    }
  | {
      type: "max";
      fields: BinOp<FieldSpec<Fields>>;
    }
  | {
      type: "min";
      fields: BinOp<FieldSpec<Fields>>;
    };

export const isSameField = <Fields extends string>(
  fieldA: FieldSpecOrField<Fields>,
  fieldB: FieldSpecOrField<Fields>,
): boolean => {
  if (fieldA === fieldB) {
    return true;
  }
  let a = typeof fieldA === "string" ? { type: "simple", field: fieldA } : fieldA;
  let b = typeof fieldB === "string" ? { type: "simple", field: fieldB } : fieldB;
  if (a.type === "simple" && b.type === "simple") {
    return a.field === b.field;
  }
  if (a.type === b.type) {
    switch (a.type) {
      case "div":
        // @ts-expect-error
        return isSameField(a.numerator, b.numerator) && isSameField(a.divisor, b.divisor);
      case "mul":
      case "add": {
        // @ts-expect-error
        const aFields: BinOp<FieldSpec<Fields>> = a.fields;
        // @ts-expect-error
        const bFields: BinOp<FieldSpec<Fields>> = b.fields;
        return (
          aFields.length === bFields.length && aFields.every((f, i) => isSameField(f, bFields[i]))
        );
      }
    }
  }
  //TODO: branching fields
  return false;
};

const flattenOperations = <Fields extends string>(
  operation: BoolOperationSpec<FieldSpec<Fields>>,
): BoolOperationSpec<FieldSpec<Fields>> => {
  switch (operation.op) {
    // case "&&":
    //   operation.op = "and";
    case "and":
      operation.conditions = operation.conditions.flatMap((op) =>
        op.op === "and" // || op.op === "&&"
          ? op.conditions.map(flattenOperations)
          : [flattenOperations(op)],
      ) as BinOp<BoolOperationSpec<FieldSpec<Fields>>>;
      break;
    // case "||":
    //   operation.op = "or";
    case "or":
      operation.conditions = operation.conditions.flatMap((op) => {
        const o = flattenOperations(op);
        return o.op === "or" // || op.op === "||"
          ? o.conditions.map(flattenOperations)
          : [o];
      }) as BinOp<BoolOperationSpec<FieldSpec<Fields>>>;
      if (operation.conditions.length === 2) {
        let c0 = operation.conditions[0];
        let c1 = operation.conditions[1];
        let conditions =
          c0.op === "eq" &&
          c0.operands.length === 2 &&
          (c1.op === "gt" || c1.op === "lt" || c1.op === "gte" || c1.op === "lte")
            ? { eq: c0, cmp: c1 }
            : c1.op === "eq" &&
                c1.operands.length === 2 &&
                (c0.op === "gt" || c0.op === "lt" || c0.op === "gte" || c0.op === "lte")
              ? { eq: c1, cmp: c0 }
              : null;
        if (conditions !== null) {
          const left = conditions.eq.operands[0];
          const right = conditions.eq.operands[1];
          const cmp = conditions.cmp;
          if (isSameField(left, cmp.left) && isSameField(right, cmp.right)) {
            if (cmp.op === "gt" || cmp.op === "lt") {
              return {
                op: c1.op === "gt" ? "gte" : "lte",
                left,
                right,
              };
            } else {
              // Strip equality check from or(a == b, a (>=|<=) b)
              return cmp;
            }
          }
        }
        if (c0.op === "eq" && c0.operands.length === 2) {
          const left = c0.operands[0];
          const right = c0.operands[1];
          if (c1.op === "gt" || c1.op === "lt") {
            if (isSameField(left, c1.left) && isSameField(right, c1.right)) {
              return {
                op: c1.op === "gt" ? "gte" : "lte",
                left,
                right,
              };
            }
          }
        } else if (c1.op === "eq" && c1.operands.length === 2) {
          const left = c1.operands[0];
          const right = c1.operands[1];
          if (c0.op === "gt" || c0.op === "lt") {
            if (isSameField(left, c0.left) && isSameField(right, c0.right)) {
              return {
                op: c0.op === "gt" ? "gte" : "lte",
                left,
                right,
              };
            }
          }
        }
      }
      break;
    // case "!":
    //   operation.op = "not";
    case "not": {
      let child = operation.condition;
      let invert = true;
      while (child.op === "not" /* || child.op === "!"*/) {
        child = child.condition;
        invert = !invert;
      }
      child = flattenOperations(child);
      if (invert) {
        if (child.op === "lt") {
          return {
            op: "gte",
            left: child.left,
            right: child.right,
          };
        } else if (child.op === "gt") {
          return {
            op: "lte",
            left: child.left,
            right: child.right,
          };
        } else {
          return {
            op: "not",
            condition: child,
          };
        }
      } else {
        return child;
      }
    }
    // case ">":
    //   operation.op = "gt";
    case "gt":
    // case "<":
    //   operation.op = "lt";
    case "lt":
    // case ">=":
    //   operation.op = "gte";
    case "gte":
    // case "<=":
    //   operation.op = "lte";
    case "lte":
    // case "==":
    //   operation.op = "eq";
    case "eq":
    // case "!=":
    //   operation.op = "neq";
    case "neq":
  }
  return operation;
};

const binOpSchema = <S extends z.ZodTypeAny>(schemaFactory: S | (() => S)) =>
  z.lazy(() => {
    const schema = typeof schemaFactory === "function" ? schemaFactory() : schemaFactory;
    return z.tuple([schema, schema]).rest(schema);
  });

const logicalOperation = <S extends z.ZodTypeAny>(schemaFactory: S | (() => S)) => {
  const schema = typeof schemaFactory === "function" ? z.lazy(schemaFactory) : schemaFactory;
  const lazyLogical = z.lazy(() => logicalOp);
  // @ts-ignore
  const logicalOp: z.ZodType<BoolOperationSpec<z.infer<S>>> = z.discriminatedUnion("op", [
    z.object({
      op: z.enum(["and", "&&"]).transform(() => "and" as "and"),
      conditions: binOpSchema(() => logicalOp),
    }),
    z.object({
      op: z.enum(["or", "||"]).transform(() => "or" as "or"),
      conditions: binOpSchema(() => logicalOp),
    }),
    z.object({
      op: z.enum(["not", "!"]).transform(() => "not" as "not"),
      condition: lazyLogical,
    }),
    z.object({
      op: z.enum(["gt", ">"]).transform(() => "gt" as "gt"),
      left: schema,
      right: schema,
    }),
    z.object({
      op: z.enum(["lt", "<"]).transform(() => "lt" as "lt"),
      left: schema,
      right: schema,
    }),
    z.object({
      op: z.enum(["gte", ">="]).transform(() => "gte" as "gte"),
      left: schema,
      right: schema,
    }),
    z.object({
      op: z.enum(["lte", "<="]).transform(() => "lte" as "lte"),
      left: schema,
      right: schema,
    }),
    z.object({
      op: z.enum(["eq", "=="]).transform(() => "eq" as "eq"),
      operands: binOpSchema(schema),
    }),
    z.object({
      op: z.enum(["neq", "!="]).transform(() => "neq" as "neq"),
      operands: binOpSchema(schema),
    }),
  ]);
  return logicalOp;
};

// const makeSchemas = <Fields extends string>(fields: readonly [Fields, ...Fields[]]) => {
export const makeFieldSchema = <Fields extends string>(
  fieldValidator: (s: string) => s is Fields,
) => {
  const fieldSchema = z.custom<Fields>(
    (data) => (typeof data === "string" ? fieldValidator(data) : false),
    "Must be a valid string property key",
  );
  const simpleObj = z.object({
    type: z.literal("simple"),
    field: fieldSchema,
  });
  const divOp = z.object({
    // type: z.literal("div"),//z.enum(["div", "/"]),
    type: z.enum(["div", "/"]).transform((t) => "div" as "div"),
    numerator: z.lazy(() => basic),
    divisor: z.lazy(() => basic),
  });
  const mulOp = z.object({
    // type: z.literal("mul"),//z.enum(["mul", "*"]),
    type: z.enum(["mul", "*"]).transform((t) => "mul" as "mul"),
    fields: binOpSchema(() => basic),
  });
  const addOp = z.object({
    // type: z.literal("add"),//z.enum(["add", "+"]),
    type: z.enum(["add", "+"]).transform((t) => "add" as "add"),
    fields: binOpSchema(() => basic),
  });
  // @ts-ignore
  const basic: z.ZodType<FieldSpec<Fields>, z.ZodTypeDef, FieldSpecOrField<Fields>> = z.preprocess(
    (arg) =>
      typeof arg === "string" && fieldValidator(arg) ? { type: "simple", field: arg } : arg,
    z.discriminatedUnion("type", [
      simpleObj,
      divOp,
      mulOp,
      addOp,
      z.object({
        type: z.literal("logical"),
        condition: logicalOperation(() => basic).transform(flattenOperations),
        t: z.lazy(() => basic),
        f: z.lazy(() => basic).optional(),
      }),
      z.object({
        type: z.literal("max"),
        fields: binOpSchema(() => basic),
      }),
      z.object({
        type: z.literal("min"),
        fields: binOpSchema(() => basic),
      }),
    ]),
  );
  return basic;
};
export const makeFieldObjSchema = <Fields extends string>(
  fieldValidator: (s: string) => s is Fields,
) => {
  const fieldSchema = z.custom<Fields>(
    (data) => (typeof data === "string" ? fieldValidator(data) : false),
    "Must be a valid string property key",
  );
  const simpleObj = z.object({
    type: z.literal("simple"),
    field: fieldSchema,
  });
  const nestedBasic = z.preprocess(
    (arg) =>
      typeof arg === "string" && fieldValidator(arg) ? { type: "simple", field: arg } : arg,
    z.lazy(() => basic),
  );
  const divOp = z.object({
    // type: z.literal("div"),//z.enum(["div", "/"]),
    type: z.enum(["div", "/"]).transform((t) => "div" as "div"),
    numerator: nestedBasic,
    divisor: nestedBasic,
  });
  const mulOp = z.object({
    // type: z.literal("mul"),//z.enum(["mul", "*"]),
    type: z.enum(["mul", "*"]).transform((t) => "mul" as "mul"),
    fields: binOpSchema(nestedBasic),
  });
  const addOp = z.object({
    // type: z.literal("add"),//z.enum(["add", "+"]),
    type: z.enum(["add", "+"]).transform((t) => "add" as "add"),
    fields: binOpSchema(nestedBasic),
  });
  // @ts-ignore
  const basic: z.ZodType<FieldSpec<Fields>> = z.discriminatedUnion("type", [
    simpleObj,
    divOp,
    mulOp,
    addOp,
    z.object({
      type: z.literal("logical"),
      condition: logicalOperation(nestedBasic).transform(flattenOperations),
      t: nestedBasic,
      f: nestedBasic.optional(),
    }),
    z.object({
      type: z.literal("max"),
      fields: binOpSchema(nestedBasic),
    }),
    z.object({
      type: z.literal("min"),
      fields: binOpSchema(nestedBasic),
    }),
  ]);
  return basic;
};

(() => {
  type TestFields = keyof Flatten<{
    foo: number;
    bar: { baz: number };
    qux: { quuz: number; nested: { deep: number } };
  }>;
  const isTestField = (s: string): s is TestFields => s.length > 0;
  console.log(
    "parseNestedTestField:",
    makeFieldSchema<TestFields>(isTestField).parse({
      type: "logical",
      condition: {
        op: "not",
        condition: {
          op: "not",
          condition: {
            op: "or",
            conditions: [
              {
                op: "or",
                conditions: [
                  {
                    op: "and",
                    conditions: [
                      {
                        op: "and",
                        conditions: [
                          { op: "eq", operands: ["foo", "qux.quuz"] },
                          { op: "neq", operands: ["foo", "qux.quuz"] },
                        ],
                      },
                      { op: "eq", operands: ["foo", "qux.quuz"] },
                    ],
                  },
                  {
                    op: "or",
                    conditions: [
                      {
                        op: "gt",
                        left: "foo",
                        right: "bar.baz",
                      },
                      {
                        op: "eq",
                        operands: ["foo", "bar.baz"],
                      },
                    ],
                  },
                ],
              },
              {
                op: "or",
                conditions: [
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
    }),
  );
})();
