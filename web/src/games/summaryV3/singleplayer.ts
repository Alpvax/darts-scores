import { Ref, computed, ref } from "vue";
import { TypeOf, ZodTypeAny } from "zod";


export type PlayerStatsHolder<S, R> = {
  stats: Ref<S>;
  add: (gameResult: R) => void;
  clear: () => void;
}
export type StatsType<T extends StatsCounterFactory<any, any>> =
  T extends StatsCounterFactory<infer S, any> ? TypeOf<S> : never;

export type StatsCounterFactory<S extends ZodTypeAny, R> = {
  create: () => PlayerStatsHolder<TypeOf<S>, R>;
}

export const statsCounterFactory = <S extends ZodTypeAny, R>(
  statsSchema: S,
  accumulator: (stats: TypeOf<S>, playerGameResult: R) => TypeOf<S>,
): StatsCounterFactory<S, R> => {
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
    add(this: StatsCounterInternal<TypeOf<S>, R>, gameResult: R): void {
      this.nonEmpty = true;
      this[statsInternalKey].value = accumulator(this[statsInternalKey].value, gameResult);
    },
    clear(this: StatsCounterInternal<TypeOf<S>, R>): void {
      if (this.nonEmpty) {
        this[statsInternalKey].value = structuredClone(this.defaults);
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
      get(this: StatsCounterInternal<TypeOf<S>, R>) {
        return computed(() => this[statsInternalKey]);
      },
    },
  });
  return {
    create: () => Object.create(prot, {
      [statsInternalKey]: {
        value: ref(structuredClone(defaults)),
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
