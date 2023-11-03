import type { RoundShapes, RoundsStats, RoundsValues } from "./Rounds";

export type PlayerDataPartial<R extends RoundShapes, S extends Record<string, any>> = {
  playerId: string;
  /** Whether the player has completed all rounds */
  complete: false;
  /** The final score if finished, or the current score if in progress */
  score: number;
  /** The scores after each round, only including played rounds */
  scores: number[];
  /** The scores differences for each round, only including played rounds */
  deltaScores: number[];
  /** A map of the completed rounds, with non completed rounds missing from the map */
  rounds: Map<keyof R, RoundsValues<R>>;
  /** A map of round to stats, with non completed rounds missing from the map */
  roundStats: Map<keyof R, RoundsStats<R>>;
  /** The player's current position */
  position: number;
  /** A list of playerIds that the player is tied with, empty list for no players tied with this player */
  tied: string[];
  /** Combined stats for the entire game */
  gameStats: S;
};
export type PlayerDataComplete<R extends RoundShapes, S extends Record<string, any>> = Omit<
  PlayerDataPartial<R, S>,
  "complete"
> & {
  complete: true;
  roundsComplete: RoundsValues<R>;
};
export type PlayerData<R extends RoundShapes, S extends Record<string, any>> =
  | PlayerDataPartial<R, S>
  | PlayerDataComplete<R, S>;
