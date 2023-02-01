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
import Game27, { Result27 } from "@/components/27/Game27.vue";
import { doc, DocumentReference, getDoc, getFirestore } from "firebase/firestore";
import { PlayerObj } from "@/util/player";

export default defineComponent({
  components: {
    Game27,
  },
  props: {
    gameId: { type: String, required: true },
  },
  async setup(props) {
    const all_players: PlayerObj[] =
      await Promise.all(((await getDoc(doc(getFirestore(), "game/twentyseven")))
        .get("defaultplayers") as DocumentReference[])
        .map(async d => ({ name: (await getDoc(d)).get("funName") as string, id: d.id })),
      );
    const game = ref((await getDoc(doc(getFirestore(), "game/twentyseven/games", props.gameId)))
      .data() as Result27);
    const playerScores = computed(() => game.value.game);
    const players = computed(() =>
      all_players.filter(({ id }) => Object.hasOwn(playerScores.value, id)));
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
