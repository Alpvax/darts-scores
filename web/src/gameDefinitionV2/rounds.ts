import type { MoveFocus } from "@/utils";
import type { FixedLengthArray, FixedLengthArrayLookup, NumericRange } from "@/utils/types";
import type { VNodeChild } from "vue";

export type PlayerGameData<Turns, Extra extends {} = {}> = {
  playerId: string;
  // complete: boolean;
  turns: Turns;
  displayName?: string;
  // handicap?: Handicap<Turns>
} & Extra;

export type GameResult<PData extends PlayerGameData<any, any>, PlayerId extends string = string> = {
  date: Date;
  playerOrder: PlayerId[];
  tiebreak?: {
    type: string;
    winner: PlayerId;
  };
  results: {
    [K in PlayerId]: PData;
  };
};

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
export type TurnMeta<V, Stats, MutVal extends V | undefined> = {
  readonly deltaScore: (value: MutVal) => number;
  readonly turnStats: (value: MutVal) => Stats;
  readonly component: TurnComponentFactoryDef<MutVal, Stats>;
} & (undefined extends MutVal
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

type TLU = TurnMetaDefLookup<ReturnType<TMeta27["turnFactory"]>>["untakenValue"];

export function defineTurn<V, Stats>(
  meta: TurnMetaNoFallback<V, Stats>,
): TurnMeta<V, Stats, V | undefined>;
export function defineTurn<V, Stats>(meta: TurnMetaWithFallback<V, Stats>): TurnMeta<V, Stats, V>;
export function defineTurn<V, Stats>({
  deltaScore,
  turnStats,
  component,
  untakenValue,
}: TurnMetaBase<V | undefined, Stats> & { untakenValue?: V | (() => V) }): TurnMeta<
  V,
  Stats,
  V | undefined
> {
  // @ts-ignore
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
}

// type RoundsDefinition<T extends TurnMeta<any, any, any>[] | Record<string | number | symbol, TurnMeta<any, any, any>>>
//   = T extends any[]
//   ? T
//   : {
//     order: (keyof T)[];
//     rounds: T;
//   };

// type T = RoundsDefinition<typeof turns27>

// type RoundsDefinition<V, T extends Record<string | number | symbol, TurnMeta<any, any, any>> =

// type FixedTurnsMeta<T extends Record<string | number | symbol, TurnMeta<any, any, any>> = {

// }

const turn27_4 = defineTurn<NumericRange<4>, { cliff: boolean; dd: boolean; hits: number }>({
  untakenValue: 0,
  deltaScore: (val) => {
    switch (val) {
      case 0:
        return 4 * -2;
      case 1:
        return 4 * 2;
      case 2:
        return 4 * 4;
      case 3:
        return 4 * 6;
    }
  },
  turnStats: (val) => ({
    cliff: val === 3,
    dd: val >= 2,
    hits: val,
  }),
  component: (val, { deltaScore, score }) => "TODO: mutable cell",
});
type TMeta27_4 = typeof turn27_4;
type TVal27 = TMeta27_4 extends TurnMeta<infer V, any, infer MV> ? V : unknown;
type TStats27 = TMeta27_4 extends TurnMeta<any, infer S, infer MV> ? S : unknown;

export const defineFixedArrayTurnsFor =
  <V, Stats>() =>
  <Len extends number, M extends TurnMetaDef<V, Stats>>(
    length: Len,
    turnFactory: (index: NumericRange<Len>) => M,
  ): FixedArrayTurns<Len, V, Stats, TurnMetaDefLookup<M>> =>
    defineFixedArrayTurns(length, turnFactory);
export const defineFixedArrayTurns = <
  Len extends number,
  V,
  Stats,
  M extends TurnMetaDef<V, Stats>,
>(
  length: Len,
  turnFactory: (index: NumericRange<Len>) => M,
): FixedArrayTurns<Len, V, Stats, TurnMetaDefLookup<M>> => ({
  length,
  // @ts-ignore
  turnFactory: (idx) => defineTurn(turnFactory(idx)),
});

const turns27 = defineFixedArrayTurnsFor<
  NumericRange<4>,
  { cliff: boolean; dd: boolean; hits: number }
>()(20, (idx) => ({
  untakenValue: 0, // as NumericRange<4>,
  deltaScore: (val) => {
    switch (val) {
      case 0:
        return idx * -2;
      case 1:
        return idx * 2;
      case 2:
        return idx * 4;
      case 3:
        return idx * 6;
    }
  },
  turnStats: (val) => ({
    cliff: val === 3,
    dd: val >= 2,
    hits: val,
  }),
  component: (val, { deltaScore, score }) => "TODO: mutable cell",
}));

type TMeta27 = typeof turns27;

type FixedArrayTurns<Len extends number, V, Stats, Meta extends TurnMeta<V, Stats, any>> = {
  length: Len;
  turnFactory: (index: NumericRange<Len>) => Meta;
};

// type FAT27 = FixedArrayTurns<20, NumericRange<4>, { cliff: boolean, dd: boolean, hits: number }, TMeta27_4>

// type FixedArrayTurns2<Len extends number, V, Stats, F extends (index: NumericRange<Len>) => TurnMeta<V, Stats, any>>
//   = FixedLengthArrayLookup<{
//     [K in NumericRange<Len>]: F extends (index: K) => infer M ? M : unknown;
//   }, Len>

// type TestFAT2 = FixedArrayTurns2<20, NumericRange<4>, { cliff: boolean, dd: boolean, hits: number }, TMeta27["turnFactory"]>
// // export type TurnMeta<V, S> = {
// //   makeStats: (value: V) => S;
// // }

// // type RoundsDefinition<Values =

// type RoundsDefinition<V, Stats, MutVal extends V | undefined> = {
//   fixedLength: {
//     length: number;
//     turnFactory: (index: number) => TurnMeta<V, Stats, MutVal>;
//   }
// }

// type T = RoundsDefinition<NumericRange<4>, { cliff: boolean, dd: boolean, hits: number }, NumericRange<4>>

// export type TurnValues<Turns extends > = Turns extends (infer T)[]
//   ?

export type PlayerStats<Turns, TurnStats, GameStats extends {}> = {};

export type ArrayGameStats<Turns extends any[], TurnStats, GameStats extends {}> = GameStats & {
  rounds: { [K in keyof Turns]: TurnStats };
};

export type GameStatsFactory<GR extends GameResult<any, any>, Stats> =
  GR extends GameResult<PlayerGameData<infer Turns, infer Extra>, any>
    ? (turns: Turns, extra: Extra) => Stats
    : never;

type Test27Plyr = PlayerGameData<
  { [K in NumericRange<20>]: 0 | 1 | 2 | 3 } & (0 | 1 | 2 | 3)[],
  {
    jesus?: boolean;
  }
>;
type Test27 = GameResult<Test27Plyr>;
type Stats27 = ArrayGameStats<
  Test27Plyr["turns"],
  {
    cliff: boolean;
    dd: boolean;
    hits: 0 | 1 | 2 | 3;
  },
  {
    // rounds: {
    //   [K in keyof Test27Plyr["turns"]]: {
    //     cliff: boolean;
    //     dd: boolean;
    //     hits: (0|1|2|3);
    //   }
    // };
    fatNicks: boolean;
    dream: boolean;
    allPos: boolean;
    hans: number;
    goblins: boolean;
    piranhas: boolean;
    jesus: boolean;
  }
>;

// const statsFactory27: GameStatsFactory<Test27, Stats27> = (turns, extra) => ({
//   rounds:
// })

type TestBEPlyr = PlayerGameData<(0 | 1 | 2 | 3 | 5 | 6)[]>;
type TestBE = GameResult<Test27Plyr>;
