import type { MoveFocus } from "@/utils";
import type { Round } from "./roundDef";

type RoundsBaseType<Key extends string | number = string | number> = {
  [K in Key]: Round<any, any, any, K>;
};

export type PlayerGameData<Rounds extends RoundsBaseType> = {
  readonly takenTurns: Map<keyof Rounds, any>;
  readonly untakenTurns: Set<keyof Rounds>;
};

export const playerGameData = <Rounds extends RoundsBaseType>(playerId: string) => {
  type RoundKey = keyof Rounds;
  const takenTurns = new Map<RoundKey, any>();
  const untakenTurns = new Set<RoundKey>();
  return Object.defineProperties(
    {},
    {
      takenTurns: {
        value: takenTurns,
        enumerable: true,
        writable: false,
        configurable: false,
      },
      untakenTurns: {
        value: untakenTurns,
        enumerable: true,
        writable: false,
        configurable: false,
      },
    },
  ) as PlayerGameData<Rounds>;
};

export interface TurnDisplayInputs<Value, TurnStats extends {}, RoundKey extends string | number> {
  /** The player taking the turn */
  readonly playerId: string;
  /** The round this turn is part of */
  readonly roundId: RoundKey;
  /** The value to be saved for this turn, used for calculating score and stats */
  readonly value: Value;
  /** The player's score before taking this turn. Equal to {@link endScore} - {@link deltaScore} */
  readonly startScore: number;
  /** The amount the player's score changes by during this turn. Equal to {@link endScore} - {@link startScore} */
  readonly deltaScore: number;
  /** The player's score after taking this turn. Equal to {@link startScore} + {@link deltaScore} */
  readonly endScore: number;
  /** The player's stats for this turn. Stats will be independant of any other players in the game */
  readonly stats: TurnStats;
}
export interface TurnDisplayEvents<Value, TurnStats extends {}, RoundKey extends string | number> {
  /** Use to set the value for this player's turn */
  /*readonly*/ setValue: (value: Value) => void;
  /** Use to change the focus to the previous/next turn or the first empty/untaken turn in this game */
  /*readonly*/ focus: ((focus: keyof MoveFocus) => void) & MoveFocus;
  /** Use to tell the game instance that this player has completed the game, and will take no further turns */
  /*readonly*/ finishedGame: () => void;
}
type ImmutableTurnDisplayEvents<Value, TurnStats extends {}, RoundKey extends string | number> = {
  [K in keyof TurnDisplayEvents<Value, TurnStats, RoundKey>]: undefined;
};

type MutableExtra<Value, TurnStats extends {}, RoundKey extends string | number> = {
  editable: true;
} & TurnDisplayEvents<Value, TurnStats, RoundKey>;
type ImmutableExtra<Value, TurnStats extends {}, RoundKey extends string | number> = {
  editable: false;
} & ImmutableTurnDisplayEvents<Value, TurnStats, RoundKey>;

type ImmutableTurnDisplay<Value, TurnStats extends {}, RoundKey extends string | number> = {
  (
    inputs: TurnDisplayInputs<Value, TurnStats, RoundKey>,
    events: ImmutableTurnDisplayEvents<Value, TurnStats, RoundKey>,
  ): void;
};

type MutableTurnDisplay<Value, TurnStats extends {}, RoundKey extends string | number> = (
  inputs: TurnDisplayInputs<Value, TurnStats, RoundKey>,
  events: TurnDisplayEvents<Value, TurnStats, RoundKey>,
) => void;

export type TurnDisplay<Value, TurnStats extends {}, RoundKey extends string | number> = (
  inputs: TurnDisplayInputs<Value, TurnStats, RoundKey>,
  data: MutableExtra<Value, TurnStats, RoundKey> | ImmutableExtra<Value, TurnStats, RoundKey>,
) => void;

const test: TurnDisplay<number, {}, 1> = ({ value }, { focus }) => {
  console.log(value);
  if (focus) {
    focus("empty");
    focus.empty();
  }
};
