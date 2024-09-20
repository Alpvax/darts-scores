import { computed, defineComponent, ref, type PropType, type VNodeChild, type VNodeRef } from "vue";
import type { GameDefinition, GameTurnStatsType } from "../definition";
import type { PlayerSummaryValues, SummaryAccumulatorParts, SummaryFieldDef } from ".";
import PlayerName from "@/components/PlayerName";
import { extendClass, mapObjectValues, type ClassBindings } from "@/utils";
import { autoUpdate, flip, useFloating } from "@floating-ui/vue";
import type { ContextMenuItem } from "@/components/contextmenu";

export type RoundRowsMeta<
  G extends GameDefinition<any, any, any, any, any, any, any, any, any>,
  RoundsField extends string,
> = {
  field: RoundsField;
  display?:
    | Intl.NumberFormat
    | ((field: RoundsField, value: number, delta?: number) => VNodeChild)
    | Record<RoundsField, (value: number, delta?: number) => VNodeChild>;
  labels?: Record<RoundsField, string>;
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
  SummaryPartTypes extends { [k: string]: [any] | [any, any] } & {
    score?: never;
    wins?: never;
    numGames?: never;
    rounds?: never;
  },
  RoundsField extends string,
>(
  parts: SummaryAccumulatorParts<G, SummaryPartTypes, RoundsField>,
) =>
  defineComponent({
    props: {
      /** The players to display columns for, in order */
      players: { type: Array as PropType<string[]>, required: true },
      summaries: {
        type: Object as PropType<
          Map<string, PlayerSummaryValues<G, SummaryPartTypes, RoundsField>>
        >,
        required: true,
      },
      fieldData: {
        type: Array as PropType<
          SummaryFieldDef<number, PlayerSummaryValues<G, SummaryPartTypes, RoundsField>>[]
        >,
        required: true,
      },
      roundsFields: {
        type: Object as PropType<RoundRowsMeta<G, RoundsField> | undefined>,
        default: undefined,
      },
    },
    emits: {
      changeRoundsField: (_field: RoundsField) => true,
    },
    setup: (props, { emit, slots }) => {
      type RoundKey = RoundRowsMeta<G, RoundsField>["rows"][number]["key"];

      const expandedRows = ref({
        fields: new Set<number>(),
        rounds: new Set<any>(),
      });

      const roundsContextMenu = computed(() => {
        const labels = props.roundsFields?.labels ?? ({} as Record<RoundsField, string>);
        return ([...Object.keys(parts.rounds.meta)] as RoundsField[]).map(
          (k) =>
            ({
              label: `Display ${labels[k] ?? k}`,
              action: () => emit("changeRoundsField", k),
            }) satisfies ContextMenuItem,
        );
      });

      const fieldData = computed(() =>
        props.fieldData.map((def, idx) => {
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
                return acc;
              },
              {
                highest: Number.MIN_SAFE_INTEGER,
                lowest: Number.MAX_SAFE_INTEGER,
                playerValues: [] as { pid: string; value: number; delta?: number }[],
              },
            ),
            ...def,
            expanded: def.displayExpanded !== undefined && expandedRows.value.fields.has(idx),
          };
        }),
      );

      const bestFav = computed(() =>
        mapObjectValues(parts.rounds.meta, ({ cmp }, k) =>
          props.players.reduce((best, pid) => {
            const fav = props.summaries.get(pid)?.rounds.favourites[k];
            if (fav && fav.valid) {
              return Number.isNaN(best)
                ? fav.value
                : cmp(fav.value, best) === "better"
                  ? fav.value
                  : best;
            }
            return best;
          }, Number.NaN),
        ),
      );

      const roundsData = computed(() =>
        props.roundsFields === undefined
          ? undefined
          : props.roundsFields.rows.reduce(
              (rows, { key, label }) => {
                const playerData = [...props.players].reduce(
                  (acc, pid) => {
                    const summary = props.summaries.get(pid);
                    if (summary) {
                      const roundKey = key as keyof typeof summary.rounds.valuesRaw;
                      for (const [k, { get, cmp }] of Object.entries(parts.rounds.meta) as [
                        RoundsField,
                        (typeof parts.rounds.meta)[RoundsField],
                      ][]) {
                        const value = get(
                          summary.rounds.valuesRaw[roundKey],
                          summary.numGames,
                          roundKey,
                        );
                        const fav = summary.rounds.favourites[props.roundsFields!.field];
                        acc[k].push({
                          pid,
                          value,
                          favourite: fav !== undefined && fav.valid && fav.rounds.has(roundKey),
                          best:
                            !Number.isNaN(bestFav.value[k]) &&
                            cmp(value, bestFav.value[k]) !== "worse",
                        });
                      }
                    }
                    return acc;
                  },
                  mapObjectValues(
                    parts.rounds.meta,
                    () =>
                      [] as {
                        pid: string;
                        value: number;
                        delta?: number;
                        favourite: boolean;
                        best: boolean;
                      }[],
                  ),
                );
                rows.push({
                  key,
                  label,
                  expanded: expandedRows.value.rounds.has(key),
                  expandable: Object.keys(parts.rounds.meta).length > 1,
                  playerData,
                });
                return rows;
              },
              [] as {
                key: RoundKey;
                label: string;
                expanded: boolean;
                expandable: boolean;
                playerData: {
                  [K in RoundsField]: {
                    pid: string;
                    value: number;
                    delta?: number;
                    favourite: boolean;
                    best: boolean;
                  }[];
                };
              }[],
            ),
      );

      const roundValueDisplayFuncs = computed<
        (field: RoundsField, value: number, delta?: number) => VNodeChild
      >(() => {
        const display = props.roundsFields?.display;
        if (!display) {
          return (_f, v) => v;
        } else if (typeof display === "function") {
          return display;
        } else if (display instanceof Intl.NumberFormat) {
          return (_f, v) => display.format(v);
        } else {
          return (f, v, d) => (display[f] ? display[f](v, d) : v);
        }
      });

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
              {fieldData.value.map((data, idx) => {
                const {
                  label,
                  highest,
                  lowest,
                  playerValues,
                  highlight,
                  displayCompact,
                  description,
                  extended,
                  expanded,
                  displayExpanded,
                } = data;
                const expandableRow = displayExpanded !== undefined;
                return (
                  <>
                    <tr
                      class={extendClass({
                        parentRow: expanded,
                        expandableRow,
                      })}
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
                      onClick={() => {
                        if (expanded) {
                          expandedRows.value.fields.delete(idx);
                        } else if (expandableRow) {
                          expandedRows.value.fields.add(idx);
                        }
                        tooltipContent.value = undefined;
                        hoveredEl.value = undefined;
                      }}
                    >
                      <th class="rowLabel">{label}</th>
                      {expanded ? (
                        <td
                          class="expandedRowFiller"
                          colspan={expanded ? playerValues.length : 1}
                        ></td>
                      ) : (
                        playerValues.map(({ pid, value, delta }) => {
                          // const hasDelta = deltaFmt !== null && delta !== undefined && delta !== 0;
                          return (
                            <td
                              class={extendClass(
                                highlight(value, { highest, lowest }),
                                "summaryValue",
                              )}
                              onMouseover={(e) => {
                                if (extended) {
                                  tooltipContent.value = extended(value, props.summaries.get(pid)!);
                                  hoveredEl.value = e.target as HTMLElement;
                                }
                              }}
                              onMouseleave={() => {
                                if (extended) {
                                  tooltipContent.value = undefined;
                                  hoveredEl.value = undefined;
                                }
                              }}
                            >
                              {displayCompact(value, delta, props.summaries.get(pid)!)}
                            </td>
                          );
                        })
                      )}
                    </tr>
                    {expanded
                      ? displayExpanded!.map((childRaw) => {
                          const child = typeof childRaw === "string" ? data : childRaw;
                          const { highest, lowest, values } = [...props.players].reduce(
                            (acc, pid) => {
                              const summary = props.summaries.get(pid);
                              if (summary) {
                                const val = child.value(summary, pid);
                                if (child.cmp(val, acc.highest) > 0) {
                                  acc.highest = val;
                                }
                                if (child.cmp(val, acc.lowest) < 0) {
                                  acc.lowest = val;
                                }
                                acc.values.push({ pid, value: val });
                              }
                              return acc;
                            },
                            {
                              highest: Number.MIN_SAFE_INTEGER,
                              lowest: Number.MAX_SAFE_INTEGER,
                              values: [] as { pid: string; value: number; delta?: number }[],
                            },
                          );
                          return (
                            <tr
                              class="childRow"
                              data-summary-row={`${label}.${child.label}`}
                              onMouseover={(e) => {
                                if (child.description) {
                                  tooltipContent.value = child.description();
                                  hoveredEl.value = e.currentTarget as HTMLElement;
                                }
                              }}
                              onMouseleave={() => {
                                tooltipContent.value = undefined;
                                hoveredEl.value = undefined;
                              }}
                              onClick={() => {
                                if (expanded) {
                                  expandedRows.value.fields.delete(idx);
                                }
                              }}
                            >
                              <th class="rowLabel">{child.label}</th>
                              {values.map(({ pid, value, delta }) => {
                                // const hasDelta = deltaFmt !== null && delta !== undefined && delta !== 0;
                                return (
                                  <td
                                    class={extendClass(
                                      child.highlight(value, { highest, lowest }),
                                      "summaryValue",
                                    )}
                                    onMouseover={(e) => {
                                      if (child.extended) {
                                        tooltipContent.value = child.extended(
                                          value,
                                          props.summaries.get(pid)!,
                                        );
                                        hoveredEl.value = e.target as HTMLElement;
                                      }
                                    }}
                                    onMouseleave={(e) => {
                                      if (child.extended) {
                                        tooltipContent.value = undefined;
                                        hoveredEl.value = undefined;
                                      }
                                    }}
                                  >
                                    {child.displayCompact(value, delta, props.summaries.get(pid)!)}
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })
                      : undefined}
                  </>
                );
              })}
              {roundsData.value === undefined
                ? undefined
                : roundsData.value.map(({ key, label, expanded, expandable, playerData }) => (
                    <>
                      <tr
                        v-context-menu={roundsContextMenu.value}
                        class={extendClass({
                          parentRow: expanded,
                          expandableRow: expandable,
                        })}
                        data-summary-row={
                          expanded ? key : `${key as string}.${props.roundsFields!.field}`
                        }
                        onClick={() => {
                          if (expanded) {
                            expandedRows.value.rounds.delete(key);
                          } else if (expandable) {
                            expandedRows.value.rounds.add(key);
                          }
                        }}
                      >
                        <th class="rowLabel">{label}</th>
                        {expanded ? (
                          <td
                            class="expandedRowFiller"
                            colspan={expanded ? playerData[props.roundsFields!.field].length : 1}
                          ></td>
                        ) : (
                          playerData[props.roundsFields!.field].map(
                            ({ best, favourite, value, delta }) => (
                              <td
                                class={extendClass(
                                  { favourite, best },
                                  "summaryValue",
                                  "roundSummaryValue",
                                )}
                              >
                                {roundValueDisplayFuncs.value(
                                  props.roundsFields!.field,
                                  value,
                                  delta,
                                )}
                              </td>
                            ),
                          )
                        )}
                      </tr>
                      {expanded
                        ? (
                            Object.entries(playerData) as [
                              RoundsField,
                              (typeof playerData)[RoundsField],
                            ][]
                          ).map(([k, playerVals]) => (
                            <tr
                              v-context-menu={roundsContextMenu.value}
                              class={extendClass(
                                { primaryChildRow: k === props.roundsFields?.field },
                                "childRow",
                              )}
                              data-summary-row={`${key as string}.${props.roundsFields!.field}`}
                              onClick={() => {
                                if (props.roundsFields?.field !== k) {
                                  emit("changeRoundsField", k);
                                }
                              }}
                            >
                              <th class="rowLabel">
                                {props.roundsFields!.labels ? props.roundsFields!.labels[k] : k}
                              </th>
                              {playerVals.map(({ best, favourite, value, delta }) => (
                                <td
                                  class={extendClass(
                                    { favourite, best },
                                    "summaryValue",
                                    "roundSummaryValue",
                                  )}
                                >
                                  {roundValueDisplayFuncs.value(k, value, delta)}
                                </td>
                              ))}
                            </tr>
                          ))
                        : undefined}
                    </>
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
