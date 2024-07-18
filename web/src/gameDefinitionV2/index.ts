import type { NumericRange } from "@/utils/types";
import { defineTurn, type TurnMeta, type TurnMetaDef, type TurnMetaDefLookup } from "./rounds";

export type GameDefinitionCore<GameId extends string, PlayerState> = {
  gameId: GameId;
  makeInitialState: (playerId: string) => PlayerState;
};
export type GameDefinition<
  PlayerState,
  RoundIdx extends number,
  RoundValues extends { [K in RoundIdx]: any },
  RoundStats extends { [K in RoundIdx]: any },
  RoundValsMut extends { [K in RoundIdx]?: RoundValues[K] },
  GameId extends string = string,
> = GameDefinitionCore<GameId, PlayerState> & {
  rounds: { [K in RoundIdx]: TurnMeta<RoundValues[K], RoundStats[K], RoundValsMut[K]> };
};

type _WARFCurried<GameId extends string, PlayerState, V, Stats> = {
  <Len extends number>(
    length: Len,
    turnFactory: (index: NumericRange<Len>) => TurnMetaDef<V, Stats>,
  ): TurnMetaDefLookup<ReturnType<typeof turnFactory>> extends TurnMeta<any, any, infer VMut>
    ? ArrayGameDef<GameId, PlayerState, V, Stats, VMut, Len>
    : unknown;
  (
    turnFactory: (index: number) => TurnMetaDef<V, Stats>,
  ): TurnMetaDefLookup<ReturnType<typeof turnFactory>> extends TurnMeta<any, any, infer VMut>
    ? ArrayGameDef<GameId, PlayerState, V, Stats, VMut, number>
    : unknown;
};
type WithArrayRoundsFunc<GameId extends string, PlayerState> = {
  <V, Stats>(): _WARFCurried<GameId, PlayerState, V, Stats>;
  <V, Stats, Len extends number>(
    length: Len,
    turnFactory: (index: NumericRange<Len>) => TurnMetaDef<V, Stats>,
  ): TurnMetaDefLookup<ReturnType<typeof turnFactory>> extends TurnMeta<any, any, infer VMut>
    ? ArrayGameDef<GameId, PlayerState, V, Stats, VMut, Len>
    : unknown;
  <V, Stats>(
    turnFactory: (index: number) => TurnMetaDef<V, Stats>,
  ): TurnMetaDefLookup<ReturnType<typeof turnFactory>> extends TurnMeta<any, any, infer VMut>
    ? ArrayGameDef<GameId, PlayerState, V, Stats, VMut, number>
    : unknown;
};

const makeWithArrayRounds = <GameId extends string, PlayerState>(
  core: GameDefinitionCore<GameId, PlayerState>,
): WithArrayRoundsFunc<GameId, PlayerState> => {
  const withArrayRounds = (<V, Stats, Len extends number>(
    maybeLenOrFactory?: Len | ((index: number) => TurnMetaDef<V, Stats>),
    maybeFactory?: (index: number) => TurnMetaDef<V, Stats>,
  ) => {
    return maybeLenOrFactory === undefined
      ? withArrayRounds
      : ((maybeFactory === undefined
          ? {
              type: "dynamic",
              roundFactory: maybeLenOrFactory as (index: number) => TurnMetaDef<V, Stats>,
              ...core,
            }
          : {
              type: "fixedArray",
              rounds: Array.from({ length: maybeLenOrFactory as number }, (_, idx) =>
                maybeFactory(idx),
              ),
              ...core,
            }) as
          | _WARFCurried<GameId, PlayerState, V, Stats>
          | (TurnMetaDefLookup<ReturnType<NonNullable<typeof maybeFactory>>> extends TurnMeta<
              any,
              any,
              infer VMut
            >
              ? ArrayGameDef<GameId, PlayerState, V, Stats, VMut, Len>
              : unknown));
  }) as WithArrayRoundsFunc<GameId, PlayerState>;
  return withArrayRounds;
};

type GameDefRoundsBuilder<GameId extends string, PlayerState> = Readonly<
  GameDefinitionCore<GameId, PlayerState>
> & {
  withArrayRounds: WithArrayRoundsFunc<GameId, PlayerState>;
  withObjRounds: <Rounds extends Record<any, TurnMetaDef<any, any>>>(
    rounds: Rounds,
    order: (keyof Rounds)[],
  ) => ObjectGameDef<
    GameId,
    PlayerState,
    {
      [K in keyof Rounds]: TurnMetaDefLookup<Rounds[K]>;
    }
  >;
};

export function gameDefinitionBuilder<GameId extends string>(
  gameId: GameId,
): <PlayerState>(
  makeInitialState: (playerId: string) => PlayerState,
) => GameDefRoundsBuilder<GameId, PlayerState>;
export function gameDefinitionBuilder<GameId extends string, PlayerState>(
  gameId: GameId,
  makeInitialState: (playerId: string) => PlayerState,
): GameDefRoundsBuilder<GameId, PlayerState>;
export function gameDefinitionBuilder<GameId extends string, PlayerState>(
  gameId: GameId,
  makeInitialState?: (playerId: string) => PlayerState,
):
  | GameDefRoundsBuilder<GameId, PlayerState>
  | ((
      makeInitialState: (playerId: string) => PlayerState,
    ) => GameDefRoundsBuilder<GameId, PlayerState>) {
  const makeGameDefBuilder = (
    gameId: GameId,
    makeInitialState: (playerId: string) => PlayerState,
  ): GameDefRoundsBuilder<GameId, PlayerState> => ({
    gameId: gameId,
    makeInitialState,
    withArrayRounds: makeWithArrayRounds({ gameId: gameId, makeInitialState }),
    withObjRounds: <Rounds extends Record<any, TurnMetaDef<any, any>>>(
      rounds: Rounds,
      roundOrder: (keyof Rounds)[],
    ) => ({
      gameId,
      makeInitialState,
      type: "fixedObj",
      roundOrder,
      rounds: Object.entries(rounds).reduce(
        (obj, [key, turnDef]) =>
          Object.assign(obj, {
            [key]: defineTurn(turnDef),
          }),
        {} as {
          [K in keyof Rounds]: TurnMetaDefLookup<Rounds[K]>;
        },
      ),
    }),
  });
  return makeInitialState === undefined
    ? (makeInitialState) => makeGameDefBuilder(gameId, makeInitialState)
    : makeGameDefBuilder(gameId, makeInitialState);
}

type ArrayGameDef<
  GameId extends string,
  PlayerState,
  V,
  Stats,
  VMut extends V | undefined,
  Len extends number = number,
> = GameDefinitionCore<GameId, PlayerState> &
  (number extends Len
    ? {
        type: "dynamic";
        roundFactory: (idx: number) => TurnMeta<V, Stats, VMut>;
      }
    : {
        type: "fixedArray";
        rounds: { [K in NumericRange<Len>]: TurnMeta<V, Stats, VMut> };
      });

type ObjectGameDef<
  GameId extends string,
  PlayerState,
  Rounds extends {
    [k: string | number | symbol]: TurnMeta<any, any, any>;
  },
> = GameDefinitionCore<GameId, PlayerState> & {
  type: "fixedObj";
  roundOrder: (keyof Rounds)[];
  rounds: Rounds;
};

type FixedArrayGameDef<
  PlayerState,
  Len extends number,
  V,
  Stats,
  VMut extends V | undefined,
  GameId extends string = string,
> =
  NumericRange<Len> extends infer RoundIdx extends number
    ? GameDefinition<
        PlayerState,
        RoundIdx,
        { [K in RoundIdx]: V },
        { [K in RoundIdx]: Stats },
        { [K in RoundIdx]: VMut },
        GameId
      >
    : never;

/**
 * Curried function to allow specifying some types while inferring others.
 * Usually the first call (gameId) is inferred, second (playerState, turnValue, turnStats) typed, and third (round count) inferred
 * @param gameType the identifier of the game
 * @returns a function to create the game start state
 */
export const defineFixedArrayGame =
  <GameId extends string = string>(gameType: GameId) =>
  /**
   * @param makeInitialState the factory used to create the initial state for each player
   * @returns a function to create the game rounds
   */
  <PlayerState, V, Stats>(makeInitialState: (playerId: string) => PlayerState) =>
  /**
   * @param length the length of the rounds array
   * @param turnFactory the factory function to create the individual rounds
   * @returns the GameDefinition
   */
  <Len extends number>(
    length: Len,
    turnFactory: (index: NumericRange<Len>) => TurnMetaDef<V, Stats>,
  ) =>
    ({
      gameType,
      makeInitialState,
      // @ts-expect-error
      rounds: Array.from({ length }, (_, idx) => defineTurn(turnFactory(idx as NumericRange<Len>))),
    }) as TurnMetaDefLookup<ReturnType<typeof turnFactory>> extends TurnMeta<any, any, infer VMut>
      ? FixedArrayGameDef<PlayerState, Len, V, Stats, VMut, GameId>
      : unknown;
/**
 * Version of {@link defineFixedArrayGame} without the currying
 * @param gameType the identifier of the game
 * @param makeInitialState the factory used to create the initial state for each player
 * @param length the length of the rounds array
 * @param turnFactory the factory function to create the individual rounds
 * @returns the `GameDefinition` (as a `FixedArrayGameDef`)
 */
export const defineFixedArrayGameFull = <
  PlayerState,
  Len extends number,
  V,
  Stats,
  GameId extends string = string,
>(
  gameType: GameId,
  makeInitialState: (playerId: string) => PlayerState,
  length: Len,
  turnFactory: (index: NumericRange<Len>) => TurnMetaDef<V, Stats>,
) =>
  // @ts-ignore
  defineFixedArrayGame(gameType)(makeInitialState)(length, turnFactory);

const gameType27v1 = defineFixedArrayGame("twentyseven")<
  { score: number; jesus?: boolean },
  NumericRange<4>,
  { cliff: boolean; dd: boolean; hits: number }
>(() => ({ score: 27 }))(20, (idx) => ({
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
  component: (val, { deltaScore, score, mutable, focus }) => "TODO: component" /*{
    mutable: (val, { deltaScore, score, mutable, focus }) => "TODO: mutable cell",
    immutable: (val, { deltaScore, score, mutable, focus }) => "TODO: immutable cell",
  }//*/,
}));

const gameType27v2 = gameDefinitionBuilder("twentyseven")<{ score: number; jesus?: boolean }>(
  () => ({ score: 27 }),
).withArrayRounds<NumericRange<4>, { cliff: boolean; dd: boolean; hits: number }>()(20, (idx) => ({
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
  component: (val, { deltaScore, score, mutable, focus }) => "TODO: component" /*{
      mutable: (val, { deltaScore, score, mutable, focus }) => "TODO: mutable cell",
      immutable: (val, { deltaScore, score, mutable, focus }) => "TODO: immutable cell",
    }//*/,
}));

type T27GameDefTarget = FixedArrayGameDef<
  { score: number; jesus?: boolean },
  20,
  NumericRange<4>,
  { cliff: boolean; dd: boolean; hits: number },
  NumericRange<4>,
  "twentyseven"
>;
type T27GameDefRetV1 = typeof gameType27v1;
type T27GameDefRetV2 = typeof gameType27v2;
type RetRoundsV1 = T27GameDefRetV1["rounds"];
type RetRoundsV2 = T27GameDefRetV2["rounds"];
type TrgRounds = T27GameDefTarget["rounds"];

type Cmp<A, B> = A extends B
  ? B extends A
    ? true
    : "A = B, B ! A"
  : B extends A
    ? "B = A, A ! B"
    : false;

type T27GameDefCmp1 = Cmp<T27GameDefTarget, T27GameDefRetV1>;
type T27GameDefCmp2 = Cmp<T27GameDefTarget, T27GameDefRetV2>;
type T27DetailedCmp1 = {
  [K in keyof T27GameDefTarget]: Cmp<T27GameDefTarget[K], T27GameDefRetV1[K]> extends infer C
    ? C extends true
      ? true
      : [C, T27GameDefTarget[K], T27GameDefRetV1[K]]
    : never;
};
type T27DetailedCmp2 = {
  [K in keyof T27GameDefTarget]: Cmp<T27GameDefTarget[K], T27GameDefRetV2[K]> extends infer C
    ? C extends true
      ? true
      : [C, T27GameDefTarget[K], T27GameDefRetV2[K]]
    : never;
};
type T27DetailedCmpRet = {
  [K in keyof T27GameDefRetV1 | keyof T27GameDefRetV2]: K extends keyof T27GameDefRetV1
    ? Cmp<T27GameDefRetV1[K], T27GameDefRetV2[K]> extends infer C
      ? C extends true
        ? true
        : [C, T27GameDefTarget[K], T27GameDefRetV1[K]]
      : never
    : `key "${K}" does not exist in T27GameDefRetV1`;
};
type T27RoundsCmp = Cmp<TrgRounds, RetRoundsV1>;
type T27RetRoundsCmp = {
  [K in keyof RetRoundsV1]: Cmp<RetRoundsV1, RetRoundsV2> extends infer C
    ? C extends true
      ? true
      : [C, RetRoundsV1[K], RetRoundsV2[K]]
    : never;
};
