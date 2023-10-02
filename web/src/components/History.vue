<template>
  <table id="gameResults">
    <thead>
      <tr>
        <th>
          Date
        </th>
        <th
          v-for="{name, id} in players"
          :key="id"
          class="playerName"
          :colspan="width"
        >
          {{ name }}
        </th>
      </tr>
    </thead>
    <tbody>
      <tr
        v-for="game in games"
        :key="game.gameId"
      >
        <!-- eslint-disable vue/html-quotes -->
        <td
          v-for="{ id:player } in players"
          :key="player"
          class="gameScore"
          :class="{
            winner: typeof game.winner === 'string'
              ? game.winner == player
              : game.winner.tie.includes(player),
            tie: typeof game.winner === 'object',
            allPos: Object.hasOwn(game.game, player) && game.game[player].allPositive,
            fatNickGame: Object.hasOwn(game.game, player) && game.game[player].score <= -393,
            cliffGame: Object.hasOwn(game.game, player) && game.game[player].cliffs > 0,
            ddGame: Object.hasOwn(game.game, player)
              && game.game[player].rounds.find(h => h === 2) != undefined,
          }"
          :data-notables='Object.hasOwn(game.game, player) && (" ("
            + (game.game[player].allPositive ? "+" : "")
            + (game.game[player].cliffs > 0 ? "c" : "")
            + (game.game[player].rounds.find(h => h === 2) != undefined ? "d" : "")
            + ")"
          )'
          @click.stop.prevent="$emit('update:modelValue', game)"
        >
          <!-- eslint-enable vue/html-quotes -->
          {{ Object.hasOwn(game.game, player) ? game.game[player].score : "" }}
        </td>
      </tr>
    </tbody>
  </table>
</template>

<script lang="ts">
import { Player } from "@/store/player";
import { PropType, defineComponent } from "vue";

export default defineComponent({
  props: {
    modelValue: { type: Object, default: null },
    players: { type: Array as PropType<Player[]>, required: true },
    games: { type: Array as PropType<Player[]>, required: true },
  },
  emits: ["update:modelValue"],
  setup(props) {
    return {
      width: 1,
    };
  },
});
</script>
