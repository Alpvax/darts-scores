import { defineComponent, ref, watch, type Ref, computed, type PropType, nextTick } from "vue";
import { createComponent } from "@/components/game/fixed/common";
import PlayerSelection from "@/components/PlayerSelection.vue";
import { doc, getDoc, getFirestore } from "firebase/firestore";
import { usePlayerStore } from "@/stores/player";
import {
  DATE_DM_FORMAT,
  defaultSummaryFields,
  gameMeta,
  summaryFactory,
  type TurnData27,
} from "@/game/27";
import type { PlayerDataFor } from "@/gameUtils/playerData";
import { createSummaryComponent } from "@/components/summary";
import type { PlayerDataForStats } from "@/gameUtils/summary";
import { createGameEntriesComponent } from "@/components/gameEntry";
import { intoDBResult, use27History } from "@/game/27/history";
import { use27Config } from "@/game/27/config";
import { usePlayerConfig } from "@/config/playerConfig";
import PlayerName from "@/components/PlayerName";
import { useRouter } from "vue-router";
import SimpleTiebreakDialog from "@/components/game/SimpleTiebreakDialog.vue";
import LoadingButton from "@/components/LoadingButton.vue";

const Game27 = createComponent(gameMeta);
const Summary27 = createSummaryComponent(summaryFactory, defaultSummaryFields);
const GameEntry27 = createGameEntriesComponent(summaryFactory, [
  "score",
  "hits",
  "cliffs",
  "doubleDoubles",
  "hans",
  { field: "fatNicks.allGame", combiner: (a, b) => a && b },
  "piranhas",
  "goblins",
  "allPos.allGame",
  { field: "dreams.allGame", combiner: (a, b) => a || b },
]);

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
          type?: string;
          // [k: string | number]: any;
        };
      };
  game: {
    [player: string]: PlayerGameResult27;
  };
};

export type SideDisplay = "none" | "summary" | "entries" | "combined";

export default defineComponent({
  components: {
    Game27,
    PlayerSelection,
    Summary27,
    GameEntry27,
  },
  props: {
    gameId: { type: String, default: "" },
    sideDisplay: {
      type: String as PropType<SideDisplay | undefined>,
      required: false,
    },
  },
  setup(props) {
    type PlayerData = PlayerDataFor<typeof gameMeta>;
    const db = getFirestore();
    const playerStore = usePlayerStore();
    const config = use27Config();
    const playerConfig = usePlayerConfig();
    const router = useRouter();
    const showHistoryOnSubmit = config.showHistoryOnSubmit.readonlyRef();
    const players = ref(config.defaultPlayers.readonlyRef().value);
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
            (pid) => [playerStore.playerOrder(pid), pid] as [number, string],
          );
          plyrs.sort(([a], [b]) => (a ?? 0) - (b ?? 0));
          players.value = plyrs.map((p) => p[1]);
          return;
        }
      } else if (oldGameId !== undefined) {
        gameDate.value = new Date();
        gameValues.value = undefined;
        players.value = config.defaultPlayers.readonlyRef().value;
      }
    };
    watch(() => props.gameId, onGameIdUpdated, { immediate: true });

    const gameResult = ref(null as null | Map<string, PlayerData>);
    const partialGameResult = ref(new Map<string, PlayerDataForStats<TurnData27>>());

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

    const possibleJesus = computed(
      () =>
        new Set(
          [...playerStats.value].flatMap(([pid, stats]) =>
            stats.hitsTotal === 1 && stats.turnStats[19].hits === 1 ? [pid] : [],
          ),
        ),
    );
    const playerJesus = ref(new Set<string>());

    const tiebreakResult = ref<{ type: string; winner: string } | undefined>();
    const tiebreakDialogRef = ref<HTMLDialogElement | null>(null);

    const submitScores = async () => {
      console.time("submit-game");
      if (winners.value && winners.value.length > 1) {
        if (tiebreakDialogRef.value) {
          tiebreakDialogRef.value.showModal();
        } else {
          await nextTick();
          tiebreakDialogRef.value!.showModal();
        }
      }
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
                  tiebreak: tiebreakResult.value ?? {},
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
        const resultV2 = intoDBResult(
          {
            date: gameDate.value,
            results: partialGameResult.value,
            players: players.value.map((pid) => ({
              pid,
              displayName: playerStore.playerName(pid),
            })),
            tiebreakWinner: tiebreakResult.value?.winner,
          },
          {
            players: players.value.map((pid) => ({
              pid,
              displayName: playerStore.playerName(pid),
              jesus: playerJesus.value.has(pid) && possibleJesus.value.has(pid) ? true : undefined,
            })),
            tiebreakType: tiebreakResult.value?.type,
          },
        );
        console.timeEnd("submit-game");
        console.log("Saving DBResultV2:", resultV2);
        console.time("save-game");
        await historyStore.saveGame(resultV2);
        console.timeLog("save-game", "Saved");
        // if (preferences.saveGamesInProgress) {
        //   window.sessionStorage.clear(); //TODO: only clear relevant?
        // }
        submitted.value = true;
        if (showHistoryOnSubmit.value) {
          console.timeLog("save-game", "Changing to history view");
          router.push({ name: "twentysevenHistory" });
          console.timeEnd("save-game");
        }
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

    const sideDisplayStored = config.sideDisplay.mutableRef("local");
    const sideDisplay = computed({
      get: () => props.sideDisplay ?? sideDisplayStored.value,
      set: (val) => {
        sideDisplayStored.value = val;
      },
    });

    playerStore.loadAllPlayers();
    const allowGuests = playerConfig.allowGuestPlayers.readonlyRef();

    const historyStore = use27History();

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
                  (a, b) => playerStore.playerOrder(a) - playerStore.playerOrder(b),
                ))
              }
              allowGuests={allowGuests.value}
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
              } else {
                nextTick(() => document.getElementById("submitGame")?.focus());
              }
            }}
            onUpdate:gameResult={({ data, positions: p }) => {
              gameResult.value = data;
              positions.value = p;
            }}
            onUpdate:partialSummary={(data) =>
              (partialGameResult.value = data as Map<string, PlayerDataForStats<TurnData27>>)
            }
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
                  {possibleJesus.value.size > 0 ? (
                    <tr class="jesusRow">
                      <th class="rowLabel">Jesus?</th>
                      {playerScores.value.map(({ playerId }) =>
                        possibleJesus.value.has(playerId) ? (
                          <td class="jesusOptionCell">
                            <input
                              type="checkbox"
                              checked={playerJesus.value.has(playerId)}
                              onChange={(e) => {
                                if ((e.currentTarget as HTMLInputElement).checked) {
                                  playerJesus.value.add(playerId);
                                } else {
                                  playerJesus.value.delete(playerId);
                                }
                              }}
                            />
                          </td>
                        ) : (
                          <td></td>
                        ),
                      )}
                    </tr>
                  ) : undefined}
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
          {sideDisplay.value === "summary" ? (
            <Summary27
              players={players.value}
              includeAllPlayers
              games={historyStore.games}
              inProgressGame={partialGameResult.value}
            />
          ) : (
            <GameEntry27
              players={players.value}
              includeAllPlayers
              gameResults={partialGameResult.value}
            />
          )}
          {props.gameId.length <= 0 && gameResult.value !== null && winners.value ? (
            <div class="completed">
              Game Completed!{" "}
              {winners.value.length === 1 ? (
                <>
                  Winner = <PlayerName playerId={winners.value[0]} />
                </>
              ) : (
                [
                  <>It is a tie between </>,
                  ...listFormat
                    .format(winners.value.map((pid) => `{@{${pid}}@}`))
                    .split(/(\{@\{\w+\}@\})/)
                    .map((item) => {
                      const match = /\{@\{(\w+)\}@\}/.exec(item);
                      return match ? <PlayerName playerId={match[1]} /> : <>{item}</>;
                    }),
                ]
              )}
              !
              {!submitted.value && props.gameId.length <= 0 ? (
                <LoadingButton id="submitGame" callback={submitScores}>
                  Submit Scores
                </LoadingButton>
              ) : undefined}
            </div>
          ) : undefined}
          {winners.value && winners.value.length > 1 ? (
            <SimpleTiebreakDialog
              ref={tiebreakDialogRef}
              players={winners.value}
              onSubmit={(res) => (tiebreakResult.value = res)}
            />
          ) : undefined}
        </div>
      </>
    );
  },
});
