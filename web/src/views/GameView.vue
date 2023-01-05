<template>
  <div class="playerSelect">
    <fieldset>
      <legend>Select who is playing:</legend>

      <div
        v-for="player in all_players"
        :key="player[0]"
        class="playerCheckbox"
      >
        <input
          :id="'select_' + player[1]"
          v-model="players"
          type="checkbox"
          :name="player[0]"
          :value="player[1]"
        >
        <label :for="'select_' + player[1]">{{ player[0] }}</label>
      </div>
    </fieldset>
  </div>
  <div class="game">
    <Game27
      :players="all_players.filter(([_name, id]) => players.includes(id))"
    />
  </div>
</template>

<script lang="ts">
import { defineComponent, ref } from "vue";
import Game27 from "@/components/Game27.vue"; // @ is an alias to /src
import { doc, DocumentReference, getDoc, getFirestore } from "firebase/firestore";

export default defineComponent({
  components: {
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
</style>
