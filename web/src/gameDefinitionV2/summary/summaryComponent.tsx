import { computed, defineComponent, ref, type PropType, type VNodeChild, type VNodeRef } from "vue";
import type { GameDefinition, GameTurnStatsType } from "../definition";
import type { PlayerSummaryValues, SummaryFieldDef } from ".";
import PlayerName from "@/components/PlayerName";
import { extendClass } from "@/utils";
import { autoUpdate, flip, useFloating } from "@floating-ui/vue";

export type RoundRowsMeta<
  G extends GameDefinition<any, any, any, any, any, any, any, any, any>,
  FavFields extends string,
> = {
  field: FavFields;
  display?: (value: number) => VNodeChild;
  rows: {
    key: [GameTurnStatsType<G>] extends [
      infer RoundStats extends
        | Record<any, Record<any, number | boolean>>
        | Record<any, number | boolean>[],
    ]
      ? keyof {
          [K in keyof RoundStats & (string | number) as `round.${K}`]: any;
        }
      : never;
    label: string;
  }[];
};

export const createSummaryComponent = <
  G extends GameDefinition<any, any, any, any, any, any, any, any, any>,
  SummaryPartTypes extends { [k: string]: any } & {
    score?: never;
    wins?: never;
    numGames?: never;
    rounds?: never;
  },
  FavFields extends string,
>() =>
  defineComponent({
    props: {
      /** The players to display columns for, in order */
      players: { type: Array as PropType<string[]>, required: true },
      summaries: {
        type: Object as PropType<Map<string, PlayerSummaryValues<G, SummaryPartTypes, FavFields>>>,
        required: true,
      },
      fieldData: {
        type: Array as PropType<
          SummaryFieldDef<number, PlayerSummaryValues<G, SummaryPartTypes, FavFields>>[]
        >,
        required: true,
      },
      roundsFields: {
        type: Object as PropType<RoundRowsMeta<G, FavFields> | undefined>,
        default: undefined,
      },
    },
    setup: (props, { slots }) => {
      const fieldData = computed(() =>
        props.fieldData.map((def) => {
          return {
            ...[...props.players].reduce(
              (acc, pid) => {
                const summary = props.summaries.get(pid);
                if (summary) {
                  const value = def.value(summary, pid);
                  if (def.cmp(value, acc.highest) > 0) {
                    acc.highest = value;
                  }
                  if (def.cmp(value, acc.lowest) < 0) {
                    acc.lowest = value;
                  }
                  acc.playerValues.push({ pid, value });
                }
                //TODO: add empty summaries?
                return acc;
              },
              {
                highest: Number.MIN_SAFE_INTEGER,
                lowest: Number.MAX_SAFE_INTEGER,
                playerValues: [] as { pid: string; value: number; delta?: number }[],
              },
            ),
            ...def,
          };
        }),
      );

      const bestFav = computed(() =>
        props.roundsFields === undefined
          ? undefined
          : props.players.reduce((best, pid) => {
              const summary = props.summaries.get(pid);
              if (summary) {
                return Math.max(
                  summary.rounds.favouritesSpecified[props.roundsFields!.field]!.value /
                    summary.numGames,
                  best,
                );
              }
              return best;
            }, 0),
      );

      const roundsData = computed(() =>
        props.roundsFields === undefined
          ? undefined
          : props.roundsFields.rows.reduce(
              (rows, { key, label }) => {
                const playerData = [...props.players].flatMap((pid) => {
                  const summary = props.summaries.get(pid);
                  if (summary) {
                    const roundKey = key as keyof typeof summary.rounds.values;
                    const value: number =
                      // summary.rounds.values[roundKey][props.roundsFields!.field].perGameMean;
                      summary.rounds.values[roundKey].hits.perGameMean; //TODO use dynamic fields
                    const favVal =
                      summary.rounds.favouritesSpecified[props.roundsFields!.field]?.value;
                    return [
                      {
                        pid,
                        value,
                        favourite:
                          favVal !== undefined &&
                          Math.round((value - favVal / summary.numGames) * 100) === 0,
                        best:
                          bestFav.value !== undefined &&
                          Math.round((value - bestFav.value) * 100) === 0,
                      },
                    ];
                  }
                  //TODO: add empty summaries?
                  return [];
                });
                rows.push({
                  key,
                  label,
                  playerData,
                });
                return rows;
              },
              [] as {
                key: RoundRowsMeta<G, FavFields>["rows"][number]["key"];
                label: string;
                playerData: {
                  pid: string;
                  value: number;
                  delta?: number;
                  favourite: boolean;
                  best: boolean;
                }[];
              }[],
            ),
      );

      const hoveredEl = ref<HTMLElement>();
      const tooltipEl = ref<VNodeRef | null>(null);

      const { floatingStyles } = useFloating(hoveredEl, tooltipEl, {
        placement: "bottom",
        middleware: [
          flip(),
          // shift({
          //   mainAxis: true,
          //   crossAxis: true,
          // }),
        ],
        whileElementsMounted: autoUpdate,
      });
      const tooltipContent = ref<VNodeChild>();

      return () => (
        <>
          <table id="gameSummaryTable">
            <thead>
              <tr>
                {slots.topLeftCell ? slots.topLeftCell() : <th>&nbsp;</th>}
                {props.players.flatMap((pid) =>
                  /*props.includeAllPlayers ||*/ props.summaries.has(pid)
                    ? [<PlayerName tag="th" playerId={pid} class="playerName" />]
                    : [],
                )}
              </tr>
            </thead>
            <tbody>
              {fieldData.value.map(
                ({
                  label,
                  highest,
                  lowest,
                  playerValues,
                  highlight,
                  displayCompact,
                  description,
                  extended,
                }) => (
                  <tr
                    data-summary-row={label /*path*/}
                    onMouseover={(e) => {
                      if (description) {
                        tooltipContent.value = description();
                        hoveredEl.value = e.currentTarget as HTMLElement;
                      }
                    }}
                    onMouseleave={(e) => {
                      tooltipContent.value = undefined;
                      hoveredEl.value = undefined;
                    }}
                  >
                    <th class="rowLabel">{label}</th>
                    {playerValues.map(({ pid, value, delta }) => {
                      // const hasDelta = deltaFmt !== null && delta !== undefined && delta !== 0;
                      return (
                        <td
                          class={extendClass(highlight(value, { highest, lowest }), "summaryValue")}
                          onMouseover={(e) => {
                            if (extended) {
                              tooltipContent.value = extended(value, props.summaries.get(pid)!);
                              hoveredEl.value = e.target as HTMLElement;
                            }
                          }}
                          onMouseleave={(e) => {
                            if (extended) {
                              tooltipContent.value = undefined;
                              hoveredEl.value = undefined;
                            }
                          }}
                        >
                          {displayCompact(value, delta, props.summaries.get(pid)!)}
                          {/*TODO: extended click/hover display*/}
                        </td>
                      );
                    })}
                  </tr>
                ),
              )}
              {roundsData.value === undefined
                ? undefined
                : roundsData.value.map(({ key, label, playerData }) => (
                    <tr data-summary-row={`${key as string}.${props.roundsFields!.field}`}>
                      <th class="rowLabel">{label}</th>
                      {playerData.map(({ best, favourite, value }) => (
                        <td class={extendClass({ favourite, best }, "summaryValue")}>
                          {(props.roundsFields!.display ?? ((val) => val))(value)}
                        </td>
                      ))}
                    </tr>
                  ))}
            </tbody>
          </table>
          {tooltipContent.value ? (
            <div
              ref={tooltipEl}
              id="gameSummaryTableTooltip"
              class="tooltip"
              style={floatingStyles.value}
            >
              {tooltipContent.value}
            </div>
          ) : undefined}
        </>
      );
    },
  });
