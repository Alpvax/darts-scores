<template>
  <PlayerTable
    :players="players"
    :rows="rowMeta"
    :width="editable ? 2 : 1"
  >
    <template
      v-for="round in 20"
      :key="round"
      #[round]="{player}"
    >
      <Turn27
        :editable="editable"
        :target-no="round"
        :hits="gameHits[player].value[round - 1]"
        :score="scores[player][round]"
        @focus-next="focusNext"
        @update:hits="h => setHits(player, round, h)"
      />
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
  computed, defineComponent, nextTick, onMounted, PropType, Ref, ref, toRaw, watch,
} from "vue";
import { addDoc, collection, getFirestore } from "firebase/firestore";

import PlayerTable from "@/components/PlayerTable.vue";
import { asPlayerObj, getPlayerId, iterPlayers, Player } from "@/util/player";
import Turn27 from "./Turn27.vue";

export type PlayerGameResult27 = {
  rounds: number[];
  cliffs: number;
  score: number;
  allPositive: boolean;
};
export type Result27 = {
  date: string;
  winner: string | {
    tie: string[];
    tiebreak: { //TODO: implement tiebreak
      winner?: string;
      // [k: string | number]: any;
    };
  };
  game: {
    [player: string]: PlayerGameResult27;
  };
}

// class PlayerScore {
//   private readonly hits: number[] = [];
//   private readonly cumulative: number[] = [];
//   constructor(private readonly startScore = 27) {
//     this.cumulative.push(startScore);
//     for (let i = 1; i < 21; i++) {
//       this.cumulative[i] = this.cumulative[i - 1] - i * 2;
//     }
//   }

//   getHits(round: number): number {
//     return this.hits[round] ?? 0;
//   }
//   setHits(round: number, hits: number): void {
//     this.hits[round] = hits;
//   }

// }

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
    displayWinner: { type: Boolean, default: true },
  },
  setup (props) {
    // function unwrapRefObj<T extends { [k: string]: Ref<U> }, U>(obj: T): { [K in keyof T]: U } {
    //   return Object.entries(obj).reduce((o, [p, r]) => {
    //     o[p] = toRaw(r.value);
    //     return o;
    //   }, {} as { [k: string]: U }) as { [K in keyof T]: U };
    // }
    const scores = computed(() => iterPlayers(props.players).reduce((m, { id }) => {
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
    const gameHits = computed(() => iterPlayers(props.players).reduce((o, { id }) => {
      o[id] = ref(props.playerGameHits ? props.playerGameHits[id] : new Array(20).fill(-1));
      return o;
    }, {} as { [k: string]: Ref<number[]> }));
    const completed = computed(() => Object.entries(gameHits.value).reduce((o, [id, hits]) => {
      o[id] = hits.value.every(h => h >= 0);
      return o;
    }, {} as { [k: string]: boolean }));
    const winner = computed(() => Object.values(completed.value).every(b => b)
      ? Object.entries(scores.value)
        .reduce(([hp, hs]: [string[], number], [p, s]: [string, number[]]) => {
          let endScore = s[20];
          return endScore > hs
            ? [[p], endScore]
            : endScore === hs
              ? [[...hp, p], hs]
              : [hp, hs];
        }, [[], -394] as [string[], number])[0]
        .map(id => asPlayerObj(props.players.find(p => getPlayerId(p) === id)!))
      : null);
    function setHits(player: string, round: number, hits: number): void {
      const prevHits = gameHits.value[player].value[round - 1];
      const deltaScore = 2 * round *
        (prevHits < 1 ? hits + 1 : hits < 1 ? -(prevHits + 1) : hits - prevHits);
      gameHits.value[player].value[round - 1] = hits;
      const playerScore = scores.value[player];
      for (let r = round; r <= 20; r++) {
        playerScore[r] += deltaScore;
      }
      console.debug(
        `${player} t${round} = (${prevHits} => ${hits} hits = ${deltaScore});`,
        scores.value[player],
        gameHits.value[player],
        completed.value[player],
      );
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
    watch(() => props.players, () => focusNext());
    onMounted(() => focusNext());
    const submitted = ref(false);
    return {
      gameHits,
      scores,
      winner,
      setHits,
      focusNext,
      deltaScore: (player: string, round: number): number => {
        const hits = gameHits.value[player].value[round];
        return 2 * (hits > 0 ? hits * round : -round);
      },
      submitted,
      submitScores: () => {
        let result: Result27 = {
          date: props.date.toISOString(),
          winner: winner.value!.length == 1
            ? winner.value![0].id
            : {
              tie: winner.value!.map(({ id }) => id),
              tiebreak: {},//TODO: implement tiebreak saving
            },
          game: iterPlayers(props.players).reduce((o, { id }) => {
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
        addDoc(collection(db, "game/twentyseven/games"), result);
        submitted.value = true;
      },
      rowMeta: (new Array(20)).fill(0).map((_, n) => {
        const roundNum = (n + 1).toString();
        return {
          label: roundNum,
          slotId: roundNum,
        };
      }),
      deltaNumfmt: new Intl.NumberFormat("en-GB", { style: "decimal",  signDisplay: "always" }),
    };
  },
});
</script>

<style>
.playerName, .rowLabel {
  font-weight: bold;
}
.completed {
  width: fit-content;
}
input[type=button] {
  font-size: 2.2vh;
}
</style>
