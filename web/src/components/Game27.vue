<template>
  <table>
    <thead>
      <tr>
        <td>&nbsp;</td>
        <td
          v-for="[player] in players"
          :key="player"
          class="playerName"
          colspan="2"
        >
          {{ player }}
        </td>
      </tr>
    </thead>
    <tbody>
      <tr
        v-for="n in 20"
        :key="n"
      >
        <td class="roundNum">
          {{ n }}
        </td>
        <Turn27
          v-for="[player] in players"
          :key="player"
          :target-no="n"
          :score-in="scores[player].value[n - 1] ?? 0"
          @score="(s) => score(player, n, s)"
          @update:hits="(h, f) => updateHits(player, n, h, f)"
        />
      </tr>
    </tbody>
  </table>
  <div
    v-if="winner != null"
    class="completed"
  >
    Game Completed! {{ winner.length === 1
      ? `Winner = ${winner[0]}`
      // eslint-disable-next-line max-len
      : `It is a tie between ${winner.slice(0, winner.length - 1).join(", ")} and ${winner[winner.length - 1]}` }}!
    <input
      v-if="!submitted"
      type="button"
      value="Submit Scores"
      @click="submitScores"
    >
  </div>
</template>

<script lang="ts">
import { computed, defineComponent, onMounted, PropType, Ref, ref, toRaw } from "vue";
import { addDoc, collection, getFirestore } from "firebase/firestore";

import Turn27 from "./Turn27.vue";

const startScores = [27];
for (let i = 1; i < 21; i++) {
  startScores.push(startScores[i - 1] - i * 2);
}

export default defineComponent({
  components: {
    Turn27,
  },
  props: {
    players: { type: Array as PropType<[string, string][]>, required: true },
    date: { type: Date, default: new Date() },
  },
  setup (props) {
    function unwrapRefObj<T extends { [k: string]: Ref<U> }, U>(obj: T): { [K in keyof T]: U } {
      return Object.entries(obj).reduce((o, [p, r]) => {
        o[p] = toRaw(r.value);
        return o;
      }, {} as { [k: string]: U }) as { [K in keyof T]: U };
    }
    const scores = computed(() => props.players.reduce((m, [p]) => {
      m[p] = ref([...startScores]);
      return m;
    }, {} as { [k: string]: Ref<number[]> }));
    const gameHits = computed(() => props.players.reduce((m, [p]) => {
      m[p] = ref(new Array(20).fill(0));
      return m;
    }, {} as { [k: string]: Ref<number[]> }));
    const completed = computed(() => props.players.reduce((o, [p]) => {
      o[p] = ref(false);
      return o;
    }, {} as { [k: string]: Ref<boolean> }));
    const winner = computed(() => Object.values(completed.value).every(b => b.value)
      ? Object.entries(scores.value)
        .reduce(([hp, hs]: [string[], number], [p, s]: [string, Ref<number[]>]) => {
          let endScore = s.value[20];
          return endScore > hs
            ? [[p], endScore]
            : endScore === hs
              ? [[...hp, p], hs]
              : [hp, hs];
        }, [[], -394] as [string[], number])[0]
      : null);
    function score(player: string, turn: number, score: number): void {
      let ps = scores.value[player];
      ps.value[turn] = score;
      if (turn == 20) {
        completed.value[player].value = true;
      } else {
        for (let i = turn + 1; i < 21; i++) {
          ps.value[i] = ps.value[i - 1] - i * 2;
        }
      }
      console.debug(
        `${player} t${turn} = ${score};`,
        unwrapRefObj(scores.value),
        unwrapRefObj(completed.value),
      );
    }
    function focusNext(): void {
      let el = document.querySelector(".turnHits.empty input");
      if (el && el instanceof HTMLInputElement) {
        el.focus();
      }
    };
    onMounted(() => focusNext());
    function updateHits(player: string, turn: number, hits: number, moveFocus: boolean): void {
      let ph = gameHits.value[player];
      ph.value[turn - 1] = hits;
      if (moveFocus) {
        focusNext();
      }
    }
    const submitted = ref(false);
    return {
      score,
      scores,
      winner,
      updateHits,
      submitted,
      submitScores: () => {
        const winners = winner.value!.map(name => props.players.find(([n]) => n === name)![1]);
        let result = {
          date: props.date.toISOString(),
          winner: winners.length == 1
            ? winners[0]
            : {
              tie: winners,
              tiebreak: {},//TODO: implement tiebreak saving
            },
          game: props.players.reduce((o, [p, pId]) => {
            const hits = toRaw(gameHits.value[p].value);
            const cliffs = hits.filter(c => c == 3).length;
            const score = scores.value[p].value;
            const finalScore = score[19];
            const allPositive = score.every(s => s > 0);
            o[pId] = { rounds: hits, cliffs, score: finalScore, allPositive };
            return o;
          }, {} as { [player: string]: {
            rounds: number[];
            cliffs: number;
            score: number;
            allPositive: boolean;
          }; }),
        };
        console.log(result);
        const db = getFirestore();
        addDoc(collection(db, "game/twentyseven/games"), result);
        submitted.value = true;
      },
    };
  },
});
</script>

<style>
.playerName, .roundNum {
  font-weight: bold;
}
.completed {
  width: fit-content;
}
input[type=button] {
  font-size: 2.2vh;
}
</style>
