import { SvelteMap } from "svelte/reactivity";

// class BrowserStorageLayer<T extends {}> {
//   private readonly storage: Storage;
//   constructor(storage: Storage) {
    
//   }
// }

/** The actual state of the browser storage for this key */
type StorageState = {
  session?: string;
  local?: string;
};

type BrowserStorageValueType<K extends keyof BrowserStorage, Prop extends keyof BrowserStorage[K]> = BrowserStorage[K][Prop] extends BrowserStorageValue<infer T> ? T : never;

type BrowserStorageValue<T> = {
  // /** The storage key to use to get/set the value */
  // readonly key: string;
  /** Get value using priority session -> local -> fallback */
  (): T | null;
  readonly value: T | null;
  /** Get fallback value */
  readonly fallback: T | null;
  /** Get/set value from localstorage */
  local: T | null;
  /** Get/set value from sessionstorage */
  session: T | null;
}

function makeValueState<T>(key: string, def: BrowserStoragePropDef<T>) {
  // const destroy = $effect.root(() => {
  //   const state = $state({} as StorageState);
  //   STORAGE_MAP.set(key, state);
  //   return $effect(() => {
  //     if (LOADING_VALUES.has(key)) {
  //       LOADING_VALUES.delete(key);
  //     } else {
  //       //TODO: write value to local? session? storage
  //     }
  //   });
  // });
  const { load, save }: {
    load: (s: string) => T | null;
    save: (value: T) => string;
  } = {
    load: "load" in def
      ? def.load ?? (s => s as T | null)
      : "validate" in def
        ? (s => def.validate(s) ? s as T : null)
        : (() => { throw new Error(`Invalid ValueState definition for key="${key}": ${JSON.stringify(def)}`) })(),
    save: ("save" in def ? def.save : undefined) ?? (val => val as string),
  };
  const fallback: () => T | null = typeof def.fallback === "function"
    ? def.fallback as () => T
    : () => null;
  const getLocal: () => T | null = () => {
    const val = STORAGE_MAP.get(key);
    if (!val === undefined && val?.local !== undefined) {
      return load(val.local);
    }
    return null;
  };
  const getSession: () => T | null = () => {
    const val = STORAGE_MAP.get(key);
    if (!val === undefined && val?.session !== undefined) {
      return load(val.session);
    }
    return null;
  };
  const value = () => {
    let val = getSession();
    if (val === null) {
      val = getLocal();
    }
    if (val === null) {
      val = fallback();
    }
    return val;
  }
  return Object.defineProperties(value, {
    key: {
      configurable: false,
      enumerable: true,
      value: key,
      writable: false,
    },
    definition: {
      configurable: false,
      enumerable: false,
      value: def,
      writable: false,
    },
    value: {
      configurable: false,
      enumerable: true,
      get: value,
    },
    fallback: {
      configurable: false,
      enumerable: true,
      get: fallback
    },
    local: {
      configurable: false,
      enumerable: true,
      get: getLocal,
      set: (val: T) => setLocalStorage(key, save(val)),
    },
    session: {
      configurable: false,
      enumerable: true,
      get: getSession,
      set: (val: T) => setSessionStorage(key, save(val)),
    },
  }) as BrowserStorageValue<T>
}

type BrowserStorageState<T extends {}> = {
  readonly [K in keyof T & string]: BrowserStorageValue<T[K]>;
}
type BrowserStoragePropDef<V> = {
  fallback?: V | (() => V);
  load: (s: string) => V | null;
  save: (val: V) => string;
} | (V extends string
  ? string extends V
    ? { // V == string, so both load and save are optional (defaulting to identity)
      fallback?: V | (() => V);
      load?: (s: string) => V | null;
      save?: (val: V) => string;
    }
    : { // V is a subset of string, so saving is identity, but loading needs validation
      fallback?: V | (() => V);
      /** Validate a string is a valid value upon loading */
      validate: (s: string) => boolean;
    }
  : never // V is not related to string, so both load and save must be specified
);
export type BrowserStorageProps<K extends keyof BrowserStorage> = {
  [Prop in keyof BrowserStorage[K] & string]: BrowserStoragePropDef<BrowserStorageValueType<K, Prop>>;
}

export interface BrowserStorage extends Record<string, BrowserStorageState<any>> {}

const STORAGE_MAP = new SvelteMap<string, StorageState>();
// @ts-ignore
const STORAGE_INSTANCE: BrowserStorage = {};
// const LOADING_VALUES = new Set<string>();
// const STORAGE_EFFECTS = new Map<string, () => void>();

export const initStorage = <K extends keyof BrowserStorage>(key: K, props: BrowserStorageProps<K>) => {
  if (Object.hasOwn(STORAGE_INSTANCE, key)) {
    console.error("Attempted to initialise browser storage which already exists!", { key, props });
    throw new Error(`Attempted to register browser storage which is already initialised! key = "${key}"`);
  }
  // let destroy = $effect.root(() => {
  //   const { effects, states } = (Object.entries(props) as ([keyof T & string, BrowserStoragePropDef<T[keyof T & string]>])[]).reduce(({ effects, states }, [propName, def]) => {
  //     states[propName] = makeValueState(`${key}.${propName}`, def);
  //     return { effects, states };
  //   }, {
  //     effects: [] as (() => void)[],
  //     states: {} as BrowserStorageState<T>,
  //   });
  //   return () => {
  //     effects.forEach(d => d());
  //   };
  // });
  type Prop = keyof BrowserStorage[K] & string;
  return (Object.entries(props) as ([Prop, BrowserStoragePropDef<BrowserStorageValueType<K, Prop>>])[]).reduce((states, [propName, def]) => {
    const state = makeValueState(`${key}.${propName}`, def);
    return Object.defineProperty(states, propName, {
      configurable: false,
      enumerable: true,
      get: state,
    });
  }, {} as BrowserStorage[K]);
}

declare module "$lib/config/browserStorage" {
  interface BrowserStorage {
    twentyseven: BrowserStorageState<{
      defaultView: "history" | "new" | "view",
    }>;
  }
}

type t27 = BrowserStorage["twentyseven"]
type t27dv = BrowserStorageValueType<"twentyseven", keyof t27>

type defView27 = BrowserStorage["twentyseven"]["defaultView"]
const test_storage = initStorage("twentyseven", {
  defaultView: {
    fallback: "history",
    validate: (s: string) => new Set(["history", "new", "view"]).has(s),
  } satisfies BrowserStoragePropDef<"history" | "new" | "view">
} satisfies BrowserStorageProps<"twentyseven">)

export const setSessionStorage = (key: string, val: string | undefined): void => {
  if (val) {
    sessionStorage.setItem(key, val);
  } else {
    sessionStorage.removeItem(key);
  }
  if (!STORAGE_MAP.has(key)) {
    STORAGE_MAP.set(key, {});
  }
  STORAGE_MAP.get(key)!.session = val;
};
export const setLocalStorage = (key: string, val: string | undefined): void => {
  if (val) {
    localStorage.setItem(key, val);
  } else {
    localStorage.removeItem(key);
  }
  if (!STORAGE_MAP.has(key)) {
    STORAGE_MAP.set(key, {});
  }
  STORAGE_MAP.get(key)!.local = val;
};

window.addEventListener("storage", (event) => {
  const key = event.key;
  if (key) {
    if (!STORAGE_MAP.has(key)) {
      STORAGE_MAP.set(key, $state({}));
    }
    if (event.storageArea === sessionStorage) {
      STORAGE_MAP.get(key)!.session = event.newValue ?? undefined;
    }
    if (event.storageArea === localStorage) {
      STORAGE_MAP.get(key)!.local = event.newValue ?? undefined;
    }
  }
});

// @ts-expect-error
export const getStorage: {
  (): Readonly<BrowserStorage>;
  <K extends keyof BrowserStorage>(group: K): BrowserStorage[K];
  <K extends keyof BrowserStorage, Prop extends keyof BrowserStorage[K]>(group: K, prop: Prop): BrowserStorage[K][Prop];
} = <K extends keyof BrowserStorage>(group?: K, prop?: keyof BrowserStorage[K]) => {
  if (group === undefined) {
    return STORAGE_INSTANCE;
  } else if (prop === undefined) {
    return STORAGE_INSTANCE[group];
  } else {
    return STORAGE_INSTANCE[group][prop];
  }
}

// export function sessionStorageRef(key: string, writable: false): ComputedRef<string | undefined>;
// export function sessionStorageRef(
//   key: string,
//   writable: true,
// ): WritableComputedRef<string | undefined>;
// export function sessionStorageRef(
//   key: string,
//   writable: boolean,
// ): WritableComputedRef<string | undefined> | ComputedRef<string | undefined> {
//   setSessionStorage(key, sessionStorage.getItem(key) ?? undefined);
//   return writable
//     ? computed({
//         get: () => STORAGE_MAP.get(key)?.session,
//         set: (s) => {
//           setSessionStorage(key, s);
//           sessionStorage.setItem;
//         },
//       })
//     : computed(() => STORAGE_MAP.get(key)?.session);
// }

// export function localStorageRef(key: string, writable: false): ComputedRef<string | undefined>;
// export function localStorageRef(
//   key: string,
//   writable: true,
// ): WritableComputedRef<string | undefined>;
// export function localStorageRef(
//   key: string,
//   writable: boolean,
// ): WritableComputedRef<string | undefined> | ComputedRef<string | undefined> {
//   setLocalStorage(key, localStorage.getItem(key) ?? undefined);
//   return writable
//     ? computed({
//         get: () => STORAGE_MAP.get(key)?.local,
//         set: (s) => {
//           setLocalStorage(key, s);
//           localStorage.setItem;
//         },
//       })
//     : computed(() => STORAGE_MAP.get(key)?.local);
// }