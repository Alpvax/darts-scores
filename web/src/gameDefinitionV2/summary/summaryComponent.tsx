import { computed, defineComponent, ref, type PropType, type VNodeChild, type VNodeRef } from "vue";
import type { GameDefinition, GameTurnStatsType } from "../definition";
import type { PlayerSummaryValues, SummaryAccumulatorParts, SummaryFieldDef } from ".";
import PlayerName from "@/components/PlayerName";
import { extendClass, mapObjectValues } from "@/utils";
import { autoUpdate, flip, useFloating } from "@floating-ui/vue";
import type { ContextMenuItem } from "@/components/contextmenu";
import type { ComparisonResult } from "./roundStats";

const deltaDirLookup = {
  positive: (d: number) => (d > 0 ? "better" : d < 0 ? "worse" : "equal"),
  negative: (d: number) => (d > 0 ? "worse" : d < 0 ? "better" : "equal"),
  neutral: (_d: number) => "neutral",
} satisfies Record<string, (d: number) => ComparisonResult | "neutral">;

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
      deltaGame: {
        type: Object as PropType<
          Map<string, PlayerSummaryValues<G, SummaryPartTypes, RoundsField>>
        >,
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
                  const pDelta = props.deltaGame?.get(pid);
                  const deltaVal = pDelta !== undefined ? def.value(pDelta, pid) : undefined;
                  if (def.cmp(value, acc.highest) > 0) {
                    acc.highest = value;
                  }
                  if (def.cmp(value, acc.lowest) < 0) {
                    acc.lowest = value;
                  }
                  acc.playerValues.push({
                    pid,
                    value,
                    delta:
                      deltaVal !== undefined && def.deltaDirection && def.cmp(deltaVal, 0) !== 0
                        ? {
                            val: deltaVal,
                            direction:
                              typeof def.deltaDirection === "function"
                                ? def.deltaDirection(deltaVal)
                                : deltaDirLookup[def.deltaDirection](deltaVal),
                          }
                        : undefined,
                  });
                }
                return acc;
              },
              {
                highest: Number.MIN_SAFE_INTEGER,
                lowest: Number.MAX_SAFE_INTEGER,
                playerValues: [] as {
                  pid: string;
                  value: number;
                  delta?: { val: number; direction: ComparisonResult | "neutral" };
                }[],
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
                      const pDelta = props.deltaGame?.get(pid);
                      for (const [k, { get, delta, cmp }] of Object.entries(parts.rounds.meta) as [
                        RoundsField,
                        (typeof parts.rounds.meta)[RoundsField],
                      ][]) {
                        const value = get(
                          summary.rounds.valuesRaw[roundKey],
                          summary.numGames,
                          roundKey,
                        );
                        const fav = summary.rounds.favourites[props.roundsFields!.field];
                        const deltaVal =
                          pDelta !== undefined
                            ? delta
                              ? delta(
                                  summary.rounds.valuesRaw[roundKey],
                                  summary.numGames,
                                  roundKey,
                                )
                              : get(
                                  pDelta.rounds.valuesRaw[roundKey],
                                  summary.numGames + pDelta.numGames,
                                  roundKey,
                                )
                            : undefined;
                        acc[k].push({
                          pid,
                          value,
                          delta:
                            deltaVal !== undefined
                              ? { val: deltaVal, direction: cmp(deltaVal, 0) }
                              : undefined,
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
                        delta?: { val: number; direction: ComparisonResult | "neutral" };
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
                    delta?: { val: number; direction: ComparisonResult | "neutral" };
                    favourite: boolean;
                    best: boolean;
                  }[];
                };
              }[],
            ),
      );

      const roundValueDisplayFuncs = computed<{
        value: (field: RoundsField, value: number) => VNodeChild;
        delta: (field: RoundsField, delta: number, value: number) => VNodeChild;
      }>(() => {
        const display = props.roundsFields?.display;
        if (!display) {
          return {
            value: (_f, v) => v,
            delta: (_f, d) => d,
          };
        } else if (typeof display === "function") {
          return {
            value: display,
            delta: (f, d, v) => display(f, v, d),
          };
        } else if (display instanceof Intl.NumberFormat) {
          return {
            value: (_f, v) => display.format(v),
            delta: (_f, d) => display.format(d),
          };
        } else {
          return {
            value: (f, v) => (display[f] ? display[f](v) : v),
            delta: (f, d, v) => (display[f] ? display[f](v, d) : v),
          };
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
          <table
            id="gameSummaryTable"
            class={{
              hasValues: [...props.summaries.values()].some(({ numGames }) => numGames > 0),
              hasDeltas: props.deltaGame !== undefined,
            }}
          >
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
                      onMouseleave={() => {
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
                              {displayCompact(value, props.summaries.get(pid)!)}
                              {delta !== undefined ? (
                                <span
                                  class={[
                                    "summaryDeltaValue",
                                    delta.direction === "equal" ? "neutral" : delta.direction,
                                  ]}
                                >
                                  {displayCompact(delta.val, props.deltaGame!.get(pid)!)}
                                </span>
                              ) : undefined}
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
                                const pDelta = props.deltaGame?.get(pid);
                                const deltaVal =
                                  pDelta !== undefined ? child.value(pDelta, pid) : undefined;
                                if (child.cmp(val, acc.highest) > 0) {
                                  acc.highest = val;
                                }
                                if (child.cmp(val, acc.lowest) < 0) {
                                  acc.lowest = val;
                                }
                                acc.values.push({
                                  pid,
                                  value: val,
                                  delta:
                                    deltaVal !== undefined &&
                                    child.deltaDirection &&
                                    child.cmp(deltaVal, 0) !== 0
                                      ? {
                                          val: deltaVal,
                                          direction:
                                            typeof child.deltaDirection === "function"
                                              ? child.deltaDirection(deltaVal)
                                              : deltaDirLookup[child.deltaDirection](deltaVal),
                                        }
                                      : undefined,
                                });
                              }
                              return acc;
                            },
                            {
                              highest: Number.MIN_SAFE_INTEGER,
                              lowest: Number.MAX_SAFE_INTEGER,
                              values: [] as {
                                pid: string;
                                value: number;
                                delta?: { val: number; direction: ComparisonResult | "neutral" };
                              }[],
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
                                    {child.displayCompact(value, props.summaries.get(pid)!)}
                                    {delta !== undefined ? (
                                      <span
                                        class={[
                                          "summaryDeltaValue",
                                          delta.direction === "equal" ? "neutral" : delta.direction,
                                        ]}
                                      >
                                        {child.displayCompact(
                                          delta.val,
                                          props.deltaGame!.get(pid)!,
                                        )}
                                      </span>
                                    ) : undefined}
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
                                {roundValueDisplayFuncs.value.value(
                                  props.roundsFields!.field,
                                  value,
                                )}
                                {delta !== undefined && delta.direction !== "equal" ? (
                                  <span class={["summaryDeltaValue", delta.direction]}>
                                    {roundValueDisplayFuncs.value.delta(
                                      props.roundsFields!.field,
                                      delta.val,
                                      value,
                                    )}
                                  </span>
                                ) : undefined}
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
                                  {roundValueDisplayFuncs.value.value(k, value)}
                                  {delta !== undefined && delta.direction !== "equal" ? (
                                    <span class={["summaryDeltaValue", delta.direction]}>
                                      {roundValueDisplayFuncs.value.delta(
                                        props.roundsFields!.field,
                                        delta.val,
                                        value,
                                      )}
                                    </span>
                                  ) : undefined}
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
