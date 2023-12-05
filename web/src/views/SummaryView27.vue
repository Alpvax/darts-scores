<script lang="ts">
import { createSummaryComponent } from "@/components/summary";
import { gameMeta, summaryFactory, type TurnData27 } from "@/game/27";
import { makePlayerPositions } from "@/gameUtils/playerData";
import type { IntoTaken } from "@/gameUtils/roundDeclaration";
import type { GameResult, PlayerDataForStats } from "@/gameUtils/summary";
import { ref, defineComponent } from "vue";

const Summary27 = createSummaryComponent(summaryFactory, [
  "score.highest",
  "score.lowest",
  "score.mean",
  // REAL WINS?!
  "wins.all.total",
  "numGames",
  "wins.all.mean",
  "fatNicks.count",
  "fatNicks.latest",
  "cliffs.total",
  "cliffs.mean",
  "doubleDoubles.total",
  "doubleDoubles.mean",
  "hans.total",
  "goblins.count",
  "piranhas.count",
  // "jesus.count",
  "dreams.latest",
  "allPos.count",
  "allPos.latest",
  // "hits.highest",
  // "hits.lowest",
  // "hits.mean",
]);

export default defineComponent({
  components: {
    Summary27,
  },
  props: {},
  setup: (/*TODO: props*/) => {
    const players = ref([
      //TODO: proper players
      "y5IM9Fi0VhqwZ6gAjil6",
      "6LuRdib3wFxhbcjjh0au",
      "Gt8I7XPbPWiQ92FGsTtR",
      "jcfFkGCY81brr8agA3g3",
      "jpBEiBzn9QTVN0C6Hn1m",
      "k7GNyCogBy79JE4qhvAj",
    ]);
    const makeGame = (index?: number): GameResult<TurnData27> => {
      const plyrData = players.value.reduce((map, pid) => {
        if (Math.random() < 0.6) {
          const hits = Array.from({ length: 20 }, () =>
            Math.random() < 0.3 ? (Math.random() < 0.1 ? (Math.random() < 0.01 ? 3 : 2) : 1) : 0,
          );
          const { turns, score } = gameMeta.rounds.reduce(
            ({ turns, score }, r, i) => {
              const t = r.turnData(hits[i], score, "", i);
              turns.push(t);
              return { turns, score: t.score };
            },
            { turns: [] as TurnData27[], score: 27 },
          );
          map.set(pid, {
            playerId: pid,
            complete: true,
            score,
            turns: new Map(
              turns.flatMap((t, i) =>
                t.value === undefined ? [] : [[i, t as IntoTaken<TurnData27>]],
              ),
            ),
            allTurns: new Map(turns.map((t, i) => [i, t])),
          });
        }
        return map;
      }, new Map<string, Omit<PlayerDataForStats<TurnData27>, "tied" | "position">>());
      const positions = makePlayerPositions(
        ref(new Map([...plyrData].map(([p, { score }]) => [p, score]))),
        "highestFirst",
      ).playerPositions.value;
      const game: GameResult<TurnData27> = {
        date: new Date(),
        results: new Map(
          [...plyrData].map(([pid, data]) => {
            const pos = positions.playerLookup.get(pid)!;
            return [
              pid,
              {
                ...data,
                position: pos.pos,
                tied: pos.players.filter((p) => p !== pid),
              },
            ];
          }),
        ),
      };
      if (positions.ordered[0].players.length > 1) {
        game.tiebreakWinner = positions.ordered[0].players[0];
      }
      console.log(`Summary Game ${index} results:`, game.results); //XXX
      return game;
    };
    const games = ref(Array.from({ length: 10 }, (_, i) => makeGame(i)));
    return {
      players,
      games,
    };
  },
});
</script>

<template>
  <Summary27 :players="players" :games="games" />
</template>
