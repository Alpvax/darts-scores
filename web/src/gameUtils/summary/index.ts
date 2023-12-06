import type { IntoTaken, TurnData } from "../roundDeclaration";
import { BoolSummaryField, NumericSummaryField } from "./primitive";
import { countUntil, countWhile } from "./roundCount";
import { RoundStatsSummaryField } from "./roundStats";
import { WinSummaryField, type PlayerRequirements } from "./wins";

// Re-exports for convenience
export { type PlayerRequirements } from "./wins";

//TODO: use PlayerData instead of inline type declaration
export type PlayerDataForStats<T extends TurnData<any, any, any>> = {
  playerId: string;
  /** Whether the player has completed all rounds */
  complete: boolean;
  /** The final score if finished, or the current score if in progress */
  score: number;
  /**
   * A Map of the completed rounds, with non completed rounds missing from the map. <br/>
   * Key is round index; value is {@link TakenTurnData}, including the value, delta score of the round and score at this round.
   * */
  turns: Map<number, IntoTaken<T>>;
  /**
   * A Map of all the rounds. <br/>
   * Key is round index; value is {@link TurnData}, including the value, delta score of the round and score at this round.
   * */
  allTurns: Map<number, T>;
  /** The player's current position */
  position: number;
  /** A list of playerIds that the player is tied with, empty list for no players tied with this player */
  tied: string[];
};

export type GameResult<T extends TurnData<any, any, any>, P extends string = string> = {
  date: Date;
  results: Map<P, PlayerDataForStats<T>>;
  tiebreakWinner?: P;
};

interface SummaryValueRecord {
  [key: string]: SummaryValueRecord | number;
}
export interface SummaryEntryField<
  T extends TurnData<any, any, any>,
  E,
  S extends SummaryValueRecord,
> {
  /** Create an entry for a single game */
  //TODO: use PlayerData instead of inline type declaration
  entry(playerData: PlayerDataForStats<T>, opponents: string[], tiebreakWinner?: string): E;
  /** Create an empty summary (the initial / zero values, when no games have been played) */
  emptySummary(): S;
  /** Accumulate an entry into the summary */
  summary(accumulated: S, numGames: number, entry: E): S;
}

type SummaryEntryCore<T extends TurnData<any, any, any>, P extends PlayerRequirements> = {
  score: NumericSummaryField<T>;
  wins: WinSummaryField<T, P>;
};
export type SummaryEntryFields<T extends TurnData<any, any, any>> = Record<
  string,
  SummaryEntryField<T, any, any>
>;
export type SummaryEntry<
  T extends TurnData<any, any, any>,
  S extends SummaryEntryFields<T>,
  P extends PlayerRequirements = { all: "*" },
> = SummaryEntryCore<T, P> & S;

export type SummaryValues<
  E extends SummaryEntry<T, S, P>,
  T extends TurnData<any, any, any>,
  S extends SummaryEntryFields<T>,
  P extends PlayerRequirements = { all: "*" },
> = {
  [Key in keyof E]: E[Key] extends SummaryEntryField<T, any, infer S> ? S : never;
} & {
  numGames: number;
};

const calcDeltaVal = <V extends number | SummaryValueRecord>(prev: V, val: V): V => {
  if (typeof val === "number" && typeof prev === "number") {
    return (val - prev) as V;
  } else {
    return Object.keys(val).reduce(
      (acc, k) =>
        Object.assign(acc, {
          [k]: calcDeltaVal((prev as SummaryValueRecord)[k], (val as SummaryValueRecord)[k]),
        }),
      {} as V,
    );
  }
};

export type SummaryAccumulatorFactory<
  S extends SummaryEntry<T, R, P>,
  T extends TurnData<any, any, any>,
  R extends SummaryEntryFields<T>,
  P extends PlayerRequirements = { all: "*" },
> = () => {
  /**
   * @param playerData the data for the curent player
   * @param allPlayers the ids of all the players in the game
   * @param tiebreakWinner the player who won the tiebreak, if applicable
   * @returns The changes to all values between the previous game and this one
   */
  addGame(
    playerData: PlayerDataForStats<T>,
    allPlayers: string[],
    tiebreakWinner?: string,
  ): SummaryValues<S, T, R, P>;
  /**
   * @param playerData the data for the curent player
   * @param allPlayers the ids of all the players in the game
   * @param tiebreakWinner the player who won the tiebreak, if applicable
   * @returns The changes to all values between the previous game and this one. Does not modify the summary
   */
  getDeltas(
    playerData: PlayerDataForStats<T>,
    allPlayers: string[],
    tiebreakWinner?: string,
  ): SummaryValues<S, T, R, P>;
  /** The current summary values. SHOULD NOT BE OVERWRITTEN OR MODIFIED! */
  summary: SummaryValues<S, T, R, P>;
};
export const summaryAccumulatorFactory =
  <
    S extends SummaryEntry<T, R, P>,
    T extends TurnData<any, any, any>,
    R extends SummaryEntryFields<T>,
    P extends PlayerRequirements = { all: "*" },
  >(
    fields: Omit<S, "score">,
  ): SummaryAccumulatorFactory<S, T, R, P> =>
  () => {
    type SVTyp = SummaryValues<S, T, R, P>;
    const fieldEntries = [
      ["score", new NumericSummaryField(({ score }) => score)],
      ...Object.entries(fields),
    ] as [keyof S, SummaryEntryField<T, any, any>][];
    const summary = fieldEntries.reduce(
      (summary, [k, field]) =>
        Object.assign(summary, {
          [k]: field.emptySummary(),
        }),
      { numGames: 0 } as SVTyp,
    );
    const makeGameDeltas = (pData: PlayerDataForStats<T>, players: string[], tbWinner?: string) => {
      return fieldEntries.reduce(
        ({ newSummary, deltas }, [key, field]) => {
          const entry = field.entry(
            pData,
            players.filter((pid) => pid !== pData.playerId),
            tbWinner,
          );
          // Deep clone previous value
          const prev = JSON.parse(JSON.stringify(summary[key]));
          newSummary[key] = field.summary(prev, newSummary.numGames, entry);
          deltas[key] =
            summary.numGames < 1
              ? newSummary[key]
              : Object.entries(newSummary[key]).reduce(
                  (acc, [k, v]) =>
                    Object.assign(acc, {
                      [k]: calcDeltaVal(prev[k], v),
                    }),
                  {} as SVTyp[typeof key],
                );
          return { newSummary, deltas };
        },
        {
          newSummary: { numGames: summary.numGames + 1 } as SVTyp,
          deltas: { numGames: 1 } as SVTyp,
        },
      );
    };
    return {
      addGame: (pData, players, tbWinner) => {
        const { newSummary, deltas } = makeGameDeltas(pData, players, tbWinner);
        for (const [k, v] of Object.entries(newSummary) as [keyof S, SVTyp[keyof S]][]) {
          summary[k] = v;
        }
        return deltas;
        // summary.numGames += 1;
        // return fieldEntries.reduce(
        //   (deltas, [key, field]) => {
        //     const entry = field.entry(
        //       pData,
        //       players.filter((pid) => pid !== pData.playerId),
        //       tbWinner,
        //     );
        //     // Deep clone previous value
        //     const prev = JSON.parse(JSON.stringify(summary[key]));
        //     summary[key] = field.summary(prev, summary.numGames, entry);
        //     deltas[key] = Object.entries(summary[key]).reduce(
        //       (acc, [k, v]) =>
        //         Object.assign(acc, {
        //           [k]: calcDeltaVal(prev[k], v),
        //         }),
        //       {} as SVTyp[typeof key],
        //     );
        //     return deltas;
        //   },
        //   { numGames: 1 } as SVTyp,
        // );
      },
      getDeltas: (pData, players, tbWinner) => makeGameDeltas(pData, players, tbWinner).deltas,
      summary,
    };
  };

type FieldFactoryUtils<T extends TurnData<any, any, any>> = {
  /** Count rounds until the predicate passes, returning the index of the passed round (so 0 would be first round passed) */
  countUntil: typeof countUntil<T>;
  /** Count rounds until the predicate fails, returning the index of the failed round (so 0 would be first round failed) */
  countWhile: typeof countWhile<T>;
  /** Make numeric stat */
  numeric: (calculate: (data: PlayerDataForStats<T>) => number) => NumericSummaryField<T>;
  /** Make boolean stat */
  boolean: (calculate: (data: PlayerDataForStats<T>) => boolean) => BoolSummaryField<T>;
  /** Make round stats accumulator */
  roundStats: (
    defaults: T extends TurnData<any, infer RS, any> ? RS : never,
  ) => RoundStatsSummaryField<T, T extends TurnData<any, infer RS, any> ? RS : never>;
};
export const makeSummaryAccumulatorFactoryFor =
  <T extends TurnData<any, any, any>>(): {
    <
      S extends Record<
        Exclude<string, "wins" | "score" | "numGames">,
        SummaryEntryField<T, any, any>
      >,
    >(
      fieldFactory: (fieldUtils: FieldFactoryUtils<T>) => S,
    ): SummaryAccumulatorFactory<S & SummaryEntryCore<T, { all: "*" }>, T, S, { all: "*" }>;
    <
      S extends Record<
        Exclude<string, "wins" | "score" | "numGames">,
        SummaryEntryField<T, any, any>
      >,
      P extends PlayerRequirements,
    >(
      fieldFactory: (fieldUtils: FieldFactoryUtils<T>) => S,
      winsRequirements: P,
    ): SummaryAccumulatorFactory<S & SummaryEntryCore<T, P>, T, S, P>;
  } =>
  <
    S extends Record<
      Exclude<string, "wins" | "score" | "numGames">,
      SummaryEntryField<T, any, any>
    >,
    P extends PlayerRequirements,
  >(
    fieldFactory: (fieldUtils: FieldFactoryUtils<T>) => S,
    winsRequirements = { all: "*" } as unknown as P,
  ) =>
    makeSummaryAccumulatorFactory<T, S, P>(fieldFactory, winsRequirements);
export function makeSummaryAccumulatorFactory<
  T extends TurnData<any, any, any>,
  S extends Record<Exclude<string, "wins" | "score" | "numGames">, SummaryEntryField<T, any, any>>,
>(
  fieldFactory: (fieldUtils: FieldFactoryUtils<T>) => S,
): SummaryAccumulatorFactory<S & SummaryEntryCore<T, { all: "*" }>, T, S, { all: "*" }>;
export function makeSummaryAccumulatorFactory<
  T extends TurnData<any, any, any>,
  S extends Record<Exclude<string, "wins" | "score" | "numGames">, SummaryEntryField<T, any, any>>,
  P extends PlayerRequirements,
>(
  fieldFactory: (fieldUtils: FieldFactoryUtils<T>) => S,
  winsRequirements: P,
): SummaryAccumulatorFactory<S & SummaryEntryCore<T, P>, T, S, P>;
export function makeSummaryAccumulatorFactory<
  T extends TurnData<any, any, any>,
  S extends Record<Exclude<string, "wins" | "score" | "numGames">, SummaryEntryField<T, any, any>>,
  P extends PlayerRequirements,
>(
  fieldFactory: (fieldUtils: FieldFactoryUtils<T>) => S,
  winsRequirements: P = { all: "*" } as unknown as P,
): SummaryAccumulatorFactory<S & SummaryEntryCore<T, P>, T, S, P> {
  return summaryAccumulatorFactory<S & SummaryEntryCore<T, P>, T, S, P>({
    wins: WinSummaryField.create(winsRequirements),
    ...fieldFactory({
      countUntil: countUntil as typeof countUntil<T>,
      countWhile: countWhile as typeof countWhile<T>,
      numeric: <T extends TurnData<any, any, any>>(
        calculate: (data: PlayerDataForStats<T>) => number,
      ) => new NumericSummaryField<T>(calculate),
      boolean: <T extends TurnData<any, any, any>>(
        calculate: (data: PlayerDataForStats<T>) => boolean,
      ) => new BoolSummaryField<T>(calculate),
      roundStats: <T extends TurnData<any, any, any>>(
        defaults: T extends TurnData<any, infer RS, any> ? RS : never,
      ) => new RoundStatsSummaryField(defaults),
    }),
  } as Omit<SummaryEntry<T, S, P>, "score">);
}
export default makeSummaryAccumulatorFactoryFor;

type FlattenSummaryKeysInternal<S extends SummaryValueRecord, Key = keyof S> = Key extends string
  ? S[Key] extends SummaryValueRecord
    ? `${Key}.${FlattenSummaryKeysInternal<S[Key]>}`
    : `${Key}`
  : never;

export type SummaryFieldKeys<
  S extends SummaryEntry<T, any, P>,
  T extends TurnData<any, any, any>,
  P extends PlayerRequirements = { all: "*" },
> = FlattenSummaryKeysInternal<SummaryValues<S, T, any, P>>;
