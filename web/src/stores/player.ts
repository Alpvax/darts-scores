import { ref, computed, type Ref } from "vue";
import { defineStore } from "pinia";
import { doc, getFirestore, onSnapshot, type Unsubscribe } from "firebase/firestore";
import type { ContextMenuItem } from "@/components/contextmenu";

export type DBPlayer = {
  name: string;
  funName?: string;
  funNames?: string[];
  defaultOrder: number;
  guest?: boolean;
  guestLabel?: string;
  disabled?: boolean;
  handicap?: number;
};

export class PlayerNames {
  private readonly names = new Map<string | null, string[]>();
  private theme_: string | null = null;
  private cached: string | null = null;
  constructor(
    readonly fallbackName: string,
    names?: string[],
  ) {
    if (names) {
      this.names.set(null, names);
    }
  }
  public refreshName() {
    const names = this.names.get(this.theme_);
    this.cached =
      names && names.length > 0
        ? names[Math.floor(Math.random() * names.length)]
        : this.fallbackName;
  }
  get name() {
    if (this.cached === null) {
      this.refreshName();
    }
    return this.cached!;
  }
  set name(forcedName: string) {
    this.cached = forcedName;
  }
  get theme() {
    return this.theme_;
  }
  set theme(theme: string | null) {
    if (theme === this.theme_) {
      return;
    }
    const names = this.names.get(theme);
    if (names && names.length > 0) {
      this.theme_ = theme;
      if (this.cached && !names.includes(this.cached)) {
        this.refreshName();
      }
    } else {
      if (theme !== null) {
        console.warn(
          `Attempted to set name theme for ${this.fallbackName} to unsupported theme: ${theme}.Using unthemed name instead`,
        );
      }
      this.theme_ = null;
    }
  }
  public addName(
    name: string,
    opts?: {
      /** Use the new name, but do not change the theme */
      useName?: boolean;
      theme?: string;
      // save?: boolean;
    },
  ) {
    if (this.names.size < 1) {
      this.names.set(null, [name]);
    } else {
      this.names.get(null)!.push(name);
    }
    const theme = opts?.theme;
    if (theme) {
      if (this.names.has(theme)) {
        this.names.get(theme)!.push(name);
      } else {
        this.names.set(theme, [name]);
      }
    }
    if (opts?.useName) {
      this.cached = name;
    }
  }
  public getNames(): {
    current: string;
    unthemed: string[];
    themed: { theme: string; names: string[] }[];
  };
  public getNames(theme: string | null): string[];
  public getNames(theme?: string | null) {
    if (theme !== undefined) {
      return this.names.get(theme) ?? [];
    } else {
      const allNames = new Set(this.names.get(null));
      const themed: { theme: string; names: string[] }[] = [];
      for (const theme of (
        [...this.names.keys()].filter((s) => s !== null) as string[]
      ).toSorted()) {
        const names = this.names.get(theme)!.toSorted();
        names.forEach((n) => allNames.delete(n));
        themed.push({ theme, names });
      }
      return { current: this.name, unthemed: [...allNames].toSorted(), themed };
    }
  }
  public get themes() {
    return [...this.names.keys()].filter((t) => t) as string[];
  }
  public contextMenuItems(addRandomise: "first" | "last" | false = "first"): ContextMenuItem[] {
    const items = this.getNames(null).map((name) => ({
      label: name,
      action: () => {
        this.name = name;
      },
    }));
    if (addRandomise) {
      const r = {
        label: "Randomise",
        action: () => this.refreshName(),
      };
      return addRandomise === "first" ? [r, "separator", ...items] : [...items, "separator", r];
    }
    return items;
  }
}

// const loadedProto = Object.create(null, {
//   loaded: {
//     value: true,
//     configurable: false,
//     writable: false,
//     enumerable: false,
//   },
//   name: {
//     value: new PlayerNames,
//     configurable: false,
//     enumerable: false,

//   },
//   name: {
//     get() {

//     },
//   }
// });

export class LoadedPlayer {
  readonly loaded = true;
  readonly names: PlayerNames;
  readonly defaultOrder: number;
  readonly disabled: boolean;
  readonly guest: boolean;
  readonly guestLabel?: string;
  readonly handicap: number;
  constructor(
    readonly id: string,
    database: DBPlayer,
  ) {
    this.names = new PlayerNames(database.name, database.funNames);
    if (!database.funNames && database.funName) {
      this.names.addName(database.funName);
    }
    this.defaultOrder = database.defaultOrder;
    this.disabled = database.disabled ?? false;
    this.guest = database.guest ?? false;
    this.guestLabel = database.guestLabel;
    this.handicap = database.handicap ?? 0;
  }
  get name() {
    return this.names.name;
  }
}

// export type LoadedPlayer = {
//   names:
//   // name: Ref<string>;
//   name: string;
//   id: string;
//   defaultOrder: number;
//   disabled: boolean;
//   guest: boolean;
//   guestLabel?: string;
//   loaded: true;
//   handicap: number;
// }
type PartialPlayer = {
  name: string;
  id: string;
  loaded: false;
};
export type Player = LoadedPlayer | PartialPlayer;

export const usePlayerStore = defineStore("player", () => {
  const db = getFirestore();

  const loadedPlayers = ref(new Map<string, LoadedPlayer>());
  const subscriptions = new Map<string, Unsubscribe>();
  const loadPlayer = (playerId: string) => {
    if (!subscriptions.has(playerId)) {
      subscriptions.set(
        playerId,
        onSnapshot(doc(db, "players", playerId), (snapshot) => {
          if (snapshot.exists()) {
            const p = new LoadedPlayer(playerId, snapshot.data() as DBPlayer);
            // console.log("Loaded player:", p);//XXX
            loadedPlayers.value.set(playerId, p);
          } else {
            // console.log("Unoaded player:", loadedPlayers.value.get(playerId));//XXX
            loadedPlayers.value.delete(playerId);
          }
        }),
      );
    }
  };
  const playerName = (playerId: string) =>
    computed(() => {
      loadPlayer(playerId);
      const p = loadedPlayers.value.get(playerId);
      if (p) {
        return p.name;
      }
      return playerId;
    });
  const playerOrder = (playerId: string) =>
    computed(() => {
      loadPlayer(playerId);
      const p = loadedPlayers.value.get(playerId);
      if (p) {
        return p.defaultOrder;
      }
      return Number.MAX_SAFE_INTEGER;
    });
  const getPlayer = (playerId: string): Ref<Player> => {
    loadPlayer(playerId);
    return computed(
      () =>
        (loadedPlayers.value.get(playerId) as LoadedPlayer | undefined) ?? {
          id: playerId,
          loaded: false,
          name: playerId,
        },
    );
  };

  return {
    loadPlayer,
    playerName,
    playerOrder,
    getPlayer,
    all: computed(() => [...loadedPlayers.value.keys()]),
    setNameTheme: (theme: string | null) =>
      loadedPlayers.value.forEach((p) => (p.names.theme = theme)),
  };
});
