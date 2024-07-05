import {
  computed,
  onMounted,
  onUnmounted,
  reactive,
  ref,
  type ComputedRef,
  type Ref,
  type WritableComputedRef,
} from "vue";
import { StorageLocation, type NestedPartial } from ".";

type MergeFunction<V> =
  /**
   * @param partial A map of the location to a (maybe partial) value. The StorageLocation.Volatile value will always be present and will be the current value.
   * @param fallback The default (fallback) value.
   */
  (partial: Map<StorageLocation, NestedPartial<V>>, fallback: V) => V;

type MergeOption<V> = MergeFunction<V> | "replace";

const makeMergeFunc = <V>(merge: MergeOption<V>): MergeFunction<V> => {
  if (typeof merge === "string") {
    switch (merge) {
      case "replace":
        return (partial, fallback) =>
          ([StorageLocation.Volatile, StorageLocation.Session, StorageLocation.Local]
            .map((l) => partial.get(l))
            .find((v) => v) ?? fallback) as V;
    }
  }
  return merge;
};

type ParseFunction<V> = (s: string) => NestedPartial<V> | undefined;
type ParseOption<V> =
  | ((s: string) => V extends object ? NestedPartial<V> | undefined : V | undefined)
  | "rawString"
  | "json";
const makeParseFunc = <V>(parse: ParseOption<V>): ParseFunction<V> => {
  if (typeof parse === "string") {
    switch (parse) {
      case "rawString":
        return (s) => s as NestedPartial<V>;
      case "json":
        return (s) => JSON.parse(s);
    }
  }
  return parse as ParseFunction<V>;
};

type UnparsedValues = { session?: string; local?: string; remote?: any };

type RAMStorageValue<V> = {
  // key: string;
  location: StorageLocation.Volatile;
  fallback: V | (() => V);
};
type BrowserStorageValue<V> = {
  // key: string;
  location: StorageLocation.Session | StorageLocation.Local;
  toStr?: (val: V) => string;
  merge: MergeOption<V>;
  parse: ParseOption<V>;
  fallback: V | (() => V);
};
// Separated in preparation for e.g. database saved values
type SavedStorageValue<V> = BrowserStorageValue<V>;
export type StorageValue<V> = RAMStorageValue<V> | SavedStorageValue<V>;

const CONFIG_REF_IDENTIFIER = Symbol("ConfigRef marker symbol");
export interface ConfigRef<V> {
  setVolatile(value: V): void;
  setUnparsed(unparsed: UnparsedValues): void;
  readonlyRef(): ComputedRef<V>;
  mutableRef(storageLocation?: StorageLocation): WritableComputedRef<V>;
  readonly value: V;
}

const makeBrowserRef = <V>(
  storageKey: string,
  meta: BrowserStorageValue<V>,
  recalculateFallback = false,
): ConfigRef<V> => {
  const refCache = new Map<StorageLocation | null, WritableComputedRef<V>>();
  let cachedValue: Ref<V> | null = null;
  let cachedFallback: V | null = null;
  const fallback =
    typeof meta.fallback === "function"
      ? recalculateFallback
        ? () => {
            cachedFallback = (meta.fallback as () => V)();
            return cachedFallback;
          }
        : () => {
            if (cachedFallback === null) {
              cachedFallback = (meta.fallback as () => V)();
            }
            return structuredClone(cachedFallback);
          }
      : () => structuredClone(meta.fallback as V);
  let init: () => void;
  if (typeof meta.fallback === "function") {
    init = () => {
      cachedValue = ref(fallback()) as Ref<V>;
      init = () => {};
    };
  } else {
    cachedValue = ref(meta.fallback) as Ref<V>;
    cachedFallback = structuredClone(meta.fallback);
    init = () => {};
  }
  const storageLayers: Ref<Map<StorageLocation, NestedPartial<V>>> = ref(new Map());
  const merge: MergeFunction<V> = makeMergeFunc((meta as SavedStorageValue<V>).merge);
  const parse: ParseFunction<V> = makeParseFunc(meta.parse);
  const setVolatile = (val: V) => {
    if (cachedValue === null) {
      init();
    }
    cachedValue!.value = val;
  };
  return Object.defineProperties(
    {
      setVolatile,
      setUnparsed(unparsed: UnparsedValues) {
        if (unparsed.session !== undefined) {
          const val = parse(unparsed.session);
          if (val !== undefined) {
            storageLayers.value.set(StorageLocation.Session, val);
          } else {
            storageLayers.value.delete(StorageLocation.Session);
          }
        }
        if (unparsed.local !== undefined) {
          const val = parse(unparsed.local);
          if (val !== undefined) {
            storageLayers.value.set(StorageLocation.Local, val);
          } else {
            storageLayers.value.delete(StorageLocation.Local);
          }
        }
        // TODO: if (unparsed.remote !== undefined) {
        //   this.unparsed.value.set(StorageLocation.Remote, unparsed.remote);
        // }
      },
      readonlyRef: (): ComputedRef<V> => {
        if (cachedValue === null) {
          init();
        }
        if (!refCache.has(null)) {
          refCache.set(
            null,
            computed(() => merge(storageLayers.value, fallback())),
          );
        }
        return refCache.get(null)! as ComputedRef<V>;
      },
      mutableRef: (storageLocation?: StorageLocation): WritableComputedRef<V> => {
        if (cachedValue === null) {
          init();
        }
        const location = storageLocation ?? meta.location;
        if (!refCache.has(location)) {
          let set: (val: V) => void;
          switch (location) {
            case StorageLocation.Volatile:
              set = setVolatile;
              break;
            case StorageLocation.Session:
              set = (val) => {
                setVolatile(val);
                sessionStorage.setItem(
                  storageKey,
                  ((meta as BrowserStorageValue<V>).toStr ?? JSON.stringify)(val),
                );
              };
              break;
            case StorageLocation.Local:
              set = (val) => {
                setVolatile(val);
                localStorage.setItem(
                  storageKey,
                  ((meta as BrowserStorageValue<V>).toStr ?? JSON.stringify)(val),
                );
              };
              break;
          }
          refCache.set(
            location,
            computed({
              get: () => merge(storageLayers.value, fallback()),
              set,
            }),
          );
        }
        return refCache.get(location)!;
      },
    } satisfies Omit<ConfigRef<V>, "value">,
    {
      value: {
        configurable: false,
        enumerable: true,
        get: () => {
          if (cachedValue === null) {
            init();
          }
          return refCache.get(null)?.value ?? merge(storageLayers.value, fallback());
        },
      },
      [CONFIG_REF_IDENTIFIER]: {
        configurable: false,
        enumerable: false,
        value: true,
        writable: false,
      },
    },
  ) as ConfigRef<V>;
};

const isConfigRef = (val: any): val is ConfigRef<any> =>
  val !== null && typeof val === "object" && CONFIG_REF_IDENTIFIER in val;

export type StorageMeta = Record<string, StorageValue<any>>;
export type StorageMetaTyped<T extends Record<string, any>> = {
  [K in keyof T]: StorageValue<T[K]>;
};

export type StorageRefs<Values extends { [k: string]: StorageValue<any> }> = {
  [K in keyof Values]: Values[K] extends RAMStorageValue<infer V>
    ? Ref<V>
    : Values[K] extends BrowserStorageValue<infer V>
      ? ConfigRef<V>
      : unknown;
};

type UseConfig<Values extends { [k: string]: StorageValue<any> }> = {
  getValue: <K extends keyof Values>(key: K) => Values[K] extends StorageValue<infer V> ? V : never;
} & (() => StorageRefs<Values>);

export function makeConfigComposable<Values extends { [k: string]: StorageValue<any> }>(
  values: Values,
): UseConfig<Values>;
export function makeConfigComposable<Values extends { [k: string]: StorageValue<any> }>(
  prefix: string,
  values: Values,
): UseConfig<Values>;
export function makeConfigComposable<Values extends { [k: string]: StorageValue<any> }>(
  prefixOrValues: string | Values,
  maybeValues?: Values,
): UseConfig<Values> {
  const [prefix, values] =
    typeof prefixOrValues === "string"
      ? [prefixOrValues, maybeValues!]
      : [undefined, prefixOrValues];
  const unparsedValues = reactive(new Map<string, UnparsedValues>());
  const refs = Object.freeze(
    Object.entries(values).reduce((refs, [key, meta]) => {
      const storageKey = prefix ? `${prefix}:${key}` : key;
      const unparsed: UnparsedValues = {};
      switch (meta.location) {
        case StorageLocation.Volatile:
          (refs as any)[key] = ref(
            typeof meta.fallback === "function" ? (meta.fallback as () => void)() : meta.fallback,
          );
          break;
        case StorageLocation.Local:
          unparsed.local = localStorage.getItem(storageKey) ?? undefined;
        // Do not break, check session storage for value in addition
        // eslint-disable-next-line no-fallthrough
        case StorageLocation.Session: {
          unparsed.session = sessionStorage.getItem(storageKey) ?? undefined;
          unparsedValues.set(key, unparsed);
          const cv = makeBrowserRef(storageKey, meta as SavedStorageValue<any>);
          if (unparsedValues.has(key)) {
            cv.setUnparsed(unparsedValues.get(key)!);
          }
          (refs as any)[key] = cv;
        }
      }
      return refs;
    }, {} as StorageRefs<Values>),
  ) as StorageRefs<Values>;
  const handle = (event: StorageEvent) => {
    const key = prefix
      ? event.key?.startsWith(prefix)
        ? event.key.substring(prefix.length)
        : undefined
      : event.key;
    if (key && key in refs) {
      if (!unparsedValues.has(key)) {
        unparsedValues.set(key, {});
      }
      if (event.storageArea === sessionStorage) {
        unparsedValues.get(key)!.session = event.newValue ?? undefined;
      }
      if (event.storageArea === localStorage) {
        unparsedValues.get(key)!.local = event.newValue ?? undefined;
      }
      const cv = refs[key];
      console.debug("Storage event recieved:", event, cv); //XXX
      if (isConfigRef(cv)) {
        cv.setUnparsed(unparsedValues.get(key) ?? {});
        unparsedValues.set(key, {});
      }
    }
  };
  return Object.defineProperty(
    () => {
      onMounted(() => {
        console.debug("Mounted config composable:", prefix);
        window.addEventListener("storage", handle);
      });
      onUnmounted(() => {
        console.debug("Unmounted config composable:", prefix);
        window.removeEventListener("storage", handle);
      });
      return refs;
    },
    "getValue",
    {
      configurable: false,
      enumerable: true,
      writable: false,
      value: <K extends keyof Values>(
        key: K,
      ): Values[K] extends StorageValue<infer V> ? V : never => {
        const r = refs[key];
        if (isConfigRef(r)) {
          return r.value;
        } else {
          return (r as Ref<Values[K] extends StorageValue<infer V> ? V : never>).value;
        }
      },
    },
  ) as UseConfig<Values>;
}
