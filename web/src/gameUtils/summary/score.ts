import type { VNodeChild } from "vue";
import type {
  EntryDisplayMetadataSingle,
  PlayerDataForStats,
  ScoreDirection,
  SummaryDisplayMetadata,
  SummaryEntryFieldWithGameEntryDisplay,
} from ".";
import type { TurnData } from "../roundDeclaration";
import type { HighlightRules } from "./displayMetaV2";

export class ScoreSummaryField<T extends TurnData<any, any, any>>
  implements
    SummaryEntryFieldWithGameEntryDisplay<
      T,
      ScoreEntry,
      ScoreSummaryValues,
      EntryDisplayMetadataSingle<ScoreEntry>
    >
{
  readonly minScore: number;
  readonly maxScore: number;
  display: SummaryDisplayMetadata<ScoreSummaryValues>;
  entryFieldDisplay: EntryDisplayMetadataSingle<ScoreEntry>;
  constructor(
    readonly scoreDirection: ScoreDirection,
    options?: { minScore?: number; maxScore?: number; scoreEntryDisplay?: ScoreEntryDisplay },
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
      display: options?.scoreEntryDisplay ?? (({ final }) => final),
      combineTeamValues: ({ final: a }, { final: b }) => ({
        final: a + b,
        currentScore: 0,
        latestRound: 0,
      }),
      combinedDisplay: ({ final }, count, numFmt) => `Average = ${numFmt.format(final / count)}`,
      ignoreHighlight: ({ final }) => {
        switch (scoreDirection) {
          case "highest":
            return final <= this.minScore;
          case "lowest":
            return final >= this.maxScore;
          case "none":
            return false;
        }
      },
    };
  }
  entry({ score, turns }: PlayerDataForStats<T>) {
    const [latestRound, currentScore] = [...turns].reduce(
      ([lIdx, lScore], [idx, turn]) => (idx > lIdx ? [idx, turn.score] : [lIdx, lScore]),
      [-1, this.minScore],
    );
    return {
      final: score,
      latestRound,
      currentScore,
    };
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
    { final: val }: ScoreEntry,
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
export type ScoreEntryDisplay = (entry: ScoreEntry) => VNodeChild;
type ScoreEntry = {
  /** The real or predicted final game score */
  final: number;
  /** The score after the last taken round */
  currentScore: number;
  /** The index of the last taken round */
  latestRound: number;
};
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
