import { defineComponent, ref, computed } from "vue";
import PlayerSelection from "@/components/PlayerSelection.vue";
import { usePlayerStore } from "@/stores/player";
import type { GameResult } from "@/gameUtils/summary";
import { defaultSummaryFields, gameMeta, summaryFactory, type TurnData27 } from "@/game/27";
import { createSummaryComponent } from "@/components/summary";
import { use27History } from "@/game/27/history";
import { use27Config } from "@/game/27/config";
import { makePlayerPositions } from "@/gameUtils/playerData";
import { extendClass } from "@/utils";

const Summary27 = createSummaryComponent(summaryFactory, defaultSummaryFields);

const SUPERSCRIPT_N = (() => {
  const digits = Array.from({ length: 10 }, (_, i) => String.fromCharCode(0x2070 + i));
  digits[1] = "\u00B9";
  digits[2] = "\u00B2";
  digits[3] = "\u00B3";
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_z, ...nums] = ["", digits[1]].flatMap((s) => digits.map((d) => s + d));
  nums.push(digits[2] + digits[0]);
  return nums;
})();

export default defineComponent({
  components: {
    PlayerSelection,
    Summary27,
  },
  props: {
    //TODO: Props?
    // fromDate: {
    //   type: Date as PropType<Date>,
    //   default: () => new Date(new Date().getFullYear(), 0, 1),
    // },
    // toDate: { type: Date as PropType<Date | null>, default: null },
  },
  setup(_props) {
    const playerStore = usePlayerStore();

    const config = use27Config();

    const playersFilter = config.realWinsPlayers.mutableRef("local");

    const historyStore = use27History();

    const players = computed(() =>
      [...historyStore.allPlayers]
        .filter((pid) => {
          const p = playerStore.getPlayer(pid);
          if (p.loaded) {
            return !(p.disabled || p.guest);
          }
          return true;
        })
        .toSorted((a, b) => playerStore.playerOrder(a) - playerStore.playerOrder(b)),
    );

    return () => (
      <div class="historyDiv">
        <div id="historyFilter">
          <div class="dateFilters">
            <label for="fromDateFilter">From:</label>
            <input id="fromDateFilter" v-model={historyStore.fromDate} type="date" />
            <label for="toDateFilter">To:</label>
            <input id="toDateFilter" v-model={historyStore.toDate} type="date" />
          </div>
          <PlayerSelection
            legend='Select players to filter "Real Wins"'
            available={[...historyStore.allPlayers]
              .filter((pid) => {
                const p = playerStore.getPlayer(pid);
                return p.loaded && !p.disabled;
              })
              .toSorted((a, b) => playerStore.playerOrder(a) - playerStore.playerOrder(b))}
            modelValue={playersFilter.value}
            onUpdate:modelValue={(val) => (playersFilter.value = val)}
          />
        </div>
        <table class="gamesList">
          <thead>
            <tr>
              <td class="tableHeader">Date</td>
              {players.value.map((pid) => (
                <td class="playerName">{playerStore.playerName(pid)}</td>
              ))}
            </tr>
          </thead>
          <tbody>
            {(historyStore.games as unknown as (GameResult<TurnData27> & { gameId: string })[]).map(
              (game) => {
                const positions = makePlayerPositions(
                  ref(new Map([...game.results].map(([pid, { score }]) => [pid, score]))),
                  gameMeta.positionOrder,
                ).playerPositions.value.playerLookup;
                return (
                  <tr>
                    <td class="rowLabel">{game.date.toLocaleDateString()}</td>
                    {players.value.map((pid) => {
                      const result = game.results.get(pid);
                      const pos = positions.get(pid);
                      const notables = [...(result?.allTurns?.values() ?? [])].reduce(
                        (acc, t) => {
                          if (t.score < 0) {
                            acc.allPositive = false;
                          }
                          if (t.stats.cliff) {
                            acc.cliffs += 1;
                          } else if (t.stats.doubledouble) {
                            acc.dd += 1;
                          }
                          return acc;
                        },
                        {
                          allPositive: true,
                          cliffs: 0,
                          dd: 0,
                        },
                      );
                      const dataNotables =
                        (notables.allPositive ? "+" : "") +
                        (notables.cliffs > 0
                          ? `c${notables.cliffs > 1 ? SUPERSCRIPT_N[notables.cliffs - 1] : ""}`
                          : "") +
                        (notables.dd > 0
                          ? `d${notables.dd > 1 ? SUPERSCRIPT_N[notables.dd - 1] : ""}`
                          : "");
                      return result ? (
                        <td
                          class={extendClass({
                            winner:
                              game.tiebreakWinner !== undefined
                                ? pid === game.tiebreakWinner
                                : pos?.pos === 1,
                            tie: pos?.pos === 1 && pos && pos.players.length > 1,
                          })}
                          data-notables={dataNotables.length > 0 ? ` (${dataNotables})` : undefined}
                        >
                          {result.score}
                        </td>
                      ) : (
                        <td>&nbsp;</td>
                      );
                    })}
                  </tr>
                );
              },
            )}
          </tbody>
        </table>
        <Summary27 players={players.value} games={historyStore.games} />
      </div>
    );
  },
});
