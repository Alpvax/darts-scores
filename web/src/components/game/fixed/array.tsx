import { extendClass, type ClassBindings } from "@/utils";
import {
  hasStats,
  makeMoveFocusFactory,
  type Round,
  type RoundNoStats,
  type RoundWStats,
  type TurnStats,
} from "@/gameUtils/round";
import { computed, defineComponent, ref, type PropType, onMounted } from "vue";
import {
  makePlayerPositions,
  type DisplayPosRowPositions,
  type PlayerDataBase,
  type PositionsOrder,
} from "@/gameUtils/playerData";
import { usePlayerStore } from "@/stores/player";

type GameMetaBase = {
  /**
   * The start score for each game.
   * Can use a factory function to allow for player handicaps.
   */
  startScore: number | ((playerId: string) => number);
  /**
   * Which direction to sort the positions<br/>
   * `"lowestFirst"` means the player(s) with the lowest score are in first place.<br/>
   * `"highestFirst"` means the player(s) with the highest score are in first place.<br/>
   */
  positionOrder: PositionsOrder;
};
type GameMetaNoRS<V> = GameMetaBase & {
  /** The list of rounds for the game. Probably use `@/gameUtils/round.arrayRoundsBuilder`*/
  rounds: Iterable<RoundNoStats<V>> | Iterator<RoundNoStats<V>>;
};
type GameMetaWithRS<V, RS extends TurnStats> = GameMetaBase & {
  /** The list of rounds for the game. Probably use `@/gameUtils/round.arrayRoundsBuilder`*/
  rounds: Iterable<RoundWStats<V, RS>> | Iterator<RoundWStats<V, RS>>;
};
type GameMetaNoStats<V> = GameMetaNoRS<V> & {
  playerNameClass?: (data: PlayerDataNoStats<V, RoundNoStats<V>>) => ClassBindings;
};
type GameMetaWithRSNoGS<V, RS extends TurnStats> = GameMetaWithRS<V, RS> & {
  playerNameClass?: (data: PlayerDataNoStats<V, RoundWStats<V, RS>>) => ClassBindings;
};
type GameMetaNoRSWithGS<V, GS extends Record<string, any>> = GameMetaNoRS<V> & {
  gameStats: (data: PlayerDataNoStats<V, RoundNoStats<V>>) => GS;
  playerNameClass?: (data: PlayerDataWStats<V, RoundNoStats<V>, GS>) => ClassBindings;
};
type GameMetaWithBothStats<
  V,
  RS extends TurnStats,
  GS extends Record<string, any>,
> = GameMetaWithRS<V, RS> & {
  gameStats: (data: PlayerDataNoStats<V, RoundWStats<V, RS>>) => GS;
  playerNameClass?: (data: PlayerDataWStats<V, RoundWStats<V, RS>, GS>) => ClassBindings;
};
type GameMetaAny<V, RS extends TurnStats, GS extends Record<string, any>> =
  | GameMetaNoStats<V>
  | GameMetaWithRSNoGS<V, RS>
  | GameMetaNoRSWithGS<V, GS>
  | GameMetaWithBothStats<V, RS, GS>;

export type PlayerDataNoStats<V, R extends Round<V, any>> = PlayerDataBase & {
  /**
   * A map of the completed rounds, with non completed rounds missing from the map. <br/>
   * If the rounds have stats, the values will be an object of `{ value: V; stats: S }`.
   * Otherwise, the values will be `V`.
   */
  rounds: Map<number, R extends RoundWStats<any, infer S> ? { value: V; stats: S } : V>;
};
export type PlayerDataWStats<
  V,
  R extends Round<V, any>,
  S extends Record<string, any>,
> = PlayerDataNoStats<V, R> & {
  /** Combined stats for the entire game */
  gameStats: S;
};

function hasGameStats(
  playerData: PlayerDataNoStats<any, any> | PlayerDataWStats<any, any, any>,
): playerData is PlayerDataWStats<any, any, any>;
function hasGameStats<V, RS extends TurnStats, GS extends Record<string, any>>(
  gameMeta: GameMetaAny<V, RS, GS>,
): gameMeta is GameMetaNoRSWithGS<V, GS> | GameMetaWithBothStats<V, RS, GS>;
function hasGameStats<S>(arg: any): arg is { gameStats: S } {
  return Object.hasOwn(arg, "gameStats");
}

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

export function createComponent<V>(meta: GameMetaNoStats<V>): any;
export function createComponent<V, RS extends TurnStats>(meta: GameMetaWithRSNoGS<V, RS>): any;
export function createComponent<V, GS extends Record<string, any>>(
  meta: GameMetaNoRSWithGS<V, GS>,
): any;
export function createComponent<V, RS extends TurnStats, GS extends Record<string, any>>(
  meta: GameMetaWithBothStats<V, RS, GS>,
): any;
export function createComponent<V, RS extends TurnStats = {}, GS extends Record<string, any> = {}>(
  meta: GameMetaAny<V, RS, GS>,
) {
  type RoundT = Required<
    (typeof meta)["rounds"] extends Iterable<infer R> | Iterator<infer R> ? R : never
  >;
  type PlayerData = typeof meta extends { gameStats: any }
    ? PlayerDataWStats<V, RoundT, GS>
    : PlayerDataNoStats<V, RoundT>;
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
  const startScore: (playerId: string) => number =
    typeof meta.startScore === "function" ? meta.startScore : () => meta.startScore as number;

  const turnKey = (playerId: string, roundIdx: number) => `${playerId}:${roundIdx}`;

  return defineComponent(
    (props, { slots, emit }) => {
      const rounds = ref([] as RoundT[]);
      if (Array.isArray(meta.rounds)) {
        rounds.value = meta.rounds.map((r: RoundT) => {
          const { display, label, deltaScore, inputFocusSelector } = r;
          const base = { display, label, deltaScore, inputFocusSelector };
          if (hasStats(r)) {
            return {
              ...base,
              stats: r.stats,
              rowClass: r.rowClass ?? (() => ""),
              cellClass: r.cellClass ?? (() => ""),
            } as RoundT;
          } else {
            return {
              ...base,
              rowClass: r.rowClass ?? (() => ""),
              cellClass: r.cellClass ?? (() => ""),
            } as RoundT;
          }
        });
      } else {
        console.warn("UNIMPLEMENTED: Non-array rounds (i.e. dynamic length games)"); //TODO: implement dynamic length games
      }
      const turnValues = ref(new Map<string, V>()); //TODO: set from props

      // /** Map of playerId to Map<roundIndex, value>. Untaken turns will be missing from the map */
      // const playerTurns = computed(
      //   () =>
      //     new Map(
      //       props.players.map((pid) => {
      //         const map = new Map<number, V>();
      //         for (let i = 0; i < rounds.value.length; i++) {
      //           const val = turnValues.value.get(turnKey(pid, i));
      //           if (val !== undefined) {
      //             map.set(i, val);
      //           }
      //         }
      //         return [pid, map];
      //       }),
      //     ),
      // );

      /** Map of playerId to {score, scores, values, deltascores, roundStats, lastPlayedRound} */
      const playerScores = computed(
        () =>
          new Map(
            props.players.map((pid) => {
              return [
                pid,
                rounds.value.reduce(
                  ({ score, scores, values, deltaScores, roundStats, lastPlayedRound }, r, i) => {
                    const val = turnValues.value.get(turnKey(pid, i));
                    const delta = r.deltaScore(val, pid, i);
                    score += delta;
                    scores.push(score);
                    values.push(val);
                    deltaScores.push(delta);
                    if (hasStats(r)) {
                      roundStats.push(
                        r.stats({
                          playerId: pid,
                          roundKey: i,
                          score,
                          value: val,
                          deltaScore: delta,
                        }),
                      );
                    }
                    if (val !== undefined) {
                      lastPlayedRound = i;
                    }
                    return { score, scores, values, deltaScores, roundStats, lastPlayedRound };
                  },
                  {
                    score: startScore(pid),
                    scores: [] as number[],
                    values: [] as (V | undefined)[],
                    deltaScores: [] as number[],
                    roundStats: [] as RS[],
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
              type RoundsMapVal = RoundT extends RoundWStats<V, RS> ? { value: V; stats: RS } : V;
              type RoundsMap = Map<number, RoundsMapVal>;
              const { score, scores, deltaScores, values, roundStats } =
                playerScores.value.get(playerId)!;
              const position = playerPositions.value.playerLookup.get(playerId)!;
              const pRounds: RoundsMap = new Map(
                rounds.value.flatMap((r, i) => {
                  const value = values[i];
                  return value !== undefined
                    ? [
                        [i, hasStats(r) ? { value, stats: roundStats[i] } : value] as [
                          number,
                          RoundsMapVal,
                        ],
                      ]
                    : [];
                }),
              );
              const pData: PlayerDataNoStats<V, RoundT> = {
                playerId,
                complete: false, //TODO: complete: pRounds.size === rounds.value.length
                score,
                scores,
                deltaScores,
                rounds: pRounds,
                position: position.pos,
                tied: position.players.filter((p) => p !== playerId),
              };
              return [
                playerId,
                hasGameStats(meta)
                  ? { ...pData, gameStats: (meta.gameStats as (data: typeof pData) => GS)(pData) }
                  : pData,
              ] as [string, PlayerData];
            }),
          ),
      );

      const allCompleted = computed(() =>
        //TODO: completed early for dynamic rounds
        props.players.every(
          (pid) => playerData.value.get(pid)!.rounds.size === rounds.value.length,
        ),
      );

      const { focusEmpty, create: makeMoveFocus } = makeMoveFocusFactory(
        rounds,
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
            {rounds.value.map((r, idx) => {
              const playerRowData = props.players.map((pid) => {
                const pScore = playerScores.value.get(pid)!;
                return {
                  playerId: pid,
                  roundKey: idx,
                  score: pScore.scores[idx],
                  deltaScore: pScore.deltaScores[idx],
                  value: pScore.values[idx],
                  stats: pScore.roundStats[idx],
                };
              });
              return (
                <tr class={r.rowClass(playerRowData)}>
                  <td class="rowLabel">{r.label}</td>
                  {playerRowData.map((pData, pIdx) => {
                    const cellClass = extendClass(r.cellClass(pData), "turnInput", {
                      unplayed: pData.value === undefined,
                    });
                    return (
                      <td class={cellClass} data-round-index={idx}>
                        {r.display({
                          score: pData.score,
                          deltaScore: pData.deltaScore,
                          value: computed({
                            get: () => pData.value,
                            set: (val) => {
                              turnValues.value.set(turnKey(pData.playerId, idx), val!);
                              emit("turnTaken", pData);
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
}
