import { ZodTypeAny, TypeOf } from "zod";
import { PlayerStatsHolder, StatsCounterFactory, statsCounterFactory } from "./summary/v2";

export type PlayerResultGetter<GR, PR> = (gameResult: GR, playerId: string) => PR;

type SFDecCore<T extends number | string> = {
  label: string;
  /**
   * Display rate as an additional field.<br>
   * If undefined, no rate displayed.
   * If number, number of fixed digits (after '.')
   * otherwise, function is called with the rate.
   */
  displayAdditionalRate?: number | ((rate: number) => T);
};
type SFDecGame<GR, T extends number | string> = SFDecCore<T> & {
  type: "game";
  value: (
    stats: GR,
    previous: T | undefined,
    extras: {
      playerId: string;
      rate: (stat: number, fixed?: number) => number;
    },
  ) => T;
};
type SFDecPlayer<PS, T extends number | string> = SFDecCore<T> & {
  type: "player";
  value: (
    stats: PS,
    extras: {
      playerId: string;
      rate: (stat: number, fixed?: number) => number;
    },
  ) => T;
};
export type SummaryFieldDeclaration<GR, PS, T extends number | string> =
  SFDecGame<GR, T> | SFDecPlayer<PS, T>;
export type SummaryFieldDeclarations<GR, PS> = {
  [k: string]: SummaryFieldDeclaration<GR, PS, any>;
};

type SummaryType<SF extends SummaryFieldDeclarations<any, any>> = {
  [K in keyof SF]: SF[K] extends SummaryFieldDeclaration<any, any, infer T> ? T : never;
} & {
  [K in keyof SF & string as `${K}Rate`]?: number;/*[SF[K]["displayAdditionalRate"]] extends [() => infer T]
    ? T
    : [SF[K]["displayAdditionalRate"]] extends [number]
      ? number
      : never;//*/
};

export type GameType<
  GR,
  PR,
  PS extends ZodTypeAny,
  SF extends SummaryFieldDeclarations<GR, TypeOf<PS>>,
> = {
  readonly key: string;
  readonly listPlayers: (gameResult: GR) => string[];
  readonly getPlayerResult: PlayerResultGetter<GR, PR>;
  readonly playerStatsFactory: StatsCounterFactory<PS, PR>;
  summaryFieldsOrder: (keyof SF)[];
  summaryFieldsDeclaration: SF;
};

export const buildStats = <
  GR,
  PR,
  PS extends ZodTypeAny,
  SF extends SummaryFieldDeclarations<GR, TypeOf<PS>>,
>(gameType: GameType< GR, PR, PS, SF>, games: Iterable<GR>): Map<string, SummaryType<SF>> => {
  const summary = new Map<string, Partial<SummaryType<SF>>>();
  const playerStatsHolders = new Map<string, PlayerStatsHolder<TypeOf<PS>, PR>>();
  for (const game of games) {
    for (const playerId of gameType.listPlayers(game)) {
      if (!playerStatsHolders.has(playerId)) {
        playerStatsHolders.set(playerId, gameType.playerStatsFactory.create());
        summary.set(playerId, {});
      }
      playerStatsHolders.get(playerId)!.add(gameType.getPlayerResult(game, playerId));
      const extras = {
        playerId,
        rate: (val: number, fixed = 2): number =>
          parseFloat(val.toFixed(fixed >= 0 ? fixed : undefined)),
      };
      for (const [key, field] of gameType.summaryFieldsOrder.flatMap((k) => {
        const f = gameType.summaryFieldsDeclaration[k];
        return (f.type === "game" ? [[k, f]] : []) as [keyof SF, SFDecGame<GR, any>][];
      })) {
        const playerSummary = summary.get(playerId)!;
        playerSummary[key] = field.value(game, playerSummary[key], extras);
      }
    }
  }
  // Add player stats
  for (const [playerId, pSummary] of summary) {
    const extras = {
      playerId,
      rate: (val: number, fixed = 2): number =>
        parseFloat(val.toFixed(fixed >= 0 ? fixed : undefined)),
    };
    for (const [key, field] of gameType.summaryFieldsOrder.flatMap((k) => {
      const f = gameType.summaryFieldsDeclaration[k];
      return (f.type === "player" ? [[k, f]] : []) as [keyof SF, SFDecPlayer<TypeOf<PS>, any>][];
    })) {
      pSummary[key] = field.value(playerStatsHolders.get(playerId)!, extras);
    }
  }
  return summary as Map<string, SummaryType<SF>>;
};

export const makeGameType = <GR, PR>(
  key: string,
  listPlayers: (gameResult: GR) => string[],
  getPlayerResult: PlayerResultGetter<GR, PR>,
) => <
  PS extends ZodTypeAny,
  SF extends SummaryFieldDeclarations<GR, TypeOf<PS>>,
>(
  statsSchema: PS,
  statsAccumulator: (stats: TypeOf<PS>, playerGameResult: PR) => TypeOf<PS>,
  summaryFields: SF, summaryOrder: (keyof SF)[],
): GameType<GR, PR, PS, SF> => ({
  key,
  listPlayers,
  getPlayerResult,
  playerStatsFactory: statsCounterFactory(statsSchema, statsAccumulator),
  summaryFieldsDeclaration: summaryFields,
  summaryFieldsOrder: summaryOrder,
});

const test = {
  gameCount: {
    label: "Total games played",
    type: "player",
    value: stats => stats.numGames,
  } as SummaryFieldDeclaration<{}, {numGames: number}, number>,
  cliff: {
    label: "Cliffs",
    type: "player",
    value: stats => stats.cliffs,
    displayAdditionalRate: 2,
  } as SummaryFieldDeclaration<{}, {cliffs: number}, number>,
};
type DAR = number | ((rate: number) => number) | undefined;
const dar: DAR = 3;
type GTTest = typeof dar extends undefined ? true : false;
type TEST = SummaryType<typeof test>;
