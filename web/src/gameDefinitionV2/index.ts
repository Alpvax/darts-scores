import type { NumericRange } from "@/utils/types";
import { defineTurn, type TurnMeta, type TurnMetaDef, type TurnMetaDefLookup } from "./rounds";

export type InitialStateFactory<PlayerState, PlayerId extends string = string> = (
  playerId: PlayerId,
) => PlayerState;

export type GameDefinitionCore<GameId extends string, PlayerState> = {
  gameId: GameId;
  makeInitialState: InitialStateFactory<PlayerState>;
};

type _WARFCurried<GameId extends string, PlayerState, V, Stats> = {
  <Len extends number>(
    length: Len,
    turnFactory: (index: NumericRange<Len>) => TurnMetaDef<V, Stats>,
  ): TurnMetaDefLookup<ReturnType<typeof turnFactory>> extends TurnMeta<any, any, infer UntakenVal>
    ? ArrayGameDef<GameId, PlayerState, V, Stats, UntakenVal, Len>
    : unknown;
  (
    turnFactory: (index: number) => TurnMetaDef<V, Stats>,
  ): TurnMetaDefLookup<ReturnType<typeof turnFactory>> extends TurnMeta<any, any, infer UntakenVal>
    ? ArrayGameDef<GameId, PlayerState, V, Stats, UntakenVal, number>
    : unknown;
};
type WithArrayRoundsFunc<GameId extends string, PlayerState> = {
  <V, Stats>(): _WARFCurried<GameId, PlayerState, V, Stats>;
  <V, Stats, Len extends number>(
    length: Len,
    turnFactory: (index: NumericRange<Len>) => TurnMetaDef<V, Stats>,
  ): TurnMetaDefLookup<ReturnType<typeof turnFactory>> extends TurnMeta<any, any, infer UntakenVal>
    ? ArrayGameDef<GameId, PlayerState, V, Stats, UntakenVal, Len>
    : unknown;
  <V, Stats>(
    turnFactory: (index: number) => TurnMetaDef<V, Stats>,
  ): TurnMetaDefLookup<ReturnType<typeof turnFactory>> extends TurnMeta<any, any, infer UntakenVal>
    ? ArrayGameDef<GameId, PlayerState, V, Stats, UntakenVal, number>
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
              infer UntakenVal
            >
              ? ArrayGameDef<GameId, PlayerState, V, Stats, UntakenVal, Len>
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
  makeInitialState: InitialStateFactory<PlayerState>,
) => GameDefRoundsBuilder<GameId, PlayerState>;
export function gameDefinitionBuilder<GameId extends string, PlayerState>(
  gameId: GameId,
  makeInitialState: InitialStateFactory<PlayerState>,
): GameDefRoundsBuilder<GameId, PlayerState>;
export function gameDefinitionBuilder<GameId extends string, PlayerState>(
  gameId: GameId,
  makeInitialState?: InitialStateFactory<PlayerState>,
):
  | GameDefRoundsBuilder<GameId, PlayerState>
  | ((
      makeInitialState: InitialStateFactory<PlayerState>,
    ) => GameDefRoundsBuilder<GameId, PlayerState>) {
  const makeGameDefBuilder = (
    gameId: GameId,
    makeInitialState: InitialStateFactory<PlayerState>,
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

export type AnyGameDefinition<Len extends number> =
  | ArrayGameDef<any, any, any, any, any, Len>
  | ObjectGameDef<any, any, any>;

export type ArrayGameDef<
  GameId extends string,
  PlayerState,
  V,
  Stats,
  UntakenVal extends V | undefined,
  Len extends number = number,
> = GameDefinitionCore<GameId, PlayerState> &
  (number extends Len
    ? {
        type: "dynamic";
        roundFactory: (idx: number) => TurnMeta<V, Stats, UntakenVal>;
      }
    : {
        type: "fixedArray";
        rounds: { [K in NumericRange<Len>]: TurnMeta<V, Stats, UntakenVal> };
      });

export type ObjectGameDef<
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
