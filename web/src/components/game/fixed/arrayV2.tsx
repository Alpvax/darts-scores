import { type ClassBindings, makeMoveFocusFactory, extendClass } from "@/utils";
import { computed, defineComponent, ref, type PropType, onMounted } from "vue";
import {
  makePlayerPositions,
  type DisplayPosRowPositions,
  type PlayerDataT,
} from "@/gameUtils/playerData";
import { usePlayerStore } from "@/stores/player";
import type { ArrayGameMetadata, GameMetaWithStats } from "@/gameUtils/gameMeta";
import type { TurnData, TurnStats } from "@/gameUtils/roundDeclaration";
import { ArrayStatsAccumulatorGame, type GameStatsForRounds } from "@/gameUtils/statsAccumulator";

// type ComponentBuilderBase = {
//   withRounds: {
//     <V>(rounds: Iterable<RoundNoStats<V>>): ComponentBuilderRNS<V>;
//     <V, RS extends TurnStats>(rounds: Iterable<RoundWStats<V, RS>>): ComponentBuilderRWS<V, RS>;
//   }
// }
// type ComponentBuilderRNS<V> = {
//   withStats: <GS extends Record<string, any>>(stats: PlayerDataNoStats)
// }
// type ComponentBuilderRWS<V, RS extends TurnStats> = {}
// export const componentBuilder = (meta: GameMetaBase) => ({
//   withRounds: <R extends Round<any, any>>(rounds: Iterator<R> | Iterable<R>) =>
// })

export const createComponent = <
  V,
  RS extends TurnStats = {},
  GS extends GameStatsForRounds<RS> = any,
>(
  meta: ArrayGameMetadata<V, RS> & GameMetaWithStats<V, RS, GS> /*{
    gameStatsFactory?: (accumulatedStats: ArrayGameStats<RS>, turns: { all: TurnData<V, RS>[]; taken: TurnData<V, RS>[] }) => GS;
    playerNameClass?: (data: PlayerDataT<RS, TurnData<V, RS>, GS>) => ClassBindings
  },*/,
) => {
  type PlayerData = PlayerDataT<RS, TurnData<V, RS>, GS>;
  // type RoundT = Required<Round<V, RS>>;
  // type PlayerData = PlayerDataNoStats<V, RoundT> | PlayerDataWStats<V, RoundT, GS>;
  // const makePlayerData: (playerId: string, )
  const playerNameClass: (data: PlayerData) => ClassBindings = meta.playerNameClass
    ? (data: PlayerData) =>
        extendClass(
          (meta.playerNameClass as (data: PlayerData) => ClassBindings)(data),
          "playerName",
        )
    : () => "playerName";

  const gameStatsFactory = meta.gameStatsFactory
    ? () => new ArrayStatsAccumulatorGame(meta.gameStatsFactory!)
    : () => new ArrayStatsAccumulatorGame(() => ({}));

  const turnKey = (playerId: string, roundIdx: number) => `${playerId}:${roundIdx}`;

  return defineComponent(
    (props, { slots, emit }) => {
      const turnValues = ref(new Map<string, V>()); //TODO: set from props

      /** Map of playerId to Map<index, {score, turns, lastPlayedRound}> */
      const playerScores = computed(
        () =>
          new Map(
            props.players.map((pid) => {
              return [
                pid,
                meta.rounds.reduce(
                  ({ score, turns, turnsTaken, lastPlayedRound }, r, i) => {
                    const val = turnValues.value.get(turnKey(pid, i));
                    const data = r.turnData(val, score, pid, i);
                    score += data.deltaScore;
                    if (r.type === "indexed-stats") {
                      // || r.type === "keyed-stats") {
                      turns.set(i, data);
                    }
                    if (val !== undefined) {
                      turnsTaken.add(data);
                      lastPlayedRound = i;
                    }
                    return { score, turns, turnsTaken, lastPlayedRound };
                  },
                  {
                    score: meta.startScore(pid),
                    turns: new Map<number, TurnData<V, RS>>(),
                    turnsTaken: new Set<TurnData<V, RS>>(),
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
              const { score, turns, turnsTaken } = playerScores.value.get(playerId)!;
              const position = playerPositions.value.playerLookup.get(playerId)!;
              const statsAccumulator = gameStatsFactory();
              turns.forEach(({ stats, roundIndex }) =>
                statsAccumulator.addRound(roundIndex, stats!),
              );
              return [
                playerId,
                {
                  playerId,
                  complete: false, //TODO: complete: pRounds.size === rounds.value.length
                  score,
                  turns,
                  position: position.pos,
                  tied: position.players.filter((p) => p !== playerId),
                  stats: statsAccumulator.result({
                    all: [...turns.values()],
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
                <th class={playerNameClass(data)}>{playerStore.playerName(pid).value}</th>
              ))}
            </tr>
            {posRow("head")}
          </thead>
          <tbody>
            {posRow("body")}
            {meta.rounds.map((r, idx) => {
              const playerRowData = props.players.map(
                (pid) => playerScores.value.get(pid)!.turns.get(idx)!,
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
                              emit("turnTaken", pData);
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
              {slots.footer ? slots.footer() : undefined}
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
      // emits: {
      //   /* eslint-disable @typescript-eslint/no-unused-vars */
      //   playerCompleted: (playerId: string, completed: boolean) => true,
      //   completed: (completed: boolean) => true,
      //   turnTaken: (
      //     playerId: string,
      //     roundId: RoundKey<T>,
      //     turnData: TurnData<RoundValue<T, RoundKey<T>>>,
      //   ) => true,
      //   /** Emitted only when the entire game is complete, then each time the result changes */
      //   ["update:gameResult"]: (result: Map<string, PlayerDataComplete<T>>) => true,
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
      //   /* eslint-enable @typescript-eslint/no-unused-vars */
      // },
    },
  );
};
