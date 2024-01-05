import type { PlayerDataForStats, SummaryEntryField } from ".";
import type { TurnData, TurnStats } from "../roundDeclaration";

export const FAVOURITES_KEY = Symbol("favouriteRoundsData");

export class RoundStatsSummaryField<
  T extends TurnData<any, RS, any>,
  RS extends TurnStats,
  K extends string,
> implements SummaryEntryField<T, Map<K, RS>, RoundStatSummaryValues<K, RS>>
{
  constructor(
    private readonly roundKeys: string[],
    private readonly statDefaults: RS,
  ) {}
  entry(playerData: PlayerDataForStats<T>) {
    return new Map(
      [...playerData.turns].map(([i, t]) =>
        t.stats !== undefined
          ? [(i + 1).toString() as K, t.stats]
          : [(i + 1).toString() as K, { ...this.statDefaults }],
      ),
    );
  }
  emptySummary(): RoundStatSummaryValues<K, RS> {
    return this.roundKeys.reduce(
      (acc, key) =>
        Object.assign(acc, {
          [key]: (Object.entries(this.statDefaults) as [keyof RS, number | boolean][]).reduce(
            (acc, [key, val]) =>
              Object.assign(acc, {
                [key]:
                  typeof val === "boolean"
                    ? {
                        count: 0,
                        mean: 0,
                      }
                    : {
                        highest: Number.MIN_SAFE_INTEGER,
                        lowest: Number.MAX_SAFE_INTEGER,
                        total: 0,
                        mean: 0,
                        nonZero: {
                          count: 0,
                          mean: 0,
                        },
                      },
              }),
            {} as RoundStatSummaryValues<K, RS>[K],
          ),
        }),
      {
        [FAVOURITES_KEY]: (
          Object.entries(this.statDefaults) as [keyof RS, number | boolean][]
        ).reduce(
          (acc, [key, val]) =>
            Object.assign(acc, {
              [key]: {
                favourites: new Set(),
                count: val,
              },
            }),
          {} as RSFavourites<K, RS>,
        ),
      } as RoundStatSummaryValues<K, RS>,
    );
  }
  summary(
    prev: RoundStatSummaryValues<K, RS>,
    numGames: number,
    entry: Map<K, RS>,
  ): RoundStatSummaryValues<K, RS> {
    return [...entry].reduce(
      (acc, [idx, val]) =>
        Object.assign(acc, {
          [idx]: (Object.entries(val) as [keyof RS & string, number | boolean][]).reduce(
            (roundAcc, [key, val]) => {
              const favourites = acc[FAVOURITES_KEY][key];
              if (isBoolVal(roundAcc, key)) {
                roundAcc[key].count = roundAcc[key].count + +(val as boolean);
                roundAcc[key].mean = roundAcc[key].count / numGames;
                if (roundAcc[key].count === favourites.count) {
                  favourites.favourites.add(idx);
                } else if (roundAcc[key].count >= favourites.count) {
                  favourites.favourites.clear();
                  favourites.favourites.add(idx);
                  favourites.count = roundAcc[key].count;
                }
              } else if (isNumVal(roundAcc, key)) {
                const num = val as number;
                roundAcc[key].highest = Math.max(roundAcc[key].highest, num);
                roundAcc[key].lowest = Math.min(roundAcc[key].lowest, num);
                roundAcc[key].total += num;
                roundAcc[key].mean = roundAcc[key].total / numGames;
                const count = roundAcc[key].nonZero.count + (num !== 0 ? 1 : 0);
                roundAcc[key].nonZero = {
                  count,
                  mean: count / numGames,
                };
                if (roundAcc[key].highest === favourites.count) {
                  favourites.favourites.add(idx);
                } else if (roundAcc[key].highest >= favourites.count) {
                  favourites.favourites.clear();
                  favourites.favourites.add(idx);
                  favourites.count = roundAcc[key].highest;
                }
              }
              return roundAcc;
            },
            prev[idx],
          ),
        }),
      prev,
    );
  }
}
type BoolRSVal = {
  /** The total number of times that the stat has been true */
  count: number;
  /** The mean number of times that the stat has been true */
  mean: number;
};
type NumRSVal = {
  /** The highest value the stat reached in a single game */
  highest: number;
  /** The lowest value the stat reached in a single game */
  lowest: number;
  /** Sum of all the values the stat reached */
  total: number;
  /** The mean number of times that the stat has been true */
  mean: number;
  nonZero: {
    count: number;
    mean: number;
  };
};
type RSFavourites<K extends string, RS extends TurnStats> = {
  [key in keyof RS]: {
    favourites: Set<K>;
    count: number;
  };
};
type RoundStatSummaryValues<K extends string, RS extends TurnStats> = {
  [key in K]: {
    [SK in keyof RS & string]: RS[SK] extends boolean ? BoolRSVal : NumRSVal;
  };
} & {
  [FAVOURITES_KEY]: RSFavourites<K, RS>;
};

const isBoolVal = <RS extends TurnStats, K extends keyof RS & string>(
  vals: { [k in K]: BoolRSVal | NumRSVal },
  key: K,
): vals is { [k in K]: BoolRSVal } => Object.hasOwn(vals[key], "count");
const isNumVal = <RS extends TurnStats, K extends keyof RS & string>(
  vals: { [k in K]: BoolRSVal | NumRSVal },
  key: K,
): vals is { [k in K]: NumRSVal } => !Object.hasOwn(vals[key], "count");
