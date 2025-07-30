import { z } from "zod";
import {
  errorMap,
  makeReverseOpLookup,
  zodOperatorUnionSchema,
  type SelectOperator,
} from "../utils";

// ========== Maths operations (number, number) => number ==========

const mathsOpMapUnary = {
  negate: ["-", "negative"],
  abs: [],
} as const;
const mathsOpMapDiv = {
  div: ["/"],
} as const;
// const mathsOpMapBinop = {
// } as const;
const mathsOpMapMulti = {
  add: ["+"],
  mul: ["*"],
} as const;
const mathsOperatorMap = {
  ...mathsOpMapUnary,
  ...mathsOpMapDiv,
  // ...mathsOpMapBinop,
  ...mathsOpMapMulti,
};
type MathsOperatorMap = typeof mathsOperatorMap;
const mathsOpLookup = makeReverseOpLookup(mathsOperatorMap);
export type MathsOperatorName = keyof MathsOperatorMap;
type MathsOperatorSymbol = MathsOperatorMap[MathsOperatorName][number];
export type MathsOperator = MathsOperatorName | MathsOperatorSymbol;

type MathsOpUnaryNamed = keyof typeof mathsOpMapUnary;
type MathsOpUnary = SelectOperator<typeof mathsOpLookup, MathsOpUnaryNamed>;

type MathsOpDivNamed = keyof typeof mathsOpMapDiv;
type MathsOpDiv = SelectOperator<typeof mathsOpLookup, MathsOpDivNamed>;

// type MathsOpBinopNamed = keyof typeof mathsOpMapBinop;
// type MathsOpBinop = SelectOperator<typeof mathsOpLookup, MathsOpBinopNamed>;

type MathsOpMultiNamed = keyof typeof mathsOpMapMulti;
type MathsOpMulti = SelectOperator<typeof mathsOpLookup, MathsOpMultiNamed>;

type MathsOperationUnary<T, Op = MathsOpUnaryNamed> = {
  type: Op;
  operand: T;
};
type MathsOperationUnaryInput<T> = [MathsOpUnary, T] | MathsOperationUnary<T, MathsOpUnary>;
const mathsOpUnarySchema = zodOperatorUnionSchema(mathsOpMapUnary).transform(
  (type) => mathsOpLookup[type],
);
const mathsSchemasUnary = <T, S extends z.ZodType<T, any, any>>(schema: S) => ({
  arr: z
    .tuple([mathsOpUnarySchema, schema]) //, errorMap("Maths unary [op, T]:"))
    .transform(([type, operand]) => ({ type, operand })),
  obj: z
    .object(
      {
        type: mathsOpUnarySchema,
        operand: schema,
      },
      // errorMap("Maths unary obj:"),
    )
    .passthrough(),
});

type MathsOperationDiv<T, Op = "div"> = {
  type: Op;
  numerator: T;
  divisor: T;
};
type MathsOperationDivInput<T> = [T, MathsOpDiv, T] | MathsOperationDiv<T, MathsOpDiv>;
const mathsOpDivSchema = zodOperatorUnionSchema(mathsOpMapDiv).transform(
  (type) => mathsOpLookup[type],
);
const mathsSchemasDiv = <T, S extends z.ZodType<T, any, any>>(schema: S) => ({
  arr: z
    .tuple([schema, mathsOpDivSchema, schema]) //, errorMap('Maths div [num, "/", div]:'))
    .transform(([numerator, type, divisor]) => ({ type, numerator, divisor })),
  obj: z
    .object(
      {
        type: mathsOpDivSchema,
        a: schema,
        b: schema,
      },
      // errorMap("Maths div obj:"),
    )
    .passthrough(),
});
type MathsOperationBinop<T, Op /* = MathsOpBinopNamed*/> = {
  type: Op;
  a: T;
  b: T;
};
// type MathsOperationBinopInput<T> = [T, MathsOpBinop, T] | MathsOperationBinop<T, MathsOpBinop>;
// const normaliseMathsBinop = <T>(binop: MathsOperationBinopInput<T>): MathsOperationBinop<T> =>
//   Array.isArray(binop)
//     ? { type: mathsOpLookup[binop[1]], a: binop[0], b: binop[2] }
//     : { type: mathsOpLookup[binop.type], a: binop.a, b: binop.b };
// const mathsOpBinopSchema = zodOperatorUnionSchema(mathsOpMapBinop).transform(
//   (type) => mathsOpLookup[type],
// );
// const mathsSchemaBinop = <T, S extends z.ZodType<T, any, any>>(schema: S) =>
//   z.union([
//     z.tuple([schema, mathsOpBinopSchema, schema]).transform(([a, type, b]) => ({ type, a, b })),
//     z.object({
//       type: mathsOpBinopSchema,
//       a: schema,
//       b: schema,
//     }).passthrough(),
//   ]);

type MathsOperationMulti<T, Op = MathsOpMultiNamed> = {
  type: Op;
  operands: [T, T, ...T[]];
};
type MathsOperationMultiInput<T> =
  | [T, MathsOpMulti, T]
  | MathsOperationBinop<T, MathsOpMulti>
  | MathsOperationMulti<T, MathsOpMulti>;
const normaliseMathsMulti = <T>(multi: MathsOperationMultiInput<T>): MathsOperationMulti<T> =>
  Array.isArray(multi)
    ? { type: mathsOpLookup[multi[1] as MathsOpMulti], operands: [multi[0], multi[2]] as [T, T] }
    : "operands" in multi
      ? { type: mathsOpLookup[multi.type], operands: multi.operands }
      : { type: mathsOpLookup[multi.type], operands: [multi.a, multi.b] as [T, T] };
const mathsOpMultiSchema = zodOperatorUnionSchema(mathsOpMapMulti).transform(
  (type) => mathsOpLookup[type],
);
const mathsSchemasMulti = <T, S extends z.ZodType<T, any, any>>(schema: S) => ({
  arr: z
    .tuple([schema, mathsOpMultiSchema, schema]) //, errorMap("Maths multi [l, op, r]:"))
    .transform<MathsOperationMulti<T>>(([a, type, b]) => ({ type, operands: [a, b] })),
  objAB: z
    .object(
      {
        type: mathsOpMultiSchema,
        a: schema,
        b: schema,
      },
      // errorMap("Maths multi obj [ab]:"),
    )
    .transform<MathsOperationMulti<T>>(({ type, a, b }) => ({
      type,
      operands: [a, b] as [T, T],
    })),
  obj: z.object(
    {
      type: mathsOpMultiSchema,
      operands: z.tuple([schema, schema]).rest(schema),
    },
    // errorMap("Maths multi obj [arr]:"),
  ),
});

export type MathsOperation<T> =
  | MathsOperationUnary<T>
  | MathsOperationDiv<T>
  // | MathsOperationBinop<T>
  | MathsOperationMulti<T>;
export type MathsOperationInput<T> =
  | MathsOperationUnaryInput<T>
  | MathsOperationDivInput<T>
  // | MathsOperationBinopInput<T>
  | MathsOperationMultiInput<T>;
const normaliseMaths = <T>(maths: MathsOperationInput<T>): MathsOperation<T> => {
  if (Array.isArray(maths)) {
    switch (maths.length) {
      // Unary [type, val]
      case 2:
        return { type: mathsOpLookup[maths[0]], operand: maths[1] };
      // Binop / multiop with 2 operands
      case 3: {
        const type = mathsOpLookup[maths[1]];
        return type === "div"
          ? { type, numerator: maths[0], divisor: maths[2] }
          : { type, operands: [maths[0], maths[2]] };
      }
    }
  } else {
    const type = mathsOpLookup[maths.type];
    if (type === "div") {
      const { numerator, divisor } = maths as MathsOperationDiv<T>;
      return { type, numerator, divisor };
    } else if (type in mathsOpMapUnary) {
      return {
        type: type as MathsOpUnaryNamed,
        operand: (maths as MathsOperationUnary<T>).operand,
      };
      // } else if (type in mathsOpMapBinop) {
      //   const { a, b } = maths as MathsOperationBinop<T, MathsOpMultiNamed>;
      //   return { type: type as MathsOpBinopNamed, a, b };
    } else {
      //if (type in mathsOpMapMulti) {
      if ("operands" in maths) {
        return { type: type as MathsOpMultiNamed, operands: maths.operands };
      } else {
        const { a, b } = maths as MathsOperationBinop<T, MathsOpMultiNamed>;
        return { type: type as MathsOpMultiNamed, operands: [a, b] as [T, T] };
      }
    }
  }
};
export const mathsSchema = <T, S extends z.ZodType<T, any, any>>(schema: S) => {
  const unary = mathsSchemasUnary(schema);
  const div = mathsSchemasDiv(schema);
  const multi = mathsSchemasMulti(schema);
  return z
    .union([
      unary.arr,
      unary.obj,
      div.arr,
      div.obj,
      multi.arr,
      multi.obj,
      multi.objAB,
      // mathsSchemaUnary<T, S>(schema) as z.ZodType<
      //   MathsOperationUnary<T>,
      //   any,
      //   MathsOperationUnaryInput<T>
      // >,
      // mathsSchemaDiv<T, S>(schema) as z.ZodType<MathsOperationDiv<T>, any, MathsOperationDivInput<T>>,
      // // mathsSchemaBinop<T, S>(schema) as z.ZodType<
      // //   MathsOperationBinop<T>,
      // //   any,
      // //   MathsOperationBinopInput<T>
      // // >,
      // mathsSchemaMulti<T, S>(schema) as z.ZodType<
      //   MathsOperationMulti<T>,
      //   any,
      //   MathsOperationMultiInput<T>
      // >,
    ])
    .pipe(z.discriminatedUnion("type", [unary.obj, div.obj, multi.obj]));
};
export const mathsSchemas = <T, S extends z.ZodType<T, any, any>>(schema: S) => {
  const unary = mathsSchemasUnary(schema);
  const div = mathsSchemasDiv(schema);
  const multi = mathsSchemasMulti(schema);
  return {
    ops: [mathsOpUnarySchema, mathsOpDivSchema, mathsOpMultiSchema] as const,
    input: [unary.arr, unary.obj, div.arr, div.obj, multi.arr, multi.obj, multi.objAB] as const,
    output: [
      unary.obj,
      div.obj,
      multi.obj,
    ] as const satisfies z.ZodDiscriminatedUnionOption<"type">[],
  };
};
