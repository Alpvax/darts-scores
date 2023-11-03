import type { ClassBindings, MoveFocus } from "@/utils";
import type { PlayerData, PlayerDataComplete } from "./PlayerData";
import {
  isKeyedRound,
  normaliseRecordRounds,
  type KeyedRound,
  type Round,
  type RoundShape,
  type RoundShapes,
  type RoundsList,
  normaliseTupleRounds,
  type RoundsValues,
  type RoundsValuesMap,
  type AnyPlayerTurnData,
  type AnyRoundValue,
  type RoundKey,
} from "./Rounds";
import { computed, defineComponent, onMounted, ref, type PropType } from "vue";
import { usePlayerStore } from "@/stores/player";

export type GameMetadata<R extends RoundShapes, S extends Record<string, any>> = {
  startScore: (playerId: string) => number;
  playerNameClass?: (data: PlayerData<R, S>) => ClassBindings;
  /**
   * Which direction to sort the positions
   * `"lowestFirst"` means the player(s) with the lowest score are in first place.
   * `"highestFirst"` means the player(s) with the highest score are in first place.
   */
  positionOrder: "lowestFirst" | "highestFirst";
  gameStats?: (data: Omit<PlayerData<R, S>, "gameStats">) => S;
  rounds: RoundsList<R>;
};

const makeTurnKey = <R extends RoundShapes>(playerId: string, round: RoundKey<R>): string =>
  `${playerId}:${round}`;

export function createComponents<
  R extends Record<string, RoundShape> | readonly [...RoundShape[]],
  S extends Record<string, any>,
>(gameMeta: GameMetadata<R, S>) {
  const rounds = isKeyedRound(gameMeta.rounds[0])
    ? normaliseRecordRounds(gameMeta.rounds as KeyedRound<any, any, any>[])
    : normaliseTupleRounds(gameMeta.rounds as Round<any, any>[]);

  return {
    completed: defineComponent({
      props: {
        players: { type: Array as PropType<string[]>, required: true },
        // rounds: { type: Array as PropType<R[]>, required: true },
        modelValue: {
          type: Object as PropType<Map<string, RoundsValues<R>>>,
          default: () => new Map(),
        },
        displayPositions: {
          type: String as PropType<"head" | "body" | "foot" | "none">,
          default: "head",
        },
      },
      setup: (props, { slots }) => {
        const moveFocus: MoveFocus = {
          empty: () => {},
          next: () => {},
          prev: () => {},
        };
      },
    }),
    inProgress: defineComponent({
      props: {
        players: { type: Array as PropType<string[]>, required: true },
        // rounds: { type: Array as PropType<R[]>, required: true },
        modelValue: {
          type: Object as PropType<Map<string, RoundsValuesMap<R>>>,
          default: () => new Map(),
        },
        displayPositions: {
          type: String as PropType<"head" | "body" | "foot" | "none">,
          default: "head",
        },
      },
      emits: {
        /* eslint-disable @typescript-eslint/no-unused-vars */
        playerCompleted: (playerId: string, completed: boolean) => true,
        completed: (completed: boolean) => true,
        turnTaken: (turnData: AnyPlayerTurnData<R>) => true,
        /** Emitted only when the entire game is complete, then each time the result changes */
        ["update:gameResult"]: (result: Map<string, PlayerDataComplete<R, S>>) => true,
        ["update:positions"]: (
          ordered: {
            pos: number;
            posOrdinal: string;
            players: string[];
          }[],
        ) => true,
        ["update:playerScores"]: (result: PlayerData<R, S>[]) => true,
        ["update:modelValue"]: (values: Map<string, RoundsValuesMap<R>>) => true,
        /* eslint-enable @typescript-eslint/no-unused-vars */
      },
      setup: (props, { slots, emit }) => {
        const playerStore = usePlayerStore();
        const turnData = ref(new Map<string, AnyRoundValue<R>>());

        const playerTurns = computed(
          () =>
            new Map(
              props.players.map((pid) => [
                pid,
                new Map(
                  Object.entries(rounds.roundsLookup).flatMap(([k, round]) => {
                    const turnKey = makeTurnKey(pid, k);
                    return turnData.value.has(turnKey)
                      ? [[round, turnData.value.get(turnKey)!]]
                      : [];
                  }),
                ),
              ]),
            ),
        );
        const allCompleted = computed(() =>
          props.players.every((pid) => playerTurns.value.get(pid)!.size === rounds.ordered.length),
        );

        const { focusEmpty, create: makeMoveFocus } = rounds.makeMoveFocusFactory(
          computed(() => props.players.length),
          allCompleted,
        );
        onMounted(() => focusEmpty());

        return () => <>TODO</>;
      },
    }),
  };
}
