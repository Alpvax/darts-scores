import { computed, ref, Ref } from "vue";
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

export type PlayerStatsHolder<S, R> = {
  stats: Ref<S>;
  add: (gameResult: R) => void;
  clear: () => void;
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export const statsCounterFactory = <S extends z.ZodTypeAny, R>(
  statsSchema: S,
  accumulator: (stats: z.infer<S>, gameResult: R) => z.infer<S>,
) => {
  const statsInternalKey = Symbol("statsInternal");
  type StatsCounterInternal<S, R> = {
    defaults: S;
    accumulator: (stats: S, gameResult: R) => S;
    nonEmpty: boolean;
    [statsInternalKey]: S;
  };

  const defaults = Object.freeze(statsSchema.parse({}));
  const prot = Object.defineProperties({
    accumulator,
    add(this: StatsCounterInternal<z.infer<S>, R>, gameResult: R): void {
      this.nonEmpty = true;
      this[statsInternalKey].value = accumulator(this[statsInternalKey].value, gameResult);
    },
    clear(this: StatsCounterInternal<z.infer<S>, R>): void {
      if (this.nonEmpty) {
        this[statsInternalKey].value = { ...this.defaults };
      }
    },
  }, {
    defaults: {
      value: defaults,
      enumerable: false,
      writable: false,
      configurable: false,
    },
    stats: {
      get(this: StatsCounterInternal<z.infer<S>, R>) {
        return computed(() => this[statsInternalKey]);
      },
    },
  });
  return {
    create: (): PlayerStatsHolder<z.infer<S>, R> => Object.create(prot, {
      [statsInternalKey]: {
        value: ref({ ...defaults }),
        enumerable: false,
        configurable: false,
        writable: false,
      },
      nonEmpty: {
        value: false,
        enumerable: false,
        configurable: false,
        writable: true,
      },
    }),
  };
};
