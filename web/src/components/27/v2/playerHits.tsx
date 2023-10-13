import { usePlayerStore } from "@/store/player/onDemand";
import { PropType, Ref, computed, defineComponent, ref } from "vue";
import { RoundNums1_20 as RoundNum } from "@/utils/utilTypes";
import { usePrefs } from "@/store/clientPreferences";
import { Player } from "@/store/player";

type PlayerHits27 = {
  playerId: string;
  playerName: Ref<string>;
  startScore: number;
  currentlyPositive: Ref<boolean>;
  fatNick: Ref<boolean>;
  hits: Ref<Map<RoundNum, 0 | 1 | 2 | 3>>;
  scores: Ref<Map<RoundNum, number>>;
  getHits(round: RoundNum): Ref<0 | 1 | 2 | 3 | "unplayed">;
  setHits(round: RoundNum, hits: 0 | 1 | 2 | 3): void;
  getScore(round: RoundNum): Ref<number>;
  getScoreDelta(round: RoundNum): Ref<number>;
  roundsHit: Ref<number>;
  totalHits: Ref<number>;
}

type PlayerHitsOpts = {
  playerStore: ReturnType<typeof usePlayerStore>;
  startScore?: number;
}
export const playerHits = (playerId: string, opts: PlayerHitsOpts): PlayerHits27 => {
  const startScore = opts.startScore ?? 27;
  const player = opts.playerStore.loadPlayer(playerId);
  const roundHits = ref(new Map<RoundNum, 0 | 1 | 2 | 3>());
  const scores = ref(new Map<RoundNum, number>());
  const updateScoreCache = (from?: RoundNum): void => {
    const round = from ?? 1;
    let score = round === 1 ? startScore : scores.value.get(round)!;
    for (let r = round; r <= 20; r++) {
      const h = roundHits.value.get(r) ?? 0;
      score += h > 0 ? h * 2 * r : -2 * r;
      scores.value.set(r, score);
    }
  };
  updateScoreCache();
  return {
    playerId,
    playerName: computed(() => player.value.name),
    startScore,
    currentlyPositive: computed(() => {
      const lastPlayedRound = Math.max(...roundHits.value.keys());
      for (let r = 1; r <= lastPlayedRound; r++) {
        if (scores.value.get(r as RoundNum)! < 0) {
          return false;
        }
      }
      return true;
    }),
    fatNick: computed(() => [...roundHits.value.values()].filter(h => h > 0).length > 0),
    hits: roundHits,
    scores,
    getHits: (round: RoundNum): Ref<0 | 1 | 2 | 3 | "unplayed"> =>
      computed(() => roundHits.value.get(round) ?? "unplayed"),
    setHits: (round: RoundNum, hits: 0 | 1 | 2 | 3): void => {
      console.log("About to error in setHits!");//XXX
      roundHits.value.set(round, hits);
      updateScoreCache(round);
    },
    getScore: (round: RoundNum): Ref<number> =>
      computed(() => scores.value.get(round)!),
    getScoreDelta: (round: RoundNum): Ref<number> =>
      computed(() => {
        const h = roundHits.value.get(round) ?? 0;
        return h > 0 ? h * 2 * round : -2 * round;
      }),
    roundsHit: computed(() => [...roundHits.value.values()].filter(h => h > 0).length),
    totalHits: computed(() => [...roundHits.value.values()].reduce((a, b) => a + b, 0 as number)),
  };
};

export const gameScores = <P extends string>(
  playerStore: ReturnType<typeof usePlayerStore>,
  players: Ref<Iterable<P>>,
): Ref<Map<P, PlayerHits27>> => {
  // const map = ref(new Map<P, PlayerHits27>());
  return computed(() => new Map([...players.value]
    .map(pid => [pid, playerHits(pid, { playerStore })])));
};

export const GameComponent = defineComponent({
  props: {
    players: { type: Array as PropType<(string | Player)[]>, required: true },
    date: { type: Date, default: new Date() },
    editable: { type: Boolean, default: true },
    playerGameHits: {
      type: Object as PropType<{ [player: string]: number[] } | null>,
      default: null,
    },
    displayDate: { type: Boolean, default: false },
    displayWinner: { type: Boolean, default: true },
  },
  setup: (props) => {
    const playerStore = usePlayerStore();
    const preferences = usePrefs();
    const players = computed(() => props.players
      .map(p => typeof p === "string" ? playerStore.loadPlayer(p).value : p));
    const playerIds = computed(() => {
      console.log("Players:", players);//XXX
      return players.value.map(p => p.id);
    });
    const playerScores = gameScores(playerStore, playerIds);

    /** Map of position => playerIds */
    const positions = computed(() => [...playerScores.value.values()]
      .reduce((scores, data) => {
        const score = data.getScore(20 as RoundNum).value;
        if (scores.has(score)) {
          scores.get(score)!.push(data.playerId);
        } else {
          scores.set(score, [data.playerId]);
        }
        return scores;
      }, new Map<number, string[]>()));

    /** Map of playerId => position */
    const playerPositions = computed(() => [...positions.value.entries()].toSorted()
      .reduce(({ pos, map }, [_score, pids]) => {
        for (const pid of pids) {
          map.set(pid, pos);
        }
        return { pos: pos + pids.length, map };
      }, {
        pos: 1,
        map: new Map<string, number>(),
      }).map);
    //TODO: positions / winner, team stats etc.

    const deltaNumfmt =
      new Intl.NumberFormat(undefined, { style: "decimal",  signDisplay: "always" });
    const dateDayMonthFmt = new Intl.DateTimeFormat(undefined, { day: "2-digit", month: "short" });

    const focusInput = (round: RoundNum, playerIndex: number): void => {
      // eslint-disable-next-line no-undef
      const els = document.querySelectorAll("input.turnHits") as NodeListOf<HTMLInputElement>;
      const idx = playerIds.value.length * (round as number - 1) + playerIndex;
      const el = els.item(idx);
      if (el) {
        el.focus();
      } else {
        console.log("Unable to find el!");//XXX
      }
      //TODO: select input
    };
    const focusSubmit = (): void => {
      const el = document.querySelector("div.completed > input.submitGame");
      if (el) {
        (el as HTMLElement).focus();
      } else {
        console.log("Unable to find el!");//XXX
      }
    };

    const focusEmpty = (): void => {
      const el = document.querySelector("input.turnHits.empty");
      if (el) {
        (el as HTMLElement).focus();
      } else {
        console.log("Unable to find el!");//XXX
      }
    };

    const changeHitsFocus = (
      currentRound: RoundNum,
      currentPlayerIndex: number,
      direction: "next" | "prev",
    ): void => {
      const l = playerIds.value.length - 1;
      switch (direction) {
        case "next":
          if (currentPlayerIndex === l) {
            if (currentRound === 20 as RoundNum) {
              focusSubmit();
            } else {
              focusInput(currentRound + 1 as RoundNum, 0);
            }
          } else {
            focusInput(currentRound, currentPlayerIndex + 1);
          }
          break;
        case "prev":
          if (currentPlayerIndex === 0) {
            if (currentRound !== 1 as RoundNum) {
              focusInput(currentRound - 1 as RoundNum, l);
            }
          } else {
            focusInput(currentRound, currentPlayerIndex - 1);
          }
          break;
      }
    };

    return () => <div>
      <table
        id="game27"
        class="playerTable"
      >
        <thead>
          <tr>
            { props.displayDate
              ? <td class="gameDate" >
                <span>{ dateDayMonthFmt.format(props.date) }</span><br/>
                <span>{ props.date.getFullYear() }</span>
              </td>
              : <td> &nbsp; </td>
            }
            {
              players.value.map(({ name, id }) => <th class={{
                playerName: true,
                fatNick: playerScores.value.get(id)?.fatNick.value,
                allPositive: playerScores.value.get(id)?.currentlyPositive.value,
              }}>{ name }</th>)
            }
          </tr>
        </thead>
        <tbody>
          { // Position row
            preferences.displayPlayerPosition
              ? <tr class="positionRow" >
                <td class="rowLabel"> Position </td>
                {
                  playerIds.value.map((id) => {
                    const pos = playerPositions.value.get(id)!;
                    let ord = "th";
                    switch (pos) {
                      case 1: ord = "st"; break;
                      case 2: ord = "nd"; break;
                      case 3: ord = "rd"; break;
                    }
                    return <td>{ pos }<sup>{ ord }</sup></td>;
                  })
                }
              </tr>
              : {}
          }
          { // Round rows
            Array.from({ length: 20 }, (_, i) => {
              const round = i + 1 as RoundNum;
              return <tr>
                <td
                  class={{
                    rowLabel: true,
                    allMissed: [...playerScores.value.values()]
                      .every(ph => ph.getHits(round).value === 0),
                  }}>{ round }</td>
                {
                  playerIds.value.map((pid, playerIndex) => {
                    const data = playerScores.value.get(pid)!;
                    console.log("Data:", data);//XXX
                    return {
                      hits: data.getHits(round).value,
                      score: data.getScore(round).value,
                      deltaScore: data.getScoreDelta(round).value,
                      // setHits: (hits: 0 | 1 | 2 | 3) => data.setHits(round, hits),
                      setHits: (hits: 0 | 1 | 2 | 3) => {
                        console.log(
                          `Setting hits for player: ${playerIndex} (${data.playerName})`,
                          `${data.getHits(round).value} => ${hits}`,
                          `delta = ${data.getScoreDelta(round).value}`,
                          `score previously = ${data.getScore(round).value}`,
                        );//XXX
                        data.setHits(round, hits);
                        console.log(`New score = ${data.getScore(round).value}`);//XXX
                      },
                      focusNext: () => changeHitsFocus(round, playerIndex, "next"),
                      focusPrev: () => changeHitsFocus(round, playerIndex, "prev"),
                    };
                  }).map(({ hits, score, deltaScore, setHits, focusNext, focusPrev }) => <td
                    class={{
                      turnScore: true,
                      taken: hits !== "unplayed",
                      cliff: hits == 3,
                      doubledouble: hits == 2,
                      miss: !props.editable && hits == 0,
                      editable: props.editable,
                    // winner: !props.editable && round === 20 as RoundNum && isWinner != "none",
                    // tie: !props.editable && round === 20 as RoundNum && isWinner == "tie",
                    }}>
                    { score } <sup>({ deltaNumfmt.format(deltaScore) })</sup>
                    {
                      props.editable
                        ? <input
                          class={{
                            hitsInput: true,
                            turnHits: true,
                            empty: hits === "unplayed",
                          }}
                          type="number"
                          min="0"
                          max="3"
                          placeholder="0"
                          value={ hits === "unplayed" ? 0 : hits }
                          onKeydown={(event) => {
                            if (event.isComposing ||
                              event.shiftKey || event.ctrlKey || event.altKey || event.metaKey || [
                              ...Array.from({ length: 20 }, (_, n) => `F${n + 1}`), // F-keys
                            ].includes(event.key)) {
                              return;
                            }
                            console.log("recieved key:", event.key);//XXX
                            switch (event.key) {
                              case "0":
                                setHits(0);
                                focusEmpty();
                                break;
                              case "1":
                                setHits(1);
                                focusEmpty();
                                break;
                              case "2":
                                setHits(2);
                                focusEmpty();
                                break;
                              case "3":
                                setHits(3);
                                focusEmpty();
                                break;
                              case "Tab":
                              case "Enter":
                                if (hits === "unplayed") {
                                  setHits(0);
                                }
                                focusEmpty();
                                break;
                              case "ArrowLeft":
                              case "Left":
                              case "Backspace":
                                focusPrev();
                                break;
                              case "ArrowRight":
                              case "Right":
                                focusNext();
                                break;
                              // default:
                              //   return;
                            }
                            event.preventDefault();
                          }}
                        />
                        : {}
                    }
                  </td> /*TODO: turn27 rewrite*/)
                }
              </tr>;
            })
          }
          { // Hits row
            !props.editable || preferences.twentyseven.ingameHits
              ? <tr class="totalHitsRow">
                <td class="rowLabel"> Hits </td>
                {
                  playerIds.value.map(id => <td>{
                    (() => {
                      const data = playerScores.value.get(id)!;
                      const played = data.hits.value.size;
                      return `${data.roundsHit.value} / ${played}`
                      + ` (${data.totalHits.value} / ${played * 3})`;
                    })()
                  }</td>)
                }
              </tr>
              : {}
          }
        </tbody>
      </table>
      {
        props.displayWinner && positions.value.size > 0
        && [...playerScores.value.values()].every(data => data.hits.value.size === 20)
          ? <div class="completed">
        Game Completed! { (() => {
              console.log("Positions:", positions.value);//XXX
              const winners = positions.value.get(1)!
                .map(pid => playerScores.value.get(pid)!.playerName.value);
              const l = winners.length - 1;
              return winners.length === 1
                ? `Winner = ${winners[0]}`
                : `It is a tie between ${ winners.slice(0, l).join(", ") } and ${winners[l]}`;
            })()
            }!
            {
              false/*!submitted*/ && props.editable
                ? <input
                  type="button"
                  class="submitGame"
                  value="Submit Scores"
                  onClick={() => console.log("TODO:", "submitScores") }
                />
                : {}
            }
          </div>
          : {}
      }
    </div>;
  },
});
export default GameComponent;
