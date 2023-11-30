import { normaliseGameMetadata } from "@/gameUtils/gameMeta";
import makeSummaryAccumulatorFactory from "@/gameUtils/summary";
import type { Ref } from "vue";

export const DECIMAL_FORMAT = new Intl.NumberFormat(undefined, {
  style: "decimal",
  signDisplay: "always",
});
export const DATE_DM_FORMAT = new Intl.DateTimeFormat(undefined, {
  day: "2-digit",
  month: "short",
});

export const onKeyInput =
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

/** Player stats for a single game, combined with the round stats */
type GameStats = {
  /** Furthest number reached before hitting */
  farFN: number;
  /** No hits in the entire game (farFN = 20) */
  fatNick: boolean;
  /** Furthest number reached before going negative */
  farPos: number;
  /** Score did not go negative for the entire game (farPos = 20) */
  allPositive: boolean;
  /** Furthest number reached without missing a round */
  farDream: number;
  /** Had at least 1 hit per round (farDream = 20) */
  dream: boolean;
  /** Only hit double doubles or cliffs */
  goblin: boolean;
  /** Only hit double 1(s) */
  piranha: boolean;
  /** Only hit with the very last dart of the game */
  jesus: boolean;
  /** 3 consecutive double doubles */
  hans: number;
};
const summaryFactory = makeSummaryAccumulatorFactory(({ countWhile, numeric, boolean }) => ({
  fatNicks: countWhile(({ value }) => !value),
  dreams: countWhile(({ value }) => value),
  allPos: countWhile(({ score }) => score > 0),
  //TODO: use round stats
  cliffs: numeric((data) => [...data.turns.values()].filter(({ value }) => value === 3).length),
  //TODO: use round stats
  doubleDoubles: numeric(
    (data) => [...data.turns.values()].filter(({ value }) => value >= 2).length,
  ),
  // hans: numeric(data => ),
  goblins: boolean((data) => [...data.turns.values()].every(({ value }) => !value || value >= 2)),
  piranhas: boolean((data) =>
    [...data.turns.values()].every(
      ({ roundIndex, value }) => Boolean(value) === (roundIndex === 0),
    ),
  ),
  // jesus: boolean(data => ),
}));
// type GameSummary = {
//   score: HLT;
//   wins: WinCount;
//   fatNicks: Count & Closest;
//   cliffs: HLT;
//   dd: HLT;
//   hans: HLT;
//   goblins: Count;
//   piranhas: Count;
//   jesus: Count;
//   dreams: Count & Closest;
//   allPos: Count & Closest;
//   hits: {
//     total: HLT;
//     rounds: HLT;
//     cliffs: HLT;
//     dd: HLT;
//   };
// };
const summaryOrder = [
  "score.highest",
  "score.lowest",
  "score.mean",
  // REAL WINS?!
  // "wins.count",
  "numGames.count",
  // "wins.rate",
  "fatNicks.count",
  "fatNicks.closest",
  "cliffs.total",
  "cliffs.meanTotal",
  "doubleDoubles.total",
  "doubleDoubles.meanTotal",
  "hans.total",
  "goblins.count",
  "piranhas.count",
  "jesus.count",
  "dreams.furthest",
  "positive.total",
  "positive.furthest",
  "hits.highest",
  "hits.lowest",
  "hits.mean",
];

export const gameMeta = normaliseGameMetadata<
  number,
  {
    cliff: boolean;
    doubledouble: boolean;
    hits: number;
  },
  GameStats
>({
  startScore: () => 27,
  positionOrder: "highestFirst",
  rounds: Array.from({ length: 20 }, (_, i) => ({
    label: (i + 1).toString(),
    display: (hits, { score, deltaScore, editable, focus }) => (
      <>
        <span>{score}</span>
        <sup>({DECIMAL_FORMAT.format(deltaScore)})</sup>
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
            onKeydown={onKeyInput(hits, focus)}
          />
        ) : undefined}
      </>
    ),
    deltaScore: (h) => 2 * (i + 1) * (h === undefined || h <= 0 ? -1 : h),
    stats: ({ value }) => ({
      cliff: value === 3,
      doubledouble: (value ?? 0) >= 2,
      hits: value ?? 0,
    }),
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
  })),
  gameStatsFactory: (stats, { taken, all }) => {
    // fatNick = countUntil(({ value }) => value);
    // dream = countUntil(({ value }) => !value);
    // allPos = countUntil(({ score }) => score < 0);
    const firstHit = all.findIndex(({ value }) => value);
    const firstNeg = all.findIndex(({ score }) => score < 0);
    const firstMiss = all.findIndex(({ value }) => !value);
    return {
      farFN: firstHit >= 0 ? firstHit : 20,
      fatNick: taken.length > 0 && stats.hitsCountNZ < 1,
      farPos: firstNeg >= 0 ? firstNeg : 20,
      allPositive: taken.length > 0 && ![...taken.values()].some(({ score }) => score < 0),
      farDream: firstMiss >= 0 ? firstMiss : 20,
      dream: firstMiss < 0,
      goblin: taken.every(({ value }) => value !== 1),
      piranha: Boolean(all[0].value) && all.slice(1).every(({ value }) => !value),
      jesus: false && stats.hitsTotal === 1 && all[19].value === 1, //TODO: last dart recognition?
      hans: all
        .map(({ stats }) => stats!.doubledouble)
        .reduce(
          (acc, dd, i, arr) => (i <= 17 && dd && arr[i + 1] && arr[i + 2] ? acc + 1 : acc),
          0,
        ),
    };
  },
  playerNameClass: ({ stats }) => ({
    fatNick: stats.fatNick,
    allPositive: stats.allPositive,
  }),
});
