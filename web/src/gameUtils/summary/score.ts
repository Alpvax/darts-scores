import type {
  EntryDisplayMetadata,
  PlayerDataForStats,
  ScoreDirection,
  SummaryDisplayMetadata,
  SummaryEntryField,
} from ".";
import type { TurnData } from "../roundDeclaration";
import type { HighlightRules } from "./displayMetaV2";

export class ScoreSummaryField<T extends TurnData<any, any, any>>
  implements SummaryEntryField<T, number, ScoreSummaryValues>
{
  readonly minScore: number;
  readonly maxScore: number;
  display: SummaryDisplayMetadata<ScoreSummaryValues>;
  entryFieldDisplay: EntryDisplayMetadata<number>;
  constructor(
    readonly scoreDirection: ScoreDirection,
    options?: { minScore?: number; maxScore?: number },
  ) {
    this.minScore = options?.minScore ?? Number.MIN_SAFE_INTEGER;
    this.maxScore = options?.maxScore ?? Number.MAX_SAFE_INTEGER;
    this.display = {
      best: {
        best: scoreDirection,
        label: "Personal Best",
        highlight: "best" as HighlightRules,
      },
      worst: {
        best: scoreDirection,
        label: "Personal Worst",
        highlight: "best" as HighlightRules,
      },
      mean: {
        best: scoreDirection,
        label: "Average score",
        highlight: "best" as HighlightRules,
      },
    };
    this.entryFieldDisplay = {
      label: "Score",
      combineTeamValues: (a, b) => a + b,
      combinedDisplay: (total, count, numFmt) => `Average = ${numFmt.format(total / count)}`,
      ignoreHighlight: (val) => {
        switch (scoreDirection) {
          case "highest":
            return val <= this.minScore;
          case "lowest":
            return val >= this.maxScore;
          case "none":
            return false;
        }
      },
    };
  }
  entry({ score }: PlayerDataForStats<T>) {
    return score;
  }
  emptySummary(): ScoreSummaryValues {
    const [best, worst] =
      this.scoreDirection === "highest"
        ? [this.minScore, this.maxScore]
        : [this.maxScore, this.minScore];
    return {
      best,
      worst,
      total: 0,
      mean: 0,
    };
  }
  summary(
    { best, worst, total }: ScoreSummaryValues,
    numGames: number,
    val: number,
  ): ScoreSummaryValues {
    const tot = total + val;
    const [b, w] = this.scoreDirection === "highest" ? [Math.max, Math.min] : [Math.min, Math.max];
    return {
      best: b(best, val),
      worst: w(worst, val),
      total: tot,
      mean: tot / numGames,
    };
  }
}
type ScoreSummaryValues = {
  /** The best score in a single game */
  best: number;
  /** The worst score in a single game */
  worst: number;
  /** Sum of all the values the stat reached */
  total: number;
  /** The mean number of times that the stat has been true */
  mean: number;
};
