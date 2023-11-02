import { derived, readable, writable } from "svelte/store";
import { collection, doc, getFirestore, onSnapshot, type Unsubscribe } from "firebase/firestore";

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

class PlayerNames {
  private readonly names = new Map<string | null, string[]>();
  private theme_: string | null = null;
  private cached: string | null = null;
  constructor(readonly fallbackName: string, names?: string[]) {
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
          `Attempted to set name theme for ${this.fallbackName} to unsupported theme: ${theme}.Using unthemed name instead`
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
    }
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
}

export class LoadedPlayer {
  readonly loaded = true;
  readonly names: PlayerNames;
  readonly defaultOrder: number;
  readonly disabled: boolean;
  readonly guest: boolean;
  readonly guestLabel?: string;
  readonly handicap: number;
  constructor(readonly id: string, database: DBPlayer) {
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
        })
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
  const defaultOrder = (playerId: string) =>
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
      () => loadedPlayers.value.get(playerId) ?? { id: playerId, loaded: false, name: playerId }
    );
  };

  return {
    loadPlayer,
    playerName,
    defaultOrder,
    getPlayer,
  };
});

const DB = getFirestore();

export const loaded = writable(new Map<string, LoadedPlayer>());
let subscriptions: Map<string, Unsubscribe> | Unsubscribe = new Map();
const requested = writable(new Map<string, PartialPlayer>());
export const players = derived([loaded, requested], ([$loaded, $requested]) => {
  return new Map<string, Player>([...$requested.entries(), ...$loaded.entries()]);
});

function loadPlayer(pid: string, p: DBPlayer): void;
function loadPlayer(p: LoadedPlayer): void;
function loadPlayer(p: string | LoadedPlayer, db?: DBPlayer): void {
  const [pid, player] = typeof p === "string" ? [p, new LoadedPlayer(p, db!)] : [p.id, p];
  loaded.update((map) => map.set(pid, player));
  requested.update((map) => {
    map.delete(pid);
    return map;
  });
}

export function subscribeAll() {
  // Unsubscribe individuals and subscribe to all only if not already subscribed
  if (subscriptions instanceof Map) {
    for (const unsub of subscriptions.values()) {
      unsub();
    }
    subscriptions = onSnapshot(collection(DB, "players"), (snap) => {
      snap.docChanges().forEach((change) => {
        switch (change.type) {
          case "removed":
            //Why delete old players? they can remain client-side until next reload
            // map.delete(playerId);
            break;
          default:
            loadPlayer(change.doc.id, change.doc.data() as DBPlayer);
            break;
        }
      });
    });
  }
  return players;
}

export function subscribeTo(...playerIds: string[]) {
  for (const pid of playerIds) {
    requested.update((map) => map.set(pid, { id: pid, loaded: false, name: pid }));
  }
  // Only add subscriptions if not allSubscribed
  if (subscriptions instanceof Map) {
    for (const pid of playerIds) {
      if (!subscriptions.has(pid)) {
        subscriptions.set(
          pid,
          onSnapshot(doc(DB, "players", pid), (snap) => {
            if (snap.exists()) {
              loadPlayer(pid, snap.data() as DBPlayer);
            }
          })
        );
      }
    }
  }
  return derived(players, ($players) => new Map(playerIds.map((pid) => [pid, $players.get(pid)!])));
}

export const time = readable(new Date(), (set) => {
  const interval = setInterval(() => {
    set(new Date());
  }, 1000);

  return function stop() {
    clearInterval(interval);
  };
});
