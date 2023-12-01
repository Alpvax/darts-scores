import type { TurnData } from "@/gameUtils/roundDeclaration";
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
  S extends SummaryEntry<T, P>,
  T extends TurnData<any, any, any>,
  P extends PlayerRequirements = { all: "*" },
>(
  summaryFactory: SummaryAccumulatorFactory<S, T, P>,
  defaultFields: SummaryFieldKeys<S, T, P>[],
  decimalFormat = new Intl.NumberFormat(undefined, {
    style: "decimal",
    maximumFractionDigits: 2,
  }),
) => {
  return defineComponent(
    (props, { slots }) => {
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
                  {props.players
                    .flatMap((pid) => playerStats.value.get(pid) ?? [])
                    .map((stats) => {
                      let val: any = stats;
                      for (const p of parts) {
                        val = val[p];
                      }
                      return <td>{decimalFormat.format(val)}</td>;
                    })}
                </tr>
              );
            })}
          </tbody>
        </table>
      );
    },
    {
      props: {
        players: { type: Array as PropType<string[]>, required: true },
        games: { type: Array as PropType<GameResult<T>[]>, required: true },
        fields: { type: Array as PropType<SummaryFieldKeys<S, T, P>[]>, default: defaultFields },
      },
    },
  );
};
