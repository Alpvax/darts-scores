import type { MoveFocus } from "@/utils";
import type { VNodeChild } from "vue";

type ComponentFactoryExtra<Mutable extends boolean, Stats> = {
  /** The id of the player this cell corresponds to */
  playerId: string;
  /** The index of this round in the whole game */
  roundIndex: number;
  /** The calculated change in score based on the current turn value */
  deltaScore: number;
  /** The calculated score at the end of this round, based on the current turn value */
  score: number;
  /** The calculated stats for this round, based on the current turn value */
  stats: Stats;
} & (Mutable extends true
  ? {
      mutable: true;
      focus: MoveFocus;
    }
  : {
      mutable: false;
      focus?: undefined; // Allow destructuring in shared factory
    }) extends infer _T
  ? { [K in keyof _T]: _T[K] }
  : never;

/**
 * The component to display.
 * @param value is a ref that can be used as a v-model value for the round input. Setting it will automatically move the focus to the next unentered input
 * @param extra is an object containing several other potentially useful properties:
 *  `mutable`: whether the rendered cell should allow editing the value, used to conditionally render input elements
 *  `focus`: a {@link MoveFocus} object to allow changing focus to different turns. Only available when `mutable` is true
 */
type ComponentFactoryDef<V, Stats, Mutable extends boolean> = (
  /**
   * Maybe mutable value. Will be mutable if `extra.mutable` is `true`.
   * When mutable, setting it will update the game data.
   * Otherwise setting it will throw an error.
   */
  value: Mutable extends false ? Exclude<V, undefined> : V,
  extra: ComponentFactoryExtra<Mutable, Stats>,
) => VNodeChild;

type TurnComponentFactoryDef<V, S> = {
  mutable: ComponentFactoryDef<V, S, true>;
  immutable: ComponentFactoryDef<Exclude<V, undefined>, S, false>;
};

type TurnComponentFactoryMeta<V, S> =
  | TurnComponentFactoryDef<V, S>
  | ComponentFactoryDef<V, S, boolean>;

type TurnMetaBase<V, Stats> = {
  deltaScore: (value: V) => number;
  turnStats: (value: V) => Stats;
  component: TurnComponentFactoryMeta<V, Stats>;
};
export type TurnMeta<V, Stats, UntakenVal extends V | undefined> = {
  readonly deltaScore: (value: UntakenVal) => number;
  readonly turnStats: (value: UntakenVal) => Stats;
  readonly component: TurnComponentFactoryDef<UntakenVal, Stats>;
} & (undefined extends UntakenVal
  ? {
      readonly untakenValue: undefined;
    }
  : {
      readonly untakenValue: V | (() => V);
    });

type TurnMetaNoFallback<V, Stats> = TurnMetaBase<V | undefined, Stats> & {
  untakenValue?: undefined;
};
type TurnMetaWithFallback<V, Stats> = TurnMetaBase<V, Stats> & {
  untakenValue: V | (() => V);
};
export type TurnMetaDef<V, Stats> = TurnMetaNoFallback<V, Stats> | TurnMetaWithFallback<V, Stats>;
export type TurnMetaDefLookup<M extends TurnMetaDef<any, any>> =
  M extends TurnMetaNoFallback<infer V, infer Stats>
    ? TurnMeta<V, Stats, V | undefined>
    : M extends TurnMetaWithFallback<infer V, infer Stats>
      ? TurnMeta<V, Stats, V>
      : never;

export const defineTurn: {
  <V, Stats>(meta: TurnMetaNoFallback<V, Stats>): TurnMeta<V, Stats, V | undefined>;
  <V, Stats>(meta: TurnMetaWithFallback<V, Stats>): TurnMeta<V, Stats, V>;
} = <V, Stats>(meta: TurnMetaDef<V, Stats>) => {
  const { deltaScore, turnStats, component, untakenValue } = meta;
  return {
    deltaScore,
    turnStats,
    component:
      typeof component === "function"
        ? {
            mutable: component,
            immutable: component,
          }
        : component,
    untakenValue,
  };
};
