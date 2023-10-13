<template>
  <td>
    {{ "//TODO:" }}
  </td>
</template>

<script lang="ts">
import { defineComponent } from "vue";


export default defineComponent({
  props: {
    player: { type: String, required: true },
    stats: { type: Object, required: true },
    best: { type: Boolean, default: false },
    worst: { type: Boolean, default: false },
    lowerIsBetter: { type: Boolean, default: false },
  },
  setup(props) {

  },
});
</script>
