import { z } from "zod";
import {
  errorMap,
  makeReverseOpLookup,
  zodOperatorUnionSchema,
  type SelectOperator,
} from "../utils";
import { DeepMap, DeepSet } from "deep-equality-data-structures";

// ========== Comparison operations (number, number) => boolean ==========

const cmpOperatorMapOrdered = {
  gt: [">"],
  lt: ["<"],
  gte: [">="],
  lte: ["<="],
} as const;
const cmpOperatorMapUnordered = {
  eq: ["==", "="],
  neq: ["!=", "<>"],
} as const;
const cmpOperatorMap = {
  ...cmpOperatorMapOrdered,
  ...cmpOperatorMapUnordered,
};
type CmpOperatorMap = typeof cmpOperatorMap;
const cmpOpLookup = makeReverseOpLookup(cmpOperatorMap);
export type CmpOperatorName = keyof CmpOperatorMap;
type CmpOperatorSymbol = CmpOperatorMap[CmpOperatorName][number];
export type CmpOperator = CmpOperatorName | CmpOperatorSymbol;

type CmpOpOrderedName = keyof typeof cmpOperatorMapOrdered;
type CmpOpOrdered = SelectOperator<typeof cmpOpLookup, CmpOpOrderedName>;

type CmpOpUnorderedName = keyof typeof cmpOperatorMapUnordered;
type CmpOpUnordered = SelectOperator<typeof cmpOpLookup, CmpOpUnorderedName>;

export type CmpOperationOrdered<T, Op = CmpOpOrderedName> = {
  op: Op;
  left: T | number;
  right: T | number;
};
export type CmpOperationOrderedInput<T> =
  | CmpOperationOrdered<T, CmpOpOrdered>
  | [T | number, CmpOpOrdered, T | number];

export type CmpOperationUnordered<T, Op = CmpOpUnorderedName> = {
  op: Op;
  a: T | number;
  b: T | number;
};
export type CmpOperationUnorderedInput<T> =
  | CmpOperationOrdered<T, CmpOpUnordered>
  | CmpOperationUnordered<T, CmpOpUnordered>
  | [T | number, CmpOpUnordered, T | number];

const cmpOpOrderedSchema = zodOperatorUnionSchema(cmpOperatorMapOrdered).transform(
  (op) => cmpOpLookup[op],
);
export const cmpSchemasOrdered = <T, S extends z.ZodType<T, any, any>>(
  schema: S,
  numSchema = z.number(),
) => {
  const numOrT = z.union([schema, numSchema]);
  return {
    arr: z
      .tuple([numOrT, cmpOpOrderedSchema, numOrT]) //, errorMap("CmpO [l, op, r]:"))
      .transform(([left, op, right]) => ({ op, left, right })),
    obj: z
      .object(
        {
          op: cmpOpOrderedSchema,
          left: numOrT,
          right: numOrT,
        },
        // errorMap("CmpO obj:"),
      )
      .passthrough(),
  };
};
const cmpOpUnorderedSchema = zodOperatorUnionSchema(cmpOperatorMapUnordered).transform(
  (op) => cmpOpLookup[op],
);
export const cmpSchemasUnordered = <T, S extends z.ZodType<T, any, any>>(
  schema: S,
  numSchema = z.number(),
) => {
  const numOrT = z.union([schema, numSchema]);
  return {
    arr: z
      .tuple([numOrT, cmpOpUnorderedSchema, numOrT]) //, errorMap("CmpU [l, op, r]:"))
      .transform<CmpOperationUnordered<T>>(([a, op, b]) => ({ op, a, b })),
    objRL: z
      .object(
        {
          op: cmpOpUnorderedSchema,
          left: numOrT,
          right: numOrT,
        },
        // errorMap("CmpO obj [lr]:"),
      )
      .transform<CmpOperationUnordered<T>>(({ op, left: a, right: b }) => ({ op, a: a!, b: b! })),
    obj: z.object(
      {
        op: cmpOpUnorderedSchema,
        a: numOrT,
        b: numOrT,
      },
      // errorMap("CmpO obj [ab]:"),
    ),
    objOps: z
      .object(
        {
          op: cmpOpUnorderedSchema,
          operands: z.tuple([numOrT, numOrT]),
        },
        // errorMap("CmpO obj [arr]:"),
      )
      .transform<CmpOperationUnordered<T>>(({ op, operands: [a, b] }) => ({ op, a, b })),
  };
};

export type CmpOperation<T> = CmpOperationOrdered<T> | CmpOperationUnordered<T>;
export type CmpOperationInput<T> = CmpOperationOrderedInput<T> | CmpOperationUnorderedInput<T>;
export const cmpSchema = <T, S extends z.ZodType<T, any, any>>(schema: S) => {
  const ordered = cmpSchemasOrdered(schema);
  const unordered = cmpSchemasUnordered(schema);
  return z
    .union([
      ordered.arr,
      ordered.obj,
      unordered.arr,
      unordered.obj,
      unordered.objOps,
      unordered.objRL,
      // cmpSchemaOrdered<T, S>(schema) as z.ZodType<
      //   CmpOperationOrdered<T>,
      //   any,
      //   CmpOperationOrderedInput<T>
      // >,
      // cmpSchemaUnordered<T, S>(schema) as z.ZodType<
      //   CmpOperationUnordered<T>,
      //   any,
      //   CmpOperationUnorderedInput<T>
      // >,
    ])
    .pipe(z.discriminatedUnion("op", [ordered.obj, unordered.obj]));
};

// ========== Logical operations unary (bool -> bool), binop (bool, bool) -> bool, and multi (bool[] (length >= 2)) -> bool ==========

const logicOpMapUnary = {
  not: ["!"],
} as const;
const logicOpMapBinop = {
  xor: ["^"],
} as const;
const logicOpMapMulti = {
  and: ["&&"],
  or: ["||"],
} as const;
const logicOperatorMap = {
  ...logicOpMapUnary,
  ...logicOpMapBinop,
  ...logicOpMapMulti,
};
type LogicOperatorMap = typeof logicOperatorMap;
const logicOpLookup = makeReverseOpLookup(logicOperatorMap);
export type LogicOperatorName = keyof LogicOperatorMap;
type LogicOperatorSymbol = LogicOperatorMap[LogicOperatorName];
export type LogicOperator = LogicOperatorName | LogicOperatorSymbol;

type LogicOpUnaryNamed = keyof typeof logicOpMapUnary;
type LogicOpUnary = SelectOperator<typeof logicOpLookup, LogicOpUnaryNamed>;

type LogicOpBinopNamed = keyof typeof logicOpMapBinop;
type LogicOpBinop = SelectOperator<typeof logicOpLookup, LogicOpBinopNamed>;

type LogicOpMultiNamed = keyof typeof logicOpMapMulti;
type LogicOpMulti = SelectOperator<typeof logicOpLookup, LogicOpMultiNamed>;

type LogicOperationUnary<T, Op = LogicOpUnaryNamed, B extends boolean = boolean> = {
  op: Op;
  operand: ConditionalOperation<T> | B;
};
type LogicOperationUnaryInput<T> =
  | [LogicOpUnary, ConditionalOperation<T> | boolean]
  | LogicOperationUnary<T, LogicOpUnary>;
// const normaliseLogicUnary = <T>(unary: LogicOperationUnaryInput<T>): LogicOperationUnary<T> =>
//   Array.isArray(unary)
//     ? { op: logicOpLookup[unary[0]], operand: unary[1] }
//     : { op: logicOpLookup[unary.op], operand: unary.operand };
const logicOpUnarySchema = zodOperatorUnionSchema(logicOpMapUnary).transform(
  (op) => logicOpLookup[op],
);
const logicSchemasUnary = <T, S extends z.ZodType<ConditionalOperation<T>, any, any>>(
  schema: S,
) => {
  const valueSchema = z.union([schema, z.boolean()]);
  return {
    arr: z
      .tuple([logicOpUnarySchema, valueSchema]) //, errorMap("LogicU [op, T]:"))
      .transform(([op, operand]) => ({ op, operand })),
    obj: z
      .object(
        {
          op: logicOpUnarySchema,
          operand: valueSchema,
        },
        // errorMap("LogicU obj:"),
      )
      .passthrough(),
  };
};

type LogicOperationBinop<T, Op = LogicOpBinopNamed, B extends boolean = boolean> = {
  op: Op;
  a: ConditionalOperation<T> | B;
  b: ConditionalOperation<T> | B;
};
type LogicOperationBinopInput<T> =
  | [ConditionalOperation<T> | boolean, LogicOpBinop, ConditionalOperation<T> | boolean]
  | LogicOperationBinop<T, LogicOpBinop>;
// const normaliseLogicBinop = <T>(binop: LogicOperationBinopInput<T>): LogicOperationBinop<T> =>
//   Array.isArray(binop)
//     ? { op: logicOpLookup[binop[1]], a: binop[0], b: binop[2] }
//     : { op: logicOpLookup[binop.op], a: binop.a, b: binop.b };
const logicOpBinopSchema = zodOperatorUnionSchema(logicOpMapBinop).transform(
  (op) => logicOpLookup[op],
);
const logicSchemasBinop = <T, S extends z.ZodType<ConditionalOperation<T>, any, any>>(
  schema: S,
) => {
  const valueSchema = z.union([schema, z.boolean()]);
  return {
    arr: z
      .tuple([valueSchema, logicOpBinopSchema, valueSchema]) //, errorMap("LogicB [l, op, r]:"))
      .transform(([a, op, b]) => ({ op, a, b })),
    obj: z
      .object(
        {
          op: logicOpBinopSchema,
          a: valueSchema,
          b: valueSchema,
        },
        // errorMap("LogicB obj:"),
      )
      .passthrough(),
  };
};

type LogicOperationMulti<T, Op = LogicOpMultiNamed, B extends boolean = boolean> = {
  op: Op;
  operands: [
    ConditionalOperation<T> | B,
    ConditionalOperation<T> | B,
    ...(ConditionalOperation<T> | B)[],
  ];
};
type LogicOperationMultiInput<T> =
  | [ConditionalOperation<T> | boolean, LogicOpMulti, ConditionalOperation<T> | boolean]
  | LogicOperationBinop<T, LogicOpMulti>
  | LogicOperationMulti<T, LogicOpMulti>;
// const normaliseLogicMulti = <T>(multi: LogicOperationMultiInput<T>): LogicOperationMulti<T> =>
//   Array.isArray(multi)
//     ? { op: logicOpLookup[multi[1] as LogicOpMulti], operands: [multi[0], multi[2]] as [T, T] }
//     : "operands" in multi
//       ? { op: logicOpLookup[multi.op], operands: multi.operands }
//       : { op: logicOpLookup[multi.op], operands: [multi.a, multi.b] as [T, T] };
const logicOpMultiSchema = zodOperatorUnionSchema(logicOpMapMulti).transform(
  (op) => logicOpLookup[op],
);
const logicSchemasMulti = <T, S extends z.ZodType<ConditionalOperation<T>, any, any>>(
  schema: S,
) => {
  const valueSchema = z.union([schema, z.boolean()]);
  return {
    arr: z
      .tuple([valueSchema, logicOpMultiSchema, valueSchema]) //, errorMap("LogicM [l, op, r]:"))
      .transform<LogicOperationMulti<T>>(([a, op, b]) => ({ op, operands: [a, b] })),
    objAB: z
      .object(
        {
          op: logicOpMultiSchema,
          a: valueSchema,
          b: valueSchema,
        },
        // errorMap("LogicM obj [ab]:"),
      )
      .transform<LogicOperationMulti<T>>(({ op, a, b }) => ({
        op,
        operands: [a, b] as [ConditionalOperation<T> | boolean, ConditionalOperation<T> | boolean],
      })),
    obj: z.object(
      {
        op: logicOpMultiSchema,
        operands: z.tuple([valueSchema, valueSchema]).rest(valueSchema),
      },
      // errorMap("LogicM obj [arr]:"),
    ),
    // }) satisfies z.ZodType<LogicOperationMulti<T>, any, any>,
  };
};

export type LogicOperationFlat<T> =
  | boolean
  | LogicOperationUnary<T, LogicOpUnaryNamed, never>
  | LogicOperationBinop<T, LogicOpBinopNamed, never>
  | LogicOperationMulti<T, LogicOpMultiNamed, never>;
export type LogicOperation<T> =
  | LogicOperationUnary<T>
  | LogicOperationBinop<T>
  | LogicOperationMulti<T>;
export type LogicOperationInput<T> =
  | LogicOperationUnaryInput<T>
  | LogicOperationBinopInput<T>
  | LogicOperationMultiInput<T>;
// export const normaliseLogic = <T>(logic: LogicOperationInput<T>): LogicOperation<T> => {
//   if (Array.isArray(logic)) {
//     switch (logic.length) {
//       // Unary [op, val]
//       case 2:
//         return { op: logicOpLookup[logic[0]], operand: logic[1] };
//       // Binop / multiop with 2 operands
//       case 3: {
//         const op = logicOpLookup[logic[1]];
//         return op === "xor"
//           ? { op, a: logic[0], b: logic[2] }
//           : { op, operands: [logic[0], logic[2]] };
//       }
//     }
//   } else {
//     const op = logicOpLookup[logic.op];
//     switch (op) {
//       case "and":
//       case "or": {
//         if ("operands" in logic) {
//           return { op, operands: logic.operands };
//         } else {
//           const { a, b } = logic as LogicOperationBinop<T, LogicOpMultiNamed>;
//           return { op, operands: [a, b] as [T, T] };
//         }
//       }
//       case "not":
//         return { op, operand: (logic as LogicOperationUnary<T>).operand };
//       case "xor": {
//         const { a, b } = logic as LogicOperationBinop<T>;
//         return { op, a, b };
//       }
//     }
//   }
// };
export const logicSchema = <T, S extends z.ZodType<ConditionalOperation<T>, any, any>>(
  schema: S,
) => {
  const unary = logicSchemasUnary(schema);
  const binop = logicSchemasBinop(schema);
  const multi = logicSchemasMulti(schema);
  return z
    .union([unary.arr, unary.obj, binop.arr, binop.obj, multi.arr, multi.obj, multi.objAB])
    .pipe(z.discriminatedUnion("op", [unary.obj, binop.obj, multi.obj]));
};
// z.union([
//   logicSchemaUnary<T, S>(schema) as z.ZodType<
//     LogicOperationUnary<T>,
//     any,
//     LogicOperationUnaryInput<T>
//   >,
//   logicSchemaBinop<T, S>(schema) as z.ZodType<
//     LogicOperationBinop<T>,
//     any,
//     LogicOperationBinopInput<T>
//   >,
//   logicSchemaMulti<T, S>(schema) as z.ZodType<
//     LogicOperationMulti<T>,
//     any,
//     LogicOperationMultiInput<T>
//   >,
// ]);

// ========== Conditional operations (number, number) => boolean, or operations on one or more boolean values  ==========
type CmpValEntry<T> = {
  id: number;
  field: T;
  eq: Set<number>;
  neq: Set<number>;
  max?: { value: number; allowEq: boolean };
  min?: { value: number; allowEq: boolean };
};
const validateValEntry = <T>(
  entry: CmpValEntry<T>,
  operation: "and" | "or",
):
  | {
      result: "ops";
      operands: Exclude<ConditionalOperation<T>, boolean>[];
    }
  | {
      result: "constant";
      value: boolean;
    }
  | {
      result: "error";
      error: {
        kind: string;
        message: string;
        field: T;
      } & { [k: string]: any };
    } => {
  const operands: Exclude<ConditionalOperation<T>, boolean>[] = [];
  switch (operation) {
    case "and": {
      if (entry.eq.size > 1) {
        return {
          result: "error",
          error: {
            kind: "impossibleEq",
            message: "Equality comparison against multiple constant values will always fail",
            field: entry.field,
            equalTo: entry.eq,
          },
        };
      }
      for (const neq of entry.neq) {
        if (entry.eq.has(neq)) {
          return {
            result: "error",
            error: {
              kind: "eqNeq",
              message: "a == b AND a != b will always fail",
              field: entry.field,
              value: neq,
            },
          };
        }
      }
      const eqA = [...entry.eq];
      if (entry.min !== undefined) {
        if (entry.eq.size > 0 && eqA.some((v) => v < entry.min!.value)) {
          return {
            result: "error",
            error: {
              kind: "eqOOB",
              message: "Cannot be equal a to and greater than b where b > a",
              field: entry.field,
              min: entry.min!.value,
              equalTo: entry.eq,
            },
          };
        }
        if (entry.max !== undefined) {
          if (
            entry.min.allowEq && entry.max.allowEq ? entry.min <= entry.max : entry.min < entry.max
          ) {
            operands.push({
              op: entry.min.allowEq ? "gte" : "gt",
              left: entry.field,
              right: entry.min.value,
            });
            operands.push({
              op: entry.max.allowEq ? "lte" : "lt",
              left: entry.field,
              right: entry.max.value,
            });
          }
        }
      } else if (entry.max !== undefined) {
        if (entry.eq.size > 0 && eqA.some((v) => v < entry.max!.value)) {
          return {
            result: "error",
            error: {
              kind: "eqOOB",
              message: "Cannot be equal a to and less than b where b < a",
              field: entry.field,
              max: entry.max!.value,
              equalTo: entry.eq,
            },
          };
        }
      }
      if (entry.eq.size > 0) {
        operands.push({
          op: "eq",
          a: entry.field,
          b: entry.eq.values().next().value!,
        });
      }
    }
    case "or": {
      for (const neq of entry.neq) {
        if (entry.eq.has(neq)) {
          return {
            result: "constant",
            value: true,
            // error: {
            //   kind: "eqNeq",
            //   message: "a == b or a != b will always return true",
            //   field: entry.field,
            //   value: neq,
            // },
          };
        }
      }
      const hasMin = entry.min !== undefined;
      const hasMax = entry.max !== undefined;
      if (hasMin && hasMax) {
        // e.g. a < 3 || a > 1 = anything
        if (entry.min!.value < entry.max!.value) {
          return {
            result: "constant",
            value: true,
          };
        }
        operands.push(
          {
            op: entry.min!.allowEq || entry.eq.has(entry.min!.value) ? "gte" : "gt",
            left: entry.field,
            right: entry.min!.value,
          },
          {
            op: entry.max!.allowEq || entry.eq.has(entry.max!.value) ? "lte" : "lt",
            left: entry.field,
            right: entry.max!.value,
          },
        );
      } else if (hasMin) {
        operands.push({
          op: entry.min!.allowEq || entry.eq.has(entry.min!.value) ? "gte" : "gt",
          left: entry.field,
          right: entry.min!.value,
        });
      } else if (hasMax) {
        operands.push({
          op: entry.max!.allowEq || entry.eq.has(entry.max!.value) ? "lte" : "lt",
          left: entry.field,
          right: entry.max!.value,
        });
      }
      operands.push(
        ...[...entry.eq].flatMap((val) =>
          (hasMin && val < entry.min!.value) || (hasMax && val > entry.max!.value)
            ? [
                {
                  op: "eq",
                  a: entry.field,
                  b: val,
                } satisfies ConditionalOperation<T>,
              ]
            : [],
        ),
      );
    }
  }
  if (entry.neq.size > 0) {
    operands.push({
      op: "neq",
      a: entry.field,
      b: entry.eq.values().next().value!,
    });
  }
  return {
    result: "ops",
    operands,
  };
};
type CmpPairEntry = {
  eq?: boolean;
  neq?: boolean;
  cmp: Set<"gt" | "lt" | "gte" | "lte">;
};
class FieldComparisonMap<T> {
  private nextId = 0;
  private readonly lookupT = new DeepMap<T, number>();
  private readonly idLookup = new Map<number, CmpValEntry<T>>();
  private readonly entries = new DeepMap<[number, number], CmpPairEntry>();

  private getId(field: T) {
    return this.lookupT.get(field) ?? this.getValEntry(field).id;
  }
  private getField(id: number) {
    return this.idLookup.get(id)!.field;
  }
  private getValEntry(field: T): CmpValEntry<T> {
    const id = this.lookupT.get(field);
    if (id === undefined) {
      const entry: CmpValEntry<T> = {
        id: this.nextId++,
        field,
        eq: new Set(),
        neq: new Set(),
      };
      this.idLookup.set(entry.id, entry);
      this.lookupT.set(field, entry.id);
      return entry;
    } else {
      return this.idLookup.get(id)!;
    }
  }
  private getEntryPair(fieldA: T, fieldB: T): CmpPairEntry {
    const idA = this.getId(fieldA);
    const idB = this.getId(fieldB);
    if (idA === idB) {
      console.error("Fields are equivalent:", fieldA, fieldB);
      throw new Error("Fields are equivalent");
    }
    // Always use first defined, latest as order
    const key: [number, number] = idA < idB ? [idA, idB] : [idB, idA];
    const entry = this.entries.get(key);
    if (entry === undefined) {
      const e: CmpPairEntry = {
        cmp: new Set(),
      };
      this.entries.set(key, e);
      return e;
    } else {
      return entry;
    }
  }

  eq(a: T | number, b: T | number) {
    if (typeof a === "number") {
      if (typeof b === "number") {
        return { const: a === b };
      } else {
        const e = this.getValEntry(b);
        e.eq.add(a);
      }
    } else if (typeof b === "number") {
      const e = this.getValEntry(a);
      e.eq.add(b);
    } else {
      const e = this.getEntryPair(a, b);
      e.eq = true;
    }
  }

  neq(a: T | number, b: T | number) {
    if (typeof a === "number") {
      if (typeof b === "number") {
        return { const: a !== b };
      } else {
        const e = this.getValEntry(b);
        e.eq.add(a);
      }
    } else if (typeof b === "number") {
      const e = this.getValEntry(a);
      e.neq.add(b);
    } else {
      const e = this.getEntryPair(a, b);
      e.neq = true;
    }
  }

  gt(a: T | number, b: T | number, allowEq = false) {
    if (typeof a === "number") {
      if (typeof b === "number") {
        return { const: a === b };
      } else {
        const e = this.getValEntry(b);
        if (e.min === undefined || a > e.min.value) {
          e.min = { value: a, allowEq };
        }
      }
    } else if (typeof b === "number") {
      const e = this.getValEntry(a);
      if (e.max === undefined || b > e.max.value) {
        e.max = { value: b, allowEq };
      }
    } else {
      const e = this.getEntryPair(a, b);
      e.cmp.add(allowEq ? "gte" : "gt");
    }
  }
  gte(a: T | number, b: T | number) {
    return this.gt(a, b, true);
  }
  lt(a: T | number, b: T | number, allowEq = false) {
    if (typeof a === "number") {
      if (typeof b === "number") {
        return { const: a === b };
      } else {
        const e = this.getValEntry(b);
        if (e.max === undefined || a > e.max.value) {
          e.max = { value: a, allowEq };
        }
      }
    } else if (typeof b === "number") {
      const e = this.getValEntry(a);
      if (e.min === undefined || b > e.min.value) {
        e.min = { value: b, allowEq };
      }
    } else {
      const e = this.getEntryPair(a, b);
      e.cmp.add(allowEq ? "lte" : "lt");
    }
  }
  lte(a: T | number, b: T | number) {
    return this.lt(a, b, true);
  }

  flatOperands(kind: "and" | "or"): ConditionalOperation<T> {
    const operands = new DeepSet<Exclude<ConditionalOperation<T>, boolean>>();
    switch (kind) {
      case "and": {
        for (const e of this.idLookup.values()) {
          const valid = validateValEntry(e, kind);
          switch (valid.result) {
            case "ops": {
              for (const o of valid.operands) {
                operands.add(o);
              }
              break;
            }
            case "constant": {
              if (!valid.value) {
                return false;
              }
              break;
            }
            case "error": {
              const { message, ...args } = valid.error;
              console.warn(message, args);
              break;
            }
          }
        }
        for (const [pair, entry] of this.entries) {
          if (entry.eq && entry.neq) {
            console.warn("a == b AND a != b will always fail", {
              kind: "eqNeq",
              fields: pair.map((id) => this.getField(id)),
            });
            return false;
          }
          if (entry.cmp.size > 0) {
            if (entry.eq) {
              console.warn("fields cannot be equal and greater or less than each other", {
                kind: "eqGtLt",
                fields: pair.map((id) => this.getField(id)),
              });
              return false;
            }
            const gte = entry.cmp.has("gte");
            const lte = entry.cmp.has("lte");
            const gt = entry.cmp.has("gt") || gte;
            const lt = entry.cmp.has("lt") || gte;
            if ((gte && lt) || (lte && gt)) {
              console.warn("fields greater, equal and less than each other will never be true", {
                kind: "cmpAny",
                fields: pair.map((id) => this.getField(id)),
              });
              return false;
            } else {
              if (gte) {
                operands.add({
                  op: "gte",
                  left: this.getField(pair[0]),
                  right: this.getField(pair[1]),
                });
              } else if (gt) {
                operands.add({
                  op: "gt",
                  left: this.getField(pair[0]),
                  right: this.getField(pair[1]),
                });
              }
              if (lte) {
                operands.add({
                  op: "lte",
                  left: this.getField(pair[0]),
                  right: this.getField(pair[1]),
                });
              } else if (lt) {
                operands.add({
                  op: "lt",
                  left: this.getField(pair[0]),
                  right: this.getField(pair[1]),
                });
              }
            }
          } else if (entry.eq) {
            operands.add({
              op: "eq",
              a: pair[0],
              b: pair[1],
            });
          }
          if (entry.neq) {
            operands.add({
              op: "neq",
              a: pair[0],
              b: pair[1],
            });
          }
        }
      }
      case "or": {
        for (const e of this.idLookup.values()) {
          const valid = validateValEntry(e, kind);
          switch (valid.result) {
            case "ops": {
              for (const o of valid.operands) {
                operands.add(o);
              }
              break;
            }
            case "constant": {
              if (valid.value) {
                return true;
              }
              break;
            }
            case "error": {
              const { message, ...args } = valid.error;
              console.warn(message, args);
              break;
            }
          }
        }
        for (const [pair, entry] of this.entries) {
          if (entry.eq && entry.neq) {
            console.warn("a == b OR a != b will always succeed", {
              kind: "eqNeq",
              fields: pair.map((id) => this.getField(id)),
            });
            return true;
          }
          if (entry.cmp.size > 0) {
            const gt = entry.cmp.has("gt");
            const lt = entry.cmp.has("lt");
            const gte = entry.cmp.has("gte") || (entry.eq && gt);
            const lte = entry.cmp.has("lte") || (entry.eq && lt);
            if ((gte && lt) || (lte && gt)) {
              console.warn("fields greater, equal or less than each other will always be true", {
                kind: "cmpAny",
                fields: pair.map((id) => this.getField(id)),
              });
              return true;
            } else {
              if (gte) {
                operands.add({
                  op: "gte",
                  left: this.getField(pair[0]),
                  right: this.getField(pair[1]),
                });
              } else if (gt) {
                operands.add({
                  op: "gt",
                  left: this.getField(pair[0]),
                  right: this.getField(pair[1]),
                });
              }
              if (lte) {
                operands.add({
                  op: "lte",
                  left: this.getField(pair[0]),
                  right: this.getField(pair[1]),
                });
              } else if (lt) {
                operands.add({
                  op: "lt",
                  left: this.getField(pair[0]),
                  right: this.getField(pair[1]),
                });
              }
            }
          }
          if (entry.eq) {
            operands.add({
              op: "eq",
              a: pair[0],
              b: pair[1],
            });
          }
          if (entry.neq) {
            operands.add({
              op: "neq",
              a: pair[0],
              b: pair[1],
            });
          }
        }
      }
    }
    if (operands.size < 1) {
      console.error("Unable to parse any operands but has not returned early!", {
        idLookup: this.idLookup,
        fieldLookup: this.lookupT,
        pairEntries: this.entries,
      });
      return false;
    }
    return operands.size > 1
      ? {
          op: kind,
          operands: [...operands],
        }
      : operands.values().next().value!;
  }
}

export const flattenCondition = <T>(
  condition: ConditionalOperationNonFlat<T>,
): ConditionalOperation<T> => {
  type Val = T | number;
  type Flat = Exclude<ConditionalOperation<T>, boolean>;
  type NonFlat = ConditionalOperationNonFlat<T>;
  switch (condition.op) {
    case "and": {
      const cmpMap = new FieldComparisonMap<T>();
      //TODO: overlapping comparisons
      // const limits = new DeepMap<Flat, {
      //   max?: [number, boolean];
      //   min?: [number, boolean];
      //   eq?: number;
      //   neq?: number;
      // }>();
      const operands = [] as Flat[];
      for (const op of condition.operands) {
        if (op === false) {
          // Short circuit and
          return false;
        } else if (typeof op === "object") {
          switch (op.op) {
            case "gt":
            case "lt":
            case "gte":
            case "lte":
              cmpMap[op.op](op.left, op.right);
              break;
            case "eq":
            case "neq":
              cmpMap[op.op](op.a, op.b);
              break;
            case "and": {
              operands.push(...(op.operands as Flat[]));
              break;
            }
            default:
              operands.push(op as Flat);
          }
        }
      }
      return cmpMap.flatOperands("or");
      // return operands.length >= 2
      //   ? ({ op: "and", operands: operands as [Flat, Flat, ...Flat[]] } satisfies Flat)
      //   : ((operands[0] as Flat) ?? true);
    }
    case "or": {
      const cmpMap = new FieldComparisonMap<T>();
      // const comparisons = new DeepMap<
      //   T,
      //   {
      //     all: DeepSet<Val>;
      //     eq: DeepSet<Val>;
      //     neq: DeepSet<Val>;
      //     gt: DeepSet<Val>;
      //     lt: DeepSet<Val>;
      //   }
      // >();
      // const getCmp = (arg: T) => {
      //   if (!comparisons.has(arg)) {
      //     const cmp = {
      //       all: new DeepSet<Val>(),
      //       eq: new DeepSet<Val>(),
      //       neq: new DeepSet<Val>(),
      //       gt: new DeepSet<Val>(),
      //       lt: new DeepSet<Val>(),
      //     };
      //     comparisons.set(arg, cmp);
      //     return cmp;
      //   }
      //   return comparisons.get(arg)!;
      // };
      const operands = [] as Flat[];
      for (const op of condition.operands) {
        if (op === true) {
          // Short circuit or
          return true;
        } else if (typeof op === "object") {
          switch (op.op) {
            case "gt":
            case "lt":
            case "gte":
            case "lte":
              cmpMap[op.op](op.left, op.right);
              break;
            case "eq":
            case "neq":
              cmpMap[op.op](op.a, op.b);
              break;
            case "or": {
              operands.push(...(op.operands as Flat[]));
              break;
            }
            default:
              operands.push(op as Flat);
          }
          // switch (op.op) {
          //   case "gt": {
          //     if (typeof op.left !== "number") {
          //       const cmp = getCmp(op.left);
          //       cmp.all.add(op.right);
          //       cmp.gt.add(op.right);
          //     }
          //     if (typeof op.right !== "number") {
          //       const cmp = getCmp(op.right);
          //       cmp.all.add(op.left);
          //       cmp.lt.add(op.left);
          //       cmp.eq.add(op.left);
          //     }
          //     break;
          //   }
          //   case "lt": {
          //     if (typeof op.left !== "number") {
          //       const cmp = getCmp(op.left);
          //       cmp.all.add(op.right);
          //       cmp.lt.add(op.right);
          //     }
          //     if (typeof op.right !== "number") {
          //       const cmp = getCmp(op.right);
          //       cmp.all.add(op.left);
          //       cmp.gt.add(op.left);
          //       cmp.eq.add(op.left);
          //     }
          //     break;
          //   }
          //   case "gte": {
          //     if (typeof op.left !== "number") {
          //       const cmp = getCmp(op.left);
          //       cmp.all.add(op.right);
          //       cmp.gt.add(op.right);
          //       cmp.eq.add(op.right);
          //     }
          //     if (typeof op.right !== "number") {
          //       const cmp = getCmp(op.right);
          //       cmp.all.add(op.left);
          //       cmp.lt.add(op.left);
          //     }
          //     break;
          //   }
          //   case "lte": {
          //     if (typeof op.left !== "number") {
          //       const cmp = getCmp(op.left);
          //       cmp.all.add(op.right);
          //       cmp.lt.add(op.right);
          //       cmp.eq.add(op.right);
          //     }
          //     if (typeof op.right !== "number") {
          //       const cmp = getCmp(op.right);
          //       cmp.all.add(op.left);
          //       cmp.gt.add(op.left);
          //     }
          //     break;
          //   }
          //   case "eq": {
          //     if (typeof op.a !== "number") {
          //       const cmp = getCmp(op.a);
          //       cmp.all.add(op.b);
          //       cmp.eq.add(op.b);
          //     }
          //     if (typeof op.b !== "number") {
          //       const cmp = getCmp(op.b);
          //       cmp.all.add(op.a);
          //       cmp.eq.add(op.a);
          //     }
          //     break;
          //   }
          //   case "neq": {
          //     if (typeof op.a !== "number") {
          //       const cmp = getCmp(op.a);
          //       cmp.all.add(op.b);
          //       cmp.neq.add(op.b);
          //     }
          //     if (typeof op.b !== "number") {
          //       const cmp = getCmp(op.b);
          //       cmp.all.add(op.a);
          //       cmp.neq.add(op.a);
          //     }
          //     break;
          //   }
          //   case "or": {
          //     operands.push(...(op.operands as Flat[]));
          //     break;
          //   }
          //   default: {
          //     operands.push(op);
          //   }
          // }
        }
      }
      return cmpMap.flatOperands("or");
      // for (const [left, cmp] of comparisons.entries()) {
      //   for (const right of cmp.all) {
      //     const gt = cmp.gt.has(right);
      //     const lt = cmp.lt.has(right);
      //     if (cmp.eq.has(right)) {
      //       if (cmp.neq.has(right)) {
      //         continue;
      //       }
      //       if (lt || gt) {
      //         if (lt && !gt) {
      //           operands.push({ op: "lte", left, right });
      //         } else if (!lt && gt) {
      //           operands.push({ op: "gte", left, right });
      //         }
      //       } else {
      //         operands.push({ op: "eq", a: left, b: right });
      //       }
      //     } else {
      //       if (lt || gt) {
      //         if (lt) {
      //           operands.push({ op: "lt", left, right });
      //         }
      //         if (gt) {
      //           operands.push({ op: "gt", left, right });
      //         }
      //       } else if (cmp.neq.has(right)) {
      //         operands.push({ op: "neq", a: left, b: right });
      //       }
      //     }
      //   }
      // }
      // return operands.length >= 2
      //   ? ({ op: "or", operands: operands as [Flat, Flat, ...Flat[]] } satisfies Flat)
      //   : ((operands[0] as Flat) ?? true);
    }
    case "not": {
      if (typeof condition.operand === "boolean") {
        return !condition.operand;
      } else if (condition.operand.op === "not") {
        return condition.operand.operand;
      } else if (condition.operand.op === "lt") {
        return {
          op: "gte",
          left: condition.operand.left,
          right: condition.operand.right,
        };
      } else if (condition.operand.op === "gt") {
        return {
          op: "lte",
          left: condition.operand.left,
          right: condition.operand.right,
        };
      }
      break;
    }
    case "xor": {
      const args: ["lit", boolean, boolean] | ["1b", boolean, Flat] | ["flat", Flat, Flat] =
        typeof condition.a === "boolean"
          ? typeof condition.b === "boolean"
            ? ["lit", condition.a, condition.b]
            : ["1b", condition.a, condition.b]
          : typeof condition.b === "boolean"
            ? ["1b", condition.b, condition.a]
            : ["flat", condition.a, condition.b];
      switch (args[0]) {
        case "lit":
          return args[1] !== args[2];
        case "1b": {
          const op = args[2];
          if (args[1]) {
            // Should invert
            if (op.op === "not") {
              return op.operand;
            } else {
              return { op: "not", operand: op };
            }
          } else {
            return op;
          }
        }
        case "flat": {
          //TODO: implement checking that the 2 xor args are different
        }
      }
      break;
    }
    case "gt": {
      if (typeof condition.left === "number" && typeof condition.right === "number") {
        return condition.left > condition.right;
      }
      break;
    }
    case "lt": {
      if (typeof condition.left === "number" && typeof condition.right === "number") {
        return condition.left < condition.right;
      }
      break;
    }
    case "gte": {
      if (typeof condition.left === "number" && typeof condition.right === "number") {
        return condition.left >= condition.right;
      }
      break;
    }
    case "lte": {
      if (typeof condition.left === "number" && typeof condition.right === "number") {
        return condition.left <= condition.right;
      }
      break;
    }
    case "eq": {
      if (typeof condition.a === "number" && typeof condition.b === "number") {
        return condition.a === condition.b;
      }
      break;
    }
    case "neq": {
      if (typeof condition.a === "number" && typeof condition.b === "number") {
        return condition.a !== condition.b;
      }
      break;
    }
  }
  return condition;
};

export type ConditionalOperation<T> = CmpOperation<T> | LogicOperationFlat<T>;
export type ConditionalOperationNonFlat<T> = CmpOperation<T> | LogicOperation<T>;
export type ConditionalOperationInput<T> = CmpOperationInput<T> | LogicOperationInput<T>;
// export const conditionSchema = <T, S extends z.ZodType<T, any, any>>(schema: S) => {
//   const cmp = cmpSchema<T, S>(schema);
//   const logic = logicSchema<
//     T,
//     z.ZodType<ConditionalOperation<T>, z.ZodTypeDef, ConditionalOperationInput<T>>
//   >(z.lazy(() => condition));
//   const condition: z.ZodType<
//     ConditionalOperation<T>,
//     z.ZodTypeDef,
//     ConditionalOperationInput<T>
//   > = z.union([cmp, logic]).transform<ConditionalOperation<T>>(flattenCondition);
//   return condition;
// };
export const conditionSchema = <T, S extends z.ZodType<T, any, any>>(schema: S) => {
  const ordered = cmpSchemasOrdered<T, S>(schema);
  const unordered = cmpSchemasUnordered<T, S>(schema);
  const unary = logicSchemasUnary(z.lazy(() => condition));
  const binop = logicSchemasBinop(z.lazy(() => condition));
  const multi = logicSchemasMulti(z.lazy(() => condition));
  // @ts-expect-error
  const condition: z.ZodType<
    ConditionalOperation<T>,
    z.ZodTypeDef,
    ConditionalOperationInput<T>
  > = z
    .union([
      z.boolean(),
      ordered.arr,
      ordered.obj,
      unordered.arr,
      unordered.obj,
      unordered.objOps,
      unordered.objRL,
      unary.arr,
      unary.obj,
      binop.arr,
      binop.obj,
      multi.arr,
      multi.obj,
      multi.objAB,
    ])
    .pipe(
      z.union([
        z.boolean(),
        z
          .discriminatedUnion("op", [ordered.obj, unordered.obj, unary.obj, binop.obj, multi.obj])
          // @ts-expect-error
          .transform<ConditionalOperation<T>>(flattenCondition),
      ]),
    );
  return condition;
};
