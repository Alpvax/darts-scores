import {
  defaultRateFmt,
  type NormalisedDisplayMetaInputs,
  type PlayerDataForStats,
  type SummaryDisplayMetadata,
  type SummaryEntryField,
} from ".";
import type { TurnData } from "../roundDeclaration";

export class BoolSummaryField<T extends TurnData<any, any, any>>
  implements SummaryEntryField<T, boolean, BooleanSummaryValues>
{
  display: SummaryDisplayMetadata<BooleanSummaryValues>;
  constructor(
    readonly calculate: (data: PlayerDataForStats<T>) => boolean,
    displayMeta: NormalisedDisplayMetaInputs<BooleanSummaryValues>,
  ) {
    this.display = {
      count: displayMeta.getMeta("count", {
        label: (l) => `${l}s`,
      }),
      mean: displayMeta.getMeta("mean", {
        label: (l) => `${l} Rate`,
        format: defaultRateFmt,
      }),
    };
  }
  entry(playerData: PlayerDataForStats<T>) {
    return this.calculate(playerData);
  }
  emptySummary(): BooleanSummaryValues {
    return {
      count: 0,
      mean: 0,
    };
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

export class NumericSummaryField<T extends TurnData<any, any, any>>
  implements SummaryEntryField<T, number, NumericSummaryValues>
{
  display: SummaryDisplayMetadata<NumericSummaryValues>;
  constructor(
    readonly calculate: (data: PlayerDataForStats<T>) => number,
    displayMeta: NormalisedDisplayMetaInputs<NumericSummaryValues>,
  ) {
    this.display = {
      highest: displayMeta.getMeta("highest", {
        label: (l) => `Most ${l}s`,
      }),
      lowest: displayMeta.getMeta("lowest", {
        label: (l) => `Least ${l}s`,
      }),
      total: displayMeta.getMeta("total", {
        label: (l) => `${l}s`,
      }),
      mean: displayMeta.getMeta("mean", {
        label: (l) => `${l} Rate`,
        format: defaultRateFmt,
      }),
    };
  }
  entry(playerData: PlayerDataForStats<T>) {
    return this.calculate(playerData);
  }
  emptySummary(): NumericSummaryValues {
    return {
      highest: Number.MIN_SAFE_INTEGER,
      lowest: Number.MAX_SAFE_INTEGER,
      total: 0,
      mean: 0,
    };
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
      mean: tot / numGames,
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
