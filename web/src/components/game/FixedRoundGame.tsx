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
import { computed, defineComponent, onMounted, ref, type PropType, type Ref } from "vue";
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

type DisplayPosRowPositions = "head" | "body" | "foot" | "none";
type PlayerPositionsLookup = Map<
  string,
  {
    pos: number;
    posOrdinal: string;
    players: string[];
  }
>;

export function createComponents<
  R extends Record<string, RoundShape> | readonly [...RoundShape[]],
  S extends Record<string, any>,
>(gameMeta: GameMetadata<R, S>) {
  const rounds = isKeyedRound(gameMeta.rounds[0])
    ? normaliseRecordRounds(gameMeta.rounds as KeyedRound<any, any, any>[])
    : normaliseTupleRounds(gameMeta.rounds as Round<any, any>[]);

  const makePosRow =
    (
      displayPositions: Ref<DisplayPosRowPositions>,
      players: Ref<string[]>,
      playerLookup: Ref<PlayerPositionsLookup>,
      smallClass: boolean,
    ) =>
    (displayWhen: DisplayPosRowPositions) =>
      // Only display when requested, and only if everyone isn't tied
      displayPositions.value === displayWhen ? (
        <tr class={{ positionRow: true, small: smallClass }}>
          <td class="rowLabel">Position</td>
          {players.value.map((pid) => {
            const { pos, posOrdinal } = playerLookup.value.get(pid)!;
            return (
              <td>
                {pos}
                <sup>{posOrdinal}</sup>
              </td>
            );
          })}
        </tr>
      ) : undefined;
  const makePosCalc = (scores: Ref<Map<string, number>>) =>
    computed(() => {
      const orderedScores = [...scores.value.values()];
      orderedScores.sort((a, b) => {
        switch (gameMeta.positionOrder) {
          case "lowestFirst":
            return a - b;
          case "highestFirst":
            return b - a;
        }
      });
      const scorePlayerLookup = [...scores.value.entries()].reduce((acc, [pid, score]) => {
        if (acc.has(score)) {
          acc.get(score)!.push(pid);
        } else {
          acc.set(score, [pid]);
        }
        return acc;
      }, new Map<number, string[]>());

      const { ordered, playerLookup } = orderedScores.reduce(
        ({ scores, ordered, playerLookup }, score, idx) => {
          const pos = idx + 1;
          // Assumes < 21 players in a game
          const posOrdinal = pos === 1 ? "st" : pos === 2 ? "nd" : pos === 3 ? "rd" : "th";
          if (!scores.has(score)) {
            scores.add(score);
            const players = scorePlayerLookup.get(score)!;
            ordered.push({ pos, posOrdinal, players });
            for (const p of players) {
              playerLookup.set(p, { pos, posOrdinal, players });
            }
          }
          return { scores, ordered, playerLookup };
        },
        {
          scores: new Set<number>(),
          ordered: [] as { pos: number; posOrdinal: string; players: string[] }[],
          playerLookup: new Map<string, { pos: number; posOrdinal: string; players: string[] }>(),
        },
      );

      return { ordered, playerLookup };
    });
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
    mutable: defineComponent({
      props: {
        players: { type: Array as PropType<string[]>, required: true },
        // rounds: { type: Array as PropType<R[]>, required: true },
        modelValue: {
          type: Object as PropType<Map<string, RoundsValuesMap<R>>>,
          default: () => new Map(),
        },
        displayPositions: {
          type: String as PropType<DisplayPosRowPositions>,
          default: "head",
        },
      },
      emits: {
        /* eslint-disable @typescript-eslint/no-unused-vars */
        // playerCompleted: (playerId: string, completed: boolean) => true,
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

        const playerScores = computed(
          () =>
            new Map(
              props.players.map((pid) => {
                const turns = playerTurns.value.get(pid);
                return [
                  pid,
                  rounds.ordered.reduce(
                    ({ score, scores, deltaScores, lastPlayedRound }, r, i) => {
                      const round = (isKeyedRound(r) ? r.key : r.index) as RoundKey<R>;
                      const delta = r.deltaScore(turns?.get(round), pid, i);
                      score += delta;
                      scores.push(score);
                      deltaScores.push(delta);
                      lastPlayedRound = i;
                      return { score, scores, deltaScores, lastPlayedRound };
                    },
                    {
                      score: gameMeta.startScore(pid),
                      scores: [] as number[],
                      deltaScores: [] as number[],
                      lastPlayedRound: -1,
                    },
                  ),
                ];
              }),
            ),
        );

        return () => <>TODO</>;
      },
    }),
  };
}
