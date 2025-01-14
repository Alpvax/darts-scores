import type { TurnData } from "@/gameUtils/roundDeclaration";
import {
  type SummaryDefinition,
  type PlayerRequirements,
  type SummaryAccumulatorFactory,
  SummaryFieldsKeySymbol,
  type PlayerDataForStats,
  type SummaryEntryFieldWithGameEntryDisplay,
  type EntryDisplayMetadataSingle,
  type EntryDisplayFieldTypes,
} from "@/gameUtils/summary";
import { computed, defineComponent, type PropType } from "vue";
import PlayerName from "./PlayerName";

type FieldMetadata<S extends SummaryDefinition<T, any, any>, T extends TurnData<any, any, any>> = {
  [K in keyof EntryDisplayFieldTypes<S, T> & string]:
    | K
    | {
        field: K;
        combiner: (
          a: EntryDisplayFieldTypes<S, T>[K],
          b: EntryDisplayFieldTypes<S, T>[K],
        ) => EntryDisplayFieldTypes<S, T>[K];
      };
}[keyof EntryDisplayFieldTypes<S, T> & string];

export const createGameEntriesComponent = <
  S extends SummaryDefinition<T, any, P>,
  T extends TurnData<any, any, any>,
  P extends PlayerRequirements = { all: "*" },
  Pid extends string = string,
>(
  summaryFactory: SummaryAccumulatorFactory<S, T, any, P>,
  defaultFields: FieldMetadata<S, T>[], //SummaryEntryKeys<S, T, P>[],
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
      fields: { type: Array as PropType<FieldMetadata<S, T>[]>, default: defaultFields },
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
      //TODO: add to preferences
      const teamDisplay = (() => {
        const usePos = (() => {
          const key = "darts.ingame.teamPosition";
          const s = sessionStorage.getItem(key);
          const val = s ?? localStorage.getItem(key);
          if (val) {
            if (/f(irst)?|0|s(tart)?/.test(val)) {
              return "first";
            }
            if (/l(ast)?|1|e(nd)?/.test(val)) {
              return "last";
            }
            console.warn(
              `Invalid value for storage property "${key}": "${val}"\n Deleted property!`,
            );
            (s !== null ? sessionStorage : localStorage).removeItem(key);
          }
          return "first";
        })();
        return (pos: "first" | "last", type: "head" | "value", value?: any) => {
          if (pos === usePos) {
            switch (type) {
              case "head":
                return (
                  <th class="playerName teamColumn" data-player-id={"combinedTeamColumn"}>
                    Team
                  </th>
                );
              case "value":
                return <td class="summaryValue teamColumn">{value}</td>;
            }
          }
          return undefined;
        };
      })();

      const entries = computed(() => summaryFactory.entriesFor(props.gameResults));
      const fieldsMeta = computed(() =>
        // @ts-ignore
        props.fields.flatMap((fieldDef) => {
          const [fieldPath, combiner] =
            typeof fieldDef === "string" ? [fieldDef] : [fieldDef.field, fieldDef.combiner];
          const [fieldKey, ...fieldProp] = fieldPath.split(".") as [keyof S, ...string[]];
          if (fieldKey === "numGames") {
            return [];
          }
          const field = summaryFactory[SummaryFieldsKeySymbol][
            fieldKey as keyof S
          ] as SummaryEntryFieldWithGameEntryDisplay<T, any, any>;
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
          return {
            field,
            path: fieldPath,
            fieldKey,
            fieldProp,
            label: meta.label ?? fieldPath,
            display:
              meta.display ??
              ((v: any) => (typeof v === "number" ? props.decimalFormat.format(v) : v)),
            combineTeamValues: combiner ?? meta.combineTeamValues,
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
        console.log(players.value, entries.value, props.gameResults); //XXX
        return fieldsMeta.value.flatMap(({ fieldKey, fieldProp, combineTeamValues, ...meta }) => {
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

      return () => (
        <table id="gameSummaryEntryTable">
          <thead>
            <tr>
              {slots.topLeftCell ? slots.topLeftCell() : <th>&nbsp;</th>}
              {teamDisplay("first", "head")}
              {players.value.map((pid) => (
                <PlayerName tag="th" playerId={pid} class="playerName" />
              ))}
              {teamDisplay("last", "head")}
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
                const teamValue =
                  combined !== undefined
                    ? combinedDisplay
                      ? combinedDisplay(combined, playerValues.length, props.decimalFormat)
                      : display(combined)
                    : "N/A";
                return (
                  <tr data-summary-row={path}>
                    <th class="rowLabel">{label}</th>
                    {teamDisplay("first", "value", teamValue)}
                    {playerValues.map(({ value }) => {
                      return (
                        <td
                          class={[
                            "summaryValue",
                            ...[
                              highlight && value !== undefined && !ignoreHighlight(value)
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
                    {teamDisplay("last", "value", teamValue)}
                  </tr>
                );
              },
            )}
          </tbody>
        </table>
      );
    },
  });
