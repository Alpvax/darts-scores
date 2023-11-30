import type { IntoTaken, TurnData } from "../roundDeclaration";
import type { NumericSummaryField } from "./primitive";

//TODO: use PlayerData instead of inline type declaration
export type PlayerDataNoStats<T extends TurnData<any, any>> = {
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

export interface SummaryEntryField<T extends TurnData<any, any>, E, S> {
  //TODO: use PlayerData instead of inline type declaration
  entry(playerData: PlayerDataNoStats<T>): E;
  summary(accumulated: S, numGames: number, entry: E): S;
}

class WinSummaryField<T extends TurnData<any, any>> implements SummaryEntryField<T, {}, {}> {
  entry(playerData: PlayerDataNoStats<T>): {} {
    throw new Error("Method not implemented.");
  }
  summary(accumulated: {}, numGames: number, entry: {}): {} {
    throw new Error("Method not implemented.");
  }
}

export type SummaryEntry<T extends TurnData<any, any>> = {
  score: NumericSummaryField<T>;
  wins: WinSummaryField<T>;
  [key: string]: SummaryEntryField<T, any, any>;
};

export type SummaryValues<E extends SummaryEntry<T>, T extends TurnData<any, any>> = {
  [K in keyof E]: E[K] extends SummaryEntryField<T, any, infer S> ? S : never;
};
