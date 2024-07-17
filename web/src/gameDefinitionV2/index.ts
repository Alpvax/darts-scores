import type { NumericRange } from "@/utils/types";
import type { TurnMeta, TurnMetaDef, TurnMetaDefLookup } from "./rounds";

export type GameDefinition<
  PlayerState,
  RoundIdx extends number,
  RoundValues extends { [K in RoundIdx]: any },
  RoundStats extends { [K in RoundIdx]: any },
  RoundValsMut extends { [K in RoundIdx]?: RoundValues[K] },
  GameId extends string = string,
> = {
  gameType: GameId;
  makeInitialState: (playerId: string) => PlayerState;
  rounds: { [K in RoundIdx]: TurnMeta<RoundValues[K], RoundStats[K], RoundValsMut[K]> };
};

type FixedArrayGameDef<
  PlayerState,
  Len extends number,
  V,
  Stats,
  VMut extends V | undefined,
  GameId extends string = string,
> =
  NumericRange<Len> extends infer RoundIdx extends number
    ? GameDefinition<
        PlayerState,
        RoundIdx,
        { [K in RoundIdx]: V },
        { [K in RoundIdx]: Stats },
        { [K in RoundIdx]: VMut },
        GameId
      >
    : never;

type T27GameDefTarget = FixedArrayGameDef<
  { score: number; jesus?: boolean },
  20,
  NumericRange<4>,
  { cliff: boolean; dd: boolean; hits: number },
  NumericRange<4>,
  "twentyseven"
>;

/**
 * Curried function to allow specifying some types while inferring others.
 * Usually the first call (gameId) is inferred, second (playerState, turnValue, turnStats) typed, and third (round count) inferred
 * @param gameType the identifier of the game
 * @returns a function to create the game start state
 */
export const defineFixedArrayGame =
  <GameId extends string = string>(gameType: GameId) =>
  /**
   * @param makeInitialState the factory used to create the initial state for each player
   * @returns a function to create the game rounds
   */
  <PlayerState, V, Stats>(makeInitialState: (playerId: string) => PlayerState) =>
  /**
   * @param length the length of the rounds array
   * @param turnFactory the factory function to create the individual rounds
   * @returns the GameDefinition
   */
  <Len extends number>(
    length: Len,
    turnFactory: (index: NumericRange<Len>) => TurnMetaDef<V, Stats>,
  ) =>
    ({
      gameType,
      makeInitialState,
      rounds: Array.from({ length }, (_, idx) => turnFactory(idx as NumericRange<Len>)),
    }) as TurnMetaDefLookup<ReturnType<typeof turnFactory>> extends TurnMeta<any, any, infer VMut>
      ? FixedArrayGameDef<PlayerState, Len, V, Stats, VMut, GameId>
      : unknown;
/**
 * Version of {@link defineFixedArrayGame} without the currying
 * @param gameType the identifier of the game
 * @param makeInitialState the factory used to create the initial state for each player
 * @param length the length of the rounds array
 * @param turnFactory the factory function to create the individual rounds
 * @returns the `GameDefinition` (as a `FixedArrayGameDef`)
 */
export const defineFixedArrayGameFull = <
  PlayerState,
  Len extends number,
  V,
  Stats,
  GameId extends string = string,
>(
  gameType: GameId,
  makeInitialState: (playerId: string) => PlayerState,
  length: Len,
  turnFactory: (index: NumericRange<Len>) => TurnMetaDef<V, Stats>,
) =>
  // @ts-ignore
  defineFixedArrayGame(gameType)(makeInitialState)(length, turnFactory);

const gameType27 = defineFixedArrayGame("twentyseven")<
  { score: number; jesus?: boolean },
  NumericRange<4>,
  { cliff: boolean; dd: boolean; hits: number }
>(() => ({ score: 27 }))(20, (idx) => ({
  untakenValue: 0, // as NumericRange<4>,
  deltaScore: (val) => {
    switch (val) {
      case 0:
        return idx * -2;
      case 1:
        return idx * 2;
      case 2:
        return idx * 4;
      case 3:
        return idx * 6;
    }
  },
  turnStats: (val) => ({
    cliff: val === 3,
    dd: val >= 2,
    hits: val,
  }),
  component: (val, { deltaScore, score, mutable, focus }) => "TODO: component",/*{
    mutable: (val, { deltaScore, score, mutable, focus }) => "TODO: mutable cell",
    immutable: (val, { deltaScore, score, mutable, focus }) => "TODO: immutable cell",
  }//*/
}));

type T27GameDefReturned = typeof gameType27;
type RetRounds = T27GameDefReturned["rounds"];
type TrgRounds = T27GameDefTarget["rounds"];

type Cmp<A, B> = A extends B
  ? B extends A
    ? true
    : "A = B, B ! A"
  : B extends A
    ? "B = A, A ! B"
    : false;

type T27GameDefCmp = Cmp<T27GameDefTarget, T27GameDefReturned>;
type T27DetailedCmp = {
  [K in keyof T27GameDefTarget]: Cmp<T27GameDefTarget[K], T27GameDefReturned[K]> extends infer C
    ? C extends true
      ? true
      : [C, T27GameDefTarget[K], T27GameDefReturned[K]]
    : never;
};
type T27RoundsCmp = Cmp<TrgRounds, RetRounds>;
