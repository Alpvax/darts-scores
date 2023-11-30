import type { IntoTaken, TurnData } from "../roundDeclaration";
import type { NumericSummaryField } from "./primitive";
import type { PlayerRequirements, WinSummaryField } from "./wins";

//TODO: use PlayerData instead of inline type declaration
export type PlayerDataForStats<T extends TurnData<any, any>> = {
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
   * A Map of the all rounds, with non completed rounds missing from the map. <br/>
   * Key is round index; value is {@link TurnData}, including the value, delta score of the round and score at this round.
   * */
  allTurns: Map<number, T>;
  /** The player's current position */
  position: number;
  /** A list of playerIds that the player is tied with, empty list for no players tied with this player */
  tied: string[];
};

interface SummaryValueRecord {
  [key: string]: SummaryValueRecord | number;
}
export interface SummaryEntryField<T extends TurnData<any, any>, E, S extends SummaryValueRecord> {
  /** Create an entry for a single game */
  //TODO: use PlayerData instead of inline type declaration
  entry(playerData: PlayerDataForStats<T>, opponents: string[], tiebreakWinner?: string): E;
  /** Create an empty summary (the initial / zero values, when no games have been played) */
  emptySummary(): S;
  /** Accumulate an entry into the summary */
  summary(accumulated: S, numGames: number, entry: E): S;
}

export type SummaryEntry<
  T extends TurnData<any, any>,
  P extends PlayerRequirements = { all: "*" },
> = {
  score: NumericSummaryField<T>;
  wins: WinSummaryField<T, P>;
  [key: string]: SummaryEntryField<T, any, any>;
};

export type SummaryValues<
  E extends SummaryEntry<T, P>,
  T extends TurnData<any, any>,
  P extends PlayerRequirements = { all: "*" },
> = {
  [K in keyof E]: E[K] extends SummaryEntryField<T, any, infer S> ? S : never;
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

export const summaryAccumulatorFactory =
  <
    S extends SummaryEntry<T, P>,
    T extends TurnData<any, any>,
    P extends PlayerRequirements = { all: "*" },
  >(
    fields: S,
  ) =>
  (): {
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
    ): SummaryValues<S, T, P>;
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
    ): SummaryValues<S, T, P>;
    /** The current summary values. SHOULD NOT BE OVERWRITTEN OR MODIFIED! */
    summary: SummaryValues<S, T, P>;
  } => {
    type SVTyp = SummaryValues<S, T, P>;
    const fieldEntries = Object.entries(fields) as [keyof S, SummaryEntryField<T, any, any>][];
    const summary = fieldEntries.reduce(
      (summary, [k, field]) =>
        Object.assign(summary, {
          [k]: field.emptySummary(),
        }),
      { numGames: 0 } as SVTyp,
    );
    return {
      addGame: (pData, players, tbWinner) => {
        summary.numGames += 1;
        return fieldEntries.reduce(
          (deltas, [key, field]) => {
            const entry = field.entry(
              pData,
              players.filter((pid) => pid !== pData.playerId),
              tbWinner,
            );
            // Deep clone previous value
            const prev = JSON.parse(JSON.stringify(summary[key]));
            summary[key] = field.summary(prev, summary.numGames, entry);
            deltas[key] = Object.entries(summary[key]).reduce(
              (acc, [k, v]) =>
                Object.assign(acc, {
                  [k]: calcDeltaVal(prev[k], v),
                }),
              {} as SVTyp[typeof key],
            );
            return deltas;
          },
          { numGames: 1 } as SVTyp,
        );
      },
      getDeltas: (pData, players, tbWinner) => {
        return fieldEntries.reduce(
          (deltas, [key, field]) => {
            const entry = field.entry(
              pData,
              players.filter((pid) => pid !== pData.playerId),
              tbWinner,
            );
            // Deep clone previous value
            const prev = JSON.parse(JSON.stringify(summary[key]));
            const newSummary: SVTyp[typeof key] = field.summary(prev, summary.numGames + 1, entry);
            deltas[key] = Object.entries(newSummary).reduce(
              (acc, [k, v]) =>
                Object.assign(acc, {
                  [k]: calcDeltaVal(prev[k], v),
                }),
              {} as SVTyp[typeof key],
            );
            return deltas;
          },
          { numGames: 1 } as SVTyp,
        );
      },
      summary,
    };
  };

export default summaryAccumulatorFactory;
