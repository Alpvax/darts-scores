import type { NumericRange, ValuesSubset } from "@/utils/types";
import { defineTurn, type TurnMeta, type TurnMetaDef, type TurnMetaDefLookup } from "./rounds";
import type { PlayerDataWithId } from "./gameData";

type PositionsOrder = "highestFirst" | "lowestFirst";

type GamePositionsDef<PlayerData> = {
  scoreField: keyof ValuesSubset<number, PlayerData>;
  order: PositionsOrder;
};
export type Position = { pos: number; players: string[] };

export type InitialStateFactory<PlayerState, PlayerId extends string = string> = (
  playerId: PlayerId,
) => PlayerState;

export type GameDefinitionCore<GameId extends string, PlayerState> = {
  gameId: GameId;
  makeInitialState: InitialStateFactory<PlayerState>;
  positions: GamePositionsDef<PlayerState>;
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
    positions: GamePositionsDef<PlayerState>,
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
  positions: GamePositionsDef<PlayerState>,
) => GameDefRoundsBuilder<GameId, PlayerState>;
export function gameDefinitionBuilder<GameId extends string, PlayerState>(
  gameId: GameId,
  makeInitialState: InitialStateFactory<PlayerState>,
  positions: GamePositionsDef<PlayerState>,
): GameDefRoundsBuilder<GameId, PlayerState>;
export function gameDefinitionBuilder<GameId extends string, PlayerState>(
  gameId: GameId,
  makeInitialState?: InitialStateFactory<PlayerState>,
  positions?: GamePositionsDef<PlayerState>,
):
  | GameDefRoundsBuilder<GameId, PlayerState>
  | ((
      makeInitialState: InitialStateFactory<PlayerState>,
      positions: GamePositionsDef<PlayerState>,
    ) => GameDefRoundsBuilder<GameId, PlayerState>) {
  const makeGameDefBuilder = (
    gameId: GameId,
    makeInitialState: InitialStateFactory<PlayerState>,
    positions: GamePositionsDef<PlayerState>,
  ): GameDefRoundsBuilder<GameId, PlayerState> => ({
    gameId: gameId,
    makeInitialState,
    positions,
    withArrayRounds: makeWithArrayRounds({ gameId: gameId, makeInitialState, positions }),
    withObjRounds: <Rounds extends Record<any, TurnMetaDef<any, any>>>(
      positions: GamePositionsDef<PlayerState>,
      rounds: Rounds,
      roundOrder: (keyof Rounds)[],
    ) => ({
      gameId,
      makeInitialState,
      type: "fixedObj",
      positions,
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
      withGameStats: withGameStatsObj({
        gameId,
        makeInitialState,
        type: "fixedObj",
        positions,
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
    }),
  });
  return makeInitialState === undefined
    ? (makeInitialState) => makeGameDefBuilder(gameId, makeInitialState, positions!)
    : makeGameDefBuilder(gameId, makeInitialState, positions!);
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
  SoloStats extends {} = {},
  GameStats extends {} = {},
> = GameDefinitionCore<GameId, PlayerState> &
  (number extends Len
    ? {
        type: "dynamic";
        roundFactory: (idx: number) => TurnMeta<V, Stats, UntakenVal>;
      } & GameStatsDefPart<SoloStats, GameStats, PlayerState, TurnMeta<V, Stats, UntakenVal>[]>
    : {
        type: "fixedArray";
        rounds: { [K in NumericRange<Len>]: TurnMeta<V, Stats, UntakenVal> };
      } & GameStatsDefPart<
        SoloStats,
        GameStats,
        PlayerState,
        { [K in NumericRange<Len>]: TurnMeta<V, Stats, UntakenVal> },
        NumericRange<Len>
      >);

export type ObjectGameDef<
  GameId extends string,
  PlayerState,
  Rounds extends {
    [k: string | number | symbol]: TurnMeta<any, any, any>;
  },
  SoloStats extends {} = {},
  GameStats extends {} = {},
> = GameDefinitionCore<GameId, PlayerState> & {
  type: "fixedObj";
  roundOrder: (keyof Rounds)[];
  rounds: Rounds;
} & ({} extends GameStats
    ? {
        withGameStats: ReturnType<typeof withGameStatsObj<GameId, PlayerState, Rounds>>;
      }
    : {
        soloStatsFactory: SoloStatsFactory<SoloStats, PlayerState, Rounds> | undefined;
        gameStatsFactory: GameStatsFactory<SoloStats, GameStats, PlayerState, Rounds>;
      });

type T = keyof ArrayGameDef<
  "foo",
  { score: number },
  NumericRange<4>,
  { bar: boolean },
  NumericRange<4>,
  20,
  {},
  { loser: boolean }
>;

type SoloStatsFactory<
  SoloStats extends {},
  PlayerState,
  Rounds extends {} | any[],
  RoundKey extends keyof Rounds = keyof Rounds,
> = (
  playerData: PlayerDataWithId<
    PlayerState,
    { [K in RoundKey]: Rounds[K] extends TurnMeta<any, infer RS, infer V> ? RS : never },
    RoundKey
  >,
) => SoloStats;
type GameStatsFactory<
  SoloStats extends {},
  GameStats extends {},
  PlayerState,
  Rounds extends {} | any[],
  RoundKey extends keyof Rounds = keyof Rounds,
> = (
  playerData: PlayerDataWithId<
    PlayerState,
    { [K in RoundKey]: Rounds[K] extends TurnMeta<any, infer RS, infer V> ? RS : never },
    RoundKey
  > &
    SoloStats & {
      position: Position;
    },
) => GameStats;

function withGameStats<
  GameStats extends {},
  PlayerState,
  Rounds extends {} | any[],
  RoundKey extends keyof Rounds = keyof Rounds,
>(): (game: GameStatsFactory<{}, GameStats, PlayerState, Rounds, RoundKey>) => {
  soloStatsFactory?: undefined;
  gameStatsFactory: GameStatsFactory<{}, GameStats, PlayerState, Rounds, RoundKey>;
};
function withGameStats<
  SoloStats extends {},
  GameStats extends {},
  PlayerState,
  Rounds extends {} | any[],
  RoundKey extends keyof Rounds = keyof Rounds,
>(
  solo: SoloStatsFactory<SoloStats, PlayerState, Rounds, RoundKey>,
): (game: GameStatsFactory<{}, GameStats, PlayerState, Rounds, RoundKey>) => {
  soloStatsFactory: SoloStatsFactory<SoloStats, PlayerState, Rounds, RoundKey>;
  gameStatsFactory: GameStatsFactory<{}, GameStats, PlayerState, Rounds, RoundKey>;
};
function withGameStats<
  GameStats extends {},
  PlayerState,
  Rounds extends {} | any[],
  RoundKey extends keyof Rounds = keyof Rounds,
>(
  solo: undefined,
  game: GameStatsFactory<{}, GameStats, PlayerState, Rounds, RoundKey>,
): {
  soloStatsFactory?: undefined;
  gameStatsFactory: GameStatsFactory<{}, GameStats, PlayerState, Rounds, RoundKey>;
};
function withGameStats<
  SoloStats extends {},
  GameStats extends {},
  PlayerState,
  Rounds extends {} | any[],
  RoundKey extends keyof Rounds = keyof Rounds,
>(
  solo: SoloStatsFactory<SoloStats, PlayerState, Rounds, RoundKey>,
  game: GameStatsFactory<SoloStats, GameStats, PlayerState, Rounds, RoundKey>,
): {
  soloStatsFactory: SoloStatsFactory<SoloStats, PlayerState, Rounds, RoundKey>;
  gameStatsFactory: GameStatsFactory<SoloStats, GameStats, PlayerState, Rounds, RoundKey>;
};
function withGameStats<
  SoloStats extends {},
  GameStats extends {},
  PlayerState,
  Rounds extends {} | any[],
  RoundKey extends keyof Rounds = keyof Rounds,
>(
  maybeSolo?: SoloStatsFactory<SoloStats, PlayerState, Rounds, RoundKey>,
  maybeGame?: GameStatsFactory<SoloStats, GameStats, PlayerState, Rounds, RoundKey>,
):
  | {
      soloStatsFactory?: SoloStatsFactory<SoloStats, PlayerState, Rounds, RoundKey>;
      gameStatsFactory: GameStatsFactory<SoloStats, GameStats, PlayerState, Rounds, RoundKey>;
    }
  | ((game: GameStatsFactory<SoloStats, GameStats, PlayerState, Rounds, RoundKey>) => {
      soloStatsFactory?: SoloStatsFactory<SoloStats, PlayerState, Rounds, RoundKey>;
      gameStatsFactory: GameStatsFactory<SoloStats, GameStats, PlayerState, Rounds, RoundKey>;
    }) {
  if (maybeGame) {
    return {
      gameStatsFactory: maybeGame,
      soloStatsFactory: maybeSolo,
    };
  }
  // @ts-ignore
  return (game: GameStatsFactory<SoloStats, GameStats, PlayerState, Rounds, RoundKey>) =>
    withGameStats(maybeSolo, game);
}

const withGameStatsArr =
  <
    GameId extends string,
    PlayerState,
    Rounds extends {
      [k: string | number | symbol]: TurnMeta<any, any, any>;
    },
  >(
    gameDef: Omit<ObjectGameDef<GameId, PlayerState, Rounds>, "withGameStats">,
  ): {
    (
      solo?: undefined,
    ): <GameStats extends {}>(
      game: GameStatsFactory<{}, GameStats, PlayerState, Rounds>,
    ) => ObjectGameDef<GameId, PlayerState, Rounds, {}, GameStats>;
    <SoloStats extends {}>(
      solo: SoloStatsFactory<SoloStats, PlayerState, Rounds>,
    ): <GameStats extends {}>(
      game: GameStatsFactory<SoloStats, GameStats, PlayerState, Rounds>,
    ) => ObjectGameDef<GameId, PlayerState, Rounds, SoloStats, GameStats>;
    <GameStats extends {}>(
      soloState: undefined,
      gameState: GameStatsFactory<{}, GameStats, PlayerState, Rounds>,
    ): ObjectGameDef<GameId, PlayerState, Rounds, {}, GameStats>;
    <SoloStats extends {}, GameStats extends {}>(
      soloState: SoloStatsFactory<SoloStats, PlayerState, Rounds>,
      gameState: GameStatsFactory<SoloStats, GameStats, PlayerState, Rounds>,
    ): ObjectGameDef<GameId, PlayerState, Rounds, SoloStats, GameStats>;
    // @ts-expect-error
  } =>
  <SoloStats extends {}, GameStats extends {}>(
    maybeSolo?: SoloStatsFactory<any, PlayerState, Rounds>,
    maybeGame?: GameStatsFactory<any, any, PlayerState, Rounds>,
  ) => {
    if (maybeGame) {
      return Object.assign(
        {
          gameStatsFactory: maybeGame,
          soloStatsFactory: maybeSolo,
        },
        gameDef,
      ) as unknown as ObjectGameDef<GameId, PlayerState, Rounds, SoloStats, GameStats>;
    }
    return maybeSolo
      ? <GS extends {}>(game: GameStatsFactory<SoloStats, GS, PlayerState, Rounds>) =>
          Object.assign(
            {
              gameStatsFactory: game,
              soloStatsFactory: maybeSolo,
            },
            gameDef,
          ) as unknown as ObjectGameDef<GameId, PlayerState, Rounds, SoloStats, GS>
      : <GS extends {}>(game: GameStatsFactory<SoloStats, GS, PlayerState, Rounds>) =>
          Object.assign(
            {
              gameStatsFactory: game,
              soloStatsFactory: undefined,
            },
            gameDef,
          ) as unknown as ObjectGameDef<GameId, PlayerState, Rounds, {}, GS>;
  };

const withGameStatsObj =
  <
    GameId extends string,
    PlayerState,
    Rounds extends {
      [k: string | number | symbol]: TurnMeta<any, any, any>;
    },
  >(
    gameDef: Omit<ObjectGameDef<GameId, PlayerState, Rounds>, "withGameStats">,
  ): {
    (
      solo?: undefined,
    ): <GameStats extends {}>(
      game: GameStatsFactory<{}, GameStats, PlayerState, Rounds>,
    ) => ObjectGameDef<GameId, PlayerState, Rounds, {}, GameStats>;
    <SoloStats extends {}>(
      solo: SoloStatsFactory<SoloStats, PlayerState, Rounds>,
    ): <GameStats extends {}>(
      game: GameStatsFactory<SoloStats, GameStats, PlayerState, Rounds>,
    ) => ObjectGameDef<GameId, PlayerState, Rounds, SoloStats, GameStats>;
    <GameStats extends {}>(
      soloState: undefined,
      gameState: GameStatsFactory<{}, GameStats, PlayerState, Rounds>,
    ): ObjectGameDef<GameId, PlayerState, Rounds, {}, GameStats>;
    <SoloStats extends {}, GameStats extends {}>(
      soloState: SoloStatsFactory<SoloStats, PlayerState, Rounds>,
      gameState: GameStatsFactory<SoloStats, GameStats, PlayerState, Rounds>,
    ): ObjectGameDef<GameId, PlayerState, Rounds, SoloStats, GameStats>;
    // @ts-expect-error
  } =>
  <SoloStats extends {}, GameStats extends {}>(
    maybeSolo?: SoloStatsFactory<any, PlayerState, Rounds>,
    maybeGame?: GameStatsFactory<any, any, PlayerState, Rounds>,
  ) => {
    if (maybeGame) {
      return Object.assign(
        {
          gameStatsFactory: maybeGame,
          soloStatsFactory: maybeSolo,
        },
        gameDef,
      ) as unknown as ObjectGameDef<GameId, PlayerState, Rounds, SoloStats, GameStats>;
    }
    return maybeSolo
      ? <GS extends {}>(game: GameStatsFactory<SoloStats, GS, PlayerState, Rounds>) =>
          Object.assign(
            {
              gameStatsFactory: game,
              soloStatsFactory: maybeSolo,
            },
            gameDef,
          ) as unknown as ObjectGameDef<GameId, PlayerState, Rounds, SoloStats, GS>
      : <GS extends {}>(game: GameStatsFactory<SoloStats, GS, PlayerState, Rounds>) =>
          Object.assign(
            {
              gameStatsFactory: game,
              soloStatsFactory: undefined,
            },
            gameDef,
          ) as unknown as ObjectGameDef<GameId, PlayerState, Rounds, {}, GS>;
  };

// const withGameStats = <SoloStats extends {}, GameStats extends {}, PlayerState, Rounds extends {} | any[], RoundKey extends keyof Rounds = keyof Rounds>(
//   solo?: (playerData: PlayerDataWithId<PlayerState, { [K in RoundKey]: Rounds[K] extends TurnMeta<any, infer RS, infer V> ? RS : never }, RoundKey>) => SoloStats,
//   game?: (playerData: PlayerDataWithId<PlayerState, { [K in RoundKey]: Rounds[K] extends TurnMeta<any, infer RS, infer V> ? RS : never }, RoundKey> & SoloStats & {
//     position: Position;
//   }) => GameStats,
// ): ReturnType<GameStatsDefPart<SoloStats, GameStats, PlayerState, Rounds, RoundKey>["withGameStats"]> => {
//   if (game === undefined) {
//     return (game?: (playerData: PlayerDataWithId<PlayerState, { [K in RoundKey]: Rounds[K] extends TurnMeta<any, infer RS, infer V> ? RS : never }, RoundKey> & SoloStats & {
//       position: Position;
//     }) => GameStats) => withGameStats(solo, game);
//   }
//   return {
//     gameStatsFactory: game,
//     soloStatsFactory: solo ?? (() => {}),
//   }
// }

type GameStatsDefPart<
  SoloStats extends {},
  GameStats extends {},
  PlayerState,
  Rounds extends {} | any[],
  RoundKey extends keyof Rounds = keyof Rounds,
> = {} extends SoloStats
  ? {} extends GameStats
    ? {
        // Neither specified
        withGameStats: {
          <SS extends {}, GS extends {}>(
            soloState: (
              playerData: PlayerDataWithId<
                PlayerState,
                {
                  [K in RoundKey]: Rounds[K] extends TurnMeta<any, infer RS, infer V> ? RS : never;
                },
                RoundKey
              >,
            ) => SS | undefined,
            gameState: (
              playerData: PlayerDataWithId<
                PlayerState,
                {
                  [K in RoundKey]: Rounds[K] extends TurnMeta<any, infer RS, infer V> ? RS : never;
                },
                RoundKey
              > &
                SS & {
                  position: Position;
                },
            ) => GS,
          ): GameStatsDefPart<SS, GS, PlayerState, Rounds, RoundKey>;
          <SS extends {}>(
            soloState?: (
              playerData: PlayerDataWithId<
                PlayerState,
                {
                  [K in RoundKey]: Rounds[K] extends TurnMeta<any, infer RS, infer V> ? RS : never;
                },
                RoundKey
              >,
            ) => SS,
          ): <GS extends {}>(
            gameState: (
              playerData: PlayerDataWithId<
                PlayerState,
                {
                  [K in RoundKey]: Rounds[K] extends TurnMeta<any, infer RS, infer V> ? RS : never;
                },
                RoundKey
              > &
                SS & {
                  position: Position;
                },
            ) => GS,
          ) => GameStatsDefPart<SS, GS, PlayerState, Rounds, RoundKey>;
        };
      }
    : {
        // GameStats specified with no solo stats
        gameStatsFactory: (
          playerData: PlayerDataWithId<
            PlayerState,
            { [K in RoundKey]: Rounds[K] extends TurnMeta<any, infer RS, infer V> ? RS : never },
            RoundKey
          > &
            SoloStats & {
              position: Position;
            },
        ) => GameStats;
      }
  : {} extends GameStats
    ? {
        // SoloStats specified with no game stats
        soloStatsFactory: (
          playerData: PlayerDataWithId<
            PlayerState,
            { [K in RoundKey]: Rounds[K] extends TurnMeta<any, infer RS, infer V> ? RS : never },
            RoundKey
          >,
        ) => SoloStats;
        withGameStats: <GS extends {}>(
          gameState: (
            playerData: PlayerDataWithId<
              PlayerState,
              { [K in RoundKey]: Rounds[K] extends TurnMeta<any, infer RS, infer V> ? RS : never },
              RoundKey
            > &
              SoloStats & {
                position: Position;
              },
          ) => GS,
        ) => GameStatsDefPart<SoloStats, GS, PlayerState, Rounds, RoundKey>;
      }
    : {
        // Both specified
        soloStatsFactory: (
          playerData: PlayerDataWithId<
            PlayerState,
            { [K in RoundKey]: Rounds[K] extends TurnMeta<any, infer RS, infer V> ? RS : never },
            RoundKey
          >,
        ) => SoloStats;
        gameStatsFactory: (
          playerData: PlayerDataWithId<
            PlayerState,
            { [K in RoundKey]: Rounds[K] extends TurnMeta<any, infer RS, infer V> ? RS : never },
            RoundKey
          > &
            SoloStats & {
              position: Position;
            },
        ) => GameStats;
      };

export const makePlayerPositions = (
  playerScores: Map<string, number>,
  positionOrder: PositionsOrder,
) => {
  return () => {
    const orderedScores = [...playerScores.values()];
    orderedScores.sort((a, b) => {
      switch (positionOrder) {
        case "highestFirst":
          return b - a;
        case "lowestFirst":
          return a - b;
      }
    });
    const scorePlayerLookup = [...playerScores.entries()].reduce((acc, [pid, score]) => {
      if (acc.has(score)) {
        acc.get(score)!.push(pid);
      } else {
        acc.set(score, [pid]);
      }
      return acc;
    }, new Map<number, string[]>());

    const { ordered, playerLookup } = orderedScores.reduce(
      ({ scores, ordered, playerLookup }, score, idx) => {
        const pos = idx + 1;
        if (!scores.has(score)) {
          scores.add(score);
          const players = scorePlayerLookup.get(score)!;
          ordered.push({ pos, players });
          for (const p of players) {
            playerLookup.set(p, { pos, players });
          }
        }
        return { scores, ordered, playerLookup };
      },
      {
        scores: new Set<number>(),
        ordered: [] as Position[],
        playerLookup: new Map<string, Position>(),
      },
    );

    return { ordered, playerLookup };
  };
};
