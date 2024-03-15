export type RoundDisplayDef<Value, TurnStats extends {}, RoundKey extends string | number> = {
  /** 
   * Used to render an empty turn when the player has already finished but the game is continuing,
   * or a turn for a game in progress (mutable) or for a previously completed game (immutable).
   */
  (type: "empty" | "mutable" | "immutable"): {};
} | ({
  /** Used to render an empty turn when the player has already finished but the game is continuing */
  empty: () => {};
} & ({
  /** Used to render a mutable turn for a game in progress */
  mutable: () => {};
  /** Used to render an immutable turn for a previously completed game */
  immutable: () => {};
} | {
  /** Used to render a turn for a game in progress or a previously completed game */
  nonempty: (type: "mutable" | "immutable") => {};
}));
