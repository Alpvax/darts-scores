import { injectOpen } from "@/contextMenu/inject";
import { usePlayerStore } from "@/stores/player";
import { computed, defineComponent, h, type PropType } from "vue";

export default defineComponent({
  props: {
    tag: { type: String as PropType<keyof HTMLElementTagNameMap>, default: "span" },
    playerId: { type: String, required: true },
  },
  setup: (props) => {
    const playerStore = usePlayerStore();
    const openContextMenu = injectOpen();

    const player = computed(() => playerStore.getPlayer(props.playerId));

    return () =>
      h(
        props.tag,
        {
          onContextmenu: (e) =>
            openContextMenu(player.value.loaded ? player.value.names.contextMenuItems() : [], e, {
              useElementPosition: true,
            }),
          "data-player-id": props.playerId,
        },
        player.value.name,
      );
  },
});
