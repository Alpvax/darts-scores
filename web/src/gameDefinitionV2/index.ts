import type { NumericRange } from "@/utils/types";
import { defineTurn, type TurnMeta, type TurnMetaDef, type TurnMetaDefLookup } from "./rounds";

export type GameDefinitionCore<GameId extends string, PlayerState> = {
  gameId: GameId;
  makeInitialState: (playerId: string) => PlayerState;
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

/*
 * ============================================================================
 * TEMPORARY TEST TYPES AND VALUES
 * ============================================================================
 */

const gameType27 = gameDefinitionBuilder("twentyseven")<{ score: number; jesus?: boolean }>(() => ({
  score: 27,
})).withArrayRounds<NumericRange<4>, { cliff: boolean; dd: boolean; hits: number }>()(
  20,
  (idx) => ({
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
  }),
);

type T27GameDefTarget = ArrayGameDef<
  "twentyseven",
  { score: number; jesus?: boolean },
  NumericRange<4>,
  { cliff: boolean; dd: boolean; hits: number },
  NumericRange<4>,
  20
>;
type T27GameDefRet = typeof gameType27;
type RetRoundsV1 = T27GameDefRet["rounds"];
type TrgRounds = T27GameDefTarget["rounds"];

type Cmp<A, B> = A extends B
  ? B extends A
    ? true
    : "A = B, B ! A"
  : B extends A
    ? "B = A, A ! B"
    : false;

type T27GameDefCmp = Cmp<T27GameDefTarget, T27GameDefRet>;
type T27DetailedCmp = {
  [K in keyof T27GameDefTarget]: Cmp<T27GameDefTarget[K], T27GameDefRet[K]> extends infer C
    ? C extends true
      ? true
      : [C, T27GameDefTarget[K], T27GameDefRet[K]]
    : never;
};
type T27RoundsCmp = Cmp<TrgRounds, RetRoundsV1>;
