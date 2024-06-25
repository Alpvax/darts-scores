import { defineComponent, ref, watch, type Ref, computed, type PropType } from "vue";
import PlayerSelection from "@/components/PlayerSelection.vue";
import { usePlayerStore } from "@/stores/player";
import type { GameResult } from "@/gameUtils/summary";
import { defaultSummaryFields, gameMeta, summaryFactory, type TurnData27 } from "@/game/27";
import { createSummaryComponent } from "@/components/summary";
import { intoGameResult, use27History, type Result27 } from "@/game/27/history";
import { use27Config } from "@/game/27/config";
import { StorageLocation } from "@/config";
import { makePlayerPositions } from "@/gameUtils/playerData";
import { extendClass } from "@/utils";

const Summary27 = createSummaryComponent(summaryFactory, defaultSummaryFields);

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
  setup(props) {
    const playerStore = usePlayerStore();

    const config = use27Config();

    const playersFilter = config.realWinsPlayers.mutableRef();

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
            available={playerStore.all.toSorted(
              (a, b) => playerStore.playerOrder(a) - playerStore.playerOrder(b),
            )}
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
                let positions = makePlayerPositions(
                  ref(new Map([...game.results].map(([pid, { score }]) => [pid, score]))),
                  gameMeta.positionOrder,
                ).playerPositions.value.playerLookup;
                return (
                  <tr>
                    <td class="rowLabel">{game.date.toLocaleDateString()}</td>
                    {players.value.map((pid) => {
                      const result = game.results.get(pid);
                      const pos = positions.get(pid);
                      return result ? (
                        <td
                          class={extendClass({
                            winner:
                              game.tiebreakWinner !== undefined
                                ? pid === game.tiebreakWinner
                                : pos?.pos === 1,
                            tie: pos?.pos === 1 && pos && pos.players.length > 1,
                          })}
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
