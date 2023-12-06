import type { PlayerDataForStats, SummaryEntryField } from ".";
import type { TurnData, TurnStats } from "../roundDeclaration";

export class RoundStatsSummaryField<T extends TurnData<any, RS, any>, RS extends TurnStats>
  implements SummaryEntryField<T, Map<number, RS>, RoundStatSummaryValues<RS>>
{
  constructor(private readonly statDefaults: RS) {}
  entry(playerData: PlayerDataForStats<T>) {
    return new Map(
      [...playerData.turns].map(([i, t]) =>
        t.stats !== undefined ? [i, t.stats] : [i, { ...this.statDefaults }],
      ),
    );
  }
  emptySummary(): RoundStatSummaryValues<RS> {
    return (Object.entries(this.statDefaults) as [keyof RS, number | boolean][]).reduce(
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
      {} as RoundStatSummaryValues<RS>,
    );
  }
  summary(
    prev: RoundStatSummaryValues<RS>,
    numGames: number,
    entry: Map<number, RS>,
  ): RoundStatSummaryValues<RS> {
    return (Object.entries(entry) as [keyof RS & string, number | boolean][]).reduce(
      (acc, [key, val]) => {
        if (isBoolVal(acc, key)) {
          acc[key].count = acc[key].count + +(val as boolean);
          acc[key].mean = acc[key].count / numGames;
        } else if (isNumVal(acc, key)) {
          const num = val as number;
          acc[key].highest = Math.max(acc[key].highest, num);
          acc[key].lowest = Math.min(acc[key].lowest, num);
          acc[key].total += num;
          acc[key].mean = acc[key].total / numGames;
          const count = acc[key].nonZero.count + (num !== 0 ? 1 : 0);
          acc[key].nonZero = {
            count,
            mean: count / numGames,
          };
        }
        return acc;
      },
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
type RoundStatSummaryValues<RS extends TurnStats> = {
  [K in keyof RS & string]: RS[K] extends boolean ? BoolRSVal : NumRSVal;
};

const isBoolVal = <RS extends TurnStats, K extends keyof RS & string>(
  vals: { [k in K]: BoolRSVal | NumRSVal },
  key: K,
): vals is { [k in K]: BoolRSVal } => Object.hasOwn(vals[key], "count");
const isNumVal = <RS extends TurnStats, K extends keyof RS & string>(
  vals: { [k in K]: BoolRSVal | NumRSVal },
  key: K,
): vals is { [k in K]: NumRSVal } => !Object.hasOwn(vals[key], "count");
