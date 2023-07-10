<template>
  <PlayerTable
    id="game27"
    :players="players"
    :rows="rowMeta"
    :width="editable ? 2 : 1"
  >
    <template
      v-if="displayDate"
      #__column0header
    >
      <span
        class="gameDate"
      >{{ dateDayMonthFmt.format(date) }}</span><br>
      <span
        class="gameDate"
      >{{ date.getFullYear() }}</span>
    </template>
    <template
      v-for="round in 20"
      :key="round"
      #[round.toString()]="{player, index}"
    >
      <Turn27
        :editable="editable"
        :target-no="round"
        :hits="gameHits[player].value[round - 1]"
        :score="scores[player][round]"
        :is-winner="!editable && round === 20 && winner ? (
          winner.length === 1 && winner[0].id == player
            ? 'win'
            : winner.some(({id}) => id === player)
              ? 'tie'
              : 'none'
        ) : 'none'"
        @focus-prev="focusTurn(index - 1, round - 1)"
        @focus-next="focusNext"
        @update:hits="h => setHits(player, round, h)"
      />
    </template>
    <template #totalHits="{player}">
      <td :colspan="editable ? 2 : 1">
        {{ gameHits[player].value.reduce((t, h) => h > 0 ? t + 1 : t, 0) }}/20
        ({{ gameHits[player].value.reduce((t, h) => h > 0 ? t + h : t, 0) }}/60)
      </td>
    </template>
  </PlayerTable>
  <div
    v-if="displayWinner && winner != null"
    class="completed"
  >
    Game Completed! {{ winner.length === 1
      ? `Winner = ${winner[0].name}`
      // eslint-disable-next-line max-len
      : `It is a tie between ${
        winner.slice(0, winner.length - 1).map(({ name }) => name).join(", ")
      } and ${winner[winner.length - 1].name}` }}!
    <input
      v-if="!submitted && editable"
      type="button"
      value="Submit Scores"
      @click="submitScores"
    >
  </div>
</template>

<script lang="ts">
import {
  computed, defineComponent, nextTick, PropType, Ref, ref, toRaw, watchEffect,
} from "vue";
import { addDoc, collection, getFirestore } from "firebase/firestore";

import PlayerTable from "@/components/PlayerTable.vue";
import { RowMetadata } from "@/utils/display";
import Turn27 from "./Turn27.vue";
import { Player } from "@/store/player";
import { usePrefs } from "@/store/clientPreferences";
import { Result27, PlayerGameResult27 } from "@/games/27";

const startScores = [27];
for (let i = 1; i < 21; i++) {
  startScores.push(startScores[i - 1] - i * 2);
}

export default defineComponent({
  components: {
    PlayerTable,
    Turn27,
  },
  props: {
    players: { type: Array as PropType<Player[]>, required: true },
    date: { type: Date, default: new Date() },
    editable: { type: Boolean, default: true },
    playerGameHits: {
      type: Object as PropType<{ [player: string]: number[] } | null>,
      default: null,
    },
    displayDate: { type: Boolean, default: false },
    displayWinner: { type: Boolean, default: true },
  },
  setup (props) {
    const preferences = usePrefs();
    const scores = computed(() => props.players.reduce((m, { id }) => {
      if (props.playerGameHits) {
        let s = [27];
        for (let i = 1; i < 21; i++) {
          let h = props.playerGameHits[id][i - 1];
          s.push(s[i - 1] + 2 * (h > 0 ? h * i : -i));
        }
        m[id] = s;
      } else {
        m[id] = [...startScores];
      }
      return m;
    }, {} as { [k: string]: number[] }));
    const gameHits = computed(() => props.players.reduce((o, { id }) => {
      o[id] = ref(props.playerGameHits
        ? props.playerGameHits[id]
        : new Array(20).fill(-1));
      return o;
    }, {} as { [k: string]: Ref<number[]> }));
    const completed = computed(() => Object.entries(gameHits.value).reduce((o, [id, hits]) => {
      o[id] = hits.value.every(h => h >= 0);
      return o;
    }, {} as { [k: string]: boolean }));
    const winner = computed(() =>
      props.players.length > 0 && Object.values(completed.value).every(b => b)
        ? Object.entries(scores.value)
          .reduce(([hp, hs]: [string[], number], [p, s]: [string, number[]]) => {
            let endScore = s[20];
            return endScore > hs
              ? [[p], endScore]
              : endScore === hs
                ? [[...hp, p], hs]
                : [hp, hs];
          }, [[], -394] as [string[], number])[0]
          .map(pid => props.players.find(({ id }) => id === pid)!)
        : null);
    function setHits(player: string, round: number, hits: number): void {
      const prevHits = gameHits.value[player].value[round - 1];
      const deltaScore = 2 * round *
        (prevHits < 1
          ? hits < 1 ? 0 : hits + 1
          : hits < 1 ? -(prevHits + 1) : hits - prevHits);
      gameHits.value[player].value[round - 1] = hits;
      const playerScore = scores.value[player];
      for (let r = round; r <= 20; r++) {
        playerScore[r] += deltaScore;
      }
      console.debug(
        `${player} t${round} = (hits: ${prevHits} => ${hits}; delta = ${deltaScore});`,
        scores.value[player],
        toRaw(gameHits.value[player].value),
        completed.value[player],
      );
      if (preferences.saveGamesInProgress) {
        window.sessionStorage.setItem(`activeGame[${player}]`,
          JSON.stringify(toRaw(gameHits.value[player].value)));
      }
    }
    async function focusNext(next = true): Promise<void> {
      let el = document.querySelector(".turnHits.empty input");
      // console.log("Moving focus to:", el);//XXX
      if (el && el instanceof HTMLInputElement) {
        el.focus();
      } else {
        el = document.querySelector("div.completed > input[type=button]");
        // console.log("Completed: moving focus to:", el);//XXX
        if (el && el instanceof HTMLInputElement) {
          el.focus();
        } else if (next) {
          await nextTick();
          await focusNext(false);
        }
      }
    };
    async function focusTurn(playerIndex: number, round: number): Promise<void> {
      const xMax = props.players.length - 1;
      let x = playerIndex;
      let y = round;
      if (playerIndex < 0) {
        if (round < 1) {
          x = 0;
          y = 0;
        } else {
          x = xMax;
          y = Math.max(0, y - 1);
        }
      } else if (playerIndex > xMax) {
        if (round >= 20) {
          let query = "div.completed > input[type=button]";
          let el;
          for (let i = 0; i < 2; i++) {
            el = document.querySelector(query);
            // console.log("Completed: moving focus to:", el);//XXX
            if (el && el instanceof HTMLInputElement) {
              el.focus();
              break;
            }
            await nextTick();
          }
        } else {
          x = 0;
          y = Math.min(0, y + 1);
        }
      }
      let el = document.querySelectorAll(".turnHits input")
        .item(y * (xMax + 1) + x);
      // console.log("Moving focus to:", el);//XXX
      if (el && el instanceof HTMLInputElement) {
        el.focus();
      }
    };
    watchEffect(() => {
      if (preferences.saveGamesInProgress) {
        for (const { id } of props.players) {
          ((JSON.parse(window.sessionStorage.getItem(`activeGame[${id}]`) ?? "null")
            ?? []) as number[])
            .filter(h => h >= 0)
            .forEach((h, i) => setHits(id, i + 1, h));
        }
      }
      nextTick().then(() => focusNext());
    });
    const submitted = ref(false);
    const rowMeta: RowMetadata[] = (new Array(20)).fill(0).map((_, n) => {
      const roundNum = (n + 1).toString();
      return {
        label: roundNum,
        slotId: roundNum,
      };
    });
    rowMeta.push({
      label: "Hits",
      slotId: "totalHits",
      additionalClass: ["totalHitsRow"],
      showIf: computed(() => !props.editable || preferences.twentyseven.ingameHits),
    });
    return {
      gameHits,
      scores,
      winner,
      setHits,
      focusNext,
      focusTurn,
      deltaScore: (player: string, round: number): number => {
        const hits = gameHits.value[player].value[round];
        return 2 * (hits > 0 ? hits * round : -round);
      },
      submitted,
      submitScores: async () => {
        let result: Result27 = {
          date: props.date.toISOString(),
          winner: winner.value!.length == 1
            ? winner.value![0].id
            : {
              tie: winner.value!.map(({ id }) => id),
              tiebreak: {},//TODO: implement tiebreak saving
            },
          game: props.players.reduce((o, { id }) => {
            const hits = toRaw(gameHits.value[id].value);
            const cliffs = hits.filter(c => c == 3).length;
            const score = scores.value[id];
            const finalScore = score[20]; // Score 20 is the final score
            const allPositive = score.every(s => s > 0);
            o[id] = { rounds: hits, cliffs, score: finalScore, allPositive };
            return o;
          }, {} as { [player: string]: PlayerGameResult27 }),
        };
        console.log(result);
        const db = getFirestore();
        await addDoc(collection(db, "game/twentyseven/games"), result);
        submitted.value = true;
        if (preferences.saveGamesInProgress) {
          window.sessionStorage.clear(); //TODO: only clear relevant?
        }
      },
      rowMeta,
      deltaNumfmt: new Intl.NumberFormat("en-GB", { style: "decimal",  signDisplay: "always" }),
      dateDayMonthFmt: new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short" }),
    };
  },
});
</script>

<style>
#game27 .playerName, #game27 .rowLabel {
  font-weight: bold;
}
.gameDate {
  width: fit-content;
  font-weight: bold;
}
.completed {
  width: fit-content;
}
input[type=button] {
  font-size: 2.2vh;
}
tr.totalHitsRow > td {
  border-top: 1px dashed black;
  font-size: 0.95em;
}
</style>
