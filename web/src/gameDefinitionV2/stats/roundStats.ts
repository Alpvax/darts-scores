import type { ValuesSubset } from "@/utils/types";
import type { VNode, VNodeChild } from "vue";

type DisplayValueType = Exclude<VNodeChild, any[] | VNode>;

type ValidRoundStatType = number | boolean;

type StatFieldMeta<
  T extends ValidRoundStatType,
  Display extends DisplayValueType = DisplayValueType,
> = {
  label: string;
  compare: (a: T, B: T) => number;
  format: (value: T) => Display;
  noValDisplay: Display | (() => Display);
};

// type RoundStatSimpleDef<Stats, T extends ValidRoundStatType, K extends keyof ValuesSubset<T, Stats>> = ValuesSubset<ValidRoundStatType, Stats> extends infer S
//   ? {
//     value: K | ((value: Stats) => T);
//   }
//   : never;

type DefineRoundStatsDefFunc<
  Stats,
  R extends ValidRoundStatType | Record<any, ValidRoundStatType>,
> = Stats extends {}
  ? {
      <K extends keyof ValuesSubset<ValidRoundStatType, Stats>>(def: {
        value: K;
        subkeys: (value: ValuesSubset<ValidRoundStatType, Stats>[K]) => R;
      }): any;
      <T extends ValidRoundStatType>(def: {
        value: (stats: Stats) => T;
        subkeys: (value: T) => R;
      }): any;
    }
  : unknown;
export function defineRoundStat<
  Stats,
  R extends ValidRoundStatType | Record<any, ValidRoundStatType>,
  K extends keyof ValuesSubset<ValidRoundStatType, Stats>,
>(def: { value: K; subkeys: (value: ValuesSubset<ValidRoundStatType, Stats>[K]) => R }): any;
export function defineRoundStat<
  Stats,
  R extends ValidRoundStatType | Record<any, ValidRoundStatType>,
  T extends ValidRoundStatType,
>(def: { value: (stats: Stats) => T; subkeys: (value: T) => R }): any;
export function defineRoundStat<
  Stats,
  R extends ValidRoundStatType | Record<any, ValidRoundStatType>,
  T extends ValidRoundStatType,
  K extends keyof ValuesSubset<ValidRoundStatType, Stats>,
>(def: { value: K | ((stats: Stats) => T); subkeys: (value: ValidRoundStatType) => R }): any {}

// type SingleValueRoundStatDef<Stats, T extends ValidRoundStatType> = {
//   value: (stats: Stats) => T;
//   meta: StatFieldMeta<T>;
// }
// type ComplexRoundStatsDef<Stats, T extends ValidRoundStatType, R extends Record<any, ValidRoundStatType>> = {
//   value: (stats: Stats) => T;
//   subFields: (value: T) => R;
//   statFields: {
//     [K in keyof R]: StatFieldMeta<R[K]>;
//   }
// }
type RoundStatDefinition<
  Stats,
  T extends ValidRoundStatType,
  R extends undefined | Record<string, ValidRoundStatType>,
> = (
  | {
      value: (stats: Stats) => T;
    }
  | {
      value: keyof ValuesSubset<T, Stats>;
    }
) &
  (R extends Record<string, ValidRoundStatType>
    ? {
        subFields: (value: T) => R;
        statFields: {
          [K in keyof R]: StatFieldMeta<R[K]>;
        };
      }
    : { meta: StatFieldMeta<T> });

type StatFieldValues<
  S extends Record<string, RoundStatDefinition<any, any, any>>,
  FlatOnly extends boolean = false,
> =
  {
    [K in keyof S]: (
      _: [S[K]] extends [RoundStatDefinition<any, infer T, infer R>]
        ? undefined extends R
          ? { [P in K]: T }
          : (false extends FlatOnly ? { [P in K]: R } : {}) & {
              [P in keyof R as `${Extract<K, string | number>}.${Extract<P, string | number>}`]: R[P];
            }
        : never,
    ) => void;
  } extends Record<string, (_: infer O) => void>
    ? { [K in keyof O]: O[K] }
    : never;

type StatFields<S extends Record<string, RoundStatDefinition<any, any, any>>> =
  {
    [K in keyof S]: (
      _: S[K] extends RoundStatDefinition<any, infer T, infer R>
        ? undefined extends R
          ? { [P in K]: { value: T; meta: StatFieldMeta<T> } }
          : R extends Record<string | number, ValidRoundStatType>
            ? {
                [P in keyof R as `${Extract<K, string | number>}.${Extract<P, string | number>}`]: {
                  value: R[P];
                  meta: StatFieldMeta<R[P]>;
                };
              }
            : never
        : never,
    ) => void;
  } extends Record<string, (_: infer O) => void>
    ? { [K in keyof O]: O[K] }
    : never;

type TC = RoundStatDefinition<
  { s1: boolean; s2: number },
  boolean,
  { default: boolean; foo: number }
>;
type TS = RoundStatDefinition<{ s1: boolean; s2: number }, boolean, undefined>;

// type TSF = StatFields<{
//   ts: TS;
//   tc: TC;
// }>;

// export const defineRoundStat: DefineRoundStatsDefFunc = (...args) => ({})

// type DefineAllRoundStats = <Stats, ResultingStats extends Record<any, >({

// }) => {}

export const defineRoundStats = <
  Stats,
  RoundsField extends Record<any, DefineRoundStatsDefFunc<Stats, any>>,
>(
  fields: RoundsField,
) => {
  (Object.entries(fields) as [keyof RoundsField, DefineRoundStatsDefFunc<Stats, any>][]).reduce(
    (obj, [key, def]) => Object.assign(obj, { [key]: {} }),
  );
};
