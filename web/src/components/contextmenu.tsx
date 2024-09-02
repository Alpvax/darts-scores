import {
  computed,
  defineComponent,
  ref,
  type PropType,
  type Ref,
  type VNodeRef,
  onMounted,
  onUnmounted,
} from "vue";
import {
  flip,
  offset,
  useFloating,
  type UseFloatingOptions,
  type MaybeElement,
  type VirtualElement,
} from "@floating-ui/vue";
import { injectClose, injectItems } from "@/contextMenu/inject";

type ContextMenuOption = {
  label: string;
  action: (args: {
    event: MouseEvent | TouchEvent;
    closeMenu: () => void;
    keepMenuOpen: () => void;
  }) => void;
};
type ContextMenuSubmenu = {
  label: string;
  items: ContextMenuItem[];
};
type ContextMenuText = {
  label: string;
};
type ContextMenuSeparator =
  | {
      type: "separator" | "seperator";
      args: any; //TODO: separator args
    }
  | "separator"
  | "seperator";
export type ContextMenuItem =
  | ContextMenuOption
  | ContextMenuSubmenu
  | ContextMenuText
  | ContextMenuSeparator;

const makeElement = (
  menuItem: ContextMenuItem,
  {
    closeMenu,
    openSubMenu,
  }: {
    closeMenu: () => void;
    openSubMenu: (event: MouseEvent | TouchEvent, items: ContextMenuItem[]) => void;
  },
) => {
  const selectedRef = ref(false);
  if (typeof menuItem === "object") {
    if (Object.hasOwn(menuItem, "action")) {
      const item = menuItem as ContextMenuOption;
      const act = (event: MouseEvent | TouchEvent) => {
        let closeOnClick = true;
        const keepMenuOpen = () => {
          closeOnClick = false;
        };
        item.action({ event, closeMenu, keepMenuOpen });
        if (closeOnClick) {
          closeMenu();
        }
      };
      return (
        <li
          class={selectedRef.value ? "selected" : ""}
          onMouseleave={() => {
            selectedRef.value = false;
          }}
          onMouseenter={() => {
            selectedRef.value = true;
          }}
          onClick={act}
          onTouchstart={act}
        >
          {item.label}
        </li>
      );
    } else if (Object.hasOwn(menuItem, "items")) {
      const item = menuItem as ContextMenuSubmenu;
      return (
        <li
          class={selectedRef.value ? "selected" : ""}
          onMouseleave={() => {
            selectedRef.value = false;
          }}
          onMouseenter={(e) => {
            selectedRef.value = true;
            openSubMenu(e, item.items);
          }}
          onTouchstart={(e) => openSubMenu(e, item.items)}
        >
          {item.label}
        </li>
      );
    } else if (Object.hasOwn(menuItem, "label")) {
      return <li class="contextmenuTextItem">{(menuItem as ContextMenuText).label}</li>;
    } // else if (menuItem["type"] === "seperator") {
  }
  {
    // const item = menuItem as ContextMenuSeparator;
    return <hr />;
  }
};

const SubMenu = defineComponent({
  props: {
    items: { type: Array as PropType<ContextMenuItem[]>, required: true },
    parentItem: { type: Object as PropType<Ref<HTMLElement | null>>, required: true },
    menuProps: {
      type: Object as PropType<UseFloatingOptions<Element>>,
      default: () => ({
        placement: "right-end",
        middleware: [flip()],
      }),
    },
  },
  emits: ["close"],
  setup: (props, { emit }) => {
    const menuRef = ref(null as VNodeRef | null);
    const { floatingStyles } = useFloating(props.parentItem, menuRef, props.menuProps);

    const closeMenu = () => emit("close");

    const submenuItems = ref<ContextMenuItem[]>([]);
    const submenuItemRef = ref<HTMLElement | null>(null);
    const openSubMenu = (e: MouseEvent | TouchEvent, items: ContextMenuItem[]) => {
      submenuItemRef.value = e.currentTarget as HTMLElement | null;
      submenuItems.value = items;
    };

    return () => (
      <>
        {props.items.length < 1 ? undefined : (
          <ul ref={menuRef} class="contextmenu contextmenu-submenu" style={floatingStyles.value}>
            {props.items.map((item) => makeElement(item, { closeMenu, openSubMenu }))}
            {submenuItemRef.value === null ? undefined : (
              <SubMenu
                items={submenuItems.value}
                parentItem={submenuItemRef}
                menuProps={props.menuProps}
                onClose={() => {
                  submenuItems.value = [];
                  submenuItemRef.value = null;
                }}
              />
            )}
          </ul>
        )}
      </>
    );
  },
});

export const ContextMenu = defineComponent({
  props: {
    items: { type: Array as PropType<ContextMenuItem[]>, required: true },
    positionRef: {
      type: Object as PropType<Ref<MaybeElement<Element | VirtualElement>>>,
      default: null,
    },
    menuClass: { type: String, default: "contextmenu-root" },
    menuProps: {
      type: Object as PropType<UseFloatingOptions<Element>>,
      default: () => ({
        middleware: [flip()],
      }),
    },
    elementPosition: { type: Boolean, default: false },
  },
  setup: (props) => {
    const menuRef = ref(null as VNodeRef | null);
    const floatingMiddleware: UseFloatingOptions["middleware"] = computed(() => {
      return props.elementPosition
        ? [flip()]
        : [
            offset(({ rects }) => ({
              crossAxis: rects.floating.width / 2,
            })),
            flip(),
          ];
    });
    const { floatingStyles } = useFloating(
      // @ts-ignore
      props.positionRef,
      menuRef,
      { ...props.menuProps, middleware: floatingMiddleware },
    );
    const clickOutsideEvent = (event: MouseEvent) => {
      // here I check that click was outside the el and his children
      if (menuRef.value && !menuRef.value.contains(event.target as Node)) {
        // and if it did, call method provided in attribute value
        closeMenu();
      }
    };
    onMounted(() => {
      document.addEventListener("click", clickOutsideEvent);
    });
    onUnmounted(() => {
      document.removeEventListener("click", clickOutsideEvent);
    });

    const submenuItems = ref<ContextMenuItem[]>([]);
    const submenuItemRef = ref<HTMLElement | null>(null);
    const openSubMenu = (e: MouseEvent | TouchEvent, items: ContextMenuItem[]) => {
      if (submenuItemRef.value) {
        e.preventDefault();
      }
      submenuItems.value = items;
    };
    const closeMenu = injectClose();
    const rootItems = injectItems();
    return () => {
      return (
        <>
          {rootItems.value.length < 1 ? undefined : (
            <ul ref={menuRef} class={`contextmenu ${props.menuClass}`} style={floatingStyles.value}>
              {rootItems.value.map((item) => makeElement(item, { closeMenu, openSubMenu }))}
              {submenuItemRef.value === null ? undefined : (
                <SubMenu
                  items={submenuItems.value}
                  parentItem={submenuItemRef}
                  menuProps={props.menuProps}
                  onClose={() => {
                    submenuItems.value = [];
                    submenuItemRef.value = null;
                  }}
                />
              )}
            </ul>
          )}
        </>
      );
    };
  },
});
// export const ContextMenu = makeContextMenu<Element>();
export default ContextMenu;
