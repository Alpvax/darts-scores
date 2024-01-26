import type { TurnData } from "@/gameUtils/roundDeclaration";
import {
  type SummaryDefinition,
  type PlayerRequirements,
  type SummaryAccumulatorFactory,
  type SummaryEntryKeys,
  SummaryFieldsKeySymbol,
  type PlayerDataForStats,
  type SummaryEntryFieldPartialGameEntry,
  type EntryDisplayMetadataSingle,
} from "@/gameUtils/summary";
import { usePlayerStore } from "@/stores/player";
import { computed, defineComponent, type PropType } from "vue";

export const createGameEntriesComponent = <
  S extends SummaryDefinition<T, any, P>,
  T extends TurnData<any, any, any>,
  P extends PlayerRequirements = { all: "*" },
  Pid extends string = string,
>(
  summaryFactory: SummaryAccumulatorFactory<S, T, any, P>,
  defaultFields: SummaryEntryKeys<S, T, P>[],
  // fieldMeta?: Record<string, SummaryFieldMeta>,
) =>
  defineComponent({
    // due to "Type instantiation is excessively deep and possibly infinite"
    // @ts-ignore
    props: {
      // @ts-ignore
      players: { type: Array as PropType<Pid[]>, default: undefined },
      gameResults: { type: Object as PropType<Map<Pid, PlayerDataForStats<T>>>, required: true },
      includeAllPlayers: { type: Boolean, default: false },
      fields: { type: Array as PropType<SummaryEntryKeys<S, T, P>[]>, default: defaultFields },
      decimalFormat: {
        type: Object as PropType<Intl.NumberFormat>,
        default: new Intl.NumberFormat(undefined, {
          style: "decimal",
          maximumFractionDigits: 2,
        }),
      },
    },
    setup: (props, { slots }) => {
      const players = computed(() =>
        props.players === undefined || props.players.length < 1
          ? [...props.gameResults.keys()]
          : props.includeAllPlayers
            ? [
                ...props.players,
                ...[...props.gameResults.keys()].filter((p) => !props.players!.includes(p)),
              ]
            : [...props.gameResults.keys()],
      );
      const entries = computed(() => summaryFactory.entriesFor(props.gameResults));
      const fieldsMeta = computed(() =>
        // @ts-ignore
        props.fields.flatMap((fieldPath) => {
          const [fieldKey, ...fieldProp] = fieldPath.split(".") as [keyof S, ...string[]];
          if (fieldKey === "numGames") {
            return [];
          }
          const field = summaryFactory[SummaryFieldsKeySymbol][
            fieldKey as keyof S
          ] as SummaryEntryFieldPartialGameEntry<T, any, any>;
          let meta: EntryDisplayMetadataSingle<any> = field.entryFieldDisplay as any;
          for (const prop of fieldProp) {
            if (Object.hasOwn(meta, prop)) {
              meta = (meta as any)[prop];
            }
          }
          // @ts-ignore
          const displayField = Object.values(field.display)[0];
          const highlight = displayField?.highlight;
          const best = displayField?.best ?? "none";
          const worst = best === "highest" ? "lowest" : best === "lowest" ? "highest" : "none";
          console.log("making highlight:", fieldPath, highlight); //XXX
          return {
            field,
            path: fieldPath,
            fieldProp,
            label: meta.label ?? fieldPath,
            display:
              meta.display ??
              ((v: any) => (typeof v === "number" ? props.decimalFormat.format(v) : v)),
            combineTeamValues: meta.combineTeamValues,
            combinedDisplay: meta.combinedDisplay,
            ignoreHighlight: meta.ignoreHighlight ?? (() => false),
            format: props.decimalFormat,
            best,
            highlight:
              highlight === undefined
                ? {}
                : typeof highlight === "string"
                  ? highlight === "best"
                    ? { best }
                    : ({ worst } as Record<string, "highest" | "lowest">)
                  : Array.isArray(highlight)
                    ? highlight.reduce(
                        (acc, h) => Object.assign(acc, h === "best" ? { best } : { worst }),
                        {} as Record<string, "highest" | "lowest">,
                      )
                    : highlight,
          };
        }),
      );

      const fieldData = computed(() => {
        const playerData = players.value.map((pid) => ({ pid, data: entries.value.get(pid) }));
        return props.fields.flatMap((fieldPath, index) => {
          const [fieldKey, ...fieldProp] = fieldPath.split(".") as [keyof S, ...string[]];
          if (fieldKey === "numGames") {
            return [];
          }
          const data = playerData
            .map(({ pid, data }) => {
              let value: any = data === undefined ? undefined : data[fieldKey];
              for (const p of fieldProp) {
                if (value !== undefined) {
                  value = value[p];
                }
              }
              return { pid, value };
            })
            .reduce(
              ({ lowest, highest, playerValues }, { pid, value }) => {
                playerValues.push({ pid, value });
                return {
                  highest: value === undefined ? highest : Math.max(highest, value),
                  lowest: value === undefined ? lowest : Math.min(lowest, value),
                  playerValues,
                };
              },
              {
                highest: Number.MIN_SAFE_INTEGER,
                lowest: Number.MAX_SAFE_INTEGER,
                playerValues: [] as {
                  pid: string;
                  value: any | undefined;
                }[],
              },
            );
          const { combineTeamValues, ...meta } = fieldsMeta.value[index];
          const values = data.playerValues.flatMap(({ value }) =>
            value !== undefined ? [value] : [],
          );
          return {
            ...data,
            ...meta,
            combined:
              values.length > 1
                ? values.reduce(combineTeamValues as (a: any, b: any) => any)
                : undefined,
          };
        });
      });

      const playerStore = usePlayerStore();
      return () => (
        <table id="gameSummaryEntryTable">
          <thead>
            <tr>
              {slots.topLeftCell ? slots.topLeftCell() : <th>&nbsp;</th>}
              {players.value.map((pid) => (
                <th class="playerName" data-player-id={pid}>
                  {playerStore.playerName(pid).value}
                </th>
              ))}
              <th class="playerName teamColumn" data-player-id={"combinedTeamColumn"}>
                Team
              </th>
            </tr>
          </thead>
          <tbody>
            {fieldData.value.map(
              ({
                path,
                label,
                highlight,
                highest,
                lowest,
                playerValues,
                combined,
                display,
                combinedDisplay,
                ignoreHighlight,
              }) => {
                return (
                  <tr data-summary-row={path}>
                    <th class="rowLabel">{label}</th>
                    {playerValues.map(({ value }) => {
                      return (
                        <td
                          class={[
                            "summaryValue",
                            ...[
                              highlight && !ignoreHighlight(value)
                                ? Object.entries(highlight).flatMap(([k, v]) =>
                                    (v === "highest" && value === highest) ||
                                    (v === "lowest" && value === lowest)
                                      ? [k]
                                      : [],
                                  )
                                : [],
                            ],
                          ]}
                        >
                          {value !== undefined ? display(value) : "N/A"}
                        </td>
                      );
                    })}
                    <td class="summaryValue teamColumn">
                      {combined !== undefined
                        ? combinedDisplay
                          ? combinedDisplay(combined, playerValues.length, props.decimalFormat)
                          : display(combined)
                        : "N/A"}
                    </td>
                  </tr>
                );
              },
            )}
          </tbody>
        </table>
      );
    },
  });
