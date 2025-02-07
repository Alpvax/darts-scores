import {
  defineComponent,
  ref,
  computed,
  type PropType,
  watch,
  watchEffect,
  type VNodeRef,
  type Ref,
} from "vue";
import PlayerSelection from "@/components/PlayerSelection.vue";
import { usePlayerStore } from "@/stores/player";
import type { GameResult } from "@/gameUtils/summary";
import {
  DATE_DM_FORMAT,
  defaultSummaryFields,
  gameMeta,
  summaryFactory,
  type TurnData27,
} from "@/game/27";
import { createSummaryComponent } from "@/components/summary";
import { use27History } from "@/game/27/history";
import { use27Config } from "@/game/27/config";
import { makePlayerPositions, type PlayerDataFor } from "@/gameUtils/playerData";
import { extendClass } from "@/utils";
import { autoUpdate, shift, useFloating } from "@floating-ui/vue";
import { createImmutableComponent } from "@/components/gameV2/immutableGame";
import { useRoute } from "vue-router";

const Game27 = createImmutableComponent(gameMeta);
const Summary27 = createSummaryComponent(summaryFactory, defaultSummaryFields);

const SUPERSCRIPT_N = (() => {
  const digits = Array.from({ length: 10 }, (_, i) => String.fromCharCode(0x2070 + i));
  digits[1] = "\u00B9";
  digits[2] = "\u00B2";
  digits[3] = "\u00B3";
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_z, ...nums] = ["", digits[1]].flatMap((s) => digits.map((d) => s + d));
  nums.push(digits[2] + digits[0]);
  return nums;
})();

export default defineComponent({
  components: {
    PlayerSelection,
    Summary27,
  },
  props: {
    displayGame: { type: String as PropType<string | undefined>, default: undefined },
    //TODO: Props?
    // fromDate: {
    //   type: Date as PropType<Date>,
    //   default: () => new Date(new Date().getFullYear(), 0, 1),
    // },
    // toDate: { type: Date as PropType<Date | null>, default: null },
  },
  setup(props) {
    const playerStore = usePlayerStore();

    const config = use27Config();

    const playersFilter = config.realWinsPlayers.mutableRef("local");

    const historyStore = use27History();

    const players = computed(() =>
      [...historyStore.allPlayers]
        .flatMap(([pid, names]) => {
          const p = playerStore.getPlayer(pid);
          if (p.loaded) {
            if (p.disabled) {
              return [];
            }
          } else {
            p.addPastNames(...names);
          }
          return [p];
        })
        .toSorted(
          ({ id: a }, { id: b }) => playerStore.playerOrder(a) - playerStore.playerOrder(b),
        ),
    );

    const showGuestGames = config.displayGuestGames.mutableRef("local");
    const displayGuestSummaries = config.displayGuestSummaries.mutableRef("local");

    type PastGameResult = GameResult<TurnData27> & { gameId: string };

    const games = computed(() => historyStore.games as unknown as PastGameResult[]);
    const lastGamePlayers = computed(
      () =>
        new Set(games.value.length > 0 ? games.value[0].players.map(({ pid }) => pid) : undefined),
    );

    const gameViewPlayers = computed(() =>
      players.value.flatMap((p) =>
        (p.loaded && !p.guest) || showGuestGames.value || lastGamePlayers.value.has(p.id)
          ? [p.id]
          : [],
      ),
    );
    const summaryPlayers = computed(() =>
      players.value.flatMap((p) =>
        (p.loaded && !p.guest) ||
        lastGamePlayers.value.has(p.id) ||
        (typeof displayGuestSummaries.value === "boolean"
          ? displayGuestSummaries.value
          : displayGuestSummaries.value.includes(p.id))
          ? [p.id]
          : [],
      ),
    );

    const displayedGameId = ref<string | undefined>();
    const displayedGame = ref<PastGameResult | undefined>();

    const displayedGamePos = ref<Element | undefined>();
    watch(
      () => props.displayGame,
      (val, old) => {
        if (val !== undefined) {
          setDisplayedGame(val);
        } else if (old !== undefined) {
          setDisplayedGame(undefined);
        }
      },
      { immediate: true },
    );
    watchEffect(() => {
      displayedGame.value = games.value.find(({ gameId }) => gameId === displayedGameId.value);
    });

    const setDisplayedGame = (
      gameOrId: string | undefined | PastGameResult,
      pos?: Element | null,
    ) => {
      switch (typeof gameOrId) {
        case "undefined": {
          displayedGameId.value = undefined;
          displayedGame.value = undefined;
          displayedGamePos.value = undefined;
          break;
        }
        case "string": {
          displayedGame.value = games.value.find(({ gameId }) => gameId === gameOrId);
          displayedGameId.value = gameOrId;
          displayedGamePos.value = pos ?? undefined;
          break;
        }
        case "object": {
          displayedGameId.value = gameOrId.gameId;
          displayedGame.value = gameOrId;
          displayedGamePos.value = pos ?? undefined;
          break;
        }
      }
    };
    const pastGameEl = ref<VNodeRef | null>(null);
    const { floatingStyles } = useFloating(displayedGamePos, pastGameEl, {
      placement: "bottom-end",
      middleware: [
        shift({
          mainAxis: true,
          crossAxis: true,
        }),
      ],
      whileElementsMounted: autoUpdate,
    });
    const route = useRoute();
    const copyPastGameToClipboard = async () => {
      console.log(route.path);
      const link = `${window.location.origin}/game/${displayedGame.value!.gameId}`;
      console.info("Sharing link:", link); //XXX
      try {
        await navigator.clipboard.writeText(link);
        alert("Copied link to clipboard");
      } catch (e) {
        console.info("Error copying link to clipboard:", e);
        alert("Cannot copy to clipboard: share the following link:\n" + link);
      }
    };

    return () => (
      <div class="historyDiv">
        <div id="historyFilter">
          <div class="dateFilters">
            <label for="fromDateFilter">From:</label>
            <input id="fromDateFilter" v-model={historyStore.fromDate} type="date" />
            <label for="toDateFilter">To:</label>
            <input id="toDateFilter" v-model={historyStore.toDate} type="date" />
          </div>
          <PlayerSelection
            legend='Select players to filter "Real Wins"'
            available={players.value
              .flatMap((p) => {
                return p.loaded && !p.guest ? [p.id] : [];
              })
              .toSorted((a, b) => playerStore.playerOrder(a) - playerStore.playerOrder(b))}
            modelValue={playersFilter.value}
            onUpdate:modelValue={(val) => (playersFilter.value = val)}
          />
        </div>
        <table class="gamesList">
          <thead>
            <tr>
              <td class="tableHeader">Date</td>
              {gameViewPlayers.value.map((pid) => (
                <td class="playerName">{playerStore.playerName(pid)}</td>
              ))}
            </tr>
          </thead>
          <tbody>
            {games.value.map((game) => {
              const positions = makePlayerPositions(
                ref(new Map([...game.results].map(([pid, { score }]) => [pid, score]))),
                gameMeta.positionOrder,
              ).playerPositions.value.playerLookup;
              return (
                <tr
                  class={{
                    debugGame: game.isDebugGame,
                    selectedGame: game.gameId === displayedGameId.value,
                    teamDream:
                      [...game.results.values()].reduce((hit, { turns }) => {
                        for (const [turn, { value }] of turns) {
                          if (value > 0) {
                            hit.add(turn);
                          }
                        }
                        return hit;
                      }, new Set<number>()).size >= 20,
                  }}
                  onClick={(e) => {
                    setDisplayedGame(game, e.currentTarget as Element | null);
                    e.stopPropagation();
                    e.preventDefault();
                  }}
                  data-game-id={game.gameId}
                >
                  <td class="rowLabel">{game.date.toLocaleDateString()}</td>
                  {gameViewPlayers.value.map((pid) => {
                    const result = game.results.get(pid);
                    const pos = positions.get(pid);
                    const notables = [...(result?.allTurns?.values() ?? [])].reduce(
                      (acc, t) => {
                        if (t.score < 0) {
                          acc.allPositive = false;
                        }
                        if (t.stats.cliff) {
                          acc.cliffs += 1;
                        } else if (t.stats.doubledouble) {
                          acc.dd += 1;
                        }
                        return acc;
                      },
                      {
                        allPositive: true,
                        cliffs: 0,
                        dd: 0,
                      },
                    );
                    const dataNotables =
                      (notables.allPositive ? "+" : "") +
                      (notables.cliffs > 0
                        ? `c${notables.cliffs > 1 ? SUPERSCRIPT_N[notables.cliffs - 1] : ""}`
                        : "") +
                      (notables.dd > 0
                        ? `d${notables.dd > 1 ? SUPERSCRIPT_N[notables.dd - 1] : ""}`
                        : "");
                    return result ? (
                      <td
                        class={extendClass({
                          winner:
                            game.tiebreakWinner !== undefined
                              ? pid === game.tiebreakWinner
                              : pos?.pos === 1,
                          tie: pos?.pos === 1 && pos && pos.players.length > 1,
                        })}
                        data-notables={dataNotables.length > 0 ? ` (${dataNotables})` : undefined}
                      >
                        {result.score}
                      </td>
                    ) : (
                      <td>&nbsp;</td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
        <Summary27 players={summaryPlayers.value} games={historyStore.games} />
        {displayedGame.value === undefined ? undefined : (
          <div
            style={floatingStyles.value}
            ref={pastGameEl}
            id="pastGameOverlay"
            v-click-outside={() => setDisplayedGame(undefined)}
          >
            <Game27 class="game twentyseven" gameResult={displayedGame.value}>
              {{
                topLeftCell: () => (
                  <th class="gameDate">
                    <span>{DATE_DM_FORMAT.format(displayedGame.value?.date)}</span>
                    <br />
                    <span>{displayedGame.value?.date.getFullYear()}</span>
                  </th>
                ),
                footer: (playerScores: PlayerDataFor<typeof gameMeta>[]) => (
                  <tr class="totalHitsRow">
                    <th class="rowLabel">Hits</th>
                    {playerScores.map(({ turns, stats: { hitsCountNZ, hitsTotal } }) => {
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
                ),
              }}
            </Game27>
            <input type="button" value="Share" onClick={copyPastGameToClipboard} />
          </div>
        )}
      </div>
    );
  },
});
