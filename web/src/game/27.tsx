import { normaliseGameMetadata } from "@/gameUtils/gameMeta";
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

export const gameMeta = normaliseGameMetadata<
  number,
  {
    cliff: boolean;
    doubledouble: boolean;
    hits: number;
  },
  {
    fatNick: boolean;
    farPos: number;
    allPositive: boolean;
    farDream: number;
  }
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
  gameStatsFactory: (stats, { taken }) => {
    const firstNeg = taken.findIndex(({ score }) => score < 0);
    const firstMiss = taken.findIndex(({ value }) => value < 1);
    return {
      fatNick: taken.length > 0 && stats.hitsCountNZ < 1,
      farPos: firstNeg > 0 ? firstNeg - 1 : 20,
      allPositive: taken.length > 0 && ![...taken.values()].some(({ score }) => score < 0),
      farDream: firstMiss > 0 ? firstMiss - 1 : 20,
    };
  },
  playerNameClass: ({ stats }) => ({
    fatNick: stats.fatNick,
    allPositive: stats.allPositive,
  }),
});
