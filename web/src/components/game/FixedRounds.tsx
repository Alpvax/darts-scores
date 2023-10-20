import { usePlayerStore } from "@/stores/player";
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

type ClassBindings = undefined | string | Record<string, boolean> | string[];

const extendClass = (
  bindings: ClassBindings | (() => ClassBindings),
  ...extended: ClassBindings[]
): ClassBindings => {
  const c = typeof bindings === "function" ? bindings() : bindings;
  if (extended === undefined || extended.length < 1) {
    return c;
  } else {
    return extended.reduce((a, b) => {
      if (a === undefined) {
        return b;
      }
      if (b === undefined) {
        return a;
      }
      const isStrB = typeof b === "string";
      const isArrB = Array.isArray(b);
      if (typeof a === "string") {
        return isStrB
          ? `${a} ${b}`
          : isArrB
          ? [...a.split(" "), ...b]
          : {
              [a]: true,
              ...b,
            };
      } else if (Array.isArray(a)) {
        return isStrB
          ? [...a, ...b.split(" ")]
          : isArrB
          ? [...a, ...b]
          : a.reduce((acc, clas) => {
              acc[clas] = true;
              return acc;
            }, b);
      } else {
        return isStrB
          ? { ...a, [b]: true }
          : isArrB
          ? b.reduce((acc, clas) => {
              acc[clas] = true;
              return acc;
            }, a)
          : { ...a, ...b };
      }
    }, c);
  }
};

const RoundsType = Symbol("Map or Array values");

type TurnData<T> = {
  score: number;
  deltaScore: number;
  value: T;
};
type PlayerTurnData<T> = TurnData<T> & {
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
type KeyedRound<T, K extends string> = Round<T> & {
  key: K;
};

const isKeyedRound = <K extends string>(
  round: Round<any> | KeyedRound<any, K>,
): round is KeyedRound<any, K> => Object.hasOwn(round, "key");

type RoundInternalArr<T> = Round<T> & {
  [RoundsType]: "array";
  index: number;
};
type RoundInternalObj<T> = Round<T> & {
  [RoundsType]: "object";
  key: string;
};
type RoundInternal<T> = RoundInternalObj<T> | RoundInternalArr<T>;

export type GameData<T extends Record<string, any> | readonly [...any[]]> = Map<
  string,
  Map<RoundsKeys<T>, RoundsValues<T>>
>;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
type TurnKey<T extends Record<string, any> | readonly [...any[]]> = string;
const makeTurnKey = <T extends Record<string, any> | readonly [...any[]]>(
  playerId: string,
  round: RoundsKeys<T>,
): TurnKey<T> => `${playerId}:${round}`;

type ObjValues<T> = T extends { [k: string]: infer U } ? U : never;
type ObjArray<T> = ObjValues<T>[];

type RoundsList<R extends Record<string, any> | readonly [...any[]]> = R extends [...any[]]
  ? {
      [I in keyof R]: Round<R[I]>;
    }
  : ObjArray<{
      [K in keyof R & string]: KeyedRound<R[K], K>;
    }>;
type RoundsKeys<R extends Record<string, any> | readonly [...any[]]> = R extends [...any[]]
  ? keyof R & number
  : keyof R & string;
type RoundsValues<R extends Record<string, any> | readonly [...any[]]> = R extends [...any[]]
  ? R[number]
  : ObjValues<{ [K in keyof R & string]: R[K] }>;

type PlayerData<T extends Array<any> | Record<string, any>> = {
  playerId: string;
  /** The final score if finished, or the current score if in progress */
  score: number;
  /** The scores after each round, only including played rounds */
  scores: number[];
  /** The scores differences for each round, only including played rounds */
  deltaScores: number[];
  rounds: Map<RoundsKeys<T>, RoundsValues<T>>;
  position: number;
  tied: string[];
};
export type CompletedPlayerData<T extends Array<any> | Record<string, any>> = Omit<
  PlayerData<T>,
  "rounds"
> & {
  rounds: T;
};
export type GameResult<T extends Array<any> | Record<string, any>> = Map<
  string,
  CompletedPlayerData<T>
>;

type GameMetadata<T extends readonly [...any[]] | Record<string, any>> = {
  startScore: (playerId: string) => number;
  playerNameClass?: (data: PlayerData<T>) => ClassBindings;
  /**
   * Which direction to sort the positions
   * `"lowestFirst"` means the player(s) with the lowest score are in first place.
   * `"highestFirst"` means the player(s) with the highest score are in first place.
   */
  positionOrder: "lowestFirst" | "highestFirst";
  rounds: RoundsList<T>;
};

export const createComponent = <T extends readonly [...any[]] | Record<string, any>>(
  gameMeta: GameMetadata<T>,
) => {
  const rounds: RoundInternal<any>[] = gameMeta.rounds.map(
    (r: Round<any> | KeyedRound<any, keyof T & string>, index) =>
      isKeyedRound(r) ? { ...r, [RoundsType]: "object" } : { ...r, [RoundsType]: "array", index },
  );
  const roundsType = rounds[0][RoundsType];
  const focusSelectorBase = "td.turnInput";
  return defineComponent({
    props: {
      players: { type: Array as PropType<string[]>, required: true },
      // rounds: { type: Array as PropType<R[]>, required: true },
      values: { type: Object as PropType<GameData<T>>, default: () => new Map() },
      editable: { type: Boolean, default: false },
      displayPositions: {
        type: String as PropType<"head" | "body" | "foot" | "none">,
        default: "head",
      },
    },
    emits: {
      /* eslint-disable @typescript-eslint/no-unused-vars */
      playerCompleted: (playerId: string, completed: boolean) => true,
      allCompleted: (completed: boolean) => true,
      /** Emitted only when the entire game is complete, then each time the result changes */
      ["update:gameResult"]: (result: GameResult<T>) => true,
      ["update:positions"]: (
        ordered: {
          pos: number;
          posOrdinal: string;
          players: string[];
        }[],
      ) => true,
      ["update:values"]: (values: GameData<T>) => true,
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
      const turnData = ref(new Map<TurnKey<T>, RoundsValues<T>>());
      watch(
        () => props.values,
        (gameData) => {
          gameData.forEach((rounds, pid) =>
            rounds.forEach((val, round) => {
              turnData.value.set(makeTurnKey(pid, round), val);
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
                  const round = (r[RoundsType] === "object" ? r.key : r.index) as RoundsKeys<T>;
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
              const round = (r[RoundsType] === "object" ? r.key : r.index) as RoundsKeys<T>;
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
                    const round = (r[RoundsType] === "object" ? r.key : r.index) as RoundsKeys<T>;
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
        () =>
          [allCompleted.value, turnData.value] as [boolean, Map<string, CompletedPlayerData<T>>],
        ([val], [prev]) => {
          if (val !== prev) {
            emit("allCompleted", val);
          }
          if (val) {
            emit(
              "update:gameResult",
              props.players.reduce((result, pid) => {
                const scores = playerScores.value.get(pid)!;
                const pos = playerPositions.value.playerLookup.get(pid)!;
                const common = {
                  playerId: pid,
                  score: scores.score,
                  scores: scores.scores,
                  deltaScores: scores.deltaScores,
                  position: pos.pos,
                  tied: pos.players.filter((p) => pid !== p),
                };
                const turns = playerTurns.value.get(pid)!;
                switch (roundsType) {
                  case "object":
                    result.set(pid, {
                      ...common,
                      rounds: rounds.reduce((obj, r) => {
                        const key = (r as RoundInternalObj<T>).key as keyof T;
                        obj[key] = turns.get(key as RoundsKeys<T>)!;
                        return obj;
                      }, {} as T),
                    });
                    break;
                  case "array":
                    result.set(pid, {
                      ...common,
                      rounds: Array.from(
                        { length: rounds.length },
                        (_, i) => turns.get(i as RoundsKeys<T>)!,
                      ) as unknown as T,
                    });
                    break;
                }
                return result;
              }, new Map<string, CompletedPlayerData<T>>()),
            );
          }
        },
      );

      watch(playerPositions, (positions) => {
        //TODO: class PlayerPositions, get by index or pid
        // Deep copy positions.ordered
        emit("update:positions", JSON.parse(JSON.stringify(positions.ordered)));
      });

      watch(playerTurns, (turns) => {
        emit("update:values", turns);
      });

      return () => (
        <table>
          <thead>
            <tr>
              {slots.topLeftCell ? slots.topLeftCell() : <th>&nbsp;</th>}
              {props.players.map((pid) => {
                const classes = extendClass(
                  gameMeta.playerNameClass !== undefined
                    ? () => {
                        const scores = playerScores.value.get(pid)!;
                        const pos = playerPositions.value.playerLookup.get(pid)!;
                        return gameMeta.playerNameClass!({
                          playerId: pid,
                          score: scores.score,
                          scores: scores.scores,
                          deltaScores: scores.deltaScores,
                          rounds: playerTurns.value.get(pid)!,
                          position: pos.pos,
                          tied: pos.players.filter((p) => pid !== p),
                        });
                      }
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
              const round = (r[RoundsType] === "object" ? r.key : r.index) as RoundsKeys<T>;
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
                                val as RoundsValues<T>,
                              );
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
            <tfoot>
              {[posRow("foot"), (slots.footer as (turns: GameData<T>) => any)(playerTurns.value)]}
            </tfoot>
          ) : (
            {}
          )}
        </table>
      );
    },
  });
};
export default createComponent;
