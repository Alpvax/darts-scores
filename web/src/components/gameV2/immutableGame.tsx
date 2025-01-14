import { extendClass, type ClassBindings } from "@/utils";
import { computed, defineComponent, type PropType } from "vue";
import {
  makePlayerPositions,
  type DisplayPosRowPositions,
  type PlayerDataT,
} from "@/gameUtils/playerData";
import type { AnyGameMetadata, GameStatsFactory } from "@/gameUtils/gameMeta";
import type { TurnData, TurnStats } from "@/gameUtils/roundDeclaration";
import {
  ArrayStatsAccumulatorGame,
  type GameStatsForRounds,
} from "@/gameUtils/statsAccumulatorGame";
import PlayerNameSpan from "@/components/PlayerName";
import type { GameResult } from "@/gameUtils/summary";

const dummyMove = () => {
  console.warn("Attempted to change focus of immutable game");
};
const DUMMY_MOVE_FOCUS = {
  next: dummyMove,
  prev: dummyMove,
  empty: dummyMove,
};

export const createImmutableComponent = <
  V,
  RS extends TurnStats = {},
  GS extends GameStatsForRounds<RS> = any,
>(
  meta: AnyGameMetadata<V, RS, GS>,
) => {
  type PlayerData = PlayerDataT<RS, TurnData<V, RS, any>, GS>;
  const gameStatsFactory = () =>
    new ArrayStatsAccumulatorGame<V, RS, GS>(
      meta.gameStatsFactory as GameStatsFactory<GS, TurnData<V, RS, any>, RS>,
    );

  return defineComponent({
    props: {
      gameResult: {
        type: Object as PropType<GameResult<TurnData<V, RS, any>> & { gameId: string }>,
        required: true,
      },
      displayDate: { type: Boolean, default: true },
      displayPositions: {
        type: String as PropType<DisplayPosRowPositions>,
        default: "head",
      },
    },
    setup: (props, { slots }) => {
      const { playerPositions, posRowFactory } = makePlayerPositions(
        computed(
          () => new Map([...props.gameResult.results].map(([pid, { score }]) => [pid, score])),
        ),
        meta.positionOrder,
      );
      const posRow = posRowFactory(
        computed(() => props.displayPositions as DisplayPosRowPositions),
        computed(() => props.gameResult.players.map(({ pid }) => pid)),
        undefined,
      );

      const playerData = computed(
        () =>
          new Map(
            [...props.gameResult.results].map(([playerId, pData]) => {
              const { score, allTurns, turns } = pData;
              const position = playerPositions.value.playerLookup.get(playerId)!;
              const statsAccumulator = gameStatsFactory();
              allTurns.forEach(({ stats, roundIndex }) =>
                statsAccumulator.addRound(roundIndex, stats!),
              );
              return [
                playerId,
                {
                  playerId,
                  complete: turns.size === meta.rounds.length,
                  score,
                  turns,
                  allTurns: allTurns,
                  position: position.pos,
                  tied: position.players.filter((p) => p !== playerId),
                  stats: statsAccumulator.result({
                    all: [...allTurns.values()],
                    taken: [...turns.values()],
                  }),
                },
              ] as [string, PlayerData];
            }),
          ),
      );

      const dateDayMonthFmt = new Intl.DateTimeFormat(undefined, {
        day: "2-digit",
        month: "short",
      });

      return () => (
        <table>
          <thead>
            <tr>
              {slots.topLeftCell ? (
                slots.topLeftCell()
              ) : props.displayDate ? (
                <th class="gameDate">
                  <span>{dateDayMonthFmt.format(props.gameResult.date)}</span>
                  <br />
                  <span>{props.gameResult.date.getFullYear()}</span>
                </th>
              ) : (
                <th>&nbsp;</th>
              )}
              {props.gameResult.players.map(({ pid, displayName }) => {
                const nameClass = (meta.playerNameClass as (data: PlayerData) => ClassBindings)(
                  playerData.value.get(pid)!,
                );
                return displayName === undefined ? (
                  <PlayerNameSpan class={nameClass} tag="th" playerId={pid} />
                ) : (
                  <th class={nameClass} data-player-id={pid}>
                    {displayName}
                  </th>
                );
              })}
            </tr>
            {posRow("head")}
          </thead>
          <tbody>
            {posRow("body")}
            {meta.rounds.map((r, idx) => {
              const playerRowData = props.gameResult.players.map(
                ({ pid }) => playerData.value.get(pid)!.allTurns.get(idx)!,
              );
              return (
                <tr
                  class={(r.rowClass as (data: TurnData<V, RS, any>[]) => ClassBindings)(
                    playerRowData,
                  )}
                >
                  <td class="rowLabel">{r.label}</td>
                  {playerRowData.map(({ value, ...pData }) => {
                    const lastRowData =
                      idx === meta.rounds.length - 1
                        ? playerData.value.get(pData.playerId)!
                        : undefined;
                    let winnerClass: ClassBindings;
                    if (lastRowData?.position === 1) {
                      const tie = lastRowData.tied.length > 0;
                      winnerClass = {
                        winner: !tie || props.gameResult.tiebreakWinner === pData.playerId,
                        tie,
                      };
                    }
                    return (
                      <td
                        class={extendClass(
                          (r.cellClass as (data: TurnData<V, RS, any>) => ClassBindings)({
                            value,
                            ...pData,
                          }),
                          winnerClass,
                        )}
                        data-round-index={idx}
                      >
                        {r.display(
                          computed({
                            get: () => value,
                            set: () => {
                              console.warn("Attempted to set value of non-editable game");
                            },
                          }),
                          // Ignore due to stats property
                          // @ts-ignore
                          {
                            ...pData,
                            editable: false,
                            focus: DUMMY_MOVE_FOCUS,
                          },
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
          {props.displayPositions === "foot" || slots.footer ? (
            <tfoot>
              {posRow("foot")}
              {slots.footer
                ? slots.footer(
                    props.gameResult.players.map(({ pid }) => playerData.value.get(pid)!),
                  )
                : undefined}
            </tfoot>
          ) : undefined}
        </table>
      );
    },
  });
};
