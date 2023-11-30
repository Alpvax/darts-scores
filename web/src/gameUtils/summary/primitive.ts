import type { PlayerDataNoStats, SummaryEntryField } from ".";
import type { TurnData } from "../roundDeclaration";

export class BoolSummaryField<T extends TurnData<any, any>>
  implements SummaryEntryField<T, boolean, BooleanSummaryValues>
{
  constructor(readonly calculate: (data: PlayerDataNoStats<T>) => boolean) {}
  entry(playerData: PlayerDataNoStats<T>) {
    return this.calculate(playerData);
  }
  summary({ count }: BooleanSummaryValues, numGames: number, flag: boolean): BooleanSummaryValues {
    return {
      count: count + +flag,
      mean: count / numGames,
    };
  }
}
type BooleanSummaryValues = {
  /** The total number of times that the stat has been true */
  count: number;
  /** The mean number of times that the stat has been true */
  mean: number;
};

export class NumericSummaryField<T extends TurnData<any, any>>
  implements SummaryEntryField<T, number, NumericSummaryValues>
{
  constructor(readonly calculate: (data: PlayerDataNoStats<T>) => number) {}
  entry(playerData: PlayerDataNoStats<T>) {
    return this.calculate(playerData);
  }
  summary(
    { highest, lowest, total }: NumericSummaryValues,
    numGames: number,
    val: number,
  ): NumericSummaryValues {
    const tot = total + val;
    return {
      highest: Math.max(highest, val),
      lowest: Math.min(lowest, val),
      total: tot,
      mean: total / numGames,
    };
  }
}
type NumericSummaryValues = {
  /** The highest value the stat reached in a single game */
  highest: number;
  /** The lowest value the stat reached in a single game */
  lowest: number;
  /** Sum of all the values the stat reached */
  total: number;
  /** The mean number of times that the stat has been true */
  mean: number;
};
