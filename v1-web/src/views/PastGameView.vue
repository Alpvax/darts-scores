<template>
  <Game27
    :players="players"
    :date="date"
    :editable="false"
    :player-game-hits="rounds"
    :display-date="true"
    :display-winner="false"
  />
</template>

<script lang="ts">
import { computed, defineComponent, ref } from "vue";
import Game27 from "@/components/27/Game27.vue";
import { doc, getDoc, getFirestore } from "firebase/firestore";
import { usePlayerStore } from "@/store/player/onDemand";
import { Result27 } from "@/games/27";

export default defineComponent({
  components: {
    Game27,
  },
  props: {
    gameId: { type: String, required: true },
  },
  async setup(props) {
    const db = getFirestore();
    const playerStore = usePlayerStore();
    const game = ref((await getDoc(doc(db, "game/twentyseven/games", props.gameId)))
      .data() as Result27);
    const playerScores = computed(() => game.value.game);
    const players = computed(() => {
      let p = playerStore.getPlayers(Object.keys(playerScores.value)).value.map(p => p.value);
      p.sort((a, b) => (a.defaultOrder ?? 0) - (b.defaultOrder ?? 0));
      return p;
    });
    return {
      game,
      date: computed(() => new Date(game.value.date)),
      players,
      rounds: computed(() => Object.entries(playerScores.value).reduce((o, [id, s]) => {
        o[id] = s.rounds;
        return o;
      }, {} as { [id: string]: number[] })),
    };
  },
});
</script>

<style>
.playerName, .tableHeader {
  font-weight: bold;
}
.rowLabel {
  font-weight: bold;
  text-align: right;
  white-space: nowrap;
}
</style>
