import { usePlayerStore } from "@/stores/player";
import { type ClassBindings, extendClass } from "@/utils";
import {
  computed,
  defineComponent,
  ref,
  type PropType,
  type Ref,
  type VNodeChild,
  onMounted,
  nextTick,
  watch,
} from "vue";

const RoundsType = Symbol("Map or Array values");

export type TurnData<T> = {
  score: number;
  deltaScore: number;
  value: T;
};
export type PlayerTurnData<T> = TurnData<T> & {
  playerId: string;
};

type MoveFocus = {
  /** Change focus to the next round input */
  next: () => void;
  /** Change focus to the previous round input */
  prev: () => void;
  /** Change focus to the first unentered round input */
  empty: () => void;
};

export type Round<T> = {
  /** The html to display.
   * @param value is a ref that can be used as a v-model value for the round input. Setting it will automatically move the focus to the next unentered input
   */
  display: (
    score: number,
    deltaScore: number,
    value: Ref<T | undefined>,
    editable: boolean,
    focus: MoveFocus,
  ) => VNodeChild;
  label: string;
  deltaScore: (value: T | undefined, roundIndex: number, playerId: string) => number;
  rowClass?: (rowData: PlayerTurnData<T | undefined>[]) => ClassBindings;
  cellClass?: (data: PlayerTurnData<T | undefined>) => ClassBindings;
  /** CSS selector to use to focus the input element of a round. Defaults to using `input` to select the `<input>` element */
  inputFocusSelector?: string;
};

const makeTurnKey = (playerId: string, round: number): string => `${playerId}:${round}`;

type RoundsValue<R extends readonly [...any[]]> = R[number];
type RoundValue<R extends readonly [...any[]], K extends number> = K extends keyof R ? R[K] : never;

type PlayerDataPartial<T extends readonly [...any[]]> = {
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
  rounds: Map<number, RoundsValue<T>>;
  /** The player's current position */
  position: number;
  /** A list of playerIds that the player is tied with, empty list for no players tied with this player */
  tied: string[];
};
export type PlayerDataComplete<T extends readonly [...any[]]> = Omit<
  PlayerDataPartial<T>,
  "complete"
> & {
  complete: true;
  roundsComplete: T;
};
export type PlayerData<T extends readonly [...any[]]> =
  | PlayerDataPartial<T>
  | PlayerDataComplete<T>;

type GameMetadata<T extends readonly [...any[]]> = {
  startScore: (playerId: string) => number;
  playerNameClass?: (data: PlayerData<T>) => ClassBindings;
  /**
   * Which direction to sort the positions
   * `"lowestFirst"` means the player(s) with the lowest score are in first place.
   * `"highestFirst"` means the player(s) with the highest score are in first place.
   */
  positionOrder: "lowestFirst" | "highestFirst";
  rounds: {
    [I in keyof T & number]: Round<T[I]>;
  };
};

export const createComponent = <T extends readonly [...any[]]>(gameMeta: GameMetadata<T>) => {
  const roundsType = isKeyedRound(gameMeta.rounds[0]) ? "object" : "array";
  const rounds =
    roundsType === "object"
      ? (gameMeta.rounds.map((r) => ({ ...r, [RoundsType]: "object" })) as RoundInternalObj<
          any,
          keyof T & string
        >[])
      : (gameMeta.rounds.map((r: IndexedRound<any, keyof T & number>, index) => ({
          ...r,
          [RoundsType]: "array",
          index,
        })) as RoundInternalArr<any, keyof T & number>[]);
  const roundKey = (round: RoundInternal<T>) =>
    roundsType === "object"
      ? ((round as unknown as RoundInternalObj<any, keyof T & string>).key as RoundKey<T>)
      : ((round as unknown as RoundInternalArr<any, keyof T & number>).index as RoundKey<T>);
  const focusSelectorBase = "td.turnInput";
  return defineComponent({
    props: {
      players: { type: Array as PropType<string[]>, required: true },
      // rounds: { type: Array as PropType<R[]>, required: true },
      modelValue: {
        type: Object as PropType<Map<string, Partial<T>>>,
        default: () => new Map(),
      },
      editable: { type: Boolean, default: false },
      displayPositions: {
        type: String as PropType<"head" | "body" | "foot" | "none">,
        default: "head",
      },
    },
    emits: {
      /* eslint-disable @typescript-eslint/no-unused-vars */
      playerCompleted: (playerId: string, completed: boolean) => true,
      completed: (completed: boolean) => true,
      turnTaken: (
        playerId: string,
        roundId: RoundKey<T>,
        turnData: TurnData<RoundValue<T, RoundKey<T>>>,
      ) => true,
      /** Emitted only when the entire game is complete, then each time the result changes */
      ["update:gameResult"]: (result: Map<string, PlayerDataComplete<T>>) => true,
      ["update:positions"]: (
        ordered: {
          pos: number;
          posOrdinal: string;
          players: string[];
        }[],
      ) => true,
      ["update:playerScores"]: (result: PlayerData<T>[]) => true,
      ["update:modelValue"]: (values: Map<string, Partial<T>>) => true,
      ["update:modelValueSparse"]: (values: Map<string, Map<RoundKey<T>, RoundsValue<T>>>) => true,
      /* eslint-enable @typescript-eslint/no-unused-vars */
    },
    setup: (props, { slots, emit }) => {
      const focusEmpty = () => {
        nextTick(() => {
          const el = document.querySelector(
            focusSelectorBase + ".unplayed",
          ) as HTMLTableCellElement | null;
          if (el) {
            const row = parseInt(el.dataset.roundIndex!);
            const inputFocusSelector = rounds[row].inputFocusSelector ?? "input";
            (el.querySelector(inputFocusSelector) as HTMLElement | null)?.focus();
          } else if (!allCompleted.value) {
            console.log("Unable to find el!"); //XXX
          }
        });
      };
      onMounted(() => focusEmpty());
      const playerStore = usePlayerStore();
      const makeMoveFocus = (playerIndex: number, roundIndex: number): MoveFocus => {
        let prev = () => {};
        if (playerIndex <= 0) {
          if (roundIndex > 0) {
            prev = () => focusInput(roundIndex - 1, props.players.length - 1);
          }
        } else {
          prev = () => focusInput(roundIndex, playerIndex - 1);
        }
        const next = () => {
          if (playerIndex >= props.players.length - 1) {
            if (roundIndex < rounds.length - 1) {
              focusInput(roundIndex + 1, 0);
            }
          } else {
            focusInput(roundIndex, playerIndex + 1);
          }
        };
        const focusInput = (row: number, col: number): void => {
          nextTick(() => {
            const inputFocusSelector = rounds[row].inputFocusSelector ?? "input";
            // eslint-disable-next-line no-undef
            const tds = document.querySelectorAll(
              focusSelectorBase,
            ) as NodeListOf<HTMLTableCellElement>;
            const idx = props.players.length * (row as number) + col;
            const el = tds.item(idx)?.querySelector(inputFocusSelector) as HTMLElement | null;
            if (el) {
              el.focus();
            } else {
              console.log("Unable to find el!");
            }
          });
        };
        return {
          next,
          prev,
          empty: focusEmpty,
        };
      };
      const turnData = ref(new Map<string, RoundsValue<T>>());
      watch(
        () => props.modelValue,
        (gameData) => {
          gameData.forEach((rounds, pid) =>
            Object.entries(rounds).forEach(([round, val]) => {
              if (val !== undefined) {
                console.log("Setting round", makeTurnKey(pid, round), "to:", val); //XXX
                turnData.value.set(makeTurnKey(pid, round), val);
              }
            }),
          );
        },
        { immediate: true },
      );
      const playerTurns = computed(
        () =>
          new Map(
            props.players.map((pid) => [
              pid,
              new Map(
                rounds.flatMap((r) => {
                  const round = roundKey(r);
                  const turnKey = makeTurnKey(pid, round);
                  return turnData.value.has(turnKey) ? [[round, turnData.value.get(turnKey)!]] : [];
                }),
              ),
            ]),
          ),
      );
      const roundDataMaps = computed(
        () =>
          new Map(
            rounds.map((r) => {
              const round = (r[RoundsType] === "object" ? r.key : r.index) as RoundKey<T>;
              return [
                round,
                new Map(
                  props.players.flatMap((pid) => {
                    const turnKey = makeTurnKey(pid, round);
                    return turnData.value.has(turnKey) ? [[pid, turnData.value.get(turnKey)!]] : [];
                  }),
                ),
              ];
            }),
          ),
      );
      // const roundData = computed(() =>
      //   rounds.map((r) => {
      //     const round = (r[RoundsType] === "object" ? r.key : r.index) as RoundsKeys<T>;
      //     return props.players.flatMap((pid) => {
      //       const turnKey = makeTurnKey(pid, round);
      //       return turnData.value.has(turnKey) ? [turnData.value.get(turnKey)!] : [];
      //     });
      //   }),
      // );
      const playerScores = computed(
        () =>
          new Map(
            props.players.map((pid) => {
              const turns = playerTurns.value.get(pid);
              return [
                pid,
                rounds.reduce(
                  ({ score, scores, deltaScores, lastPlayedRound }, r, i) => {
                    const round = (r[RoundsType] === "object" ? r.key : r.index) as RoundKey<T>;
                    const delta = r.deltaScore(turns?.get(round), i, pid);
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
      const playerPositions = computed(() => {
        const orderedScores = [...playerScores.value.values()];
        orderedScores.sort(({ score: a }, { score: b }) => {
          switch (gameMeta.positionOrder) {
            case "lowestFirst":
              return a - b;
            case "highestFirst":
              return b - a;
          }
        });
        const scorePlayerLookup = [...playerScores.value.entries()].reduce(
          (acc, [pid, { score }]) => {
            if (acc.has(score)) {
              acc.get(score)!.push(pid);
            } else {
              acc.set(score, [pid]);
            }
            return acc;
          },
          new Map<number, string[]>(),
        );

        const { ordered, playerLookup } = orderedScores.reduce(
          ({ scores, ordered, playerLookup }, { score }, idx) => {
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

      const posRow = (displayWhen: (typeof props)["displayPositions"]) =>
        // Only display when requested, and only if everyone isn't tied
        props.displayPositions === displayWhen ? (
          <tr class={{ positionRow: true, small: props.editable }}>
            <td class="rowLabel">Position</td>
            {props.players.map((pid) => {
              const { pos, posOrdinal } = playerPositions.value.playerLookup.get(pid)!;
              return (
                <td>
                  {pos}
                  <sup>{posOrdinal}</sup>
                </td>
              );
            })}
          </tr>
        ) : undefined;

      const mapRoundsToT = (turns: Map<RoundKey<T>, RoundsValue<T>>): T => {
        switch (roundsType) {
          case "object":
            return rounds.reduce((obj, r) => {
              const key = (r as RoundInternalObj<any, keyof T & string>).key as keyof T;
              obj[key] = turns.get(key as RoundKey<T>)!;
              return obj;
            }, {} as T);
          case "array":
            return Array.from({ length: rounds.length }, (_, i) =>
              turns.get(i as RoundKey<T>),
            ) as unknown as T;
        }
      };

      const playerData = computed(
        () =>
          new Map<string, PlayerData<T>>(
            props.players.map((pid) => {
              const scores = playerScores.value.get(pid)!;
              const pos = playerPositions.value.playerLookup.get(pid)!;
              const turns = playerTurns.value.get(pid)!;
              const complete = turns.size === rounds.length;
              const common = {
                playerId: pid,
                score: scores.score,
                scores: scores.scores,
                deltaScores: scores.deltaScores,
                rounds: turns,
                position: pos.pos,
                tied: pos.players.filter((p) => pid !== p),
              };
              if (complete) {
                return [pid, { complete, ...common, roundsComplete: mapRoundsToT(turns) }];
              } else {
                return [pid, { complete, ...common }];
              }
            }),
          ),
      );

      const completedPlayers = computed(
        () =>
          new Set(
            [...playerTurns.value.entries()].flatMap(([pid, turns]) =>
              turns.size === rounds.length ? [pid] : [],
            ),
          ),
      );
      watch(
        () => completedPlayers.value,
        (completed, prev) => {
          for (const pid of [...completed].filter((pid) => !prev.has(pid))) {
            console.log(pid, playerTurns.value.get(pid)!, rounds.length); //XXX
            emit("playerCompleted", pid, true);
          }
          for (const pid of [...prev].filter((pid) => !completed.has(pid))) {
            emit("playerCompleted", pid, false);
          }
        },
      );
      const allCompleted = computed(() =>
        props.players.every((pid) => completedPlayers.value.has(pid)),
      );
      /** Update when completed or when a turn changes, but with the completed value as a convenience */
      watch(
        () => [allCompleted.value, turnData.value] as [boolean, Map<string, RoundsValue<T>>],
        ([val], [prev]) => {
          if (val !== prev) {
            emit("completed", val);
          }
          if (val) {
            emit(
              "update:gameResult",
              new Map<string, PlayerDataComplete<T>>(
                props.players.flatMap((pid) => {
                  const data = playerData.value.get(pid)!;
                  if (data.complete) {
                    return [[pid, data]];
                  } else {
                    console.error(
                      `Attempted to return gameResult from an incomplete game for player: ${pid}`,
                      "\nIgnoring playerData:",
                      data,
                    );
                    return [];
                  }
                }),
              ),
            );
          }
        },
      );

      watch(playerPositions, (positions) => {
        //TODO: class PlayerPositions, get by index or pid
        // Deep copy positions.ordered
        emit("update:positions", JSON.parse(JSON.stringify(positions.ordered)));
      });

      watch(
        playerTurns,
        (turns) => {
          emit(
            "update:modelValue",
            [...turns.entries()].reduce((result, [pid, playerTurns]) => {
              switch (roundsType) {
                case "object":
                  return result.set(
                    pid,
                    rounds.reduce((obj, r) => {
                      const key = roundKey(r);
                      obj[key] = playerTurns.get(key);
                      return obj;
                    }, {} as Partial<T>),
                  );
                case "array":
                  return result.set(
                    pid,
                    Array.from({ length: rounds.length }, (_, i) =>
                      playerTurns.get(i as RoundKey<T>),
                    ) as unknown as Partial<T>,
                  );
              }
            }, new Map<string, Partial<T>>()),
          );
          emit("update:modelValueSparse", turns);
          emit(
            "update:playerScores",
            props.players.map((pid) => playerData.value.get(pid)!),
          );
        },
        { immediate: true },
      );

      return () => (
        <table>
          <thead>
            <tr>
              {slots.topLeftCell ? slots.topLeftCell() : <th>&nbsp;</th>}
              {props.players.map((pid) => {
                const classes = extendClass(
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
            {rounds.map((r, idx) => {
              const round = (r[RoundsType] === "object" ? r.key : r.index) as RoundKey<T>;
              const rowData = roundDataMaps.value.get(round)!;
              const playerRowData = props.players.map((pid) => {
                const score = playerScores.value.get(pid)!;
                return {
                  playerId: pid,
                  score: score.scores[idx],
                  deltaScore: score.deltaScores[idx],
                  value: rowData.get(pid),
                };
              });
              const rowClass: ClassBindings | undefined = r.rowClass
                ? r.rowClass(playerRowData)
                : undefined;
              return (
                <tr class={rowClass}>
                  <td class="rowLabel">{r.label}</td>
                  {playerRowData.map(({ playerId, score, deltaScore, value }, pIdx) => {
                    const cellClass = extendClass(
                      r.cellClass !== undefined
                        ? () => r.cellClass!({ playerId, score, deltaScore, value })
                        : undefined,
                      "turnInput",
                      { unplayed: value === undefined },
                    );
                    const moveFocus = makeMoveFocus(pIdx, idx);
                    return (
                      <td class={cellClass} data-round-index={idx}>
                        {r.display(
                          score,
                          deltaScore,
                          computed({
                            get: () => value,
                            set: (val) => {
                              turnData.value.set(
                                makeTurnKey(playerId, round),
                                val as RoundsValue<T>,
                              );
                              emit("turnTaken", playerId, round, {
                                score,
                                deltaScore,
                                value: val as RoundValue<T, typeof round>,
                              });
                              moveFocus.empty();
                            },
                          }),
                          props.editable,
                          moveFocus,
                        )}
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
  });
};
export default createComponent;
