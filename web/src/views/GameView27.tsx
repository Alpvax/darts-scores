import { defineComponent, ref, watch, type Ref, onMounted } from "vue";
// import { makeRoundBasedComponent, type GameMeta, type Row } from "../components/game/RoundBased";
// import FixedLength, { type GameMeta, type Row } from "@/components/game/FixedLength.vue";
import createComponent, { type GameData } from "@/components/game/FixedRounds";
import { doc, getDoc, getFirestore } from "firebase/firestore";
import { usePlayerStore } from "@/stores/player";

const numfmt = new Intl.NumberFormat(undefined, { style: "decimal", signDisplay: "always" });
const dateDayMonthFmt = new Intl.DateTimeFormat(undefined, { day: "2-digit", month: "short" });

const onKey =
  (
    hits: Ref<number | undefined>,
    focus: { next: () => void; prev: () => void; empty: () => void },
  ) =>
  (event: KeyboardEvent) => {
    if (
      event.shiftKey ||
      event.ctrlKey ||
      event.altKey ||
      event.metaKey ||
      [
        ...Array.from({ length: 20 }, (_, n) => `F${n + 1}`), // F-keys
      ].includes(event.key)
    ) {
      return;
    }
    switch (event.key) {
      case "0":
        hits.value = 0;
        break;
      case "1":
        hits.value = 1;
        break;
      case "2":
        hits.value = 2;
        break;
      case "3":
        hits.value = 3;
        break;
      case "Tab":
      case "Enter":
        if (hits.value === undefined) {
          hits.value = 0;
        }
        focus.empty();
        break;
      case "ArrowLeft":
      case "Left":
      case "Backspace":
        focus.prev();
        break;
      case "ArrowRight":
      case "Right":
        focus.next();
        break;
      // default:
      //   return;
    }
    //TODO: change focus
    event.preventDefault();
  };
const Game27 = createComponent<number[]>({
  positionOrder: "highestFirst",
  startScore: () => 27,
  rounds: Array.from({ length: 20 }, (_, i) => {
    const r = i + 1;
    return {
      label: r.toString(),
      display: (score, delta, hits, editable, focus) => (
        <>
          <span>{score}</span>
          <sup>({numfmt.format(delta)})</sup>
          {editable ? (
            <input
              class="hitsInput"
              type="number"
              min="0"
              max="3"
              placeholder="0"
              value={hits.value}
              onInput={(e) => {
                const val = parseInt((e.target as HTMLInputElement).value);
                hits.value = isNaN(val) ? undefined : val;
                e.preventDefault();
              }}
              onKeydown={onKey(hits, focus)}
            />
          ) : undefined}
        </>
      ),
      deltaScore: (h, i) => 2 * (i + 1) * (h === undefined || h <= 0 ? -1 : h),
      rowClass: (data) => {
        const values = data.map((d) => d.value);
        return {
          current: values.some((v) => v !== undefined) && values.some((v) => v === undefined),
          untaken: values.every((v) => v === undefined),
          allMissed: values.every((v) => v !== undefined && v < 1),
          allHit: values.every((v) => v),
        };
      },
      cellClass: ({ value }) => {
        switch (value) {
          case 0:
            return "turn27 miss";
          case 1:
            return "turn27 hit";
          case 2:
            return "turn27 doubledouble";
          case 3:
            return "turn27 cliff";
          default:
            return "turn27";
        }
      },
    };
  }),
  playerNameClass: ({ rounds, scores }) => ({
    fatNick: rounds.size > 0 && [...rounds.values()].reduce((a, r) => a + r) <= 0,
    allPositive: rounds.size > 0 && !scores.filter((_, i) => rounds.has(i)).some((s) => s < 0),
  }),
});

type PlayerGameResult27 = {
  rounds: number[];
  cliffs: number;
  score: number;
  allPositive: boolean;
  jesus?: boolean;
  fnAmnesty?: boolean;
  handicap?: number;
};
type Result27 = {
  date: string;
  winner:
    | string
    | {
        tie: string[];
        tiebreak: {
          //TODO: implement tiebreak
          winner?: string;
          // [k: string | number]: any;
        };
      };
  game: {
    [player: string]: PlayerGameResult27;
  };
};

export default defineComponent({
  components: {
    Game27,
  },
  props: {
    gameId: { type: String, default: "" },
  },
  setup(props) {
    const db = getFirestore();
    const playerStore = usePlayerStore();
    const players = ref([
      "y5IM9Fi0VhqwZ6gAjil6",
      "6LuRdib3wFxhbcjjh0au",
      "Gt8I7XPbPWiQ92FGsTtR",
      "jcfFkGCY81brr8agA3g3",
      "jpBEiBzn9QTVN0C6Hn1m",
      "k7GNyCogBy79JE4qhvAj",
    ]);
    const gameDate = ref(new Date());
    const gameValues = ref(undefined as undefined | GameData<number[]>);
    const onGameIdUpdated = async (gameId: string | undefined, oldGameId?: string) => {
      console.log(`gameId: ${oldGameId} -> ${gameId}`);
      if (gameId) {
        const data = (await getDoc(doc(db, "game/twentyseven/games", gameId))).data() as Result27;
        if (data !== undefined) {
          console.log(data.date, Object.keys(data.game), data.game); //XXX
          gameDate.value = new Date(data.date);
          console.log("parsing game:", Object.entries(data.game));
          const values = new Map(
            Object.entries(data.game).map(([pid, { rounds }]) => [
              pid,
              new Map(rounds.map((r, i) => [i, r])),
            ]),
          );
          console.log("Setting values:", values);
          gameValues.value = values;
          const plyrs = Object.keys(data.game).map(
            (pid) => [playerStore.defaultOrder(pid).value, pid] as [number, string],
          );
          plyrs.sort(([a], [b]) => (a ?? 0) - (b ?? 0));
          players.value = plyrs.map((p) => p[1]);
          return;
        }
      }
      if (oldGameId !== undefined) {
        gameDate.value = new Date();
        gameValues.value = undefined;
        players.value = [
          //TODO: proper players
          "y5IM9Fi0VhqwZ6gAjil6",
          "6LuRdib3wFxhbcjjh0au",
          "Gt8I7XPbPWiQ92FGsTtR",
          "jcfFkGCY81brr8agA3g3",
          "jpBEiBzn9QTVN0C6Hn1m",
          "k7GNyCogBy79JE4qhvAj",
        ];
      }
      console.log(
        `Completed changing gameId: ${oldGameId} -> ${gameId}`,
        "Date:",
        gameDate.value,
        "\nPlayers:",
        players.value,
        "\nValues:",
        gameValues.value,
      ); //XXX
    };
    onMounted(() => onGameIdUpdated(props.gameId));
    watch(() => props.gameId, onGameIdUpdated);
    return () => (
      <div>
        <Game27
          class="game twentyseven"
          players={players.value}
          values={gameValues.value}
          editable={props.gameId.length < 1}
          onPlayerCompleted={(pid, complete) =>
            console.log(`player "${pid}" completion state changed: ${complete}`)
          }
          onAllCompleted={(complete) =>
            console.log(`All players completion state changed: ${complete}`)
          }
        >
          {{
            topLeftCell:
              props.gameId.length > 0
                ? () => (
                    <th class="gameDate">
                      <span>{dateDayMonthFmt.format(gameDate.value)}</span>
                      <br />
                      <span>{gameDate.value.getFullYear()}</span>
                    </th>
                  )
                : undefined,
            footer: (turns: GameData<number[]>) => (
              <tr class="totalHitsRow">
                <th class="rowLabel">Hits</th>
                {[...turns.values()].map((rounds) => {
                  const l = rounds.size;
                  const { r, a } = [...rounds.values()].reduce(
                    ({ r, a }, h) => {
                      if (h > 0) {
                        return { r: r + 1, a: a + h };
                      }
                      return { r, a };
                    },
                    { r: 0, a: 0 },
                  );
                  return (
                    <td>
                      <span>
                        {r}/{l}
                      </span>{" "}
                      <span>
                        ({a}/{l * 3})
                      </span>
                    </td>
                  );
                })}
              </tr>
            ),
          }}
        </Game27>
      </div>
    );
  },
});
