import { formatClasses, type ClassBindings, type MoveFocus } from "@/utils";
import type { PlayerData, PlayerDataComplete, PlayerDataPartial } from "./PlayerData";
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
  type AnyRoundStats,
  roundKey,
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
        turnTaken: (turnData: AnyPlayerTurnData<R> & { round: RoundKey<R> }) => true,
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
        const posRow = makePosRow(
          computed(() => props.displayPositions),
          computed(() => props.players),
          computed(() => playerPositions.value.playerLookup),
          true,
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
                    ({ score, scores, deltaScores, roundStats }, r, i) => {
                      const value = turns?.get(roundKey(r));
                      const delta = r.deltaScore(value, pid, i);
                      score += delta;
                      scores.push(score);
                      deltaScores.push(delta);
                      roundStats.push(
                        r.stats ? r.stats({ playerId: pid, score, deltaScore: delta, value }) : {},
                      );
                      // lastPlayedRound = i;
                      return { score, scores, deltaScores, roundStats };
                    },
                    {
                      score: gameMeta.startScore(pid),
                      scores: [] as number[],
                      deltaScores: [] as number[],
                      roundStats: [] as AnyRoundStats<R>[],
                      // lastPlayedRound: -1,
                    },
                  ),
                ];
              }),
            ),
        );

        const playerPositions = makePosCalc(
          computed(
            () =>
              new Map([...playerScores.value.entries()].map(([pid, { score }]) => [pid, score])),
          ),
        );

        const playerData = computed(
          () =>
            new Map(
              [...playerScores.value.entries()].map(([playerId, score]) => {
                const pos = playerPositions.value.playerLookup.get(playerId)!;
                const partialData: Omit<PlayerDataPartial<R, S>, "gameStats"> = {
                  playerId,
                  complete: false, //TODO: complete?
                  score: score.score,
                  scores: score.scores,
                  deltaScores: score.deltaScores,
                  rounds: new Map(
                    Object.keys(rounds.roundsLookup).flatMap(([k]) => {
                      const turnKey = makeTurnKey(playerId, k);
                      return turnData.value.has(turnKey)
                        ? ([[k, turnData.value.get(turnKey)!]] as [RoundKey<R>, AnyRoundValue<R>][])
                        : [];
                    }),
                  ),
                  roundStats: new Map(
                    score.roundStats.map((s, i) => {
                      const round = rounds.ordered[i];
                      const k = (isKeyedRound(round) ? round.key : i) as keyof R;
                      return [k, s];
                    }),
                  ),
                  position: pos.pos,
                  tied: pos.players.filter((pid) => pid !== playerId),
                };
                return [
                  playerId,
                  { ...partialData, gameStats: gameMeta.gameStats!(partialData) } as PlayerData<
                    R,
                    S
                  >,
                ];
              }),
            ),
        );

        return () => (
          <table>
            <thead>
              <tr>
                {slots.topLeftCell ? slots.topLeftCell() : <th>&nbsp;</th>}
                {props.players.map((pid) => {
                  const classes = formatClasses(
                    gameMeta.playerNameClass !== undefined
                      ? () => gameMeta.playerNameClass!(playerData.value.get(pid)!)
                      : undefined,
                    "playerName",
                  );
                  return <th class={classes}>{playerStore.playerName(pid).value}</th>;
                })}
              </tr>
              {posRow("head")}
            </thead>
            <tbody>
              {posRow("body")}
              {rounds.ordered.map((r, idx) => {
                const rKey: RoundKey<R> = roundKey(r);
                const playerRowData = props.players.map((pid) => {
                  const pData = playerData.value.get(pid)!;
                  return {
                    playerId: pid,
                    score: pData.scores[idx],
                    deltaScore: pData.deltaScores[idx],
                    value: pData.rounds.get(rKey) as AnyRoundValue<R>,
                    stats: pData.roundStats.get(rKey) as AnyRoundStats<R>,
                  };
                });
                const rowClass: ClassBindings | undefined = r.rowClass
                  ? r.rowClass(playerRowData)
                  : undefined;
                return (
                  <tr class={rowClass}>
                    <td class="rowLabel">{r.label}</td>
                    {playerRowData.map((pData, pIdx) => {
                      const cellClass = formatClasses(
                        r.cellClass !== undefined ? () => r.cellClass!(pData) : undefined,
                        "turnInput",
                        { unplayed: pData.value === undefined },
                      );
                      return (
                        <td class={cellClass} data-round-index={idx}>
                          {r.display({
                            score: pData.score,
                            deltaScore: pData.deltaScore,
                            value: computed({
                              get: () => pData.value,
                              set: (val) => {
                                turnData.value.set(
                                  makeTurnKey(pData.playerId, rKey),
                                  val as AnyRoundValue<R>,
                                );
                                emit("turnTaken", {
                                  playerId: pData.playerId,
                                  round: rKey,
                                  score: pData.score,
                                  deltaScore: pData.deltaScore,
                                  value: val,
                                  stats: pData.stats,
                                } as unknown as AnyPlayerTurnData<R> & { round: RoundKey<R> });
                                focusEmpty();
                              },
                            }),
                            editable: true,
                            focus: makeMoveFocus(pIdx, idx),
                          })}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
            {props.displayPositions === "foot" || slots.footer ? (
              <tfoot>{[posRow("foot"), (slots.footer as () => any)()]}</tfoot>
            ) : (
              {}
            )}
          </table>
        );
      },
    }),
  };
}

export default createComponents;
