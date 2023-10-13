/* eslint-disable vue/one-component-per-file */
// export enum StatType {
//   /** Things like cliffs. Can count most/least per game, and total */
//   MUTIPLE_PER_GAME = "multiStat",
//   /** Things like furthest positive, where there is a single value per game to be compared */
//   PER_GAME = "perGame",
//   /** Things like fat nicks, where they either happened or did not per game */
//   NUM_GAMES = "gameCount",
// }

import { Player, onDemandPlayerStore } from "@/store/player";
import { PropType, computed, defineComponent, ref, watchEffect } from "vue";

export type SummaryFieldDisplay<T> = {
  /** The text to be displayed as the summary table heading */
  label: string;
  /** Function to get the summary value from the stored data */
  getFieldValue: (val: T, totalGamesPlayed: number) => number;
  /** Function to call to convert the number to a string (e.g. using Intl.NumberFormat) */
  display?: (val: number) => string;
  /**
   * Record of `className: criteria` to use to add highlighting to the value in the table.
   * "-NZ" values specify that 0 values will be ignored for highlighting, used to prevent everyone
   * having highlighting when noone has the stat.
   * e.g. `{ best: highest, worst: lowestNZ }`
   */
  highlight?: Record<string,
  "highest" | "lowest" | "highestNZ" | "lowestNZ"
  | ((limits: { highest: number; lowest: number }, value: number, statValue: T) => boolean)
  >;
}

export type Stat<
  T, R,
  S extends Record<string, SummaryFieldDisplay<T>> = Record<string, SummaryFieldDisplay<T>>
> = {
  // readonly typ: StatType;
  readonly startValue: T extends number | boolean ? T : (() => T);
  readonly addGameResult: (prevValue: T, result: R) => T;
  readonly summaryFields: S;
}

// abstract class SingleValueGameStat<R>
// implements Stat<number, R, { count: SummaryFieldDisplay<number> }> {
//   // typ = StatType.NUM_GAMES;
//   summaryFields: { count: SummaryFieldDisplay<number> };
//   protected constructor(
//     readonly valueDelta: (result: R) => number,
//     field: SummaryFieldDisplay<number>,
//     readonly startValue = 0,
//   ) {
//     this.summaryFields = { count: field };
//   }
//   addGameResult(prevValue: number, result: R): number {
//     return prevValue + this.valueDelta(result);
//   }
// }

// /**
//  * A stat which either occurred or did not occur in a single game.
//  * Just counts the number of games the occurrence happened in.
//  * Optionally also adds a rate field (divided by numGames)
//  */
// export class BooleanGameStat<R> implements Stat<number, R,
// { count: SummaryFieldDisplay<number>; rate?: SummaryFieldDisplay<number> }
// > {
//   static create<R>(
//     getValue: (result: R) => boolean,
//     summaryField:
//     { label: string } & Partial<Omit<SummaryFieldDisplay<number>, "label" | "getFieldValue">>,
//     rateField?:
//     { label: string } & Partial<Omit<SummaryFieldDisplay<number>, "label" | "getFieldValue">>,
//   ): BooleanGameStat<R>;
//   static create<R>(
//     getValue: (result: R) => boolean,
//     summaryField:
//     { label: string } & Partial<Omit<SummaryFieldDisplay<number>, "label" | "getFieldValue">>,
//     rateLabel?: string,
//     rateMaxDecimals?: number,
//   ): BooleanGameStat<R>;
//   static create<R>(
//     getValue: (result: R) => boolean,
//     summaryLabel: string,
//     rateField?:
//     { label: string } & Partial<Omit<SummaryFieldDisplay<number>, "label" | "getFieldValue">>,
//   ): BooleanGameStat<R>;
//   static create<R>(
//     getValue: (result: R) => boolean,
//     summaryLabel: string,
//     rateLabel?: string,
//     rateMaxDecimals?: number,
//   ): BooleanGameStat<R>;
//   static create<R>(
//     getValue: (result: R) => boolean,
//     summaryField: string | ({ label: string }
//     & Partial<Omit<SummaryFieldDisplay<number>, "label" | "getFieldValue">>),
//     rateField?: string | ({ label: string }
//     & Partial<Omit<SummaryFieldDisplay<number>, "label" | "getFieldValue">>),
//     rateMaxDecimals?: number,
//   ): BooleanGameStat<R> {
//     const field: SummaryFieldDisplay<number> = typeof summaryField === "string"
//       ? {
//         label: summaryField,
//         getFieldValue: val => val,
//         highlight: { best: "highestNZ", worst: "lowestNZ" },
//       }
//       : Object.assign(summaryField, { getFieldValue: (val: number) => val });
//     const stat = new BooleanGameStat((result: R) => getValue(result) ? 1 : 0, field);
//     if (rateField !== undefined) {
//       const rateFmt = typeof rateField === "string"
//         ? new Intl.NumberFormat(undefined, {
//           maximumFractionDigits: rateMaxDecimals ?? 2,
//           style: "percent",
//         })
//         : undefined;
//       const rate: SummaryFieldDisplay<number> = typeof rateField === "string"
//         ? {
//           label: rateField,
//           getFieldValue: (val, gameCount) => val / gameCount,
//           display: val => rateFmt!.format(val),
//           highlight: field.highlight,
//         }
//         : Object.assign(rateField,
//           { getFieldValue: (val: number, gameCount: number) => val / gameCount });
//       stat.summaryFields.rate = rate;
//     }
//     return stat;
//   }
//   summaryFields: { count: SummaryFieldDisplay<number>; rate?: SummaryFieldDisplay<number> };
//   protected constructor(
//     readonly valueDelta: (result: R) => number,
//     field: SummaryFieldDisplay<number>,
//     readonly startValue = 0,
//   ) {
//     this.summaryFields = { count: field };
//   }
//   addGameResult(prevValue: number, result: R): number {
//     return prevValue + this.valueDelta(result);
//   }
//   // typ = StatType.NUM_GAMES;
//   // getValue: null | (result: R) => boolean,
//   // startValue = 0;
//   // summaryFields: { [k: string]: SummaryFieldDisplay<number> };
//   // private constructor(
//   //   label: string,
//   //   getValue: (result: R) => boolean,
//   //   summaryFieldOpts?: Partial<Omit<SummaryFieldDisplay<number>, "label" | "get">>,
//   // ) {
//   //   this.summaryFields = { count: {
//   //     label,
//   //     getFieldValue: val => val,
//   //     display: summaryFieldOpts?.display ?? (val => val.toString()),
//   //     highlight: summaryFieldOpts?.highlight ?? { best: "highest", worst: "lowestNZ" },
//   //   }};
//   // }
//   // addGameResult(prevValue: number, result: R): number {
//   //   return this.getValue(result) ? prevValue + 1 : prevValue;
//   // }
// }

type HLT = {
  highest: number;
  lowest: number;
  total: number;
}
// /**
//  * A stat for a score in a single game.
//  * Does not have to be the final score, but anything that has a single value for a single game.
//  * Records the lowest, highest and total across all games.
//  */
// export class IntegerGameStat<R> implements Stat<HLT, R,
// Partial<{ [k in "highest" | "lowest" | "total" | "mean"]: SummaryFieldDisplay<HLT> }>
// > {
//   /**
//    * A stat for a score in a single game.
//    * Does not have to be the final score, but anything that has a single value for a single game.
//    * Records the lowest, highest and total across all games.
//    */
//   static create<R>(
//     getValue: (result: R) => number,
//     summary: {
//       [k in (keyof HLT | "mean")]?: { label: string }
//       & Partial<Omit<SummaryFieldDisplay<HLT>, "label">>;
//     },
//     startValues?: Partial<HLT>,
//     floatMaxDecimals = 2,
//   ): IntegerGameStat<R> {
//     return new IntegerGameStat(getValue, summary, startValues, floatMaxDecimals);
//   }
//   // typ = StatType.PER_GAME;
//   startValue: () => HLT;
//   summaryFields: { [k: string]: SummaryFieldDisplay<HLT> };
//   private constructor(
//     readonly getValue: (result: R) => number,
//     summary: {
//       [k in (keyof HLT | "mean")]?: { label: string }
//       & Partial<Omit<SummaryFieldDisplay<HLT>, "label">>;
//     },
//     startValues?: Partial<HLT>,
//     floatMaxDecimals = 2,
//   ) {
//     this.startValue = () => ({
//       highest: startValues?.highest ?? Number.MIN_SAFE_INTEGER,
//       lowest: startValues?.lowest ?? Number.MAX_SAFE_INTEGER,
//       total: startValues?.total ?? 0,
//     });
//     const rateFmt = new Intl.NumberFormat(undefined, {
//       maximumFractionDigits: floatMaxDecimals,
//       style: "percent",
//     });
//     this.summaryFields = Object.entries(summary).reduce((obj, [k, field]) => {
//       obj[k] = {
//         label: field.label,
//         getFieldValue: field.getFieldValue ?? (
//           (val, totalGames) => Object.hasOwn(val, k)
//             ? val[k as keyof HLT]
//             : val.total / totalGames
//         ),
//         display: field.display ?? k === "mean" ? (val => rateFmt.format(val)) : undefined,
//       };
//       return obj;
//     }, {} as { [k: string]: SummaryFieldDisplay<HLT> });
//   }
//   addGameResult(prevValue: HLT, result: R): HLT {
//     const value = this.getValue(result);
//     return {
//       highest: Math.max(prevValue.highest, value),
//       lowest: Math.min(prevValue.lowest, value),
//       total: prevValue.total + value,
//     };
//   }
// }

// /**
//  * Simply counts the number of games.
//  */
// export class NumGamesStat<R> extends SingleValueGameStat<R> {
//   static create<R>(label: string): NumGamesStat<R>;
//   static create<R>(field: SummaryFieldDisplay<number>): NumGamesStat<R>;
//   static create<R>(field: string | SummaryFieldDisplay<number>): NumGamesStat<R> {
//     return new NumGamesStat(
//       () => 1,
//       typeof field === "string"
//         ? {
//           label: field,
//           getFieldValue: val => val,
//           highlight: { best: "highest" },
//         }
//         : field,
//     );
//   }
// typ = StatType.PER_GAME;
// startValue = 0;
// summaryFields: { [k: string]: SummaryFieldDisplay<number> };
// private constructor(field: string | SummaryFieldDisplay<number>) {
//   this.summaryFields = { count: typeof field === "string"
//     ? {
//       label: field,
//       getFieldValue: val => val,
//     }
//     : field };
// }
// addGameResult(prevValue: number, _result: R): number {
//   return prevValue + 1;
// }
// }

function numGamesStat<R>(label: string): Stat<number, R, { count: SummaryFieldDisplay<number> }>;
function numGamesStat<R>(field: SummaryFieldDisplay<number>):
Stat<number, R, { count: SummaryFieldDisplay<number> }>;
function numGamesStat<R>(field: string | SummaryFieldDisplay<number>):
Stat<number, R, { count: SummaryFieldDisplay<number> }> {
  return {
    startValue: 0,
    summaryFields: { count: typeof field === "string"
      ? {
        label: field,
        getFieldValue: val => val,
        highlight: { best: "highestNZ" },
      }
      : field,
    },
    addGameResult: prev => prev + 1,
  };
}

function booleanStat<R>(
  getValue: (result: R) => boolean,
  summaryField: string |
  { label: string } & Partial<Omit<SummaryFieldDisplay<number>, "label" | "getFieldValue">>,
  rateField?:
  { label: string } & Partial<Omit<SummaryFieldDisplay<number>, "label" | "getFieldValue">>,
): Stat<number, R, { count: SummaryFieldDisplay<number>; rate?: SummaryFieldDisplay<number> }>;
function booleanStat<R>(
  getValue: (result: R) => boolean,
  summaryField: string |
  { label: string } & Partial<Omit<SummaryFieldDisplay<number>, "label" | "getFieldValue">>,
  rateLabel?: string,
  rateMaxDecimals?: number,
): Stat<number, R, { count: SummaryFieldDisplay<number>; rate?: SummaryFieldDisplay<number> }>;
function booleanStat<R>(
  getValue: (result: R) => boolean,
  summaryField: string | ({ label: string }
  & Partial<Omit<SummaryFieldDisplay<number>, "label" | "getFieldValue">>),
  rateField?: string | ({ label: string }
  & Partial<Omit<SummaryFieldDisplay<number>, "label" | "getFieldValue">>),
  rateMaxDecimals?: number,
): Stat<number, R, { count: SummaryFieldDisplay<number>; rate?: SummaryFieldDisplay<number> }> {
  const count: SummaryFieldDisplay<number> = typeof summaryField === "string"
    ? {
      label: summaryField,
      getFieldValue: val => val,
      highlight: { best: "highestNZ" },
    }
    : Object.assign(summaryField, { getFieldValue: (val: number) => val });
  return {
    startValue: 0,
    addGameResult: (prev, result) => prev + (getValue(result) ? 1 : 0),
    summaryFields: {
      count,
      rate: rateField === undefined
        ? undefined
        : typeof rateField === "string"
          ? ((): SummaryFieldDisplay<number> => {
            const rateFmt = new Intl.NumberFormat(undefined, {
              maximumFractionDigits: rateMaxDecimals ?? 2,
              style: "percent",
            });
            return {
              label: rateField,
              getFieldValue: (val, gameCount) => val / gameCount,
              display: val => rateFmt!.format(val),
              highlight: count.highlight,
            };
          })()
          : Object.assign(rateField,
            { getFieldValue: (val: number, gameCount: number) => val / gameCount }),
    },
  };
}

function intGameStat<R>(
  getValue: (result: R) => number,
  summary: {
    [k in (keyof HLT | "mean")]?: { label: string }
    & Partial<Omit<SummaryFieldDisplay<HLT>, "label" | "getFieldValue">>;
  },
  startValues?: Partial<HLT>,
  floatMaxDecimals = 2,
): Stat<HLT, R, {
    highest?: SummaryFieldDisplay<HLT>;
    lowest?: SummaryFieldDisplay<HLT>;
    total?: SummaryFieldDisplay<HLT>;
    mean?: SummaryFieldDisplay<HLT>;
  }> {
  const rateFmt = new Intl.NumberFormat(undefined, {
    maximumFractionDigits: floatMaxDecimals,
    style: "percent",
  });
  return {
    startValue: () => ({
      highest: startValues?.highest ?? Number.MIN_SAFE_INTEGER,
      lowest: startValues?.lowest ?? Number.MAX_SAFE_INTEGER,
      total: startValues?.total ?? 0,
    }),
    addGameResult: (prevValue, result) => {
      const value = getValue(result);
      return {
        highest: Math.max(prevValue.highest, value),
        lowest: Math.min(prevValue.lowest, value),
        total: prevValue.total + value,
      };
    },
    summaryFields: Object.entries(summary).reduce((obj, [k, field]) => {
      obj[k] = {
        label: field.label,
        getFieldValue: (val, totalGames) => {
          return Object.hasOwn(val, k)
            ? val[k as keyof HLT]
            : val.total / totalGames;
        },
        display: field.display ?? (k === "mean"
          ? (val => rateFmt.format(val / 100))
          : undefined),
        highlight: field.highlight ?? { best: "highestNZ" },
      };
      return obj;
    }, {} as { [k: string]: SummaryFieldDisplay<HLT> }),
  };
}

/**
 * HLT with additional count of number of games the value was > 1
 */
type HLTCount = {
  highest: number;
  lowest: number;
  total: number;
  gameCount: number;
}

function intMultiStat<R>(
  getValue: (result: R) => number,
  maxPerGame: number,
  summary: {
    [k in (keyof HLTCount | "meanGames" | "meanTotal")]?: { label: string }
    & Partial<Omit<SummaryFieldDisplay<HLTCount>, "label" | "getFieldValue">>;
  },
  startValues?: Partial<HLTCount>,
  floatMaxDecimals = 2,
): Stat<HLTCount, R, {
    highest?: SummaryFieldDisplay<HLTCount>;
    lowest?: SummaryFieldDisplay<HLTCount>;
    total?: SummaryFieldDisplay<HLTCount>;
    meanGames?: SummaryFieldDisplay<HLTCount>;
    meanTotal?: SummaryFieldDisplay<HLTCount>;
  }> {
  const rateFmt = new Intl.NumberFormat(undefined, {
    maximumFractionDigits: floatMaxDecimals,
    style: "percent",
  });
  return {
    startValue: () => ({
      highest: startValues?.highest ?? Number.MIN_SAFE_INTEGER,
      lowest: startValues?.lowest ?? Number.MAX_SAFE_INTEGER,
      total: startValues?.total ?? 0,
      gameCount: 0,
    }),
    addGameResult: (prevValue, result) => {
      const value = getValue(result);
      return {
        highest: Math.max(prevValue.highest, value),
        lowest: Math.min(prevValue.lowest, value),
        total: prevValue.total + value,
        gameCount: prevValue.gameCount + (value > 1 ? 1 : 0),
      };
    },
    summaryFields: Object.entries(summary).reduce((obj, [k, field]) => {
      obj[k] = {
        label: field.label,
        getFieldValue: (val, totalGames) => {
          if (Object.hasOwn(val, k)) {
            return val[k as keyof HLTCount];
          }
          const total = totalGames * maxPerGame;
          switch (k) {
            case "meanTotal":
              return val.total / total;
            case "meanGames":
              return val.gameCount / total;
            default:
              throw new Error(`Should be unreachable. Tried to get field: "${k}"`);
          }
        },
        display: field.display ?? k.startsWith("mean")
          ? (val => rateFmt.format(val))
          : undefined,
        highlight: field.highlight ?? { best: "highestNZ" },
      };
      // console.log(k, field.label, field.display, obj[k].display, obj[k].highlight);//XXX
      return obj;
    }, {} as { [k: string]: SummaryFieldDisplay<HLTCount> }),
  };
}


export type StatsDefinition<T> = {
  numGames: Stat<number, T, { count: SummaryFieldDisplay<number> }>;
  [k: string]: Stat<any, T>;
};
export const GameStat = {
  /**
   * Simply counts the number of games.
   */
  numGames: numGamesStat,
  /**
   * A stat which either occurred or did not occur in a single game.
   * Just counts the number of games the occurrence happened in.
   */
  boolean: booleanStat,
  /**
   * A stat for a score in a single game.
   * Does not have to be the final score, but anything that has a single value for a single game.
   * Records the lowest, highest and total across all games.
   */
  game_integer: intGameStat,
  /**
   * A stat for a value where multiple can happen in a single game.
   * Records the least per game, most per game and total across all games.
   */
  integer: intMultiStat,
};


type StatsValues<S extends StatsDefinition<any>> = {
  [k in keyof S]: S[k] extends Stat<infer T, any> ? T : never;
};

type FlattenSummaryKeysInternal<S extends StatsDefinition<any>, Key = keyof S> = Key extends string
  ? S[Key] extends Stat<any, any, infer T>
    ? `${Key}.${keyof T & string}`
    : `${Key}`
  : never

export type SummaryFieldKeys<S> = S extends StatsDefinition<any>
  ? FlattenSummaryKeysInternal<S, keyof S>
  : S extends Stat<any, any, infer T>
    ? keyof T
    : never;

type UnionToIntersection<T> =
  (T extends any ? (x: T) => any : never) extends (x: infer R) => any ? R : never;

type SummaryFieldsFor<S extends StatsDefinition<any>, Key = keyof S> = Key extends string
  ? S[Key] extends Stat<any, any, infer T>
    ? {
      [K in keyof T & string as `${Key}.${K}`]: T[K];
    }
    : never
  : never;

export type SummaryFields<S> = S extends StatsDefinition<any>
  ? UnionToIntersection<SummaryFieldsFor<S, keyof S>>
  : S extends Stat<any, any, infer T>
    ? T
    : never;

// type test = SummaryFields<{
//   numGames: ReturnType<typeof numGamesStat>;
//   score: Stat<HLT, any, { highest: SummaryFieldDisplay<HLT>; lowest: SummaryFieldDisplay<HLT> }>;
// }>

// type SummaryGenerator<S extends StatsDefinition<R>, R> = {
//   newDefaults: () => StatsValues<S>;
//   addResult: (prevValues: StatsValues<S>, result: R) => StatsValues<S>;
//   summaryValue: <K extends SummaryFieldKeys<S>>(key: K) => (values: StatsValues<S>) => string;
//   createSummaryComponent: <K extends SummaryFieldKeys<S>>(...fields: K[]) => Component<{
//     players: { type: PropType<Player[]>; default: () => []};
//     games: {
//       type: PropType<{
//         playerResults: Record<string, R>;
//         //TODO: GameResult type: team stats, id/date.
//       }[]>;
//       required: true;
//     };
//   }>;
// };

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export const summaryGenerator = <S extends StatsDefinition<R>, R>(stats: S) => {
  const newDefaults = (): StatsValues<S> =>
    Object.entries(stats).reduce((obj, [key, stat]: [keyof S, Stat<any, any>]) => {
      obj[key] = typeof stat.startValue === "function" ? stat.startValue() : stat.startValue;
      return obj;
    }, {} as StatsValues<S>);
  const addResult = (prevValues: StatsValues<S>, result: R): StatsValues<S> =>
    Object.entries(stats).reduce((obj, [key, stat]: [keyof S, Stat<any, any>]) => {
      obj[key] = stat.addGameResult(obj[key], result);
      return obj;
    }, prevValues);
  const getSummaryField = <K extends SummaryFieldKeys<S> & string>(key: K):
  [SummaryFields<S>[K], keyof S, string] => {
    const [sk, fk] = key.split(".", 2) as [keyof S, string];
    return [stats[sk].summaryFields[fk] as SummaryFields<S>[K], sk, fk];
  };
  const summaryValue = <K extends SummaryFieldKeys<S>>(key: K):
  ((values: StatsValues<S>) => string) => {
    return (values: StatsValues<S>): string => {
      const [field, sk] = getSummaryField(key);
      const val = field.getFieldValue(values[sk], values.numGames as number);
      return field.display !== undefined ? field.display(val) : val.toString();
    };
  };
  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  const makeFields = <K extends SummaryFieldKeys<S>>(...summaryFields: K[]) =>
    summaryFields.map((f) => {
      const [field, sk, fk] = getSummaryField(f);
      console.log(`field: "${f}": sk = "${sk.toString()}", fk = "${fk}", field =`, field);//XXX
      return {
        key: f,
        statKey: sk,
        fieldKey: fk,
        label: field.label,
        get: (values: StatsValues<S>) =>
          field.getFieldValue(values[sk], values.numGames as number),
        display: field.display !== undefined
          ? ((val: number) => field.display!(val))
          : ((val: number) => val.toString()),
        highlight: field.highlight !== undefined
          ? (
            { highest, lowest }: { highest: number; lowest: number },
            value: number, statValue: StatsValues<S>[typeof sk],
          ) =>
            Object.entries(field.highlight!).flatMap(([key, typ]) =>
              typeof typ === "string"
                ? (
                  (highest === value && (typ === "highest" || (value !== 0 && typ === "highestNZ")))
                  || (lowest === value && (typ === "lowest" || (value !== 0 && typ === "lowestNZ")))
                    ? [key]
                    : []
                )
                : typ({ highest, lowest }, value, statValue) ? [key] : [])
          : () => [],
      };
    });
  /** Creates a summary component with the fields fixed and unchanging */
  // eslint-disable-next-line max-len
  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type, @typescript-eslint/no-unused-vars
  const createConstantSummaryComponent = <K extends SummaryFieldKeys<S>>(...summaryFields: K[]) => {
    const fields = makeFields(...summaryFields);
    return defineComponent({
      props: {
        players: { type: Array as PropType<Player[]>, required: true },
        games: {
          type: Array as PropType<{
            playerResults: Record<string, R>;
            //TODO: GameResult type: team stats, id/date.
          }[]>,
          required: true,
        },
      },
      setup(props) {
        const playerIds = computed(() => props.players.length > 0
          ? props.players.flatMap(({ id }) => playerStats.value.has(id) ? id : [])
          : [...playerStats.value.keys()]);
        const players = computed(() => props.players.length > 0
          ? props.players
          : onDemandPlayerStore().getPlayers(playerIds.value).value.map(p => p.value));

        const playerStats = ref(new Map<string, StatsValues<S>>());
        const fieldValues = computed(() => {
          const map = new Map<string, Record<K, number>>();
          for (const [pid, values] of playerStats.value.entries()) {
            map.set(pid, fields.reduce((obj, { key, get }) => {
              obj[key] = get(values);
              return obj;
            }, {} as Record<K, number>));
          }
          return map;
        });
        const statLimits = computed(() =>
          [...fieldValues.value.entries()]
            .flatMap(([ pid, values ]) => playerIds.value.includes(pid) ? values : [])
            .reduce((map, values) => {
              for (const [key, value] of Object.entries(values) as [K, number][]) {
                if (map.has(key)) {
                  const { highest, lowest } = map.get(key)!;
                  map.set(key, {
                    highest: Math.max(highest, value),
                    lowest: Math.min(lowest, value),
                  });
                } else {
                  map.set(key, {
                    highest: value,
                    lowest: value,
                  });
                }
              }
              return map;
            }, new Map<K, {
              highest: number;
              lowest: number;
            }>()),
        );
        watchEffect(() => {
          playerStats.value.clear();
          for (const game of props.games) {
            for (const [pid, result] of Object.entries(game.playerResults)) {
              const values = playerStats.value.get(pid) ?? newDefaults();
              playerStats.value.set(pid, addResult(values, result));
            }
          }
        });

        return () =>
          <table class="summaryTable playerTable">
            <thead>
              <tr>
                <td>&nbsp;</td>
                { players.value.map(({ name: playerName, id }) =>
                  <td
                    key={id}
                    data-player={id}
                    class={["playerName", `$player-${id}`]}
                  >{playerName}</td>,
                )}
              </tr>
            </thead>
            <tbody>
              { fields.map(field =>
                <tr data-summary-field={field.key}>
                  <td class="rowLabel" data-summary-field={field.key}>{ field.label }</td>
                  { playerIds.value.map((pid, index) =>
                    <td
                      key={ pid }
                      class={["rowvalue", ...field.highlight(
                        statLimits.value.get(field.key)!,
                        fieldValues.value.get(pid)![field.key],
                        playerStats.value.get(pid)![field.statKey],
                      )]}
                      data-summary-field={field.key}
                      data-player={pid}
                      data-playerIndex={index}
                    >
                      { field.display(fieldValues.value.get(pid)![field.key]) }
                    </td>,
                  )}
                  { /*TODO: field.tooltip
                    ? <div id={field.key + "_tooltip"} class="tooltip">{field.tooltip}</div>
                    : ""*/
                  }
                </tr>,
              )}
            </tbody>
          </table>;
      },
    });
  };
  /** Creates a summary component with the fields fixed and unchanging */
  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  const createSummaryComponent = <K extends SummaryFieldKeys<S>>(...defaultSummaryFields: K[]) => {
    return defineComponent({
      props: {
        players: { type: Array as PropType<Player[]>, required: true },
        games: {
          type: Array as PropType<{
            playerResults: Record<string, R>;
            //TODO: GameResult type: team stats, id/date.
          }[]>,
          required: true,
        },
        summaryFields: {
          type: Array as PropType<K[]>,
          default: () => defaultSummaryFields,
        },
      },
      setup(props) {
        const fields = computed(() => makeFields(...props.summaryFields));
        const playerIds = computed(() => props.players.length > 0
          ? props.players.flatMap(({ id }) => playerStats.value.has(id) ? id : [])
          : [...playerStats.value.keys()]);
        const players = computed(() => props.players.length > 0
          ? props.players
          : onDemandPlayerStore().getPlayers(playerIds.value).value.map(p => p.value));

        const playerStats = ref(new Map<string, StatsValues<S>>());
        const fieldValues = computed(() => {
          const map = new Map<string, Record<K, number>>();
          for (const [pid, values] of playerStats.value.entries()) {
            map.set(pid, fields.value.reduce((obj, { key, get }) => {
              obj[key] = get(values);
              return obj;
            }, {} as Record<K, number>));
          }
          return map;
        });
        const statLimits = computed(() =>
          [...fieldValues.value.entries()]
            .flatMap(([ pid, values ]) => playerIds.value.includes(pid) ? values : [])
            .reduce((map, values) => {
              for (const [key, value] of Object.entries(values) as [K, number][]) {
                if (map.has(key)) {
                  const { highest, lowest } = map.get(key)!;
                  map.set(key, {
                    highest: Math.max(highest, value),
                    lowest: Math.min(lowest, value),
                  });
                } else {
                  map.set(key, {
                    highest: value,
                    lowest: value,
                  });
                }
              }
              return map;
            }, new Map<K, {
              highest: number;
              lowest: number;
            }>()),
        );
        watchEffect(() => {
          playerStats.value.clear();
          for (const game of props.games) {
            for (const [pid, result] of Object.entries(game.playerResults)) {
              const values = playerStats.value.get(pid) ?? newDefaults();
              playerStats.value.set(pid, addResult(values, result));
            }
          }
        });

        return () =>
          <table class="summaryTable playerTable">
            <thead>
              <tr>
                <td>&nbsp;</td>
                { players.value.map(({ name: playerName, id }) =>
                  <td
                    key={id}
                    data-player={id}
                    class={["playerName", `$player-${id}`]}
                  >{playerName}</td>,
                )}
              </tr>
            </thead>
            <tbody>
              { fields.value.map(field =>
                <tr data-summary-field={field.key}>
                  <td class="rowLabel" data-summary-field={field.key}>{ field.label }</td>
                  { playerIds.value.map((pid, index) =>
                    <td
                      key={ pid }
                      class={["rowvalue", ...field.highlight(
                        statLimits.value.get(field.key)!,
                        fieldValues.value.get(pid)![field.key],
                        playerStats.value.get(pid)![field.statKey],
                      )]}
                      data-summary-field={field.key}
                      data-player={pid}
                      data-playerIndex={index}
                    >
                      { field.display(fieldValues.value.get(pid)![field.key]) }
                    </td>,
                  )}
                  { /*TODO: field.tooltip
                    ? <div id={field.key + "_tooltip"} class="tooltip">{field.tooltip}</div>
                    : ""*/
                  }
                </tr>,
              )}
            </tbody>
          </table>;
      },
    });
  };
  return {
    newDefaults, addResult, summaryValue, createSummaryComponent,
  };
};
