import { normaliseGameMetadata, type TurnDataForGame } from "@/gameUtils/gameMeta";
import type { IntoTaken } from "@/gameUtils/roundDeclaration";
import makeSummaryAccumulatorFactoryFor, { type PlayerDataForStats } from "@/gameUtils/summary";
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

export type TurnData27 = TurnDataForGame<typeof gameMeta>;

export const summaryFactory = makeSummaryAccumulatorFactoryFor<TurnData27>()(
  ({ countWhile, numeric, boolean, roundStats }) => ({
    fatNicks: countWhile(({ value }) => !value),
    dreams: countWhile(({ value }) => value > 0, true),
    allPos: countWhile(({ score }) => score > 0),
    cliffs: numeric(
      (data) => [...data.turns.values()].filter(({ stats: { cliff } }) => cliff).length,
    ),
    doubleDoubles: numeric(
      (data) =>
        [...data.turns.values()].filter(({ stats: { doubledouble } }) => doubledouble).length,
    ),
    hans: numeric(
      (data) =>
        Array.from({ length: 20 }, (_, i) => data.allTurns.get(i)!).reduce(
          ({ count, preDD }, { stats }) => {
            if (stats.doubledouble) {
              preDD += 1;
              if (preDD >= 3) {
                count += 1;
              }
            } else {
              preDD = 0;
            }
            return { count, preDD };
          },
          { count: 0, preDD: 0 },
        ).count,
    ),
    goblins: boolean((data) => [...data.turns.values()].every(({ value }) => !value || value >= 2)),
    piranhas: boolean((data) =>
      [...data.turns.values()].every(
        ({ roundIndex, value }) => Boolean(value) === (roundIndex === 0),
      ),
    ),
    // jesus: boolean(data => ),
    rounds: roundStats(
      Array.from({ length: 20 }, (_, i) => i.toString()),
      { cliff: false, doubledouble: false, hits: 0 },
    ),
  }),
  {
    all: "*",
    solo: { players: [], exact: true },
  },
);

//TODO: REMOVE TEST
(() => {
  const testSummary = summaryFactory();
  console.log(JSON.stringify(testSummary.summary, null, 2));
  // console.log(testSummary.summary);
  const testGame = (...hits: number[]): PlayerDataForStats<TurnData27> => {
    const { turns, score } = gameMeta.rounds.reduce(
      ({ turns, score }, r, i) => {
        const t = r.turnData(hits[i], score, "", i);
        turns.push(t);
        return { turns, score: t.score };
      },
      { turns: [] as TurnData27[], score: 27 },
    );
    return {
      playerId: "notavalidplayerid",
      complete: Array.from({ length: 20 }, (_, i) => hits[i] !== undefined).every((h) => h),
      score,
      turns: new Map(
        turns.flatMap((t, i) => (t.value === undefined ? [] : [[i, t as IntoTaken<TurnData27>]])),
      ),
      allTurns: new Map(turns.map((t, i) => [i, t])),
      position: 1,
      tied: [],
    };
  };
  const addTestGame = (
    hits: number[],
    gameModifier?: Partial<PlayerDataForStats<TurnData27>>,
    players?: string[],
  ) => {
    const g = { ...testGame(...hits), ...gameModifier };
    console.log("Adding Game:", g, "\n\thits:", hits);
    console.log("\tDelta:", testSummary.addGame(g, players ?? [g.playerId, ...g.tied], g.playerId));
    console.log("\tSummary:", JSON.parse(JSON.stringify(testSummary.summary)));
  };

  addTestGame([0, 1, 2, 0, 0, 0, 1, 0, 2, 2, 2, 2, 3, 0, 0, 0, 0, 0, 1, 0]);
  addTestGame([1, 1, 1, 2, 0, 1, 0, 0, 0, 2, 1, 0, 0, 0, 3, 0, 1, 0], {
    tied: ["anotherInvalidPlayer"],
  });
  // console.log(testSummary.summary);
  // console.log(JSON.stringify(testSummary.summary, null, 2));
})();
