import { type BrowserStorage, type BrowserStorageProps, getStorage as getBrowserStorage, initStorage as initBrowserStorage } from "./browserStorage";

export type ConfigValuePath<T extends {}> = object extends T
  ? T
  : {
      [K in keyof T]: (
        x: NonNullable<T[K]> extends infer V
          ? V extends object
            ? V extends any[]
              ? Pick<T, K>
              : ConfigValuePath<V> extends infer FV
                ? Pick<T, K> & {
                    [P in keyof FV as `${Extract<K, string | number>}.${Extract<P, string | number>}`]: FV[P];
                  } extends infer VFlat
                  ? undefined extends T[K]
                    ? Partial<VFlat>
                    : VFlat
                  : never
                : never
            : Pick<T, K>
          : never,
      ) => void;
    } extends Record<string, (y: infer O) => void>
      ? { [K in keyof O]: O[K] }
      : never;


type t_config = { foo: { bar: { baz: 3, qux?: "hello" }, quux: (string | null)[]}, fuzz: [number, string, Symbol]};
type t = ConfigValuePath<t_config>;

// export type ConfigValueGetterArrayPath<T extends {}, P extends readonly [...string[]] = []> = {
//   [K in keyof T & string]: NonNullable<T[K]> extends infer V
//     ? V extends object
//       ? V extends any[]
//         ? {(path: [...P, K]): T[K]}
//         : {
//           (path: [...P, K]): T[K];
//         } | ConfigValueGetterArrayPath<V, [...P, K]>
//         // : ((path: [...P, K]) => T[K]) | ConfigValueGetterArrayPath<V, [...P, K]>
//       : {(path: [...P, K]): T[K]}
//     : never;
// } extends infer O extends {} ? O[keyof O] : never

type ConfigGetter<T extends {}> = <K extends keyof ConfigValuePath<T>>(path: K) => ConfigValuePath<T>[K];
type ConfigSetter<T extends {}> = <K extends keyof ConfigValuePath<T>>(path: K, value: ConfigValuePath<T>[K]) => void;

export type ConfigLayer<T extends {}> = {
  readonly clientOnly: boolean;
  /** Use symbol to guarantee uniqueness or string for ease of use */
  readonly identity: string | symbol;
  /** Get the value from this config layer */
  get: ConfigGetter<T>;
  /** Set the value to this config layer */
  set: ConfigSetter<T>;
}

type VolatileOptions<T extends {}> = {
  identifier?: string | symbol;
  defaults?: {
    [K in keyof T]?: T[K];
  };
};
export const volatileLayer = <T extends {}>(opts?: VolatileOptions<T>): ConfigLayer<T> => {
  const state = $state((opts?.defaults ?? {}) as T);
  return {
    clientOnly: false,
    identity: opts?.identifier ?? "volatile",
    get: path => {
      //TODO: maybe make get safer? Check for reactivity
      let v: any = state;
      for(const seg of (path as string).split(".")) {
        v = v[seg as keyof typeof v];
      }
      return v;
    },
    set: (path, val) => {
      //TODO: maybe make it safer?
      let parts = (path as string).split(".");
      const final = parts.pop()!;
      let v: any = state;
      for(const seg of parts) {
        v = v[seg as keyof typeof v];
      };
      v[final] = val;
    },
  };
}

export const BROWSER_LOCAL_STORAGE_LAYER_KEY = Symbol("Browser LocalStorage");
// const LOCALSTORAGE_LAYER_GLOBAL: ConfigLayer<BrowserStorage> = {
//   identity: BROWSER_LOCAL_STORAGE_LAYER_KEY,
//   get: (path) => {
//     const [group, prop] = path.split(/\.(.*)/, 2);
//     const value = getBrowserStorage(group, prop);
//     return value.local;
//   },
//   set: (path, val) => {
//     const [group, prop] = path.split(/\.(.*)/, 2);
//     const value = getBrowserStorage(group, prop);
//     value.local = val;
//   },
// };
export const BROWSER_SESSION_STORAGE_LAYER_KEY = Symbol("Browser SessionStorage");
// const SESSIONSTORAGE_LAYER_GLOBAL: ConfigLayer<BrowserStorage> = {
//   identity: BROWSER_SESSION_STORAGE_LAYER_KEY,
//   get: (path) => {
//     const [group, prop] = path.split(/\.(.*)/, 2);
//     const value = getBrowserStorage(group, prop);
//     return value.session;
//   },
//   set: (path, val) => {
//     const [group, prop] = path.split(/\.(.*)/, 2);
//     const value = getBrowserStorage(group, prop);
//     value.session = val;
//   },
// };


/**
 * Ensure that a BrowserStorage declaration has been added and {@link initStorage} has been called to initialise it before calling this function
 * @param group the {@link BrowserStorage} group
 * @returns a layer corresponding to the session | local {@link BrowserStorage} of the given group
 */
export const browserStorageLayer = <K extends keyof BrowserStorage>(location: "local" | "session", group: K, identifier?: string | symbol): ConfigLayer<BrowserStorage[K]> => location === "local"
? {
  clientOnly: true,
  identity: identifier ?? BROWSER_LOCAL_STORAGE_LAYER_KEY,
  // @ts-expect-error
  get: (path) => getBrowserStorage(group, path).local,
  // @ts-expect-error
  set: (path, value) => getBrowserStorage(group, path).local = value,
}
: {
  clientOnly: true,
  identity: identifier ?? BROWSER_SESSION_STORAGE_LAYER_KEY,
  // @ts-expect-error
  get: (path) => getBrowserStorage(group, path).session,
  // @ts-expect-error
  set: (path, value) => getBrowserStorage(group, path).session = value,
};

/**
 * Ensure that a BrowserStorage declaration has been added and {@link initStorage} has been called to initialise it before calling this function.
 * Convenience method to create both layers, and can be iterated as [session, local] in order to add to the layers stack in the correct order.
 * @param group the {@link BrowserStorage} group
 * @returns a stack of layers [session, local] for the {@link BrowserStorage} of the given group
 */
export const browserStorageLayers = <K extends keyof BrowserStorage>(group: K, identifiers?: { local?: string | symbol; session?: string | symbol }) => {
  const local = browserStorageLayer("local", group, identifiers?.local);
  const session = browserStorageLayer("session", group, identifiers?.session);
  return {
    local, session, *[Symbol.iterator]() {
      yield session;
      yield local;
    }
  }
};

export type LayeredConfig<T extends {}> = Record<string | symbol, ConfigLayer<T>> & Iterable<ConfigLayer<T>, void, unknown/*string | symbol*/>;

//TODO: use class to enable modifying/adding layers (can use instanceof rather than re-creating the entire object)
// export class LayeredConfig<T extends {}> {
//   constructor(readonly layers: Iterable<ConfigLayer<T>>) {}

// }

type BrowserStorageGroupShaped<T extends {}> = {
  [K in keyof BrowserStorage as BrowserStorage[K] extends T ? K : never]: BrowserStorage[K];
};

type LayeredConfigBuilderHelpers<T extends {}> = {
  /** Non-saved values; Usually highest priority */
  volatile: typeof volatileLayer<T>;
  /** Convenience helper to add the volatile layer as the highest priority layer */
  withVolatile: (layers: LayeredConfig<T> | ConfigLayer<T>[], opts?: VolatileOptions<T>) => LayeredConfig<T>;
  /** Saved to browser local storage; Usually third priority (after volatile and sessionstorage layers) */
  browserLocal: <K extends keyof BrowserStorageGroupShaped<T>>(group: K, identifier?: string | symbol) => ConfigLayer<T>;
  /** Saved to browser session storage; Usually second priority (after volatile but before localstorage layer) */
  browserSession: <K extends keyof BrowserStorageGroupShaped<T>>(group: K, identifier?: string | symbol) => ConfigLayer<T>;
  browserLayers: <K extends keyof BrowserStorageGroupShaped<T>>(group: K, identifiers?: { local?: string | symbol; session?: string | symbol }) => {
    local: ConfigLayer<T>;
    session: ConfigLayer<T>;
    [Symbol.iterator](): Generator<ConfigLayer<T>, void, unknown>;
  };
  /** Convenience function to initialise the browser storage interface and create both storage layers */
  initBrowserLayers: <K extends keyof BrowserStorageGroupShaped<T>>(group: K, definition: BrowserStorageProps<K>, opts?: {
    only?: "local" | "session";
    identifiers?: { local?: string | symbol; session?: string | symbol }
  }) => {
    local?: ConfigLayer<T>;
    session?: ConfigLayer<T>;
    [Symbol.iterator](): Generator<ConfigLayer<T>, void, unknown>;
  };
};

const intoConfig = <T extends {}>(...layers: ConfigLayer<T>[]): LayeredConfig<T> =>
  Object.assign({} as LayeredConfig<T>, layers.map(layer => ({ [layer.identity]: layer })), {
    *[Symbol.iterator]() {
      yield* layers;
    }
  })

/**
 * 
 * @param build the function called with multiple helpers. Must return either an array of layers (in order of query priority [first, ..., last])
 * or a {@link LayeredConfig} (an iterable of layers in order of query priority [first, ..., last] but with the layers retrievable via their identifiers)
 * @returns 
 */
export function layeredConfigBuilder<T extends {}>(build: ((helpers: LayeredConfigBuilderHelpers<T>) => LayeredConfig<T> | ConfigLayer<T>[])): LayeredConfig<T> {
  const built = build({
    volatile: volatileLayer,
    withVolatile: (layers, opts) => intoConfig(volatileLayer(opts), ...layers),
    // @ts-expect-error
    browserLocal: <K extends keyof BrowserStorageGroupShaped<T>>(group: K) => browserStorageLayer("local", group),
    // @ts-expect-error
    browserSession: <K extends keyof BrowserStorageGroupShaped<T>>(group: K) => browserStorageLayer("session", group),
    // @ts-expect-error
    browserLayers: browserStorageLayers,
    // @ts-expect-error
    initBrowserLayers: (group, def, opts) => {
      initBrowserStorage(group, def);
      switch (opts?.only) {
        case undefined:
          return browserStorageLayers(group, opts?.identifiers);
        case "local": {
          const local = browserStorageLayer("local", group, opts?.identifiers?.local);
          return { local, *[Symbol.iterator]() { yield local }}
        }
        case "session": {
          const session = browserStorageLayer("session", group, opts?.identifiers?.session);
          return { session, *[Symbol.iterator]() { yield session }}
        }
      }
    },
    //TODO: database (firestore / supabase?)
  });
  if (Array.isArray(built)) {
    return intoConfig(...built);
  } else {
    return built
  }
}
//({
//   withBrowserLayers<K extends keyof BrowserStorage>(group: K, session: boolean, local: boolean) {
//     return session && local
//       ? Object.assign(browserStorageLayers(group), {})
//       : session
//   }
// })
