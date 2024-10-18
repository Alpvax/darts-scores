import { computed, defineComponent, ref, type PropType, type VNodeChild, type VNodeRef } from "vue";
import type { GameDefinition, GameTurnStatsType } from "../definition";
import type { ComparisonResult, PlayerSummaryValues, SummaryAccumulatorParts } from ".";
import PlayerName from "@/components/PlayerName";
import { extendClass, mapObjectValues, type ClassBindings } from "@/utils";
import { autoUpdate, flip, useFloating } from "@floating-ui/vue";
import type { ContextMenuItem } from "@/components/contextmenu";
import { type NormalisedSummaryRowsDef } from "./display/v1";
import { getVDNumFormat, makeRowHighlightFn, type HighlightFn } from "./display";
import type { SummaryFieldRow, SummaryRow } from "./display/v2";

export type RoundRowsMeta<
  G extends GameDefinition<any, any, any, any, any, any, any, any, any>,
  RoundsField extends string,
> = {
  field: RoundsField;
  display?:
    | Intl.NumberFormatOptions
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
          NormalisedSummaryRowsDef<any, PlayerSummaryValues<G, SummaryPartTypes, RoundsField>>[]
          // SummaryFieldDef<number, PlayerSummaryValues<G, SummaryPartTypes, RoundsField>>[]
        >,
        required: true,
      },
      fieldDataV2: {
        type: Array as PropType<
          SummaryFieldRow<PlayerSummaryValues<G, SummaryPartTypes, RoundsField>>[]
          // SummaryFieldDef<number, PlayerSummaryValues<G, SummaryPartTypes, RoundsField>>[]
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
        fieldsV2: new Set<string>(),
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
        props.fieldData.map(({ rows: simpleRows, ...def }, idx) => {
          const expandable = def.extended !== undefined;
          const expanded = expandable && expandedRows.value.fields.has(idx);
          const rows = expanded ? def.extended!.rows : simpleRows;
          return {
            ...props.players.reduce(
              (acc, pid) => {
                const summary = props.summaries.get(pid);
                if (summary) {
                  const values = def.fields.getValues(summary, pid);
                  const pDelta = props.deltaGame?.get(pid);
                  const deltaVals = pDelta !== undefined ? def.fields.getValues(pDelta, pid) : {};
                  for (const [key, cmp] of Object.entries(def.fields.cmp) as [
                    keyof typeof values & string,
                    (a: number, b: number) => number,
                  ][]) {
                    const value = values[key];
                    const limits = acc.fieldLimits.get(key);
                    if (limits) {
                      if (cmp(value, limits.highest) > 0) {
                        limits.highest = value;
                      }
                      if (cmp(value, limits.lowest) < 0) {
                        limits.lowest = value;
                      }
                    } else {
                      acc.fieldLimits.set(key, {
                        highest: value,
                        lowest: value,
                      });
                    }
                  }
                  for (const row of acc.rows) {
                    row.playerValues.push({
                      pid,
                      display: () => row.display(values, deltaVals),
                      highlight: (limits) =>
                        row.highlight(values, limits.get(row.cmpField(values))!),
                      tooltip: row.valueTooltip
                        ? () => row.valueTooltip!(values, deltaVals)
                        : undefined,
                    });
                  }
                }
                return acc;
              },
              {
                fieldLimits: new Map<
                  string,
                  {
                    highest: number;
                    lowest: number;
                  }
                >(),
                rows: rows.map((r) => ({
                  ...r,
                  playerValues: [] as {
                    pid: string;
                    display: () => VNodeChild;
                    highlight: (
                      limits: Map<
                        string,
                        {
                          highest: number;
                          lowest: number;
                        }
                      >,
                    ) => ClassBindings;
                    tooltip?: () => VNodeChild;
                    // value: number;
                    // delta?: { val: number; direction: ComparisonResult | "neutral" };
                  }[],
                })),
              },
            ),
            ...def,
            expandable,
            expanded,
            expandedLabel: expanded ? def.extended?.label : undefined,
          };
        }),
      );

      const fieldDataV2 = computed(() =>
        props.fieldDataV2.map((def, gpIdx) => {
          const label = typeof def.label === "function" ? def.label(false) : def.label;
          if (def.group) {
            const expandable = !def.noExpand;
            const expanded = expandable && expandedRows.value.fieldsV2.has(def.group);
            return {
              expandable,
              expanded,
              toggleExpansion: expandable
                ? (e: MouseEvent) => {
                    if (expanded) {
                      expandedRows.value.fieldsV2.delete(def.group);
                    } else {
                      expandedRows.value.fieldsV2.add(def.group);
                    }
                    //TODO: TooltipStack
                    tooltipContent.value = undefined;
                    hoveredEl.value = undefined;
                  }
                : () => {},
              groupHeader: expanded ? (
                <tr
                  class="parentRow expandableRow"
                  data-summary-row={`${def.group}:HEADER_ROW`}
                  onMouseover={(e) => {
                    //TODO: TooltipStack
                    if (def.groupTooltip) {
                      tooltipContent.value = def.groupTooltip();
                      hoveredEl.value = e.currentTarget as HTMLElement;
                    }
                  }}
                  onMouseleave={() => {
                    //TODO: TooltipStack
                    tooltipContent.value = undefined;
                    hoveredEl.value = undefined;
                  }}
                  onClick={() => {
                    expandedRows.value.fieldsV2.delete(def.group);
                  }}
                >
                  <th class="rowLabel">{label}</th>
                  <td
                    class="expandedRowFiller"
                    colspan={
                      props.players.filter((pid) => props.summaries.get(pid) !== undefined).length
                    }
                  ></td>
                </tr>
              ) : undefined,
              rows: def.rows.flatMap(
                (
                  { key, showDefault, showExtended, display, fieldTooltip, valueTooltip, ...row },
                  idx,
                ) => {
                  // Filter out rows that should be hidden in current state
                  if (expanded ? !showExtended : !showDefault) {
                    return [];
                  }
                  const label = typeof row.label === "function" ? row.label(expanded) : row.label;

                  const highlightMeta = makeRowHighlightFn(row.highlight);
                  const { playerValues, ...limits } = props.players.reduce(
                    (acc, pid) => {
                      const summary = props.summaries.get(pid);
                      const pDelta = props.deltaGame?.get(pid);
                      if (summary) {
                        let highlight: ReturnType<HighlightFn<number[]>> = () => undefined;
                        if (highlightMeta) {
                          const vals = highlightMeta.getVal(summary, pid);
                          if (
                            acc.best.length < 1 ||
                            highlightMeta.cmp(vals, acc.best) === "better"
                          ) {
                            acc.best = [...vals];
                          }
                          if (
                            acc.worst.length < 1 ||
                            highlightMeta.cmp(vals, acc.worst) === "worse"
                          ) {
                            acc.worst = [...vals];
                          }
                          highlight = highlightMeta.fn(vals);
                        }
                        acc.playerValues.push((limits) => (
                          <td
                            class={extendClass(highlight(limits), "summaryValue")}
                            onMouseover={(e) => {
                              //TODO: TooltipStack
                              if (valueTooltip) {
                                tooltipContent.value = valueTooltip(summary, pDelta ?? {}, pid);
                                hoveredEl.value = e.target as HTMLElement;
                              }
                            }}
                            onMouseleave={() => {
                              //TODO: TooltipStack
                              if (valueTooltip) {
                                tooltipContent.value = undefined;
                                hoveredEl.value = undefined;
                              }
                            }}
                            onClick={(e) => {
                              if (import.meta.env.DEV && e.ctrlKey) {
                                console.log("[SUMMARY VALUE CLICK]", {
                                  row: `${def.group}:${key ?? idx}`,
                                  player: pid,
                                  summary,
                                  pDelta,
                                });
                              }
                            }}
                          >
                            {display.display(summary, pDelta, pid)}
                          </td>
                        ));
                      }
                      return acc;
                    },
                    {
                      best: [] as number[],
                      worst: [] as number[],
                      playerValues: [] as ((limits: {
                        best: number[];
                        worst: number[];
                      }) => VNodeChild)[],
                    },
                  );
                  return [
                    {
                      key: `${def.group}:${key ?? (["string", "number"].includes(typeof label) ? label : idx)}`,
                      label,
                      limits,
                      playerValues,
                      fieldTooltip,
                    },
                  ];
                },
              ),
              //TODO: groupTooltip
            };
          } else {
            const row = def as SummaryRow<PlayerSummaryValues<G, SummaryPartTypes, RoundsField>>;
            const highlightMeta = makeRowHighlightFn(row.highlight);
            const { playerValues, ...limits } = props.players.reduce(
              (acc, pid) => {
                const summary = props.summaries.get(pid);
                const pDelta = props.deltaGame?.get(pid) ?? {};
                if (summary) {
                  let highlight: ReturnType<HighlightFn<number[]>> = () => undefined;
                  if (highlightMeta) {
                    const vals = highlightMeta.getVal(summary, pid);
                    if (acc.best.length < 1 || highlightMeta.cmp(vals, acc.best) === "better") {
                      acc.best = [...vals];
                    }
                    if (acc.worst.length < 1 || highlightMeta.cmp(vals, acc.worst) === "worse") {
                      acc.worst = [...vals];
                    }
                    highlight = highlightMeta.fn(vals);
                  }
                  acc.playerValues.push((limits) => (
                    <td
                      class={extendClass(highlight(limits), "summaryValue")}
                      onMouseover={(e) => {
                        //TODO: TooltipStack
                        if (row.valueTooltip) {
                          tooltipContent.value = row.valueTooltip(summary, pDelta, pid);
                          hoveredEl.value = e.target as HTMLElement;
                        }
                      }}
                      onMouseleave={() => {
                        //TODO: TooltipStack
                        if (row.valueTooltip) {
                          tooltipContent.value = undefined;
                          hoveredEl.value = undefined;
                        }
                      }}
                      onClick={(e) => {
                        if (import.meta.env.DEV && e.ctrlKey) {
                          console.log("[SUMMARY VALUE CLICK]", {
                            row: row.key ?? gpIdx,
                            player: pid,
                            summary,
                            pDelta,
                          });
                        }
                      }}
                    >
                      {row.display.display(summary, pDelta, pid)}
                    </td>
                  ));
                }
                return acc;
              },
              {
                best: [] as number[],
                worst: [] as number[],
                playerValues: [] as ((limits: { best: number[]; worst: number[] }) => VNodeChild)[],
              },
            );
            return {
              expandable: false,
              expanded: false,
              toggleExpansion: (e: MouseEvent) => {},
              groupHeader: undefined,
              rows: [
                {
                  key: row.key ?? (["string", "number"].includes(typeof label) ? label : gpIdx),
                  label,
                  limits,
                  playerValues,
                  fieldTooltip: row.fieldTooltip,
                },
              ],
            };
          }
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
                const playerData = props.players.reduce(
                  (acc, pid) => {
                    const summary = props.summaries.get(pid);
                    if (summary) {
                      const roundKey = key as keyof typeof summary.rounds.valuesRaw;
                      const pDelta = props.deltaGame?.get(pid);
                      for (const [k, { get, delta, cmp }] of Object.entries(parts.rounds.meta) as [
                        RoundsField,
                        (typeof parts.rounds.meta)[RoundsField],
                      ][]) {
                        const value = get(summary.rounds.valuesRaw[roundKey], {
                          numGames: summary.numGames,
                          roundKey,
                        });
                        const fav = summary.rounds.favourites[props.roundsFields!.field];
                        const deltaVal =
                          pDelta !== undefined
                            ? delta
                              ? delta(summary.rounds.valuesRaw[roundKey], {
                                  numGames: summary.numGames,
                                  roundKey,
                                })
                              : get(pDelta.rounds.valuesRaw[roundKey], {
                                  numGames: summary.numGames + pDelta.numGames,
                                  fullValues: summary.rounds.valuesRaw[roundKey],
                                  roundKey,
                                })
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
        } else if ([...Object.values(display)].every((v) => typeof v !== "function")) {
          const { value, delta } = getVDNumFormat(display as Intl.NumberFormatOptions);
          return {
            value: (_f, v) => value.format(v),
            delta: (_f, d) => delta.format(d),
          };
        } else {
          const lookup = display as Record<
            RoundsField,
            (value: number, delta?: number) => VNodeChild
          >;
          return {
            value: (f, v) => (lookup[f] ? lookup[f](v) : v),
            delta: (f, d, v) => (lookup[f] ? lookup[f](v, d) : v),
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
              {/*fieldData.value.flatMap(
                ({ expandable, expanded, expandedLabel, fieldLimits, rows }, idx) => {
                  let parentRow: VNodeChild | undefined = undefined;
                  if (expanded) {
                    const label = expandedLabel!();
                    parentRow = (
                      <tr
                        class="parentRow expandableRow"
                        data-summary-row={label}
                        onMouseleave={() => {
                          tooltipContent.value = undefined;
                          hoveredEl.value = undefined;
                        }}
                        onClick={() => {
                          if (expanded) {
                            expandedRows.value.fields.delete(idx);
                          } else {
                            expandedRows.value.fields.add(idx);
                          }
                          tooltipContent.value = undefined;
                          hoveredEl.value = undefined;
                        }}
                      >
                        <th class="rowLabel">{label}</th>
                        <td
                          class="expandedRowFiller"
                          colspan={expanded ? props.players.length : 1}
                        ></td>
                      </tr>
                    );
                  }
                  return [
                    parentRow,
                    ...rows.map((r) => {
                      const label = r.label();
                      return (
                        <>
                          <tr
                            class={{
                              expandableRow: expandable && !expanded,
                              childRow: expanded,
                            }}
                            data-summary-row={label}
                            onMouseover={(e) => {
                              if (r.fieldTooltip) {
                                tooltipContent.value = r.fieldTooltip();
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
                              } else if (expandable) {
                                expandedRows.value.fields.add(idx);
                              }
                              tooltipContent.value = undefined;
                              hoveredEl.value = undefined;
                            }}
                          >
                            <th class="rowLabel">{label}</th>
                            {r.playerValues.map(({ pid, display, highlight, tooltip }) => {
                              // const hasDelta = deltaFmt !== null && delta !== undefined && delta !== 0;
                              return (
                                <td
                                  class={extendClass(highlight(fieldLimits), "summaryValue")}
                                  onMouseover={(e) => {
                                    if (tooltip) {
                                      tooltipContent.value = tooltip();
                                      hoveredEl.value = e.target as HTMLElement;
                                    }
                                  }}
                                  onMouseleave={() => {
                                    if (tooltip) {
                                      tooltipContent.value = undefined;
                                      hoveredEl.value = undefined;
                                    }
                                  }}
                                >
                                  {display()}
                                </td>
                              );
                            })}
                          </tr>
                        </>
                      );
                    }),
                  ];
                },
              )*/}
              {fieldDataV2.value.map(
                ({ expandable, expanded, groupHeader, rows, toggleExpansion }) => [
                  groupHeader,
                  ...rows.map(({ key, label, limits, playerValues, fieldTooltip }) => (
                    <tr
                      class={{
                        expandableRow: expandable && !expanded,
                        childRow: expanded,
                      }}
                      data-summary-row={key}
                      onMouseover={(e) => {
                        if (fieldTooltip) {
                          //TODO: TooltipStack
                          tooltipContent.value = fieldTooltip();
                          hoveredEl.value = e.currentTarget as HTMLElement;
                        }
                      }}
                      onMouseleave={() => {
                        //TODO: TooltipStack
                        tooltipContent.value = undefined;
                        hoveredEl.value = undefined;
                      }}
                      onClick={toggleExpansion}
                    >
                      <th class="rowLabel">{label}</th>
                      {playerValues.map((f) => f(limits))}
                    </tr>
                  )),
                ],
              )}
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
                            ({ best, favourite, value, delta, pid }) => (
                              <td
                                class={extendClass(
                                  { favourite, best },
                                  "summaryValue",
                                  "roundSummaryValue",
                                )}
                                onClick={(e) => {
                                  if (import.meta.env.DEV && e.ctrlKey) {
                                    console.log("[SUMMARY ROUND VALUE CLICK]", {
                                      row: key,
                                      player: pid,
                                      value,
                                      delta,
                                      best,
                                      favourite,
                                    });
                                  }
                                }}
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
                              {playerVals.map(({ best, favourite, value, delta, pid }) => (
                                <td
                                  class={extendClass(
                                    { favourite, best },
                                    "summaryValue",
                                    "roundSummaryValue",
                                  )}
                                  onClick={(e) => {
                                    if (import.meta.env.DEV && e.ctrlKey) {
                                      console.log("[SUMMARY ROUND VALUE CLICK]", {
                                        row: key,
                                        player: pid,
                                        value,
                                        delta,
                                        best,
                                        favourite,
                                      });
                                    }
                                  }}
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
