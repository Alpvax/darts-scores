import { defineComponent, ref, watch, type Ref, computed, type PropType } from "vue";
import PlayerSelection from "@/components/PlayerSelection.vue";
import {
  doc,
  getDoc,
  getFirestore,
  onSnapshot,
  orderBy,
  query,
  where,
  type Unsubscribe,
  collection,
} from "firebase/firestore";
import { usePlayerStore } from "@/stores/player";
import type { GameResult } from "@/gameUtils/summary";
import { defaultSummaryFields, summaryFactory, type TurnData27 } from "@/game/27";
import { createSummaryComponent } from "@/components/summary";
import { intoGameResult, type Result27 } from "@/game/27/history";

const Summary27 = createSummaryComponent(summaryFactory, defaultSummaryFields);

export default defineComponent({
  components: {
    PlayerSelection,
    Summary27,
  },
  props: {
    fromDate: {
      type: Date as PropType<Date>,
      default: () => new Date(new Date().getFullYear(), 0, 1),
    },
    toDate: { type: Date as PropType<Date | null>, default: null },
  },
  setup(props) {
    const db = getFirestore();
    const gamesRef = collection(db, "game/twentyseven/games");

    const playerStore = usePlayerStore();

    const playersFilter = ref([
      //TODO: proper players
      "y5IM9Fi0VhqwZ6gAjil6",
      "6LuRdib3wFxhbcjjh0au",
      "Gt8I7XPbPWiQ92FGsTtR",
      "jcfFkGCY81brr8agA3g3",
      "jpBEiBzn9QTVN0C6Hn1m",
    ]);

    const today = new Date();
    const toDate = ref(today.toISOString().slice(0, 10));
    const fromDate = ref(`${today.getFullYear()}-01-01`);
    let subscription: Unsubscribe | null = null;
    const gamePlayers = ref(new Set<string>());
    const games = ref([] as (GameResult<TurnData27> & { gameId: string })[]);
    const players = computed(() =>
      [...gamePlayers.value]
        .filter((pid) => {
          const p = playerStore.getPlayer(pid).value;
          if (p.loaded) {
            return !(p.disabled || p.guest);
          }
          return true;
        })
        .toSorted((a, b) => playerStore.playerOrder(a).value - playerStore.playerOrder(b).value),
    );

    watch(
      [fromDate, toDate],
      async ([fromDate, toDate]): Promise<void> => {
        games.value = [];
        if (subscription) {
          subscription();
          console.log("Refreshed subscription"); //XXX
        }
        if (fromDate <= toDate && new Date(fromDate) <= today) {
          const td = new Date(toDate);
          td.setDate(td.getDate() + 1);
          subscription = onSnapshot(
            query(
              gamesRef,
              orderBy("date", "desc"),
              where("date", ">=", fromDate),
              where("date", "<=", td.toISOString().slice(0, 10)),
            ),
            (snapshot) =>
              snapshot.docChanges().forEach(async (change) => {
                if (change.type === "removed") {
                  games.value.splice(change.oldIndex, 1);
                } else {
                  const d = change.doc;
                  const gameData = Object.assign(
                    { gameId: d.id },
                    intoGameResult(d.data() as Result27),
                  );
                  if (change.type == "added") {
                    games.value.splice(change.newIndex, 0, gameData);
                    for (const pid of gameData.results.keys()) {
                      gamePlayers.value.add(pid);
                    }
                  } else {
                    if (change.oldIndex !== change.newIndex) {
                      games.value.splice(change.oldIndex, 1).splice(change.newIndex, 0, gameData);
                    } else {
                      games.value[change.oldIndex] = gameData;
                    }
                  }
                }
              }),
          );
        } else {
          //TODO display error
        }
      },
      {
        immediate: true,
      },
    );

    return () => (
      <div>
        <div id="historyFilter">
          <div class="dateFilters">
            <label for="fromDateFilter">From:</label>
            <input id="fromDateFilter" v-model={fromDate.value} type="date" />
            <label for="toDateFilter">To:</label>
            <input id="toDateFilter" v-model={toDate.value} type="date" />
          </div>
          <PlayerSelection
            legend='Select players to filter "Real Wins"'
            available={playerStore.all}
            modelValue={playersFilter.value}
            onUpdate:modelValue={(val) => (playersFilter.value = val)}
          />
        </div>
        <table>
          <thead>
            <tr>
              <td>Date</td>
              {players.value.map((pid) => (
                <td class="playerName">{playerStore.playerName(pid).value}</td>
              ))}
            </tr>
          </thead>
          <tbody>
            {games.value.map((game) => (
              <tr>
                <td class="rowLabel">{game.date.toLocaleDateString()}</td>
                {players.value.map((pid) => {
                  const result = game.results.get(pid);
                  return result ? <td>{result.score}</td> : <td>&nbsp;</td>;
                })}
              </tr>
            ))}
          </tbody>
        </table>
        <Summary27 players={players.value} games={games.value} />
      </div>
    );
  },
});
