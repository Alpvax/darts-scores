import { ref, type App, readonly, type Ref, h } from "vue";
import { ContextMenu, type ContextMenuItem } from "@/components/contextmenu";
import type { Side, UseFloatingOptions, VirtualElement } from "@floating-ui/vue";
import type { Placement } from "@floating-ui/vue";
import type { AlignedPlacement } from "@floating-ui/vue";
import type { Alignment } from "@floating-ui/vue";
import { menuCloseKey, menuInjectionKey, menuItemsKey, menuOpenKey } from "./inject";

export type InjectableType = {
  items: Ref<ContextMenuItem[]>;
  open: {
    (
      items: ContextMenuItem[],
      event: MouseEvent,
      options?: {
        useElementPosition?: boolean;
      },
    ): void;
    (
      items: ContextMenuItem[],
      el: Element | VirtualElement,
      options?: {
        useElementPosition?: boolean;
      },
    ): void;
  };
  close: () => void;
};

type ContextMenuBindingArg =
  | ContextMenuItem[]
  | ({ items: ContextMenuItem[] } & UseFloatingOptions<HTMLElement | VirtualElement>);

const elementKey = Symbol("Context menu related data");

type ContextMenuData = {
  contextReference: Ref<HTMLElement | VirtualElement>;
  itemsRef: Ref<ContextMenuItem[]>;
  floatingOptions: Ref<UseFloatingOptions<HTMLElement | VirtualElement>>;
};
type CMElement = HTMLElement & {
  [elementKey]: ContextMenuData;
};

const readPlacementModifiers = (modifiers: Record<string, boolean>): Placement => {
  const positions = ["top", "right", "bottom", "left"];
  const sMods = positions.filter((m) => modifiers[m]) as Side[];
  const pMods = positions
    .flatMap((s) => [`${s}-start`, `${s}-end`])
    .filter((m) => modifiers[m]) as AlignedPlacement[];
  const aMod: Alignment | undefined = modifiers.start ? "start" : modifiers.end ? "end" : undefined;
  if (modifiers.start && modifiers.end) {
    throw new Error(
      "Cannot specify both start and end placement modifiers on contextMenu directive",
    );
  }
  if (sMods.length + pMods.length > 1) {
    throw new Error(
      `Too many placement modifiers on contextMenu directive: [${[...sMods, ...pMods].join(", ")}]`,
    );
  }
  if (pMods.length > 0) {
    if (aMod) {
      throw new Error(
        `Cannot specify alignment and aligned position modifiers on contextMenu directive: [${pMods[0]}, ${aMod}]`,
      );
    }
    return pMods[0];
  }
  const p = sMods[0] ?? "right";
  return aMod ? `${p}-${aMod}` : p;
};

const makePositionRef = (el: Element, e: MouseEvent, elementPosition?: boolean) =>
  elementPosition
    ? el
    : {
        getBoundingClientRect() {
          return {
            width: 0,
            height: 0,
            x: e.clientX,
            y: e.clientY,
            top: e.clientY,
            left: e.clientX,
            right: e.clientX,
            bottom: e.clientY,
          };
        },
        contextElement: el,
      };

export default {
  install(app: App) {
    const menuItems = ref([] as ContextMenuItem[]);
    const positionRef = ref<Element | VirtualElement | null>(null);
    const useElementPosition = ref(false);
    const ctxMenuProvide: InjectableType = {
      items: readonly(menuItems) as Ref<ContextMenuItem[]>,
      open: (
        items: ContextMenuItem[],
        eventOrEl: MouseEvent | Element | VirtualElement,
        options?: {
          useElementPosition?: boolean;
        },
      ) => {
        useElementPosition.value = options?.useElementPosition ?? false;
        if (eventOrEl instanceof MouseEvent) {
          positionRef.value = makePositionRef(
            eventOrEl.target as Element,
            eventOrEl,
            useElementPosition.value,
          );
          if (!eventOrEl.shiftKey && positionRef.value) {
            eventOrEl.stopPropagation();
            eventOrEl.preventDefault();
          }
        } else {
          positionRef.value = eventOrEl;
        }
        menuItems.value = items;
      },
      close: () => {
        menuItems.value = [];
      },
    };
    app.provide(menuItemsKey, ctxMenuProvide.items);
    app.provide(menuOpenKey, ctxMenuProvide.open);
    app.provide(menuCloseKey, ctxMenuProvide.close);
    app.provide(menuInjectionKey, ctxMenuProvide);
    app.component("ContextMenu", function () {
      return h(ContextMenu, {
        items: menuItems.value,
        positionRef,
        elementPosition: useElementPosition.value,
      });
    });
    // app.provide("openContextMenu", (items?: ContextMenuItem[]) => {})//TODO:

    app.directive("click-outside", {
      beforeMount: (el, binding) => {
        el.clickOutsideEvent = (event: MouseEvent) => {
          // here I check that click was outside the el and his children
          if (!(el == event.target || el.contains(event.target))) {
            // and if it did, call method provided in attribute value
            binding.value();
          }
        };
        document.addEventListener("click", el.clickOutsideEvent);
      },
      unmounted: (el) => {
        document.removeEventListener("click", el.clickOutsideEvent);
      },
    });
    app.directive<
      HTMLElement,
      ContextMenuBindingArg | ((event: MouseEvent) => ContextMenuBindingArg)
    >("context-menu", {
      created(el, binding) {
        let itemsRef: Ref<ContextMenuItem[]>;
        const floatingOptions: Ref<UseFloatingOptions> = ref({
          placement: readPlacementModifiers(binding.modifiers),
          // middleware: [flip()],
        });
        if (typeof binding.value === "function") {
          itemsRef = ref([]); //TODO: function bindings
        } else if (Array.isArray(binding.value)) {
          itemsRef = ref(binding.value);
          console.log("Ctx menu binding:", binding.value); //XXX
        } else {
          console.log("Ctx menu non array binding:", binding.value); //XXX
          const { items, ...rest } = binding.value;
          itemsRef = ref(items);
          floatingOptions.value = { ...floatingOptions.value, ...rest };
        }
        const contextReference = ref(el as HTMLElement | VirtualElement);
        const elementPosition = Boolean(binding.modifiers.element);
        const handler = (e: MouseEvent) => {
          if (!e.shiftKey && contextReference.value) {
            e.stopPropagation();
            e.preventDefault();
            useElementPosition.value = elementPosition;
            contextReference.value = makePositionRef(el, e, elementPosition);
          }
          menuItems.value = itemsRef.value;
          positionRef.value = contextReference.value;
        };
        el.addEventListener("contextmenu", handler);
        (el as CMElement)[elementKey] = {
          contextReference,
          itemsRef,
          floatingOptions,
        };
      },
      // beforeMount(el) {},
    });
  },
};
