import { isVNode, type VNodeChild } from "vue";
import { z } from "zod";
import { formatOptionsSchema } from "./builtin";
import type { ClassBindings } from "@/utils";

export const isVNodeChild = (data: any): data is VNodeChild => {
  if (isVNode(data)) {
    return true;
  }
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
export const vNodeChildSchema = z.custom<VNodeChild>((data) => {
  return isVNodeChild(data);
});

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
