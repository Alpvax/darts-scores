import { defineComponent, ref, watch, type Ref, computed, type PropType } from "vue";
// import PlayerSelection from "@/components/PlayerSelection.vue"
import { doc, getDoc, getFirestore } from "firebase/firestore";
import { usePlayerStore } from "@/stores/player";

export default defineComponent({
  components: {
    // PlayerSelection,
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
    const playerStore = usePlayerStore();

    const gamePlayers = ref([] as string[]); //TODO
    const games = ref([] as { game: Record<string, number> }[]); //TODO

    return () => (
      <div>
        {/* <PlayerSelection
          available={playerStore.all}
        /> */}
        <table>
          <thead>
            <tr>
              <td>&nbsp;</td>
              {gamePlayers.value.map((pid) => (
                <td class="playerName">{playerStore.playerName(pid).value}</td>
              ))}
            </tr>
          </thead>
          <tbody>
            {games.value.map((game) => (
              <tr>
                {gamePlayers.value.map((pid) =>
                  Object.hasOwn(game.game, pid) ? <td>{game.game[pid]}</td> : <td>&nbsp;</td>,
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  },
});
