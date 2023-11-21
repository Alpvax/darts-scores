import { type ClassBindings, makeMoveFocusFactory } from "@/utils";
import { computed, defineComponent, ref, type PropType, onMounted, watch } from "vue";
import {
  makePlayerPositions,
  type DisplayPosRowPositions,
  type PlayerDataT,
} from "@/gameUtils/playerData";
import { usePlayerStore } from "@/stores/player";
import type { AnyGameMetadata, GameStatsFactory } from "@/gameUtils/gameMeta";
import type { TakenTurnData, TurnData, TurnStats } from "@/gameUtils/roundDeclaration";
import { ArrayStatsAccumulatorGame, type GameStatsForRounds } from "@/gameUtils/statsAccumulator";

export const createComponent = <
  V,
  RS extends TurnStats = {},
  GS extends GameStatsForRounds<RS> = any,
>(
  meta: AnyGameMetadata<V, RS, GS>,
) => {
  type PlayerData = PlayerDataT<RS, TurnData<V, RS>, GS>;
  const gameStatsFactory = () =>
    new ArrayStatsAccumulatorGame<V, RS, GS>(
      meta.gameStatsFactory as GameStatsFactory<GS, TurnData<V, RS>, RS>,
    );

  const turnKey = (playerId: string, roundIdx: number) => `${playerId}:${roundIdx}`;

  return defineComponent(
    (props, { slots, emit }) => {
      const turnValues = ref(new Map<string, V>()); //TODO: set from props

      /** Map of playerId to Map<index, {score, allTurns, takenTurns, lastPlayedRound}> */
      const playerScores = computed(
        () =>
          new Map(
            props.players.map((pid) => {
              return [
                pid,
                meta.rounds.reduce(
                  ({ score, allTurns, turnsTaken, lastPlayedRound }, r, i) => {
                    const val = turnValues.value.get(turnKey(pid, i));
                    const data = r.turnData(val, score, pid, i);
                    score = data.score;
                    if (r.type === "indexed-stats") {
                      // || r.type === "keyed-stats") {
                      allTurns.set(i, data);
                    }
                    if (val !== undefined) {
                      turnsTaken.set(i, data as TakenTurnData<V, RS>);
                      lastPlayedRound = i;
                    }
                    return { score, allTurns, turnsTaken, lastPlayedRound };
                  },
                  {
                    score: meta.startScore(pid),
                    allTurns: new Map<number, TurnData<V, RS>>(),
                    turnsTaken: new Map<number, TakenTurnData<V, RS>>(),
                    lastPlayedRound: -1,
                  },
                ),
              ];
            }),
          ),
      );

      const { playerPositions, posRowFactory } = makePlayerPositions(
        computed(
          () => new Map([...playerScores.value.entries()].map(([pid, { score }]) => [pid, score])),
        ),
        meta.positionOrder,
      );
      const posRow = posRowFactory(
        computed(() => props.displayPositions as DisplayPosRowPositions),
        computed(() => props.players),
        props.editable ? "small" : undefined,
      );

      const playerData = computed(
        () =>
          new Map(
            props.players.map((playerId) => {
              const { score, allTurns, turnsTaken } = playerScores.value.get(playerId)!;
              const position = playerPositions.value.playerLookup.get(playerId)!;
              const statsAccumulator = gameStatsFactory();
              allTurns.forEach(({ stats, roundIndex }) =>
                statsAccumulator.addRound(roundIndex, stats!),
              );
              return [
                playerId,
                {
                  playerId,
                  complete: false, //TODO: complete: pRounds.size === rounds.value.length
                  score,
                  turns: turnsTaken,
                  allTurns: allTurns,
                  position: position.pos,
                  tied: position.players.filter((p) => p !== playerId),
                  stats: statsAccumulator.result({
                    all: [...allTurns.values()],
                    taken: [...turnsTaken.values()],
                  }),
                },
              ] as [string, PlayerData];
            }),
          ),
      );

      const allCompleted = computed(() =>
        //TODO: completed early for dynamic rounds
        props.players.every((pid) => playerData.value.get(pid)!.turns.size === meta.rounds.length),
      );
      /** Update when completed or when a turn changes, but with the completed value as a convenience */
      watch(
        () => [allCompleted.value, turnValues.value] as [boolean, Map<string, V>],
        ([val], [prev]) => {
          if (val !== prev) {
            emit("completed", val);
          }
          if (val) {
            emit(
              "update:gameResult",
              new Map<string, PlayerData>(
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

      const { focusEmpty, create: makeMoveFocus } = makeMoveFocusFactory(
        computed(() => meta.rounds),
        computed(() => props.players.length),
        allCompleted,
      );
      onMounted(() => focusEmpty());

      const playerStore = usePlayerStore();
      return () => (
        <table>
          <thead>
            <tr>
              {slots.topLeftCell ? slots.topLeftCell() : <th>&nbsp;</th>}
              {[...playerData.value.entries()].map(([pid, data]) => (
                <th class={(meta.playerNameClass as (data: PlayerData) => ClassBindings)(data)}>
                  {playerStore.playerName(pid).value}
                </th>
              ))}
            </tr>
            {posRow("head")}
          </thead>
          <tbody>
            {posRow("body")}
            {meta.rounds.map((r, idx) => {
              const playerRowData = props.players.map(
                (pid) => playerScores.value.get(pid)!.allTurns.get(idx)!,
              );
              return (
                <tr
                  class={(r.rowClass as (data: TurnData<V, RS>[]) => ClassBindings)(playerRowData)}
                >
                  <td class="rowLabel">{r.label}</td>
                  {playerRowData.map(({ value, ...pData }, pIdx) => {
                    return (
                      <td
                        class={(r.cellClass as (data: TurnData<V, RS>) => ClassBindings)({
                          value,
                          ...pData,
                        })}
                        data-round-index={idx}
                      >
                        {r.display(
                          computed({
                            get: () => value,
                            set: (val) => {
                              turnValues.value.set(turnKey(pData.playerId, idx), val!);
                              emit("turnTaken", { value, ...pData });
                              focusEmpty();
                            },
                          }),
                          // Ignore due to stats property
                          // @ts-ignore
                          {
                            ...pData,
                            editable: true,
                            focus: makeMoveFocus(pIdx, idx),
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
                    computed(() => props.players.map((pid) => playerData.value.get(pid)!)),
                  )
                : undefined}
            </tfoot>
          ) : undefined}
        </table>
      );
    },
    {
      props: {
        players: { type: Array as PropType<string[]>, required: true },
        // modelValue: {
        //   type: Object as PropType<Map<string, Partial<T>>>,
        //   default: () => new Map(),
        // },
        editable: { type: Boolean, default: false },
        displayPositions: {
          type: String as PropType<DisplayPosRowPositions>,
          default: "head",
        },
      },
      emits: {
        /* eslint-disable @typescript-eslint/no-unused-vars */
        //   playerCompleted: (playerId: string, completed: boolean) => true,
        completed: (completed: boolean) => true,
        turnTaken: (turnData: TurnData<V, RS>) => true,
        /** Emitted only when the entire game is complete, then each time the result changes */
        ["update:gameResult"]: (result: Map<string, PlayerData>) => true,
        //   ["update:positions"]: (
        //     ordered: {
        //       pos: number;
        //       posOrdinal: string;
        //       players: string[];
        //     }[],
        //   ) => true,
        //   ["update:playerScores"]: (result: PlayerData<T>[]) => true,
        //   ["update:modelValue"]: (values: Map<string, Partial<T>>) => true,
        //   ["update:modelValueSparse"]: (values: Map<string, Map<RoundKey<T>, RoundsValue<T>>>) => true,
        /* eslint-enable @typescript-eslint/no-unused-vars */
      },
    },
  );
};