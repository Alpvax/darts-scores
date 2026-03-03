import type {
  SummaryPartAccumulatorWithMeta,
  StatsTypeForGame,
  SummaryPartAccumulator,
  FixedSummaryAccumulatorParts,
} from "..";
import type { GameDefinition } from "@/gameDefinitionV2/definition";
import type { NumStatExpansion, BoolStatExpansion } from "./roundStats";
import type { BestDirection } from "../display/parts";

export * from "./core";

const FLOAT_MAXIMUM_FRACTIONAL_DIGITS: number = 2;
const DEFAULT_RATE_FORMAT: Intl.NumberFormatOptions = {
  maximumFractionDigits: FLOAT_MAXIMUM_FRACTIONAL_DIGITS,
  style: "percent",
};

export type SummaryPartsFactoryHelper<
  G extends GameDefinition<any, any, any, any, any, any, any, any, any>,
  SummaryParts extends {
    [k: string]:
      | SummaryPartAccumulatorWithMeta<StatsTypeForGame<G>, any, any>
      | SummaryPartAccumulator<StatsTypeForGame<G>, any>;
  } & {
    [K in keyof FixedSummaryAccumulatorParts<G, RoundsField>]?: never;
  },
  RoundsField extends string,
> = (helpers: ReturnType<typeof makeHelpers<G>>) => SummaryParts;

const makeHelpers = <G extends GameDefinition<any, any, any, any, any, any, any, any, any>>() => ({
  /** Simple identity helper to simplify specifying type of SummaryPart */
  custom: <T>(def: SummaryPartAccumulator<StatsTypeForGame<G>, T>) => typeof def,
  /** Simple identity helper to simplify specifying type of SummaryPart and Meta */
  customWithMeta: <T, M>(def: SummaryPartAccumulatorWithMeta<StatsTypeForGame<G>, T, M>) =>
    typeof def,
  /** Part used to count the furthest round reached by some predicate */
  countFurthestRound: makeCountFurthestRoundAccumulatorPart<G>,
  /** Part used to summarise round stats from all rounds */
  countRoundStats: makeCountRoundStatsAccumulatorPartFor<G>(),
  /** Part used to track simple numeric stats */
  numeric: makeNumericAccumulatorPart<G>,
  /** Part used to track simple boolean stats */
  boolPart: makeBooleanAccumulatorPart<G>,
});
export const makeSummaryParts = <
  G extends GameDefinition<any, any, any, any, any, any, any, any, any>,
  SummaryParts extends {
    [k: string]:
      | SummaryPartAccumulatorWithMeta<StatsTypeForGame<G>, any, any>
      | SummaryPartAccumulator<StatsTypeForGame<G>, any>;
  } & {
    [K in keyof FixedSummaryAccumulatorParts<G, RoundsField>]?: never;
  },
  RoundsField extends string,
>(
  factory: SummaryPartsFactoryHelper<G, SummaryParts, RoundsField>,
): SummaryParts => factory(makeHelpers());

export type CountFurthestRoundAccumulatorPart<
  G extends GameDefinition<any, any, any, any, any, any, any, any, any>,
> = SummaryPartAccumulator<
  StatsTypeForGame<G>,
  {
    furthest: number;
    count: number;
  }
>;
export const makeCountFurthestRoundAccumulatorPart = <
  G extends GameDefinition<any, any, any, any, any, any, any, any, any>,
>(
  label: string,
  getter: (
    pData: StatsTypeForGame<G>,
  ) => [number, boolean] | { furthest: number; fullLength: boolean },
  displayDirection: BestDirection,
  display?: Omit<
    Exclude<CountFurthestRoundAccumulatorPart<G>["displayDefaults"], undefined>,
    "direction"
  >,
): CountFurthestRoundAccumulatorPart<G> => ({
  empty: () => ({
    furthest: 0,
    count: 0,
  }),
  push: ({ furthest, count }, pData) => {
    const val = getter(pData);
    const [far, full] = Array.isArray(val) ? val : [val.furthest, val.fullLength];
    return {
      furthest: Math.max(furthest, far),
      count: count + +full,
    };
  },
  displayDefaults: {
    direction: displayDirection,
    format: { maximumFractionDigits: FLOAT_MAXIMUM_FRACTIONAL_DIGITS },
    ...display,
  },
});

export type CountRoundStatsAccumulatorPart<
  G extends GameDefinition<any, any, any, any, any, any, any, any, any>,
> = SummaryPartAccumulator<
  StatsTypeForGame<G>,
  {
    most: number;
    least: number;
    total: number;
    available: number;
    /** Average cliff per game */
    perGameMean: number;
    /** Mean cliff rate of a single round */
    rate: number;
  }
>;
export const makeCountRoundStatsAccumulatorPartFor =
  <G extends GameDefinition<any, any, any, any, any, any, any, any, any>>(): {
    <
      K extends keyof {
        [K in keyof StatsTypeForGame<G>["roundStatsGameSummary"] as StatsTypeForGame<G>["roundStatsGameSummary"][K] extends BoolStatExpansion
          ? K
          : never]: any;
      },
    >(
      stat: K,
      displayDirection: BestDirection,
      displayDefaults?: Omit<
        Exclude<CountRoundStatsAccumulatorPart<G>["displayDefaults"], undefined>,
        "direction"
      >,
    ): CountRoundStatsAccumulatorPart<G>;
    <
      K extends keyof {
        [K in keyof StatsTypeForGame<G>["roundStatsGameSummary"] as StatsTypeForGame<G>["roundStatsGameSummary"][K] extends BoolStatExpansion
          ? K
          : never]: any;
      },
    >(
      stat: K,
      availableGetter: (roundsPlayed: number, numGames: number) => number,
      displayDirection: BestDirection,
      displayDefaults?: Omit<
        Exclude<CountRoundStatsAccumulatorPart<G>["displayDefaults"], undefined>,
        "direction"
      >,
    ): CountRoundStatsAccumulatorPart<G>;
    <
      K extends keyof {
        [K in keyof StatsTypeForGame<G>["roundStatsGameSummary"] as StatsTypeForGame<G>["roundStatsGameSummary"][K] extends NumStatExpansion
          ? K
          : never]: any;
      },
    >(
      stat: K,
      availableGetter: (roundsPlayed: NumStatExpansion["roundsPlayed"], numGames: number) => number,
      displayDirection: BestDirection,
      displayDefaults?: Omit<
        Exclude<CountRoundStatsAccumulatorPart<G>["displayDefaults"], undefined>,
        "direction"
      >,
    ): CountRoundStatsAccumulatorPart<G>;
  } =>
  <K extends keyof StatsTypeForGame<G>["roundStatsGameSummary"]>(
    stat: K,
    getterOrDir:
      | ((roundsPlayed: number, numGames: number) => number)
      | ((roundsPlayed: NumStatExpansion["roundsPlayed"], numGames: number) => number)
      | BestDirection,
    dirOrDisplay?:
      | BestDirection
      | Omit<Exclude<CountRoundStatsAccumulatorPart<G>["displayDefaults"], undefined>, "direction">,
    maybeDisplay?: Omit<
      Exclude<CountRoundStatsAccumulatorPart<G>["displayDefaults"], undefined>,
      "direction"
    >,
  ): CountRoundStatsAccumulatorPart<G> => {
    const [getter, direction, displayOpts] =
      typeof getterOrDir === "function"
        ? [
            (val: BoolStatExpansion | NumStatExpansion, numGames: number) =>
              Object.hasOwn(val, "roundsPlayed")
                ? (
                    getterOrDir as (
                      roundsPlayed: NumStatExpansion["roundsPlayed"],
                      numGames: number,
                    ) => number
                  )((val as NumStatExpansion).roundsPlayed, numGames)
                : (getterOrDir as (roundsPlayed: number, numGames: number) => number)(
                    (val as BoolStatExpansion).max,
                    numGames,
                  ),
            dirOrDisplay as BestDirection,
            maybeDisplay as
              | Omit<
                  Exclude<CountRoundStatsAccumulatorPart<G>["displayDefaults"], undefined>,
                  "direction"
                >
              | undefined,
          ]
        : [
            (val: BoolStatExpansion | NumStatExpansion, _numGames: number) =>
              Object.hasOwn(val, "roundsPlayed")
                ? (val as NumStatExpansion).roundsPlayed.all
                : (val as BoolStatExpansion).max,
            getterOrDir,
            maybeDisplay,
          ];
    const { overrides, ...display } = displayOpts ?? {};
    return {
      empty: () => ({
        most: 0,
        least: Number.MAX_SAFE_INTEGER, // limit to round count?
        total: 0,
        available: 0,
        perGameMean: 0,
        rate: 0,
      }),
      push: ({ most, least, total: prev, available }, { roundStatsGameSummary }, numGames) => {
        const val = roundStatsGameSummary[stat] as BoolStatExpansion | NumStatExpansion;
        const gameTotal = val.total;
        const total = prev + gameTotal;
        return {
          most: Math.max(most, gameTotal),
          least: Math.min(least, gameTotal),
          total,
          available: available + getter(val, numGames),
          perGameMean: total / numGames,
          rate: total / available,
        };
      },
      displayDefaults: {
        direction,
        format: { maximumFractionDigits: FLOAT_MAXIMUM_FRACTIONAL_DIGITS },
        ...display,
        overrides: {
          perGameMean: { format: DEFAULT_RATE_FORMAT },
          rate: { format: DEFAULT_RATE_FORMAT },
          ...overrides,
        },
      },
    };
  };

export type NumericAccumulatorPart<
  G extends GameDefinition<any, any, any, any, any, any, any, any, any>,
> = SummaryPartAccumulator<
  StatsTypeForGame<G>,
  {
    most: number;
    least: number;
    total: number;
    mean: number;
  }
>;
export const makeNumericAccumulatorPart: {
  <G extends GameDefinition<any, any, any, any, any, any, any, any, any>>(
    stat:
      | keyof {
          [K in keyof StatsTypeForGame<G> as StatsTypeForGame<G>[K] extends number
            ? K
            : never]: any;
        }
      | ((pData: StatsTypeForGame<G>) => number),
    displayDirection: BestDirection,
    displayDefaults?: Omit<
      Exclude<NumericAccumulatorPart<G>["displayDefaults"], undefined>,
      "direction"
    >,
  ): NumericAccumulatorPart<G>;
  <G extends GameDefinition<any, any, any, any, any, any, any, any, any>>(
    stat:
      | keyof {
          [K in keyof StatsTypeForGame<G> as StatsTypeForGame<G>[K] extends number
            ? K
            : never]: any;
        }
      | ((pData: StatsTypeForGame<G>) => number),
    gameMaximum: number,
    displayDirection: BestDirection,
    displayDefaults?: Omit<
      Exclude<NumericAccumulatorPart<G>["displayDefaults"], undefined>,
      "direction"
    >,
  ): NumericAccumulatorPart<G>;
} = <G extends GameDefinition<any, any, any, any, any, any, any, any, any>>(
  stat:
    | keyof {
        [K in keyof StatsTypeForGame<G> as StatsTypeForGame<G>[K] extends number ? K : never]: any;
      }
    | ((pData: StatsTypeForGame<G>) => number),
  limitOrDir: number | BestDirection,
  dirOrDisplay?:
    | BestDirection
    | Omit<Exclude<NumericAccumulatorPart<G>["displayDefaults"], undefined>, "direction">,
  maybeDisplay?: Omit<
    Exclude<NumericAccumulatorPart<G>["displayDefaults"], undefined>,
    "direction"
  >,
) => {
  const get: (pData: any) => number = typeof stat === "function" ? stat : (pData) => pData[stat];
  const [limit, direction, displayOpts] =
    typeof limitOrDir === "number"
      ? [limitOrDir, dirOrDisplay as BestDirection, maybeDisplay]
      : [
          Number.MAX_SAFE_INTEGER,
          limitOrDir,
          dirOrDisplay as
            | Omit<Exclude<NumericAccumulatorPart<G>["displayDefaults"], undefined>, "direction">
            | undefined,
        ];
  const { overrides, ...display } = displayOpts ?? {};
  return {
    empty: () => ({
      most: 0,
      least: limit,
      total: 0,
      mean: 0,
    }),
    push: ({ most, least, total: prev }, pData, numGames) => {
      const val = get(pData);
      const total = prev + val;
      return {
        most: Math.max(most, val),
        least: Math.min(least, val),
        total,
        mean: total / numGames,
      };
    },
    displayDefaults: {
      direction,
      ...display,
      overrides: {
        mean: { format: DEFAULT_RATE_FORMAT },
        ...overrides,
      },
    },
  };
};

export type BooleanAccumulatorPart<
  G extends GameDefinition<any, any, any, any, any, any, any, any, any>,
> = SummaryPartAccumulator<
  StatsTypeForGame<G>,
  {
    count: number;
    mean: number;
  }
>;
export const makeBooleanAccumulatorPart = <
  G extends GameDefinition<any, any, any, any, any, any, any, any, any>,
>(
  stat:
    | keyof {
        [K in keyof StatsTypeForGame<G> as Exclude<
          StatsTypeForGame<G>[K],
          undefined
        > extends boolean
          ? K
          : never]: any;
      }
    | ((pData: StatsTypeForGame<G>) => boolean),
  displayDirection: BestDirection,
  displayDefaults?: Omit<
    Exclude<BooleanAccumulatorPart<G>["displayDefaults"], undefined>,
    "direction"
  >,
): BooleanAccumulatorPart<G> => {
  const get: (pData: StatsTypeForGame<G>) => number =
    typeof stat === "function" ? (pData) => +stat(pData) : (pData) => (pData[stat] ? 1 : 0);
  const { overrides, ...display } = displayDefaults ?? {};
  return {
    empty: () => ({
      count: 0,
      mean: 0,
    }),
    push: ({ count }, pData, numGames) => {
      const total = count + +get(pData);
      return {
        count: total,
        mean: total / numGames,
      };
    },
    displayDefaults: {
      direction: displayDirection,
      ...display,
      overrides: {
        mean: { format: DEFAULT_RATE_FORMAT },
        ...overrides,
      },
    },
  };
};
