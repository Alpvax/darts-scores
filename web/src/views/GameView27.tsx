import { defineComponent, type Ref } from "vue";
// import { makeRoundBasedComponent, type GameMeta, type Row } from "../components/game/RoundBased";
// import FixedLength, { type GameMeta, type Row } from "@/components/game/FixedLength.vue";
import createComponent, { type GameData } from "@/components/game/FixedRounds";

const numfmt = new Intl.NumberFormat(undefined, { style: "decimal", signDisplay: "always" });

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
          {score}
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
          ) : (
            {}
          )}
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
    allPositive: rounds.size > 0 && !scores.filter((_, i) => rounds.has(i)).some(s => s < 0),
  }),
});

export default defineComponent({
  components: {
    Game27,
  },
  setup() {
    return () => (
      <div>
        <Game27
          class="game twentyseven"
          players={[
            "y5IM9Fi0VhqwZ6gAjil6",
            "6LuRdib3wFxhbcjjh0au",
            "Gt8I7XPbPWiQ92FGsTtR",
            "jcfFkGCY81brr8agA3g3",
            "jpBEiBzn9QTVN0C6Hn1m",
            "k7GNyCogBy79JE4qhvAj",
          ]}
          editable={true}
          onPlayerCompleted={(pid, complete) =>
            console.log(`player "${pid}" completion state changed: ${complete}`)
          }
          onAllCompleted={(complete) =>
            console.log(`All players completion state changed: ${complete}`)
          }
        >
          {{
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
                      {r}/{l} ({a}/{l * 3})
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
