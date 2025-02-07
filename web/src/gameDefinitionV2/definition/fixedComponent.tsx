import { type ClassBindings, extendClass, makeMoveFocusFactory, numberOrdinal } from "@/utils";
import {
  computed,
  defineComponent,
  ref,
  type PropType,
  onMounted,
  watch,
  onUnmounted,
  type Ref,
  nextTick,
} from "vue";
import PlayerNameSpan from "@/components/PlayerName";
import type { GameDefinition } from ".";
import type { DisplayPosRowPositions } from "@/gameUtils/playerData";
import type { AnyTurnDataType, PlayerDataFull, PlayerDataRaw, TurnKey, TurnMetaType, TurnStatsType, TurnValueType } from "../types";

export const createFixedGameComponent = <
  G extends GameDefinition<any, any, any, PlayerState, SharedState, TurnType, SoloStats, FullPlayerStats, PlayerId>,
  PlayerState extends {},
  SharedState extends {},
  TurnType extends AnyTurnDataType,
  SoloStats extends {},
  FullPlayerStats extends {},
  PlayerId extends string = string,
>(gameDef: G, initPlayerTurns: () => TurnValueType<TurnType>, defaultRoundOrder: TurnKey<TurnType>[], playerNameClass?: (pData: PlayerDataFull<PlayerState, TurnType, SoloStats, FullPlayerStats, PlayerId>) => ClassBindings) => {
  return defineComponent({
    props: {
      players: { type: Array as PropType<PlayerId[]>, required: true },
      roundOrder: { type: Array as PropType<TurnKey<TurnType>[]>, default: [] },
      // modelValue: {
      //   type: Object as PropType<Map<string, Partial<T>>>,
      //   default: () => new Map(),
      // },
      editable: { type: Boolean, default: true },
      displayPositions: {
        type: String as PropType<DisplayPosRowPositions>,
        default: "head",
      },
    },
    emits: {
      // /* eslint-disable @typescript-eslint/no-unused-vars */
      // //   playerCompleted: (playerId: string, completed: boolean) => true,
      // completed: (completed: boolean) => true,
      // turnTaken: (turnData: TurnData<V, RS, any>) => true,
      // /** Emitted only when the entire game is complete, then each time the result changes */
      // ["update:gameResult"]: (result: { data: Map<string, PlayerData>; positions: Position[] }) =>
      //   true,
      // ["update:playerStats"]: (playerId: string, stats: PlayerData["stats"]) => true,
      // ["update:partialSummary"]: (data: Map<string, PlayerData>) => true,
      // //   ["update:positions"]: (
      // //     ordered: {
      // //       pos: number;
      // //       posOrdinal: string;
      // //       players: string[];
      // //     }[],
      // //   ) => true,
      // //   ["update:playerScores"]: (result: PlayerData<T>[]) => true,
      // //   ["update:modelValue"]: (values: Map<string, Partial<T>>) => true,
      // //   ["update:modelValueSparse"]: (values: Map<string, Map<RoundKey<T>, RoundsValue<T>>>) => true,
      // /* eslint-enable @typescript-eslint/no-unused-vars */
    },
    setup: (props, { slots, emit }) => {
      const sharedState = ref(gameDef.initSharedState());

      const roundOrder = computed(() => props.roundOrder.length > 0 ? props.roundOrder : defaultRoundOrder)

      const playerDataRaw = ref(new Map(props.players.map(pid => [pid, {...gameDef.initPlayerData(pid), completed: false, turns: initPlayerTurns() } satisfies PlayerDataRaw<PlayerState, TurnType>]))) as Ref<Map<PlayerId, PlayerDataRaw<PlayerState, TurnType>>>;

      const gameResult = computed(() => gameDef.calculateGameResult(playerDataRaw.value, sharedState.value));

      // /** Map of playerId to Map<index, {score, allTurns, takenTurns, lastPlayedRound}> */
      // const playerScores = computed(
      //   () =>
      //     new Map(
      //       props.players.map((pid) => {
      //         return [
      //           pid,
      //           meta.rounds.reduce(
      //             ({ score, allTurns, turnsTaken, lastPlayedRound }, r, i) => {
      //               const val = turnValues.value.get(turnKey(pid, i));
      //               const data = r.turnData(val, score, pid, i);
      //               score = data.score;
      //               if (r.type === "indexed-stats") {
      //                 // || r.type === "keyed-stats") {
      //                 allTurns.set(i, data);
      //               }
      //               if (val !== undefined) {
      //                 turnsTaken.set(i, data as TakenTurnData<V, RS, any>);
      //                 lastPlayedRound = i;
      //               }
      //               return { score, allTurns, turnsTaken, lastPlayedRound };
      //             },
      //             {
      //               score: meta.startScore(pid),
      //               allTurns: new Map<number, TurnData<V, RS, any>>(),
      //               turnsTaken: new Map<number, TakenTurnData<V, RS, any>>(),
      //               lastPlayedRound: -1,
      //             },
      //           ),
      //         ];
      //       }),
      //     ),
      // );

      const posRow = (displayWhen: DisplayPosRowPositions) =>
            // Only display when requested, and only if everyone isn't tied
            props.displayPositions === displayWhen ? (
              <tr class={{positionRow: true, small: props.editable }}>
                <td class="rowLabel">Position</td>
                {props.players.map((pid) => {
                  const pos = gameResult.value.players.get(pid)!.position.pos;
                  return (
                    <td>
                      {pos}
                      <sup>{numberOrdinal(pos)}</sup>
                    </td>
                  );
                })}
              </tr>
            ) : undefined;

      // const playerData = computed(
      //   () =>
      //     new Map(
      //       props.players.map((playerId) => {
      //         const { score, allTurns, turnsTaken } = playerScores.value.get(playerId)!;
      //         const position = playerPositions.value.playerLookup.get(playerId)!;
      //         const statsAccumulator = gameStatsFactory();
      //         allTurns.forEach(({ stats, roundIndex }) =>
      //           statsAccumulator.addRound(roundIndex, stats!),
      //         );
      //         return [
      //           playerId,
      //           {
      //             playerId,
      //             complete: turnsTaken.size === meta.rounds.length,
      //             score,
      //             turns: turnsTaken,
      //             allTurns: allTurns,
      //             position: position.pos,
      //             tied: position.players.filter((p) => p !== playerId),
      //             stats: statsAccumulator.result({
      //               all: [...allTurns.values()],
      //               taken: [...turnsTaken.values()],
      //             }),
      //           },
      //         ] as [string, PlayerData];
      //       }),
      //     ),
      // );
      // emit("update:partialSummary", playerData.value);

      // const allCompleted = computed(() =>
      //   //TODO: completed early for dynamic rounds
      //   props.players.every((pid) => playerData.value.get(pid)!.turns.size === meta.rounds.length),
      // );
      // /** Update when completed or when a turn changes, but with the completed value as a convenience */
      // watch(
      //   () => [allCompleted.value, turnValues.value] as [boolean, Map<string, V>],
      //   ([val], [prev]) => {
      //     if (val !== prev) {
      //       emit("completed", val);
      //     }
      //     if (val) {
      //       emit("update:gameResult", {
      //         data: new Map<string, PlayerData>(
      //           props.players.flatMap((pid) => {
      //             const data = playerData.value.get(pid)!;
      //             if (data.complete) {
      //               return [[pid, data]];
      //             } else {
      //               console.error(
      //                 `Attempted to return gameResult from an incomplete game for player: ${pid}`,
      //                 "\nIgnoring playerData:",
      //                 data,
      //               );
      //               return [];
      //             }
      //           }),
      //         ),
      //         positions: playerPositions.value.ordered,
      //       });
      //     }
      //     emit("update:partialSummary", playerData.value);
      //   },
      //   { deep: true },
      // );
      // watch(
      //   () => new Map([...playerData.value.entries()].map(([pid, { stats }]) => [pid, stats])),
      //   (statsMap, oldMap) => {
      //     for (const [pid, stats] of statsMap) {
      //       if (oldMap === undefined || JSON.stringify(stats) !== JSON.stringify(oldMap.get(pid))) {
      //         emit("update:playerStats", pid, stats);
      //       }
      //     }
      //   },
      //   { immediate: true },
      // );

      const focusTurnInput = (el: HTMLTableCellElement) => {
        //const row = parseInt(el.dataset.roundIndex!);
        const inputFocusSelector = /*rounds.value[row].inputFocusSelector ??*/ "input";
        (el.querySelector(inputFocusSelector) as HTMLElement | null)?.focus();
      }
      
      const focusEmpty = () => nextTick(() => {
        const el = document.querySelector<HTMLTableCellElement>(
          "td.turnInput.unplayed",
        );
        if (el) {
          focusTurnInput(el);
        } else if (![...gameResult.value.players.values()].every(({completed}) => completed)) {
          console.log("Unable to find el!"); //XXX
        }
      });
      
      const focusNext = () => nextTick(() => {
        const currentEl = document.activeElement
        if (!currentEl) {
          focusEmpty();
          return;
        }
        let el = currentEl.nextElementSibling;
        if (el && el.tagName === "td" && el.classList.contains("turnInput")) {
          focusTurnInput(el as HTMLTableCellElement);
          return;
        } else if (!el) {
          const parent = currentEl.parentElement as HTMLTableRowElement;
          const nextRow = parent.nextElementSibling;
          if (nextRow && nextRow.tagName === "tr") {
            el = nextRow.firstElementChild;
            if (el && el.tagName === "td" && el.classList.contains("turnInput")) {
              focusTurnInput(el as HTMLTableCellElement);
              return;
            }
          }
        }
        console.log("Unable to find next element to focus!"); //XXX
      });
      const focusPrev = () => nextTick(() => {
        const currentEl = document.activeElement
        if (!currentEl) {
          focusEmpty();
          return;
        }
        let el = currentEl.previousElementSibling;
        if (el && el.tagName === "td" && el.classList.contains("turnInput")) {
          focusTurnInput(el as HTMLTableCellElement);
          return;
        } else if (!el) {
          const parent = currentEl.parentElement as HTMLTableRowElement;
          const nextRow = parent.previousElementSibling;
          if (nextRow && nextRow.tagName === "tr") {
            el = nextRow.lastElementChild;
            if (el && el.tagName === "td" && el.classList.contains("turnInput")) {
              focusTurnInput(el as HTMLTableCellElement);
              return;
            }
          }
        }
        console.log("Unable to find prev element to focus!"); //XXX
      });
      // /** Fallback events to use to focusEmpty */
      // const focusEvents: (keyof WindowEventMap)[] = [
      //   // "click", //DOES NOT ALLOW CLICKING INPUTS!
      //   // "keydown",
      // ];
      // onMounted(() => {
      //   for (const e of focusEvents) {
      //     window.addEventListener(e, focusEmpty, { passive: true });
      //   }
      //   focusEmpty();
      // });
      // onUnmounted(() => {
      //   for (const e of focusEvents) {
      //     window.removeEventListener(e, focusEmpty);
      //   }
      // });
      // watch(
      //   () => props.players,
      //   () => focusEmpty(),
      // );

      return () => (
        <table>
          <thead>
            <tr>
              {slots.topLeftCell ? slots.topLeftCell() : <th>&nbsp;</th>}
              {props.players.map((pid) => {
                const pData = gameResult.value.players.get(pid);
                return (
                <PlayerNameSpan
                  class={extendClass("playerName", playerNameClass && pData ? playerNameClass(pData) : undefined)}
                  tag="th"
                  playerId={pid}
                />
              )})}
            </tr>
            {posRow("head")}
          </thead>
          <tbody>
            {posRow("body")}
            {roundOrder.value.map((roundId, idx) => {
              const meta = gameDef.getRoundMetaT<TurnValueType<TurnType>, TurnStatsType<TurnType>, any>(roundId);
              const playerRowData = props.players.map(
                (pid) => gameResult.value.players.get(pid)!.turns[roundId],
              );
              return (
                <tr
                  class={meta.rowClass(playerRowData)}
                >
                  <td class="rowLabel">{meta.label()}</td>
                  {playerRowData.map(({ value, ...pData }, pIdx) => {
                    return (
                      <td
                        class={/*(meta.cellClass as (data: TurnData<V, RS, any>) => ClassBindings)({
                          value,
                          ...pData,
                        })}*/{
                          turnInput: true, unplayed: value === undefined
                        }}
                        data-round-index={idx}
                      >
                        {props.editable
                        ? meta.component.mutable (computed({
                            get: () => value,
                            set: (val) => {
                              playerDataRaw.value.set(pData.playerId, val!);
                              emit("turnTaken", { value: val, ...pData });
                              focusEmpty();
                            },
                          }),
                          {
                            playerId: pData.playerId,
                            roundIndex: idx,
                            deltaScore: meta.deltaScore(value),
                            score: pData.playerTurnData[idx as TurnKey<TurnType>].endingScore,
                            stats: pData.playerTurnData[idx as TurnKey<TurnType>].stats,
                            mutable: true,
                            focus: {
                              next: focusNext,
                              prev: focusPrev,
                              empty: focusEmpty,
                            },
                          },
                        )
                        : meta.component.immutable(
                          value,
                          {
                            playerId: pData.playerId,
                            roundIndex: idx,
                            deltaScore: meta.deltaScore(value),
                            score: pData.playerTurnData[idx as TurnKey<TurnType>].endingScore,
                            stats: pData.playerTurnData[idx as TurnKey<TurnType>].stats,
                            mutable: false,
                          },
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
              {posRow("foot")}
              {slots.footer
                ? slots.footer(
                    computed(() => props.players.map((pid) => gameResult.value.players.get(pid)!)),
                  )
                : undefined}
            </tfoot>
          ) : undefined}
        </table>
      );
    },
  });
};
