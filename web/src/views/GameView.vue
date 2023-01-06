<template>
  <div class="playerSelect">
    <PlayerSelection
      legend="Select who is playing:"
      :available-players="all_players"
      @players="p => players = p"
    />
    <input
      id="dateInput"
      v-model="date"
      type="datetime-local"
    >
  </div>
  <div class="game">
    <Game27
      :players="all_players.filter(([_name, id]) => players.includes(id))"
      :date="new Date(date)"
    />
  </div>
</template>

<script lang="ts">
import { defineComponent, ref } from "vue";
import PlayerSelection from "@/components/PlayerSelection.vue";
import Game27 from "@/components/Game27.vue";
import { doc, DocumentReference, getDoc, getFirestore } from "firebase/firestore";

export default defineComponent({
  components: {
    PlayerSelection,
    Game27,
  },
  async setup() {
    const all_players: [string, string][] =
      await Promise.all(((await getDoc(doc(getFirestore(), "game/twentyseven")))
        .get("defaultplayers") as DocumentReference[])
        .map(async d => [(await getDoc(d)).get("funName") as string, d.id]),
      );
    const players = ref(all_players.map(([_name, id]) => id));
    return {
      players,
      all_players,
      date: ref((new Date()).toISOString().slice(0, 16)),
    };
  },
});
</script>

<style>
.playerSelect {
  width: fit-content;
}
.playerCheckbox {
  display: inline;
  padding: 0px 10px;
}
.game {
  font-size: 2.5vh;
}
.playerSelect fieldset {
  display: inline-block;
}
#dateInput {
  font-size: 2vh;
}
</style>
