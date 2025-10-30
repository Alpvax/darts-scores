import type { TurnDisplay, TurnDisplayEvents, TurnDisplayInputs } from "@/gameV2/gameData";
import type { MoveFocus } from "@/utils";
import { defineComponent, h, type PropType, type SetupContext, ref } from "vue";

// type TurnComponent<Value, TurnStats extends {}, RoundKey extends string | number> = FunctionalComponent<TurnDisplayInputs<Value, TurnStats, RoundKey>, TurnDisplayEvents<Value, TurnStats, RoundKey>>

const makeTurnComponent = <Value, TurnStats extends {}, RoundKey extends string | number>(
  displayFunc: TurnDisplay<Value, TurnStats, RoundKey>,
  deltaScoreCalc: (value: Value) => number,
  statsCalc: (value: Value) => TurnStats,
) => {
  const propsDef = {
    /** The player taking the turn */
    playerId: { type: String, required: true },
    /** The round this turn is part of */
    roundId: { type: Object as PropType<RoundKey>, required: true },
    /** The value to be saved for this turn, used for calculating score and stats */
    value: { type: Object as PropType<Value>, required: true },
    /** The player's score before taking this turn. Equal to {@link endScore} - {@link deltaScore} */
    startScore: { type: Number, required: true },
    /** The amount the player's score changes by during this turn. Equal to {@link endScore} - {@link startScore} */
    deltaScore: { type: Number, required: true },
    /** The player's score after taking this turn. Equal to {@link startScore} + {@link deltaScore} */
    endScore: { type: Number, required: true },
    /** The player's stats for this turn. Stats will be independant of any other players in the game */
    stats: { type: Object as PropType<TurnStats>, required: true },
  };
  function ImmutableTurnComponent(props: TurnDisplayInputs<Value, TurnStats, RoundKey>) {
    return () =>
      displayFunc(
        {
          ...props,
        },
        {
          editable: false,
          setValue: undefined,
          focus: undefined,
          finishedGame: undefined,
        },
      );
  }
  ImmutableTurnComponent.props = propsDef;

  function MutableTurnComponent(
    props: TurnDisplayInputs<Value, TurnStats, RoundKey>,
    { emit }: SetupContext<TurnDisplayEvents<Value, TurnStats, RoundKey>>,
  ) {
    return () =>
      displayFunc(
        {
          ...props,
        },
        {
          editable: true,
          setValue: (val) => emit("setValue", val),
          focus: Object.assign((focus: keyof MoveFocus) => emit("focus", focus), {
            next: () => emit("focus", "next"),
            prev: () => emit("focus", "prev"),
            empty: () => emit("focus", "empty"),
          }),
          finishedGame: () => emit("finishedGame"),
        },
      );
  }
  MutableTurnComponent.props = propsDef;
  MutableTurnComponent.emits = {
    /** Use to set the value for this player's turn */
    setValue: (value: Value) => true,
    /** Use to change the focus to the previous/next turn or the first empty/untaken turn in this game */
    focus: (focus: keyof MoveFocus) => true,
    /** Use to tell the game instance that this player has completed the game, and will take no further turns */
    finishedGame: () => true,
  };
  return { immutable: ImmutableTurnComponent, mutable: MutableTurnComponent };
};

export const GameComponent = defineComponent(
  (props, { emit }) => {
    const editable = ref(true);
    const roundComponents = ref<ReturnType<typeof makeTurnComponent>[]>([]);

    const focusFirst = {}; //TODO
    const currentFocus = ref<{ pid: string; roundIndex: number }>(/*??*/);

    return () => h("TODO: Game component here");
  },
  {
    props: {
      players: { type: Array as PropType<string[]>, required: true },
      editable: { type: Boolean, default: false },
    },
    emits: {},
  },
);
