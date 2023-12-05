import { defineComponent, ref, watch, type Ref, computed } from "vue";
import { createComponent } from "@/components/game/fixed/common";
import PlayerSelection from "@/components/PlayerSelection.vue";
import { doc, getDoc, getFirestore } from "firebase/firestore";
import { usePlayerStore } from "@/stores/player";
import { DATE_DM_FORMAT, gameMeta } from "@/game/27";
import type { PlayerDataFor } from "@/gameUtils/playerData";

const Game27 = createComponent(gameMeta);

const listFormat = new Intl.ListFormat(undefined, { type: "conjunction", style: "long" });

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
    PlayerSelection,
  },
  props: {
    gameId: { type: String, default: "" },
  },
  setup(props) {
    type PlayerData = PlayerDataFor<typeof gameMeta>;
    const db = getFirestore();
    const playerStore = usePlayerStore();
    const players = ref([
      //TODO: proper players
      "y5IM9Fi0VhqwZ6gAjil6",
      "6LuRdib3wFxhbcjjh0au",
      "Gt8I7XPbPWiQ92FGsTtR",
      "jcfFkGCY81brr8agA3g3",
      "jpBEiBzn9QTVN0C6Hn1m",
      "k7GNyCogBy79JE4qhvAj",
    ]);
    const gameDate = ref(new Date());
    const gameValues = ref(undefined as undefined | Map<string, (number | undefined)[]>);
    const onGameIdUpdated = async (gameId: string | undefined, oldGameId?: string) => {
      if (gameId) {
        const data = (await getDoc(doc(db, "game/twentyseven/games", gameId))).data() as Result27;
        if (data !== undefined) {
          gameDate.value = new Date(data.date);
          const values = new Map(
            Object.entries(data.game).map(([pid, { rounds }]) => [pid, rounds]),
          );
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
    };
    watch(() => props.gameId, onGameIdUpdated, { immediate: true });

    const gameResult = ref(null as null | Map<string, PlayerData>);

    const playerStats = ref(new Map<string, PlayerData["stats"]>());

    watch(
      () => gameResult,
      (result) => {
        if (result) {
          console.log("Game Result:", result);
        }
      },
    );
    const positions = ref(
      [] as {
        pos: number;
        posOrdinal: string;
        players: string[];
      }[],
    );
    const winners = computed(() =>
      gameResult.value !== null && positions.value.length > 0
        ? positions.value[0].players
        : undefined,
    );
    const submitted = ref(false);

    const submitScores = () => {
      // console.log("Submitting scores:", gameValues.value);
      console.log("Game result:", gameResult.value);
      // if (gameValues.value !== undefined) {
      //   const game = [...gameValues.value.entries()].reduce(
      //     (obj, [pid, rounds]) => {
      //       obj[pid] = {
      //         rounds: rounds.map((r) => r ?? 0),
      //         //TODO: rest of values
      //       };
      //       return obj;
      //     },
      //     {} as Record<string, { rounds: number[] }>,
      //   ); //Result27["game"])
      //   console.log(game); //XXX
      // }
      if (winners.value !== undefined && gameResult.value !== null) {
        const result: Result27 = {
          date: gameDate.value.toISOString(),
          winner:
            winners.value.length === 1
              ? winners.value[0]
              : {
                  tie: winners.value,
                  tiebreak: {}, //TODO: tiebreak
                },
          game: [...gameResult.value.entries()].reduce(
            (game, [pid, data]) => {
              game[pid] = {
                rounds: [...data.allTurns.values()].map(({ value }) => value!),
                score: data.score,
                cliffs: data.stats.cliffCount,
                allPositive: data.stats.allPositive,
              };
              return game;
            },
            {} as Record<string, PlayerGameResult27>,
          ),
        };
        console.log("DBResult:", result);
        console.log(
          "Stats:",
          new Map([...gameResult.value.entries()].map(([pid, { stats }]) => [pid, stats])),
        );
        submitted.value = true;
      }
    };

    // type RoundStats = { cliff: boolean; dd: boolean; hit: boolean };
    // type GameStats = {
    //   roundStats: Map<number, RoundStats>;
    // };
    // const gameStats = ref(new Map<string, GameStats>());

    // const updateGameStats = (playerId: string, roundIdx: number, data: TurnData<number>) => {
    //   if (!gameStats.value.has(playerId)) {
    //     gameStats.value.set(playerId, {
    //       roundStats: new Map(),
    //     });
    //   }
    //   const stats = gameStats.value.get(playerId)!.roundStats;
    //   stats.set(roundIdx + 1, {
    //     cliff: data.value === 3,
    //     dd: data.value >= 2,
    //     hit: data.value >= 1,
    //   });
    //   console.log(gameStats.value.get(playerId)); //XXX
    // };

    // const playerScores = ref([] as PlayerData<number[]>[]);

    return () => (
      <>
        <div class="gameDiv">
          {props.gameId.length < 1 && !submitted.value ? (
            <PlayerSelection
              legend="Select players"
              available={playerStore.all}
              modelValue={players.value}
              onUpdate:modelValue={(p: string[]) =>
                (players.value = p.toSorted(
                  (a, b) => playerStore.defaultOrder(a).value - playerStore.defaultOrder(b).value,
                ))
              }
            />
          ) : undefined}
          <Game27
            class="game twentyseven"
            players={players.value}
            // modelValue={gameValues.value}
            editable={props.gameId.length < 1 && !submitted.value}
            displayPositions="head"
            // onPlayerCompleted={(pid, complete) =>
            //   console.log(`player "${pid}" completion state changed: ${complete}`)
            // }
            onCompleted={(c) => {
              if (!c) {
                gameResult.value = null;
              }
            }}
            onUpdate:gameResult={({ data, positions: p }) => {
              gameResult.value = data;
              positions.value = p;
            }}
            onUpdate:playerStats={(pid, stats) => playerStats.value.set(pid, stats)}
          >
            {{
              topLeftCell:
                props.gameId.length > 0
                  ? () => (
                      <th class="gameDate">
                        <span>{DATE_DM_FORMAT.format(gameDate.value)}</span>
                        <br />
                        <span>{gameDate.value.getFullYear()}</span>
                      </th>
                    )
                  : undefined,
              footer: (playerScores: Ref<PlayerData[]>) => (
                <>
                  <tr class="totalHitsRow">
                    <th class="rowLabel">Hits</th>
                    {playerScores.value.map(({ turns, stats: { hitsCountNZ, hitsTotal } }) => {
                      const l = turns.size;
                      return (
                        <td>
                          <span>
                            {hitsCountNZ}/{l}
                          </span>{" "}
                          <span>
                            ({hitsTotal}/{l * 3})
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                  {playerScores.value.some(({ turns }) => turns.size < 20) ? (
                    <tr class="finalScoreRow">
                      <th class="rowLabel">Final score</th>
                      {playerScores.value.map(({ allTurns }) => {
                        // const lastComplete = Math.max(...rounds.keys());
                        // const l_l2 = lastComplete - lastComplete * lastComplete
                        // Score - 105 - l_l2
                        // Score + 3 * (105 + l_l2)
                        let scoreMin = 27;
                        let scoreMax = 27;
                        for (let i = 0; i < 20; i++) {
                          const s = allTurns.get(i)!.value;
                          if (s === undefined) {
                            scoreMin -= 2 * (i + 1);
                            scoreMax += 6 * (i + 1);
                          } else {
                            const delta = (i + 1) * (s > 0 ? 2 * s : -2);
                            scoreMin += delta;
                            scoreMax += delta;
                          }
                        }
                        return scoreMin === scoreMax ? (
                          <td>{scoreMin}</td>
                        ) : (
                          <td>
                            {scoreMin} to {scoreMax}
                          </td>
                        );
                      })}
                    </tr>
                  ) : undefined}
                </>
              ),
            }}
          </Game27>
          {props.gameId.length <= 0 && gameResult.value !== null && winners.value ? (
            <div class="completed">
              Game Completed!{" "}
              {winners.value.length === 1
                ? `Winner = ${playerStore.playerName(winners.value[0]).value}`
                : `It is a tie between ${listFormat.format(
                    winners.value.map((pid) => playerStore.playerName(pid).value),
                  )}`}
              !
              {!submitted.value && props.gameId.length <= 0 ? (
                <input type="button" value="Submit Scores" onClick={submitScores} />
              ) : undefined}
            </div>
          ) : undefined}
        </div>
        <table class="playerGameStats">
          <thead>
            <tr>
              <th>&nbsp;</th>
              {players.value.map((pid) => (
                <th class="playerName">{playerStore.playerName(pid).value}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Object.keys(playerStats.value.values().next().value ?? { loading: undefined }).flatMap(
              (key) =>
                key === "turnStats" ? (
                  []
                ) : (
                  <tr>
                    <td class="rowLabel">{key}</td>
                    {players.value.map((pid) => {
                      const stats = playerStats.value.get(pid);
                      if (stats !== undefined) {
                        const value = stats[key as keyof PlayerData["stats"]];
                        if (value !== undefined || value !== null) {
                          return <td>{value.toString()}</td>;
                        }
                      }
                      return <td>&nbsp;</td>;
                    })}
                  </tr>
                ),
            )}
          </tbody>
        </table>
      </>
    );
  },
});
