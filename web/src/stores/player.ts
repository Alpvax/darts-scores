import { ref, computed } from "vue";
import { defineStore } from "pinia";
import { collection, doc, getFirestore, onSnapshot, type Unsubscribe } from "firebase/firestore";
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
    const allNames = this.getNames(null);
    if (allNames.length < 1) {
      return [
        {
          label: "No names found",
        },
      ];
    }
    const items = allNames.map((name) => ({
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

type PartialPlayer = {
  name: string;
  id: string;
  loaded: false;
};
export type Player = LoadedPlayer | PartialPlayer;

export const usePlayerStore = defineStore("player", () => {
  const db = getFirestore();

  const loadedPlayers = ref(new Map<string, LoadedPlayer>());
  const subscriptions: Map<string, Unsubscribe> | null = new Map<string, Unsubscribe>();
  let globalSubscription: Unsubscribe | null = null;
  const loadPlayer = (playerId: string) => {
    if (globalSubscription !== null) {
      console.debug(`Skipping loading player "${playerId}": All player subscription mode enabled!`);
      return;
    }
    if (!subscriptions.has(playerId)) {
      subscriptions.set(
        playerId,
        onSnapshot(doc(db, "players", playerId), (snapshot) => {
          if (snapshot.exists()) {
            const p = new LoadedPlayer(playerId, snapshot.data() as DBPlayer);
            // console.log("Loaded player:", p);//XXX
            loadedPlayers.value.set(playerId, p);
          } else {
            // console.log("Unloaded player:", loadedPlayers.value.get(playerId));//XXX
            loadedPlayers.value.delete(playerId);
          }
        }),
      );
    }
  };
  const playerName = (playerId: string) => {
    if (globalSubscription === null) {
      loadPlayer(playerId);
    }
    const p = loadedPlayers.value.get(playerId);
    if (p) {
      return p.name;
    }
    return playerId;
  };
  const playerOrder = (playerId: string) => {
    if (globalSubscription === null) {
      loadPlayer(playerId);
    }
    const p = loadedPlayers.value.get(playerId);
    if (p) {
      return p.defaultOrder;
    }
    return Number.MAX_SAFE_INTEGER;
  };
  const getPlayer = (playerId: string): Player => {
    if (globalSubscription === null) {
      loadPlayer(playerId);
    }
    return (
      (loadedPlayers.value.get(playerId) as LoadedPlayer | undefined) ?? {
        id: playerId,
        loaded: false,
        name: playerId,
      }
    );
  };

  return {
    loadPlayer,
    playerName,
    playerOrder,
    getPlayer,
    loadAllPlayers: () => {
      if (globalSubscription === null) {
        globalSubscription = onSnapshot(collection(db, "players"), (snapshot) => {
          snapshot.docChanges().forEach((change) => {
            const playerId = change.doc.id;
            if (loadedPlayers.value.has(playerId) && change.type in ["added", "modified"]) {
              //TODO: modify existing, rather than replacing
              loadedPlayers.value.set(
                playerId,
                new LoadedPlayer(playerId, change.doc.data() as DBPlayer),
              );
              console.log(
                "Player changed in database: (Currently replace entire player)",
                playerId,
                change.doc.data(),
              );
            } else if (change.type === "added") {
              const p = new LoadedPlayer(playerId, change.doc.data() as DBPlayer);
              console.debug("Loaded player:", p); //XXX
              loadedPlayers.value.set(playerId, p);
            } else if (change.type === "removed") {
              loadedPlayers.value.delete(playerId);
            } else {
              console.warn("Should be unreachable:", playerId, change.doc.data()); //XXX
            }
          });
        });
        for (const unsub of subscriptions.values()) {
          unsub();
        }
      }
    },
    allLoaded: () => globalSubscription !== null,
    all: computed(() =>
      [...loadedPlayers.value]
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        .filter(([_pid, { disabled }]) => !disabled)
        .toSorted(([a], [b]) => playerOrder(a) - playerOrder(b))
        .map(([pid]) => pid),
    ),
    setNameTheme: (theme: string | null) =>
      loadedPlayers.value.forEach((p) => (p.names.theme = theme)),
  };
});
