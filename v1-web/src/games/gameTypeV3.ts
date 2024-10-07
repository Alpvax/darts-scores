import { Component, reactive } from "vue";
import { z } from "zod";

export type PlayerSummaryFactory<CombinedGameStats, PlayerSummary> = {
  /** Create a default (empty) summary */
  create: () => PlayerSummary;
  /** Add stats to the summary. Whether it mutates the input summary is up to the implementation */
  add: (summary: PlayerSummary, playerStats: CombinedGameStats) => PlayerSummary;
};

type ComponentOrFactory<C extends Component> = C | (() => C) | Promise<C> | (() => Promise<C>);

type GameTypeBuilderCore<DBR, SP, MP, CS> = {
  readonly key: string;
  readonly getScores: (gameResult: DBR) => Map<string, SP>;
  readonly makeGameStats: (gameResult: DBR, spPlayerStats: Map<string, SP>) => Map<string, CS>;
  readonly withSummary: <PlayerSummary>(
    playerSummaryFactory: PlayerSummaryFactory<CS, PlayerSummary>,
  ) => GameTypeBuilderWSummary<DBR, SP, MP, PlayerSummary, CS>;
  readonly withComponent: <GameComponent extends Component>(
    component: ComponentOrFactory<GameComponent>,
  ) => GameTypeBuilderWComponent<GameComponent, DBR, SP, MP, CS>;
};
type GameTypeBuilderWSummary<DBR, SP, MP, PS, CS> = {
  readonly key: string;
  readonly getScores: (gameResult: DBR) => Map<string, SP>;
  readonly makeGameStats: (gameResult: DBR, spPlayerStats: Map<string, SP>) => Map<string, CS>;
  readonly playerSummaryFactory: PlayerSummaryFactory<CS, PS>;
  readonly withComponent: <GameComponent extends Component>(
    component: ComponentOrFactory<GameComponent>,
  ) => GameType<GameComponent, DBR, SP, MP, any, CS>;
};
type GameTypeBuilderWComponent<C extends Component, DBR, SP, MP, CS> = {
  readonly key: string;
  readonly getScores: (gameResult: DBR) => Map<string, SP>;
  readonly makeGameStats: (gameResult: DBR, spPlayerStats: Map<string, SP>) => Map<string, CS>;
  readonly component: ComponentOrFactory<C>;
  readonly withSummary: <PlayerSummary>(
    playerSummaryFactory: PlayerSummaryFactory<CS, PlayerSummary>,
  ) => GameType<C, DBR, SP, MP, PlayerSummary, CS>;
};

export const create = <
  DBGameResult, SPGameStats, MPGameStats,
  CombinedGameStats = SPGameStats & MPGameStats,
>(
  key: string,
  getScores: (gameResult: DBGameResult) => Map<string, SPGameStats>,
  makeGameStats: (gameResult: DBGameResult, spPlayerStats: Map<string, SPGameStats>) =>
  Map<string, CombinedGameStats>,
): GameTypeBuilderCore<DBGameResult, SPGameStats, MPGameStats, CombinedGameStats> => ({
  key, getScores, makeGameStats,
  withSummary: <PlayerSummary>(
    playerSummaryFactory: PlayerSummaryFactory<CombinedGameStats, PlayerSummary>,
  ) => ({
    key, getScores, makeGameStats, playerSummaryFactory,
    withComponent: <GameComponent extends Component>(
      component: ComponentOrFactory<GameComponent>,
    ) => ({ key, getScores, makeGameStats, playerSummaryFactory, component }),
  }),
  withComponent: <GameComponent extends Component>(
    component: ComponentOrFactory<GameComponent>,
  ) => ({
    key, getScores, makeGameStats, component,
    withSummary: <PlayerSummary>(
      playerSummaryFactory: PlayerSummaryFactory<CombinedGameStats, PlayerSummary>,
    ) => ({ key, getScores, makeGameStats, component, playerSummaryFactory }),
  }),
});


export type GameType<
  GameComponent extends Component,
  DBGameResult,
  SPGameStats,
  MPGameStats,
  PlayerSummary,
  CombinedGameStats = SPGameStats & MPGameStats
> = {
  readonly key: string;
  readonly component: ComponentOrFactory<GameComponent>;
  readonly getScores: (gameResult: DBGameResult) => Map<string, SPGameStats>;
  readonly makeGameStats: (gameResult: DBGameResult, spPlayerStats: Map<string, SPGameStats>)
  => Map<string, CombinedGameStats>;
  readonly playerSummaryFactory: PlayerSummaryFactory<CombinedGameStats, PlayerSummary>;
};

// export const create = <
//   GameComponent extends Component,
//   DBGameResult, SPGameStats, MPGameStats,
//   CombinedGameStats = SPGameStats & MPGameStats,
// >(
//   key: string,
//   component: GameComponent,
//   getScores: (gameResult: DBGameResult) => Map<string, SPGameStats>,
//   makeGameStats: (gameResult: DBGameResult, spPlayerStats: Map<string, SPGameStats>) =>
//   Map<string, CombinedGameStats>,
// ) => <PlayerSummary>(
//   playerSummaryFactory: PlayerSummaryFactory<CombinedGameStats, PlayerSummary>,
// ): GameType<
// GameComponent, DBGameResult, SPGameStats, MPGameStats, PlayerSummary, CombinedGameStats
// > => ({
//   key, component, getScores, makeGameStats, playerSummaryFactory,
// });

export const DefaultedSummaryFactory = <CombinedGameStats, PlayerSummary>(
  defaultValues: PlayerSummary,
  accumulator: (summary: PlayerSummary, playerStats: CombinedGameStats) => PlayerSummary,
): PlayerSummaryFactory<CombinedGameStats, PlayerSummary> => {
  const defaults = Object.freeze(defaultValues);
  return {
    create: () => structuredClone(defaults),
    add: accumulator,
  };
};
export const ZodSummaryFactory = <CombinedGameStats, S extends z.ZodTypeAny>(
  schema: S,
  accumulator: (summary: z.TypeOf<S>, playerStats: CombinedGameStats) => z.TypeOf<S>,
): PlayerSummaryFactory<CombinedGameStats, z.TypeOf<S>> =>
  DefaultedSummaryFactory(schema.parse({}), accumulator);

export const buildGameStats = <
  DBGameResult,
  SPGameStats,
  MPGameStats,
  PlayerSummary,
  CombinedGameStats,
  G extends GameType<any, DBGameResult, SPGameStats, MPGameStats, PlayerSummary, CombinedGameStats>
>(gameType: G, game: DBGameResult): Map<string, CombinedGameStats> =>
  gameType.makeGameStats(game, gameType.getScores(game));

export type SummaryAccumulator<
  DBGameResult,
  PlayerSummary,
  CombinedGameStats,
> = {
  /** Reactive vue proxy object. Should not be modified manually! */
  values: Map<string, PlayerSummary>;
  /** Add a single players stats to the map. Use with caution, recommended to use addGame instead */
  addStats: (playerId: string, stats: CombinedGameStats) => void;
  /** Calls addStats for each player in a game to add their stats to the map */
  addGame: (gameResult: DBGameResult) => void;
  /** Completely clears the values map */
  clear: () => void;
};

export const buildGameSummaryAccumulator = <
  DBGameResult,
  SPGameStats,
  MPGameStats,
  PlayerSummary,
  CombinedGameStats,
  G extends GameType<any, DBGameResult, SPGameStats, MPGameStats, PlayerSummary, CombinedGameStats>,
>(gameType: G, {
  filters,
  rateFields,
}: {
  filters?: {
    playerFilter?: (playerId: string, stats: CombinedGameStats) => boolean;
    gameFilter?: (gameResult: DBGameResult) => boolean;
  };
  rateFields?: {
    numGamesGetter: (summary: PlayerSummary) => number;
    fields: Set<keyof PlayerSummary>;
  };
}):
SummaryAccumulator<DBGameResult, PlayerSummary, CombinedGameStats> => {
  const values = reactive(new Map<string, PlayerSummary>());
  const addStats = (playerId: string, stats: CombinedGameStats): void => {
    if (!values.has(playerId)) {
      values.set(playerId, gameType.playerSummaryFactory.create());
    }
    gameType.playerSummaryFactory.add(values.get(playerId)!, stats);
  };
  const addGame = (gameResult: DBGameResult): void => {
    if (!filters?.gameFilter || filters.gameFilter(gameResult)) {
      for (const [playerId, stats] of buildGameStats<
      DBGameResult,
      SPGameStats,
      MPGameStats,
      PlayerSummary,
      CombinedGameStats,
      G
      >(gameType, gameResult)) {
        if (!filters?.playerFilter || filters.playerFilter(playerId, stats)) {
          addStats(playerId, stats);
        }
      }
    }
  };
  const clear = (): void => {
    values.clear();
  };
  return { values, addStats, addGame, clear };
};
