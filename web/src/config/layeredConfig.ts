import { computed, ref, toRaw, type ComputedRef, type Ref, type WritableComputedRef } from "vue";
import { type NestedPartial } from ".";
import { getDBData, type AppModelTypeFor, type DatabaseConfig } from "./database";
import * as browserStorage from "./browserStorage";

const STORAGE_REF_DEFINITION = Symbol("StorageDefinition");

export type StorageLayer = keyof StorageLayers<any>;

export type BaseStorageDefinition<V> = {
  /** Fallback/default value or factory */
  fallback: V | (() => V);
  /**
   * Whether to recalculate the fallback value on each merge call
   * or cache the value and only calculate it the first time.
   */
  recalculateFallback?: boolean;
};

type BrowserStorageConverter<V> = {
  fromString: (s: string) => NestedPartial<V> | undefined;
  toString: (val: V) => string;
};

type BrowserStorageConverterDef<V> = [V] extends [string]
  ? "rawString" | "json" | BrowserStorageConverter<V>
  : "json" | BrowserStorageConverter<V>;

const makeBrowserConverter = <V>(
  parse: BrowserStorageConverterDef<V>,
): BrowserStorageConverter<V> => {
  if (typeof parse === "string") {
    switch (parse) {
      case "rawString":
        return {
          fromString: (s) => s as NestedPartial<V>,
          toString: (val) => String(val),
        };
      case "json":
        return {
          fromString: JSON.parse,
          toString: JSON.stringify,
        };
    }
  }
  return parse as BrowserStorageConverter<V>;
};

export type BrowserStorageDef<V> = {
  readonly key: string;
  readonly convert: BrowserStorageConverterDef<V>;
};

type CommonBrowserStorageDef<V> = { browser: BrowserStorageDef<V> };
type SplitBrowserStorageDef<V> = {
  browserLocal: BrowserStorageDef<V>;
  browserSession: BrowserStorageDef<V>;
};
type BrowserStorageDefinition<V, L extends "session" | "local" | undefined = "session" | "local"> =
  | "session"
  | "local" extends L
  ? CommonBrowserStorageDef<V> | SplitBrowserStorageDef<V>
  : L extends string
    ? Pick<SplitBrowserStorageDef<V>, `browser${Capitalize<L>}`>
    : {};
const isCommonBrowserDef = <V>(def: any): def is CommonBrowserStorageDef<V> =>
  Object.hasOwn(def, "browser");
const isLocalBrowserDef = <V>(def: any): def is Pick<SplitBrowserStorageDef<V>, "browserLocal"> =>
  Object.hasOwn(def, "browserLocal");
const isSessionBrowserDef = <V>(
  def: any,
): def is Pick<SplitBrowserStorageDef<V>, "browserSession"> => Object.hasOwn(def, "browserSession");

type DBStorageDefinition<V, K extends keyof DatabaseConfig> = {
  database: {
    key: K;
    /**
     * @param data
     * Value when defined,
     * `null` when still waiting for data
     * `undefined` when missing from database
     */
    get: (data: AppModelTypeFor<K> | undefined | null) => NestedPartial<V> | undefined;
    // set:
  };
};
const isRemoteDef = <V>(def: any): def is DBStorageDefinition<V, any> =>
  Object.hasOwn(def, "database");

// type StorageDefinition<V> = BaseStorageDefinition<V>
// & BrowserStorageDefinition<V>
// & DBStorageDefinition<V>

type IsNonVolatile<OptLayers extends StorageLayer> = "session" extends OptLayers
  ? true
  : "local" extends OptLayers
    ? true
    : "remote" extends OptLayers
      ? true
      : false;

export type LayeredStorageDefinition<
  V,
  OptLayers extends Exclude<StorageLayer, "volatile">,
> = BaseStorageDefinition<V> &
  BrowserStorageDefinition<V, Extract<OptLayers, "session" | "local">> &
  ("remote" extends OptLayers ? DBStorageDefinition<V, keyof DatabaseConfig> : {}) &
  (IsNonVolatile<OptLayers> extends true
    ? { merge: MergeOption<V, OptLayers> }
    : { merge?: MergeOption<V, OptLayers> });

export type LayeredStorageDefinition2<
  V,
  BrowserLayers extends "session" | "local" | undefined,
  DBKey extends keyof DatabaseConfig | undefined = undefined,
> = BaseStorageDefinition<V> &
  BrowserStorageDefinition<V, BrowserLayers> &
  (undefined extends DBKey ? {} : DBStorageDefinition<V, NonNullable<DBKey>>) &
  (NonNullable<BrowserLayers> | (undefined extends DBKey ? never : "remote") extends infer OptLayers
    ? [OptLayers] extends [StorageLayer]
      ? IsNonVolatile<OptLayers> extends true
        ? { merge: MergeOption<V, OptLayers> }
        : { merge?: MergeOption<V, OptLayers> }
      : {}
    : {});

type OptionalLayers<
  BrowserLayers extends "session" | "local" | undefined,
  DBKey extends keyof DatabaseConfig | undefined,
> = NonNullable<BrowserLayers> | (undefined extends DBKey ? never : "remote");

export type AnyLayeredDef<
  V,
  K extends keyof DatabaseConfig | undefined = undefined,
> = BaseStorageDefinition<V> &
  Partial<CommonBrowserStorageDef<V>> &
  Partial<SplitBrowserStorageDef<V>> &
  (undefined extends K ? {} : DBStorageDefinition<V, NonNullable<K>>) & { merge?: MergeOption<V> };

type BaseLayer<V> = {
  setVolatile(value: V): void;
  readonly value: V;
};

type BrowserLayer<V> = {
  readonly key: string;
  readonly converter: BrowserStorageConverter<V>;
  // unparsed: Ref<string | undefined>;
  partialRef: ComputedRef<NestedPartial<V> | undefined>;
  mutableRef?: WritableComputedRef<V>;
};
/** @param converterOverride added to avoid building converter twice for common layers */
const makeBrowserLayer = <V>(
  def: BrowserStorageDef<V>,
  storage: "local" | "session",
  converterOverride?: BrowserStorageConverter<V>,
): BrowserLayer<V> => {
  const converter = converterOverride ?? makeBrowserConverter(def.convert);
  const r =
    storage === "local"
      ? browserStorage.localStorageRef(def.key, false)
      : browserStorage.sessionStorageRef(def.key, false);
  return {
    key: def.key,
    converter,
    // unparsed: storage === "local"
    //   ? browserStorage.localStorageRef(def.key, true)
    //   ? browserStorage.sessionStorageRef(def.key, true),
    partialRef: computed(() => (r.value !== undefined ? converter.fromString(r.value) : undefined)),
  };
};

type DBLayer<V> = {
  /**
   * Getter to allow value to only be queried from database if requested
   */
  partialRef: ComputedRef<() => NestedPartial<V> | undefined>;
  cachedPartial?: NestedPartial<V>;
  mutableRef?: WritableComputedRef<V>;
};

type StorageLayers<V> = {
  /** Not saved, just kept in RAM */
  volatile: BaseLayer<V>;
  /** Saved to sessionStorage */
  session?: BrowserLayer<V>;
  /** Saved to localStorage */
  local?: BrowserLayer<V>;
  /** Saved to database. Currently unimplemented */
  remote?: DBLayer<V>;
};

type MergeFuncArgs<V, Layers extends StorageLayer> = {
  current: V;
  fallback: V;
} & {
  [K in Layers as K extends "volatile" | "remote" ? never : K]?: NestedPartial<V>;
} & {
  getRemote: () => NestedPartial<V> | undefined;
};

type MergeFunction<V, Layers extends StorageLayer = StorageLayer> = (values: {
  [K in keyof MergeFuncArgs<V, Layers>]: MergeFuncArgs<V, Layers>[K];
}) => V;
// type MergeOption<V, Layers extends StorageLayer = StorageLayer> = (MergeFunction<V, Layers> extends ((values: infer Args) => V) ? ((values: Args) => V) : never)
// type MergeOption<V, Layers extends StorageLayer = StorageLayer> = MergeFunction<V, Layers> | "replace";
// | ({} extends V ? never : "replace");
type MergeOption<V, Layers extends StorageLayer = StorageLayer> = [Layers] extends ["volatile"]
  ? never
  : MergeFunction<V, Layers> | "replace";

const makeMergeFunc = <V, Layers extends StorageLayer>(
  merge: MergeOption<V, Layers>,
): MergeFunction<V, Layers> => {
  if (typeof merge === "string") {
    switch (merge) {
      case "replace":
        return ({ fallback, ...layers }) => {
          if ("session" in layers && layers.session !== undefined) {
            return layers.session as V;
          }
          if ("local" in layers && layers.local !== undefined) {
            return layers.local as V;
          }
          if ("getRemote" in layers) {
            const val = layers.getRemote();
            if (val !== undefined) {
              return val as V;
            }
          }
          return fallback as V;
        };
      default:
        throw new Error(`Unsupported merge option: ${merge}`);
    }
  } else {
    return merge;
  }
};

type LayeredConfigValue<V, Layers extends StorageLayer = StorageLayer> = {
  readonlyRef(): ComputedRef<V>;
  mutableRef(storageLayer: Layers): Ref<V>;
  readonly value: V;
  setValue(storageLayer: Layers, value: V): void;
  /** Save the current value to the specified storage location */
  saveTo(storageLayer: Exclude<Layers, "volatile">): void;
  readonly layers: StorageLayers<V>;
};

// export function makeLayeredConfigValue<V, OptLayers extends Exclude<StorageLayer, "volatile"> = Exclude<StorageLayer, "volatile">>(definition: LayeredStorageDefinition<V, OptLayers>): LayeredConfigValue<V, "volatile" | OptLayers> {
export function makeLayeredConfigValue<
  V,
  BrowserLayers extends "session" | "local" | undefined,
  DBKey extends keyof DatabaseConfig | undefined = undefined,
>(
  definition: LayeredStorageDefinition2<V, BrowserLayers, DBKey>,
): LayeredConfigValue<V, "volatile" | OptionalLayers<BrowserLayers, DBKey>> {
  type OptLayers = OptionalLayers<BrowserLayers, DBKey>;
  let volatileRef: Ref<V> | null = null;
  const fallback =
    typeof definition.fallback === "function"
      ? definition.recalculateFallback
        ? (definition.fallback as () => V)
        : (() => {
            let cachedFallback: V | null = null;
            return () => {
              if (cachedFallback === null) {
                cachedFallback = (definition.fallback as () => V)();
              }
              return structuredClone(cachedFallback);
            };
          })()
      : () => structuredClone(definition.fallback as V);
  const init = () => {
    volatileRef = ref(fallback()) as Ref<V>;
    // watch(
    //   cachedValue!,
    //   (val) => layers.set(StorageLocation.Volatile, val as NestedPartial<V>),
    //   { immediate: true },
    // );
  };
  const setVolatile = (value: V) => {
    if (volatileRef === null) {
      init();
    }
    volatileRef!.value = value;
  };
  const layers: StorageLayers<V> = {
    volatile: {
      setVolatile,
      get value() {
        if (volatileRef === null) {
          init();
        }
        return volatileRef!.value;
      },
    },
  };
  if (isCommonBrowserDef<V>(definition)) {
    const converter = makeBrowserConverter(definition.browser.convert);
    layers.local = makeBrowserLayer(definition.browser, "local", converter);
    layers.session = makeBrowserLayer(definition.browser, "session", converter);
  } else {
    if (isLocalBrowserDef<V>(definition)) {
      layers.local = makeBrowserLayer(definition.browserLocal, "local");
    }
    if (isSessionBrowserDef<V>(definition)) {
      layers.session = makeBrowserLayer(definition.browserSession, "session");
    }
  }
  if (isRemoteDef<V>(definition)) {
    const data = getDBData(definition.database.key);
    if (data) {
      //TODO: implement database config better?
      layers.remote = {
        partialRef: computed(() => () => {
          if (data.ref.value === null) {
            data.update();
          }
          return definition.database.get(data.ref.value);
        }),
      };
    } else {
      console.warn(
        "Database connection does not exist! Ensure that you have called initDBData with the correct key before making the config! key =",
        definition.database.key,
      );
    }
  }

  const setValue = (storageLayer: "volatile" | OptLayers, value: V): void => {
    if (volatileRef === null) {
      init();
    }
    volatileRef!.value = value;
    switch (storageLayer) {
      case "session": {
        if (layers.session) {
          browserStorage.setSessionStorage(
            layers.session.key,
            layers.session.converter.toString(value),
          );
        } else {
          console.warn("Cannot set value", value, "to session storage! UNREGISTERED");
        }
        break;
      }
      case "local": {
        if (layers.local) {
          browserStorage.setLocalStorage(layers.local.key, layers.local.converter.toString(value));
        } else {
          console.warn("Cannot set value", value, "to local storage! UNREGISTERED");
        }
        break;
      }
      case "remote": {
        if (layers.remote) {
          console.log("TODO: WRITING TO REMOTE STORAGE NOT YET IMPLEMENTED"); //TODO: remote config setting
        } else {
          console.warn("Cannot set value", value, "to remote storage! UNREGISTERED");
        }
        break;
      }
    }
  };

  const mergeFunc: MergeFunction<V, OptLayers> =
    "merge" in definition
      ? makeMergeFunc(definition.merge as MergeOption<V, OptLayers>)
      : ({ fallback }) => fallback;
  const merge = () => {
    if (volatileRef === null) {
      init();
    }
    const args: MergeFuncArgs<V, StorageLayer> = Object.assign(
      {
        current: toRaw(volatileRef!.value),
        fallback: fallback(),
      },
      "session" in layers
        ? {
            session: toRaw(layers.session!.partialRef.value),
          }
        : undefined,
      "local" in layers
        ? {
            local: toRaw(layers.local!.partialRef.value),
          }
        : undefined,
      "remote" in layers
        ? {
            getRemote: layers.remote!.partialRef.value,
          }
        : undefined,
    );
    return toRaw(mergeFunc(args));
    // console.log("Merging layers:", args);//XXX
    // const val = mergeFunc(args);
    // console.log("Merge result:", val);//XXX
    // return toRaw(val);
  };
  let readonlyRef: ComputedRef<V> | undefined;
  return Object.defineProperties(
    {
      readonlyRef: () => {
        if (readonlyRef === undefined) {
          readonlyRef = computed(merge);
        }
        return readonlyRef!;
      },
      mutableRef: (storageLayer: "volatile" | OptLayers): Ref<V> => {
        switch (storageLayer) {
          case "volatile": {
            if (volatileRef === null) {
              init();
            }
            return volatileRef as Ref<V>;
          }
          case "session": {
            if (layers.session) {
              if (!layers.session.mutableRef) {
                layers.session.mutableRef = computed({
                  get: () => merge(),
                  set: (val) => setValue("session" as OptLayers, val),
                });
              }
              return layers.session.mutableRef;
            } else {
              console.warn("Cannot get value from session storage! UNREGISTERED");
            }
            break;
          }
          case "local": {
            if (layers.local) {
              if (!layers.local.mutableRef) {
                layers.local.mutableRef = computed({
                  get: () => merge(),
                  set: (val) => setValue("local" as OptLayers, val),
                });
              }
              return layers.local.mutableRef;
            } else {
              console.warn("Cannot get value from local storage! UNREGISTERED");
            }
            break;
          }
          case "remote": {
            if (layers.remote) {
              if (!layers.remote.mutableRef) {
                layers.remote.mutableRef = computed({
                  get: () => merge(),
                  set: (val) => setValue("remote" as OptLayers, val),
                });
              }
              return layers.remote.mutableRef;
            } else {
              console.warn("Cannot get value from remote storage! UNREGISTERED");
            }
            break;
          }
        }
        throw new Error(`Unsupported storage layer: ${storageLayer}`);
      },
      setValue,
      saveTo: (storageLayer: OptLayers) => setValue(storageLayer, merge()),
      layers,
    } satisfies Omit<LayeredConfigValue<V>, "value">,
    {
      value: {
        configurable: false,
        enumerable: true,
        get: () => {
          if (volatileRef === null) {
            init();
          }
          return readonlyRef !== null ? readonlyRef!.value : merge();
        },
      },
      [STORAGE_REF_DEFINITION]: {
        configurable: false,
        enumerable: false,
        value: definition,
        writable: false,
      },
    },
  ) as LayeredConfigValue<V>;
}

type LayeredConfigValues<Definitions extends { [k: string]: AnyLayeredDef<any, any> }> = {
  [K in keyof Definitions]: Definitions[K] extends LayeredStorageDefinition<infer V, infer Layers>
    ? LayeredConfigValue<V, Layers>
    : Definitions[K] extends LayeredStorageDefinition2<
          infer V,
          infer BrowserLayers extends "session" | "local" | undefined,
          infer DBKey
        >
      ? LayeredConfigValue<V, "volatile" | OptionalLayers<BrowserLayers, DBKey>>
      : Definitions[K] extends AnyLayeredDef<infer V, infer DBKey>
        ? ["any", V, DBKey, Definitions[K]]
        : [unknown, Definitions[K]];
};

type UseLayeredConfigs<Definitions extends { [k: string]: AnyLayeredDef<any, any> }> = {
  getValue: <K extends keyof Definitions>(
    key: K,
  ) => Definitions[K] extends LayeredStorageDefinition<infer V, any> ? V : never;
} & (() => LayeredConfigValues<Definitions>);

export const makeLayeredConfigComposable = <
  Definitions extends { [k: string]: AnyLayeredDef<any, any> },
>(
  definitions: Definitions,
): UseLayeredConfigs<Definitions> => {
  const values = Object.freeze(
    Object.entries(definitions).reduce(
      (values, [key, def]) =>
        Object.assign(values, {
          [key]: makeLayeredConfigValue(def as LayeredStorageDefinition2<any, any, any>),
        }),
      {},
    ),
  ) as {
    [K in keyof Definitions]: Definitions[K] extends LayeredStorageDefinition<infer V, infer Layers>
      ? LayeredConfigValue<V, Layers>
      : unknown;
  };
  return Object.defineProperty(() => values, "getValue", {
    configurable: false,
    enumerable: true,
    writable: false,
    value: <K extends keyof Definitions>(
      key: K,
    ): Definitions[K] extends LayeredStorageDefinition<infer V, any> ? V : never =>
      (values[key] as LayeredConfigValue<any, any>).value,
  }) as UseLayeredConfigs<Definitions>;
};
