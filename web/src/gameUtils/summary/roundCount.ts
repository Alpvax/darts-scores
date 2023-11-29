import type { PlayerDataNoStats, SummaryEntryFactory } from ".";
import type { TurnData, IntoTaken } from "../roundDeclaration";

type RoundIndexPredicateResult =
  | {
      found: true;
      index: number;
    }
  | {
      found: false;
      index: undefined;
    };
export class RoundCount<T extends TurnData<any, any>>
  implements SummaryEntryFactory<T, { index: number; allGame: boolean }, RoundCountSummaryValues>
{
  private readonly findIndex: (data: (T | IntoTaken<T>)[]) => RoundIndexPredicateResult;
  private readonly predicate: (data: T | IntoTaken<T>) => boolean;
  private readonly findFirst: boolean;
  private readonly takenOnly: boolean;
  constructor(
    predicate: (data: IntoTaken<T>) => boolean,
    options: {
      /**
       * Find the index of the first round where the predicate returns true.
       * When `false` (default) finds the index of the first round where the predicate returns false.
       */
      findFirst?: boolean;
      /**
       * Only count the taken rounds. default = `false`
       * If there are gaps in the taken rounds, this may not result in a reasonable value;
       */
      ignoreUntakenRounds: true;
    },
  );
  constructor(
    predicate: (data: T) => boolean,
    options?: {
      /**
       * Find the index of the first round where the predicate returns true.
       * When `false` (default) finds the index of the first round where the predicate returns false.
       */
      findFirst?: boolean;
      /**
       * Only count the taken rounds. default = `false`
       * If there are gaps in the taken rounds, this may not result in a reasonable value;
       */
      ignoreUntakenRounds?: false;
    },
  );
  constructor(
    predicate: ((data: T) => boolean) | ((data: IntoTaken<T>) => boolean),
    options?: {
      /**
       * Find the index of the first round where the predicate returns true.
       * When `false` (default) finds the index of the first round where the predicate returns false.
       */
      findFirst?: boolean;
      /**
       * Only count the taken rounds. default = `false`
       * If there are gaps in the taken rounds, this may not result in a reasonable value;
       */
      ignoreUntakenRounds?: boolean;
    },
  ) {
    this.predicate = predicate as (data: T | IntoTaken<T>) => boolean;
    this.findFirst = options?.findFirst ?? false;
    this.takenOnly = options?.ignoreUntakenRounds ?? false;

    this.findIndex = options?.findFirst
      ? (data) => {
          const idx = data.findIndex(this.predicate);
          // Return first index where predicate passed
          return idx < 0 ? { found: false } : { found: true, index: idx };
        }
      : (data) => {
          const idx = data.findIndex((val) => !this.predicate(val));
          // Return first index where predicate failed
          return idx < 0 ? { found: false } : { found: true, index: idx };
        };
  }

  public entry({ turns, allTurns }: PlayerDataNoStats<T>) {
    const result = this.findIndex(this.takenOnly ? [...turns.values()] : [...allTurns.values()]);
    return {
      index: result.index ?? allTurns.size,
      allGame: !result.found,
    };
  }

  public summary(
    { earliest, latest, count }: RoundCountSummaryValues,
    numGames: number,
    { index, allGame }: { index: number; allGame: boolean },
  ): RoundCountSummaryValues {
    const total = count + +allGame;
    return {
      earliest: Math.min(earliest, index),
      latest: Math.max(latest, index),
      count: total,
      mean: total / numGames,
    };
  }
}

type RoundCountSummaryValues = {
  /** The lowest round index the count stopped at */
  earliest: number;
  /** The highest round index the count stopped at */
  latest: number;
  // Total distance required for calculation:
  // /** The mean round index the count stopped at */
  // meanDistance: number;
  /** The total number of times that the count has reached the final round */
  count: number;
  /** The mean number of times that the count has reached the final round */
  mean: number;
};
