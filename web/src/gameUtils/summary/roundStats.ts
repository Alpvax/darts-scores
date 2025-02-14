import {
  normaliseDMI,
  type DisplayMetaArg,
  type PlayerDataForStats,
  type ScoreDirection,
  type SummaryDisplayMetadata,
  type SummaryEntryField,
  defaultRateFmt,
} from ".";
import type { TurnData, TurnStats } from "../roundDeclaration";
import type { HighlightRules } from "./displayMetaV2";

export const FAVOURITES_KEY = Symbol("favouriteRoundsData");

type DisplayMetaRoundArg<RS extends TurnStats, T, K extends string> = (
  key: K,
  index: number,
) => DisplayMetaArg<T, keyof RSSummaryVal<RS> & string>;
export type RoundStatsDisplayMetaInput<RS extends TurnStats, K extends string> = {
  best: ScoreDirection;
  label: DisplayMetaRoundArg<RS, string, K>;
  format?: DisplayMetaRoundArg<RS, Intl.NumberFormatOptions, K>;
  highlight?: DisplayMetaRoundArg<RS, HighlightRules, K>;
};
export class RoundStatsSummaryField<
  T extends TurnData<any, RS, any>,
  RS extends TurnStats,
  K extends string,
> implements SummaryEntryField<T, Map<K, RS>, RoundStatSummaryValues<K, RS>>
{
  display: SummaryDisplayMetadata<RoundStatSummaryValues<K, RS>>;
  constructor(
    private readonly roundKeys: K[],
    private readonly statDefaults: RS,
    displayMeta?: RoundStatsDisplayMetaInput<RS, K>,
  ) {
    this.display = {};
    if (displayMeta) {
      roundKeys.forEach((key, index) => {
        const meta = normaliseDMI<RSSummaryVal<RS>>({
          best: displayMeta.best,
          label: displayMeta.label(key, index),
          format: displayMeta.format ? displayMeta.format(key, index) : undefined,
          highlight: displayMeta.highlight ? displayMeta.highlight(key, index) : undefined,
        });
        for (const [k, v] of Object.entries(statDefaults)) {
          this.display[`${key}.${k}.mean` as keyof typeof this.display] = meta.getMeta("mean", {
            format: defaultRateFmt,
          });
          if (typeof v === "boolean") {
            this.display[`${key}.${k}.count` as keyof typeof this.display] = meta.getMeta("count");
          } else {
            this.display[`${key}.${k}.highest` as keyof typeof this.display] =
              meta.getMeta("highest");
            this.display[`${key}.${k}.lowest` as keyof typeof this.display] =
              meta.getMeta("lowest");
            this.display[`${key}.${k}.total` as keyof typeof this.display] = meta.getMeta("total");
            this.display[`${key}.${k}.nonZero.count` as keyof typeof this.display] =
              meta.getMeta("nonZero.count");
            this.display[`${key}.${k}.nonZero.mean` as keyof typeof this.display] = meta.getMeta(
              "nonZero.mean",
              { format: defaultRateFmt },
            );
          }
        }
      });
    }
  }
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
        [FAVOURITES_KEY]: Object.keys(this.statDefaults).reduce(
          (acc, key) =>
            Object.assign(acc, {
              [key]: {
                favourites: new Set(),
                count: 0,
                /* TODO: track least?
                most: new Set(),
                maxCount: 0,
                least: new Set(),
                minCount: 0,
                */
              } satisfies RSFavourites<K, RS>[keyof RS],
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
      (acc, [roundKey, val]) =>
        Object.assign(acc, {
          [roundKey]: (Object.entries(val) as [keyof RS & string, number | boolean][]).reduce(
            (roundAcc, [key, val]) => {
              let count = 0;
              if (isBoolVal(roundAcc, key)) {
                count = roundAcc[key].count + +(val as boolean);
                roundAcc[key].count = count;
                roundAcc[key].mean = count / numGames;
              } else if (isNumVal(roundAcc, key)) {
                const num = val as number;
                count = Math.max(roundAcc[key].highest, num);
                roundAcc[key].highest = count;
                roundAcc[key].lowest = Math.min(roundAcc[key].lowest, num);
                roundAcc[key].total += num;
                roundAcc[key].mean = roundAcc[key].total / numGames;
                const nzCount = roundAcc[key].nonZero.count + (num !== 0 ? 1 : 0);
                roundAcc[key].nonZero = {
                  count: nzCount,
                  mean: nzCount / numGames,
                };
              }
              const favData = acc[FAVOURITES_KEY][key];
              if (count > 0) {
                if (count === favData.count) {
                  favData.favourites.add(roundKey);
                } else if (count > favData.count) {
                  favData.favourites.clear();
                  favData.favourites.add(roundKey);
                  favData.count = count;
                }
              }
              /*TODO: Track least and fix least being empty if > zero
              if (count > 0) {
                if (count === favData.maxCount) {
                  favData.most.add(roundKey);
                } else if (count > favData.maxCount) {
                  favData.most.clear();
                  favData.most.add(roundKey);
                  favData.maxCount = count;
                }
              }
              if (count <= favData.minCount) {
                favData.least.add(roundKey);
              } else {
                favData.least.delete(roundKey);
              }*/
              return roundAcc;
            },
            prev[roundKey],
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
    /* TODO: track least?
    most: Set<K>;
    maxCount: number;
    least: Set<K>;
    minCount: number;
    */
  };
};
type RoundStatSummaryValues<K extends string, RS extends TurnStats> = {
  [key in K]: RSSummaryVal<RS>;
} & {
  [FAVOURITES_KEY]: RSFavourites<K, RS>;
};
type RSSummaryVal<RS extends TurnStats> = {
  [SK in keyof RS & string]: RS[SK] extends boolean ? BoolRSVal : NumRSVal;
};

const isBoolVal = <RS extends TurnStats, K extends keyof RS & string>(
  vals: { [k in K]: BoolRSVal | NumRSVal },
  key: K,
): vals is { [k in K]: BoolRSVal } => Object.hasOwn(vals[key], "count");
const isNumVal = <RS extends TurnStats, K extends keyof RS & string>(
  vals: { [k in K]: BoolRSVal | NumRSVal },
  key: K,
): vals is { [k in K]: NumRSVal } => !Object.hasOwn(vals[key], "count");
