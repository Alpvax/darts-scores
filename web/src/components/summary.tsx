import type { NormalisedRound, TurnData } from "@/gameUtils/roundDeclaration";
import type {
  GameResult,
  PlayerRequirements,
  SummaryAccumulatorFactory,
  SummaryEntry,
  SummaryFieldKeys,
} from "@/gameUtils/summary";
import { usePlayerStore } from "@/stores/player";
import { computed, defineComponent, type PropType } from "vue";

export const createSummaryComponent = <
  S extends SummaryEntry<T, any, P>,
  T extends TurnData<any, any, any>,
  R extends NormalisedRound<any, any, any>,
  P extends PlayerRequirements = { all: "*" },
>(
  summaryFactory: SummaryAccumulatorFactory<S, T, any, P>,
  defaultFields: SummaryFieldKeys<S, T, P>[],
  rounds: R[],
  roundFields: T extends TurnData<any, infer RS, any> ? (stats: RS) => any : () => any,
) =>
  defineComponent({
    // @ts-ignore due to "Type instantiation is excessively deep and possibly infinite"
    props: {
      players: { type: Array as PropType<string[]>, required: true },
      games: { type: Array as PropType<GameResult<T>[]>, required: true },
      inProgressGame: { type: Object as PropType<GameResult<T> | null>, default: null },
      fields: { type: Array as PropType<SummaryFieldKeys<S, T, P>[]>, default: defaultFields },
      roundFields: {
        type: Function as PropType<
          T extends TurnData<any, infer RS, any> ? (stats: RS) => any : () => any
        >,
        default: roundFields,
      },
      decimalFormat: {
        type: Object as PropType<Intl.NumberFormat>,
        default: new Intl.NumberFormat(undefined, {
          style: "decimal",
          maximumFractionDigits: 2,
        }),
      },
    },
    setup: (props, { slots }) => {
      const playerStats = computed(() =>
        props.games.reduce((map, game) => {
          const allPlayers = [...game.results.keys()];
          game.results.forEach((pData, pid) => {
            if (!map.has(pid)) {
              map.set(pid, summaryFactory());
            }
            map.get(pid)!.addGame(pData, allPlayers, game.tiebreakWinner);
          });
          return map;
        }, new Map<string, ReturnType<typeof summaryFactory>>()),
      );

      const playerDeltas = computed(
        () =>
          new Map(
            props.inProgressGame === null
              ? undefined
              : [...playerStats.value].map(([pid, summary]) => {
                  const pData = props.inProgressGame!.results.get(pid);
                  return pData !== undefined
                    ? [pid, summary.getDeltas(pData, [...props.inProgressGame!.results.keys()])]
                    : [pid, summary.summary];
                }),
          ),
      );

      const playerStore = usePlayerStore();
      return () => (
        <table>
          <thead>
            <tr>
              {slots.topLeftCell ? slots.topLeftCell() : <th>&nbsp;</th>}
              {props.players.flatMap((pid) =>
                playerStats.value.has(pid)
                  ? [<th class="playerName">{playerStore.playerName(pid).value}</th>]
                  : [],
              )}
            </tr>
          </thead>
          <tbody>
            {props.fields.map((fieldPath) => {
              const parts = fieldPath.split(".");
              return (
                <tr>
                  <th class="rowLabel">{fieldPath}</th>
                  {props.players
                    .flatMap((pid) => {
                      const pData = playerStats.value.get(pid);
                      return pData ? { ...pData, deltas: playerDeltas.value.get(pid) } : [];
                    })
                    .map(({ summary, deltas }) => {
                      let val: any = summary;
                      let delta: any = deltas;
                      for (const p of parts) {
                        val = val[p];
                        if (deltas !== undefined) {
                          delta = delta[p];
                        }
                      }
                      return (
                        <td>
                          {props.decimalFormat.format(val)}
                          {delta !== undefined ? (
                            <span class="summaryDeltaValue">
                              {props.decimalFormat.format(delta)}
                            </span>
                          ) : undefined}
                        </td>
                      );
                    })}
                </tr>
              );
            })}
            {
              undefined /*rounds.flatMap((r) => (
              <tr class="roundSummaryRow">
                <th class="rowLabel">{r.label}</th>
                {props.players.flatMap((pid) => {
                  if (!playerStats.value.has(pid)) {
                    return [];
                  }
                  return <td>TODO: round stats</td>;
                })}
              </tr>
            ))*/
            }
          </tbody>
        </table>
      );
    },
  });
