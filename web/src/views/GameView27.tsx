import { defineComponent, type Ref } from "vue";
// import { makeRoundBasedComponent, type GameMeta, type Row } from "../components/game/RoundBased";
// import FixedLength, { type GameMeta, type Row } from "@/components/game/FixedLength.vue";
import createComponent from "@/components/game/FixedRounds";
const deltaScore = (round: number, hits: number): number => 2 * round * (hits <= 0 ? -1 : hits);
const calcScore = (hits: number[]): number =>
  hits.reduce((s, h, i) => s + deltaScore(i + 1, h), 27);

const numfmt = new Intl.NumberFormat(undefined, { style: "decimal", signDisplay: "always" });
// const rounds = Array.from({ length: 20 }, (_, i) => {
//   const r = i + 1;
//   return [
//     `double${r}`,
//     {
//       label: r.toString(),
//       content: (data: number[]) => (
//         <>
//           {calcScore(data.slice(0, r))}
//           <sup>({numfmt.format(deltaScore(r, data[i]))})</sup>
//         </>
//       ),
//       // `${calcScore(data.slice(0, r))} (${data[i]} hits)`,
//     },
//   ] as [string, Row<number[]>];
// }).reduce((acc, [k, v]) => Object.assign(acc, { [k]: v }), {} as Record<string, Row<number[]>>);

// const gameMeta = {
//   data: (): number[] =>
//     Array.from({ length: 20 }, () => {
//       const rand = Math.random();
//       return rand < 0.5 ? 0 : rand < 0.8 ? 1 : rand < 0.95 ? 2 : 3;
//     }),
//   scores: (data: Map<string, number[]>) =>
//     new Map([...data.entries()].map(([pid, hits]) => [pid, calcScore(hits)])),
//   positionOrder: "highestFirst",
//   rounds,
//   rows: [
//     "double1",
//     "double2",
//     "double3",
//     "double4",
//     "double5",
//     "double6",
//     "double7",
//     "double8",
//     "double9",
//     "double10",
//     "double11",
//     "double12",
//     "double13",
//     "double14",
//     "double15",
//     "double16",
//     "double17",
//     "double18",
//     "double19",
//     "double20",
//     {
//       label: "finalRange for 5",
//       content: (data: number[]) => {
//         const score = calcScore(data.slice(0, 4));
//         return `${score - (420 - 5 * (5 - 1))} - ${score + 3 * (420 - 5 * (5 - 1))}`;
//       },
//     },
//   ],
// } satisfies GameMeta<number[]>;

// const RoundBased = makeRoundBasedComponent(gameMeta);

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
const RoundBased = createComponent<number[]>({
  positionOrder: "highestFirst",
  startScore: () => 27,
  rounds: Array.from({ length: 20 }, (_, i) => {
    const r = i + 1;
    return {
      label: r.toString(),
      display: (score, delta, hits, focus) => (
        <>
          {score}
          <sup>({numfmt.format(delta)})</sup>
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
        </>
      ),
      deltaScore: (h, i) => 2 * (i + 1) * (h === undefined || h <= 0 ? -1 : h),
    };
  }),
});

export default defineComponent({
  components: {
    Game27: RoundBased,
  },
  setup() {
    return () => (
      <div>
        <Game27
          players={[
            "y5IM9Fi0VhqwZ6gAjil6",
            "6LuRdib3wFxhbcjjh0au",
            "Gt8I7XPbPWiQ92FGsTtR",
            "jcfFkGCY81brr8agA3g3",
            "jpBEiBzn9QTVN0C6Hn1m",
            "k7GNyCogBy79JE4qhvAj",
          ]}
        />
      </div>
    );
  },
});
