import { z } from "zod";

type HighLowTotal = {
  highest: number;
  lowest: number;
  total: number;
};
export const highLowTotal = {
  newSchema: (
    { min, max, high, low, total, func }: {
      min?: number;
      max?: number;
      high?: number;
      low?: number;
      total: number;
      func?: (schema: z.ZodNumber) => z.ZodNumber;
    },
  ) => {
    let schema = z.number();
    if (func) { schema = func(schema); }
    if (min) { schema = schema.min(min); }
    if (max) { schema = schema.max(max); }
    high = high ?? min;
    low = low ?? max;
    const res = z.object({
      highest: high !== undefined ? schema.default(high) : schema,
      lowest: low !== undefined ? schema.default(low) : schema,
      total: total !== undefined ? schema.default(total) : schema,
    });
    return high !== undefined && low !== undefined && total !== undefined
      ? res.default({})
      : res;
  },
  addStat: (
    { highest, lowest, total }: HighLowTotal,
    statValue: number,
  ) => ({
    highest: Math.max(highest, statValue),
    lowest: Math.min(lowest, statValue),
    total: total + statValue,
  }),
};
