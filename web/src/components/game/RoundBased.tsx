import { usePlayerStore } from "@/stores/player";
import {
  computed,
  defineAsyncComponent,
  defineComponent,
  type PropType,
  type VNodeChild,
} from "vue";

export type FixedRoundRow = {
  label: string;
  display: () => VNodeChild;
};

type Row<T> = {
  label: string;
  classes?: Record<string, boolean>;
  content: (data: T) => VNodeChild;
};

interface InputRow<T> extends Row<T> {}

export type GameMeta<T, R extends Row<T>, Rounds extends string> = {
  /** Create new player data */
  data: (playerId: string) => T;
  playerNameHighlight?: (
    playerData: T,
    additional: {
      position: number;
      tied: number;
    },
  ) => Record<string, boolean>;
  scores: (data: Map<string, T>) => Map<string, number>;
  /**
   * Which direction to sort the positions
   * `"lowestFirst"` means the player(s) with the lowest score are in first place.
   * `"highestFirst"` means the player(s) with the highest score are in first place.
   */
  positionOrder: "lowestFirst" | "highestFirst";
  rounds: Record<Rounds, R>;
  rows: (Row<T> | Rounds)[];
};

export default defineAsyncComponent(<T, R extends Row<T>, Rounds extends string>() =>
  Promise.resolve(
    defineComponent({
      props: {
        players: { type: Array as PropType<string[]>, required: true },
        // rounds: { type: Array as PropType<R[]>, required: true },
        gameMeta: { type: Object as PropType<GameMeta<T, R, Rounds>>, required: true },
        editable: { type: Boolean, default: false },
        displayPositions: {
          type: String as PropType<"head" | "body" | "foot" | "none">,
          default: "head",
        },
      },
      emits: ["playerCompleted", "allCompleted"],
      setup: (props, { slots }) => {
        const playerStore = usePlayerStore();
        const playerData = computed(
          () => new Map(props.players.map((pid) => [pid, props.gameMeta.data(pid)])),
        );
        const playerScores = computed(() => props.gameMeta.scores(playerData.value));
        const playerPositions = computed(() => {
          const orderedScores = [...playerScores.value.values()];
          orderedScores.sort((a, b) => {
            switch (props.gameMeta.positionOrder) {
              case "lowestFirst":
                return a - b;
              case "highestFirst":
                return b - a;
            }
          });
          const scorePlayerLookup = [...playerScores.value.entries()].reduce(
            (acc, [pid, score]) => {
              if (acc.has(score)) {
                acc.get(score)!.push(pid);
              } else {
                acc.set(score, [pid]);
              }
              return acc;
            },
            new Map<number, string[]>(),
          );

          const { ordered, playerLookup } = orderedScores.reduce(
            ({ scores, ordered, playerLookup }, score, idx) => {
              const pos = idx + 1;
              // Assumes < 21 players in a game
              const posOrdinal = pos === 1 ? "st" : pos === 2 ? "nd" : pos === 3 ? "rd" : "th";
              if (!scores.has(score)) {
                scores.add(score);
                const players = scorePlayerLookup.get(score)!;
                ordered.push({ pos, posOrdinal, players });
                for (const p of players) {
                  playerLookup.set(p, { pos, posOrdinal, players });
                }
              }
              return { scores, ordered, playerLookup };
            },
            {
              scores: new Set<number>(),
              ordered: [] as { pos: number; posOrdinal: string; players: string[] }[],
              playerLookup: new Map<
                string,
                { pos: number; posOrdinal: string; players: string[] }
              >(),
            },
          );

          return { ordered, playerLookup };
        });
        // const roundData = computed(() => props.players.reduce((map, pid) => {}, new Map<))

        const posRow = (displayWhen: (typeof props)["displayPositions"]) =>
          // Only display when requested, and only if everyone isn't tied
          props.displayPositions === displayWhen && playerPositions.value.ordered.length > 1 ? (
            <tr class={{ positionRow: true, small: props.editable }}>
              <td class="rowLabel">Position</td>
              {props.players.map((pid) => {
                const { pos, posOrdinal } = playerPositions.value.playerLookup.get(pid)!;
                return (
                  <td>
                    {pos}
                    <sup>{posOrdinal}</sup>
                  </td>
                );
              })}
            </tr>
          ) : undefined;
        return () => (
          <table>
            <thead>
              <tr>
                <th>{slots.topLeftCell ? slots.topLeftCell() : <>&nbsp;</>}</th>
                {props.players.map((pid) => {
                  const classes = props.gameMeta.playerNameHighlight
                    ? {
                        playerName: true,
                        ...props.gameMeta.playerNameHighlight(playerData.value.get(pid)!, {
                          position: playerPositions.value.playerLookup.get(pid)!.pos,
                          tied: playerPositions.value.playerLookup.get(pid)!.players.length, //TODO:
                        }),
                      }
                    : "playerName";
                  return <th class={classes}>{playerStore.playerName(pid).value}</th>;
                })}
              </tr>
              {posRow("head")}
            </thead>
            <tbody>
              {posRow("body")}
              {props.gameMeta.rows.map((r) => {
                const row = typeof r === "string" ? (props.gameMeta.rounds[r] as Row<T>) : r;
                return (
                  <tr class={row.classes}>
                    <td class="rowLabel">{row.label}</td>
                    {props.players.map((pid) => (
                      <td>{row.content(playerData.value.get(pid)!)}</td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
            <tfoot>{posRow("foot")}</tfoot>
          </table>
        );
      },
    }),
  ),
);
