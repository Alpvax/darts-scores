import type { TurnData } from "@/gameUtils/roundDeclaration";
import type {
  GameResult,
  PlayerDataForStats,
  PlayerRequirements,
  SummaryAccumulatorFactory,
  SummaryEntry,
  SummaryFieldKeys,
} from "@/gameUtils/summary";
import type { SummaryFieldMeta } from "@/gameUtils/summary/displayMeta";
import { usePlayerStore } from "@/stores/player";
import { computed, defineComponent, type PropType } from "vue";

export const createSummaryComponent = <
  S extends SummaryEntry<T, any, P>,
  T extends TurnData<any, any, any>,
  // R extends NormalisedRound<any, any, any>,
  P extends PlayerRequirements = { all: "*" },
  PIDs extends string = string,
>(
  summaryFactory: SummaryAccumulatorFactory<S, T, any, P>,
  defaultFields: SummaryFieldKeys<S, T, P>[],
  fieldMeta?: Record<string, SummaryFieldMeta>,
  // rounds: R[],
  // roundFields: T extends TurnData<any, infer RS, any> ? (stats: RS) => any : () => any,
) =>
  // @ts-ignore
  defineComponent({
    // due to "Type instantiation is excessively deep and possibly infinite"
    // @ts-ignore
    props: {
      players: { type: Array as PropType<PIDs[]>, required: true },
      games: { type: Array as PropType<GameResult<T, PIDs>[]>, required: true },
      includeAllPlayers: { type: Boolean, default: false },
      inProgressGame: {
        type: Object as PropType<Map<PIDs, PlayerDataForStats<T>> | null>,
        default: null,
      },
      fields: { type: Array as PropType<SummaryFieldKeys<S, T, P>[]>, default: defaultFields },
      decimalFormat: {
        type: Object as PropType<Intl.NumberFormat>,
        default: new Intl.NumberFormat(undefined, {
          style: "decimal",
          maximumFractionDigits: 2,
        }),
      },
      deltaFormat: {
        type: Object as PropType<Intl.NumberFormat | Partial<Intl.NumberFormatOptions> | null>,
        default: () => ({ signDisplay: "exceptZero" }),
      },
    },
    setup: (props, { slots }) => {
      const playerStats = computed(() =>
        props.games.reduce(
          (map, game, gameIndex) => {
            const allPlayers = [...game.results.keys()];
            game.results.forEach((pData, pid) => {
              if (!map.has(pid)) {
                map.set(pid, summaryFactory());
              }
              map.get(pid)!.addGame(pData, allPlayers, game.tiebreakWinner);
            });
            console.debug(
              `Summary post game[${gameIndex}]:`,
              new Map([...map].map(([k, v]) => [k, v.summary])),
            ); //XXX
            return map;
          },
          new Map<PIDs, ReturnType<typeof summaryFactory>>(
            props.includeAllPlayers
              ? props.players.map((pid) => [pid, summaryFactory()])
              : undefined,
          ),
        ),
      );

      const playerDeltas = computed(
        () =>
          new Map(
            props.inProgressGame === null
              ? undefined
              : [...playerStats.value].flatMap(([pid, summary]) => {
                  const pData = props.inProgressGame!.get(pid);
                  return pData !== undefined
                    ? [[pid, summary.getDeltas(pData, [...props.inProgressGame!.keys()])]]
                    : [];
                }),
          ),
      );

      const fieldsMeta = computed(() =>
        props.fields.map((fieldPath) => {
          const meta = summaryFactory.getDisplayMetadata(fieldPath);
          const fMeta: SummaryFieldMeta | undefined = fieldMeta ? fieldMeta[fieldPath] : undefined;
          const best = meta.best ?? "highest";
          const label = meta.label ?? fMeta?.label ?? fieldPath;
          let format: Intl.NumberFormat;
          let deltaFmt: Intl.NumberFormat;
          const makeDeltaFmt = (opts: Intl.NumberFormatOptions) => {
            if (props.deltaFormat instanceof Intl.NumberFormat) {
              const { locale, ...pOpts } = props.deltaFormat.resolvedOptions();
              return new Intl.NumberFormat(locale, { ...opts, ...pOpts });
            } else {
              return new Intl.NumberFormat(undefined, { ...opts, ...props.deltaFormat });
            }
          };
          if (meta.formatArgs) {
            format = new Intl.NumberFormat(undefined, meta.formatArgs);
            deltaFmt = makeDeltaFmt(meta.formatArgs);
          } else {
            let fmt = fMeta?.format ?? "!baseFmt";
            while (typeof fmt === "string") {
              fmt = fMeta?.format ?? props.decimalFormat;
            }
            format = fmt;
            deltaFmt = makeDeltaFmt(fmt.resolvedOptions());
          }
          const highlight = meta.highlight;
          // // eslint-disable-next-line prefer-const
          // let { /*label, format,*/ best, highlight } = fieldMeta[fieldPath] ?? {
          //   label: fieldPath,
          //   format: "!baseFmt",
          // };
          // while (typeof format === "string") {
          //   format = fieldMeta[format]?.format ?? props.decimalFormat;
          // }
          // let deltaFmt = null;
          // if (props.deltaFormat !== null) {
          //   const { locale, ...fOpts } = format.resolvedOptions();
          //   if (props.deltaFormat instanceof Intl.NumberFormat) {
          //     const { locale, ...pOpts } = props.deltaFormat.resolvedOptions();
          //     deltaFmt = new Intl.NumberFormat(locale, { ...fOpts, ...pOpts });
          //   } else {
          //     deltaFmt = new Intl.NumberFormat(locale, { ...fOpts, ...props.deltaFormat });
          //   }
          // }
          const worst = best === "highest" ? "lowest" : "highest";
          return {
            path: fieldPath,
            parts: fieldPath.split("."),
            label,
            format,
            deltaFmt,
            zero: summaryFactory.lookupZeroVal(fieldPath),
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
        const playerData = props.players.flatMap((pid) => {
          const pData = playerStats.value.get(pid);
          return pData ? { pid, summary: pData.summary, deltas: playerDeltas.value.get(pid) } : [];
        });
        return props.fields.map((fieldPath, index) => {
          const parts = fieldPath.split(".");
          return Object.assign(
            playerData
              .map(({ pid, summary, deltas }) => {
                let value: any = summary.numGames > 0 ? summary : undefined;
                let delta: any = deltas;
                for (const p of parts) {
                  if (value !== undefined) {
                    value = value[p];
                  }
                  if (deltas !== undefined) {
                    delta = delta[p];
                  }
                }
                return { pid, value, delta };
              })
              .reduce(
                ({ lowest, highest, playerValues }, pData) => {
                  playerValues.push(pData);
                  return {
                    highest: pData.value === undefined ? highest : Math.max(highest, pData.value),
                    lowest: pData.value === undefined ? lowest : Math.min(lowest, pData.value),
                    playerValues,
                  };
                },
                {
                  highest: Number.MIN_SAFE_INTEGER,
                  lowest: Number.MAX_SAFE_INTEGER,
                  playerValues: [] as {
                    pid: string;
                    value: number | undefined;
                    delta: number | undefined;
                  }[],
                },
              ),
            fieldsMeta.value[index],
          );
        });
      });

      const playerStore = usePlayerStore();
      return () => (
        <table
          id="gameSummaryTable"
          class={props.deltaFormat !== null && props.inProgressGame ? "hasDeltas" : ""}
        >
          <thead>
            <tr>
              {slots.topLeftCell ? slots.topLeftCell() : <th>&nbsp;</th>}
              {props.players.flatMap((pid) =>
                props.includeAllPlayers || playerStats.value.has(pid)
                  ? [
                      <th class="playerName" data-player-id={pid}>
                        {playerStore.playerName(pid).value}
                      </th>,
                    ]
                  : [],
              )}
            </tr>
          </thead>
          <tbody>
            {fieldData.value.map(
              ({
                path,
                label,
                format,
                deltaFmt,
                highlight,
                highest,
                lowest,
                zero,
                best,
                playerValues,
              }) => {
                return (
                  <tr data-summary-row={path}>
                    <th class="rowLabel">{label}</th>
                    {playerValues.map(({ value, delta }) => {
                      const hasDelta = deltaFmt !== null && delta !== undefined && delta !== 0;
                      return (
                        <td
                          class={[
                            "summaryValue",
                            ...(value === zero
                              ? []
                              : [...Object.entries(highlight)].flatMap(([k, v]) =>
                                  (v === "highest" && value === highest) ||
                                  (v === "lowest" && value === lowest)
                                    ? [k]
                                    : [],
                                )),
                          ]}
                        >
                          {value !== undefined
                            ? format.format(value)
                            : hasDelta
                              ? format.format(delta)
                              : "N/A"}
                          {hasDelta && value !== undefined ? (
                            <span
                              class={[
                                "summaryDeltaValue",
                                best === "none"
                                  ? "neutral"
                                  : delta > 0
                                    ? best === "highest"
                                      ? "better"
                                      : "worse"
                                    : best === "highest"
                                      ? "worse"
                                      : "better",
                              ]}
                            >
                              {deltaFmt.format(delta)}
                            </span>
                          ) : undefined}
                        </td>
                      );
                    })}
                  </tr>
                );
              },
            )}
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
