import { computed, reactive, ref, type ComputedRef, type Ref, type WritableComputedRef } from "vue";

export enum StorageLocation {
  /** Not saved, just kept in RAM */
  Volatile,
  /** Saved to sessionStorage */
  Session,
  /** Saved to localStorage */
  Local,
  // /** Saved to database. Currently unimplemented */
  // Remote,
}

export type NestedPartial<T> = T extends {}
? {
  [K in keyof T]?: NestedPartial<T[K]>;
}
: T;

type MergeFunction<T> =
/**
 * @param partial A map of the location to a (maybe partial) value. The StorageLocation.Volatile value will always be present and will be the current value.
 * @param initial The default (fallback) value.
 */
(partial: Map<StorageLocation, NestedPartial<T>>, initial: T) => T;

type MergeOption<T> = MergeFunction<T> | "replace";

const makeMergeFunc = <T>(merge: MergeOption<T>): MergeFunction<T> => {
  if (typeof merge === "string") {
    switch (merge) {
      case "replace":
        return (partial, initial) => ([StorageLocation.Volatile, StorageLocation.Session, StorageLocation.Local].map(l => partial.get(l)).find(v => v) ?? initial) as T;
    }
  }
  return merge;
};

type UnparsedValues = { session?: string, local?: string, remote?: any };

type RAMStorageValue<T> = {
  key: string;
  location: StorageLocation.Volatile;
  initial: T | (() => T);
}
type BrowserStorageValue<T> = {
  key: string;
  location: StorageLocation.Session | StorageLocation.Local;
  parse: (s: string) => NestedPartial<T>;
  toStr?: (val: T) => string;
  merge: MergeOption<T>;
  initial: T | (() => T);
}
// Separated in preparation for e.g. database saved values
type SavedStorageValue<T> = BrowserStorageValue<T>;
export type StorageValue<T> = RAMStorageValue<T> | SavedStorageValue<T>;

class ConfigRef<T, Meta extends SavedStorageValue<T>> {
  private readonly refCache = new Map<StorageLocation | null, WritableComputedRef<T>>();
  private cachedValue: Ref<T> | null;
  private readonly initDefault: () => void;
  private defaultValue: T | null = null;
  private readonly storageLayers: Ref<Map<StorageLocation, NestedPartial<T>>> = ref(new Map());
  private merge: MergeFunction<T>;
  constructor(private readonly meta: Meta) {
    if (typeof meta.initial === "function") {
      this.cachedValue = null;
      this.initDefault = () => {
        this.defaultValue = (meta.initial as () => T)();
        this.cachedValue = ref(structuredClone(this.defaultValue)) as Ref<T>;
      };
    } else {
      this.cachedValue = ref(meta.initial) as Ref<T>;
      this.defaultValue = meta.initial;
      this.initDefault = () => {};
    }
    this.merge = makeMergeFunc((this.meta as SavedStorageValue<T>).merge);
  }
  // isDefault(): boolean {

  // }
  /** Set the value without saving to storage */
  setVolatile(val: T) {
    if (this.cachedValue === null) {
      this.initDefault();
    }
    this.cachedValue!.value = val;
  }
  setUnparsed(unparsed: UnparsedValues) {
    console.log("Setting unparsed:", unparsed, this);//XXX
    if (unparsed.session !== undefined) {
      this.storageLayers.value.set(StorageLocation.Session, (this.meta as SavedStorageValue<T>).parse(unparsed.session));
    }
    if (unparsed.local !== undefined) {
      this.storageLayers.value.set(StorageLocation.Local, (this.meta as SavedStorageValue<T>).parse(unparsed.local));
    }
    // TODO: if (unparsed.remote !== undefined) {
    //   this.unparsed.value.set(StorageLocation.Remote, unparsed.remote);
    // }
  }
  readonlyRef(): ComputedRef<T> {
    if (this.cachedValue === null) {
      this.initDefault();
    }
    if (!this.refCache.has(null)) {
      this.refCache.set(null, computed(() => this.merge(this.storageLayers.value, structuredClone(this.defaultValue!))));
    }
    return this.refCache.get(null)! as ComputedRef<T>;
  }
  getMutableRef(storageLocation: StorageLocation): WritableComputedRef<T> {
    if (this.cachedValue === null) {
      this.initDefault();
    }
    if (!this.refCache.has(storageLocation)) {
      let set: (val: T) => void;
      switch (storageLocation) {
        case StorageLocation.Volatile:
          set = this.setVolatile;
          break;
        case StorageLocation.Session:
          set = (val) => {
            this.setVolatile(val);
            sessionStorage.setItem(this.meta.key, ((this.meta as SavedStorageValue<T>).toStr ?? JSON.stringify)(val));
          };
          break;
        case StorageLocation.Local:
          set = (val) => {
            this.setVolatile(val);
            localStorage.setItem(this.meta.key, ((this.meta as SavedStorageValue<T>).toStr ?? JSON.stringify)(val));
          };
          break;
      }
      this.refCache.set(storageLocation, computed({
        get: () => this.merge(this.storageLayers.value, structuredClone(this.defaultValue!)),
        set, 
      }));
    }
    return this.refCache.get(storageLocation)!;
  }
}

// export type ConfigRef<T, Meta extends StorageValue<T>> = {
//   ref: ComputedRef<T>,
//   isDefault(): boolean,
//   set: {
//     ()
//   };
// }

function makeRef<T>(value: StorageValue<T>, unparsed?: UnparsedValues): { r: Ref<T>, setUnparsed?: (unparsed: UnparsedValues) => void } {
  if (value.location === StorageLocation.Volatile) {
    if (typeof value.initial === "function") {
      let internal: Ref<T> | null = null;
      return {
        r: computed({
          get: () => {
            if (internal === null) {
              internal = ref((value.initial as () => T)()) as Ref<T>;
            }
            return internal.value;
          },
          set: (val) => {
            if (internal === null) {
              internal = ref((value.initial as () => T)()) as Ref<T>;
            }
            internal.value = val;
          }
        })
      };
    } else {
      return { r: ref(value.initial) as Ref<T> };
    }
  } else {
    let unparsedRef: Ref<Map<StorageLocation, string>> = ref(new Map());
    let setUnparsed = (unparsed: UnparsedValues) => {
      if (unparsed.session !== undefined) {
        unparsedRef.value.set(StorageLocation.Session, unparsed.session);
      }
      if (unparsed.local !== undefined) {
        unparsedRef.value.set(StorageLocation.Local, unparsed.local);
      }
      // TODO: if (unparsed.remote !== undefined) {
      //   unparsedRef.value.set(StorageLocation.Remote, unparsed.remote);
      // }
    };
    let merge = makeMergeFunc((value as SavedStorageValue<T>).merge);
    setUnparsed(unparsed ?? {});
    if (typeof value.initial === "function") {
      let cached: Ref<T | null> = ref(null);
      return {
        r: computed({
          get: () => {
            if (cached.value === null) {
              cached.value = (value.initial as () => T)();
            }
            if (unparsedRef.value.size > 0) {
              let m = new Map();
              for (const [k, s] of unparsedRef.value) {
                m.set(k, value.parse(s));
              }
              cached.value = merge(m, cached.value);
              unparsedRef.value.clear();
            }
            return cached.value;
          },
          set: (val) => {
            cached.value = val;
            switch (value.location) {
              case StorageLocation.Session:
                sessionStorage.setItem(value.key, (value.toStr ?? JSON.stringify)(val));
                break;
              case StorageLocation.Local:
                localStorage.setItem(value.key, (value.toStr ?? JSON.stringify)(val));
                break;
            }
          }
        }),
        setUnparsed,
      };
    } else {
      let cached: Ref<T> = ref(value.initial) as Ref<T>;
      return {
        r: computed({
          get: () => {
            if (unparsedRef.value.size > 0) {
              let m = new Map();
              for (const [k, s] of unparsedRef.value) {
                m.set(k, value.parse(s));
              }
              cached.value = merge(m, cached.value);
              unparsedRef.value.clear();
            }
            return cached.value;
          },
          set: (val) => {
            cached.value = val;
            switch (value.location) {
              case StorageLocation.Session:
                sessionStorage.setItem(value.key, (value.toStr ?? JSON.stringify)(val));
                break;
              case StorageLocation.Local:
                localStorage.setItem(value.key, (value.toStr ?? JSON.stringify)(val));
                break;
            }
          }
        }),
        setUnparsed,
      };
    }
  }
}

export class StorageInterfaceV1 {
  readonly values = new Map<string, Ref<any>>();
  readonly unparsedSetters = new Map<string, (unparsed: UnparsedValues) => void>();
  readonly unparsedValues: Map<string, UnparsedValues>;
  private readonly storageValues = new Map<string, StorageValue<any>>();
  constructor() {
    window.addEventListener("storage", this.handleEvent);
    this.unparsedValues = reactive(new Map())
  }
  addValueHandler<T>(storageValue: StorageValue<T>): Ref<T> {
    let key = storageValue.key;
    if (this.storageValues.has(key)) {
      throw new Error(`Value with key: "${key}" already exists!`);
    }
    this.storageValues.set(key, storageValue);
    if (!this.unparsedValues.has(key)) {
      let unparsed: UnparsedValues = {};
      let shouldSave = false;
      switch (storageValue.location) {
        case StorageLocation.Local:
          unparsed.local = localStorage.getItem(key) ?? undefined;
          shouldSave = true;
          // Do not break, check session storage for value in addition
        case StorageLocation.Session:
          unparsed.session = localStorage.getItem(key) ?? undefined;
          shouldSave = true;
      }
      if (shouldSave) {
        this.unparsedValues.set(key, unparsed)
      }
    }
    let { r, setUnparsed } = makeRef(storageValue, this.unparsedValues.get(key) ?? undefined);
    this.values.set(key, r);
    if (setUnparsed) {
      this.unparsedSetters.set(key, setUnparsed);
    }
    return r;
  }
  getReactive<T>(key: string): Ref<T> | undefined {
    return this.values.get(key)
  }
  handleEvent(event: StorageEvent) {
    let key = event.key;
    if (key) {
      if (!this.unparsedValues.has(key)) {
        this.unparsedValues.set(key, {})
      }
      if (event.storageArea === sessionStorage) {
        this.unparsedValues.get(key)!.session = event.newValue ?? undefined;
      }
      if (event.storageArea === localStorage) {
        this.unparsedValues.get(key)!.local = event.newValue ?? undefined;
      }
      let setUnparsed = this.unparsedSetters.get(key);
      if (setUnparsed) {
        setUnparsed(this.unparsedValues.get(key) ?? {});
        this.unparsedValues.set(key, {});
      }
    }
  }
}

export class StorageInterface {
  private static DEFAULT_INSTANCE: StorageInterface = new StorageInterface();
  public static defaultInstance(): StorageInterface {
    return this.DEFAULT_INSTANCE
  }
  readonly volatileValues = new Map<string, Ref<any>>();
  readonly savedValues = new Map<string, ConfigRef<any, any>>();
  readonly unparsedValues: Map<string, UnparsedValues>;
  private readonly storageValues = new Map<string, StorageValue<any>>();
  constructor() {
    window.addEventListener("storage", (e) => this.handleEvent(e));
    this.unparsedValues = reactive(new Map())
  }
  addValueHandler<T>(storageValue: RAMStorageValue<T>, allowExisting?: boolean): Ref<T>;
  addValueHandler<T>(storageValue: BrowserStorageValue<T>, allowExisting?: boolean): ConfigRef<T, typeof storageValue>;
  addValueHandler<T>(storageValue: StorageValue<T>, allowExisting?: boolean): any/*: typeof storageValue extends SavedStorageValue<T> ? ConfigRef<T, typeof storageValue> : Ref<T>*/ {
    let key = storageValue.key;
    if (this.storageValues.has(key) && !allowExisting) {
      throw new Error(`Value with key: "${key}" already exists!`);
    }
    this.storageValues.set(key, storageValue);
    if (!this.unparsedValues.has(key)) {
      let unparsed: UnparsedValues = {};
      let shouldSave = false;
      switch (storageValue.location) {
        case StorageLocation.Local:
          unparsed.local = localStorage.getItem(key) ?? undefined;
          shouldSave = true;
          // Do not break, check session storage for value in addition
        case StorageLocation.Session:
          unparsed.session = sessionStorage.getItem(key) ?? undefined;
          shouldSave = true;
      }
      if (shouldSave) {
        this.unparsedValues.set(key, unparsed)
      }
    }
    switch (storageValue.location) {
      case StorageLocation.Volatile: {
        this.volatileValues.set(key, ref(typeof storageValue.initial === "function"
          ? (storageValue.initial as () => void)()
          : storageValue.initial));
        return this.volatileValues.get(key)!;
      }
      default: {
        let cv = new ConfigRef<T, typeof storageValue>(storageValue);
        if (this.unparsedValues.has(key)) {
          cv.setUnparsed(this.unparsedValues.get(key)!);
        }
        this.savedValues.set(key, cv);
        return cv;
      }
    }
  }
  getVolatileRef<T>(key: string): Ref<T> | undefined {
    return this.volatileValues.get(key)
  }
  getSavedRef<T, M extends SavedStorageValue<T>>(key: string): ConfigRef<T, M> | undefined;
  getSavedRef<T, M extends SavedStorageValue<T>>(meta: M): ConfigRef<T, M> | undefined;
  getSavedRef<T, M extends SavedStorageValue<T>>(keyOrMeta: string | M): ConfigRef<T, M> | undefined {
    return typeof keyOrMeta === "string"
      ? this.savedValues.get(keyOrMeta)
      : this.savedValues.get(keyOrMeta.key)
  }
  // getReactive<T>(key: string): Ref<T> | ConfigRef<T, any> | undefined {
  //   return this.volatileValues.has(key) ? this.volatileValues.get(key) : this.savedValues.get(key)
  // }
  handleEvent(event: StorageEvent) {
    let key = event.key;
    if (key) {
      if (!this.unparsedValues.has(key)) {
        this.unparsedValues.set(key, {})
      }
      if (event.storageArea === sessionStorage) {
        this.unparsedValues.get(key)!.session = event.newValue ?? undefined;
      }
      if (event.storageArea === localStorage) {
        this.unparsedValues.get(key)!.local = event.newValue ?? undefined;
      }
      let cv = this.savedValues.get(key);
      console.info("Storage event recieved:", event, cv);//XXX
      if (cv) {
        cv.setUnparsed(this.unparsedValues.get(key) ?? {});
        this.unparsedValues.set(key, {});
      }
    }
  }
}

export default StorageInterface;

