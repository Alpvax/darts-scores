import { defineStore } from "pinia";
import { computed, ref, type Ref, type WritableComputedRef } from "vue";
import type { ZodDefault, TypeOf, ZodTypeAny, ZodObject } from "zod";

function getValue<S extends ZodTypeAny>(
  storage: Storage,
  schema: ZodDefault<S>,
  path0: string,
  ...pathParts: string[]
): TypeOf<S> {
  const key = ["darts", path0, ...pathParts].join(".");
  const val = storage.getItem(key);
  console.debug(
    `Getting value for "${key}" = "${val}";\n\tResult:`,
    schema.parse(val !== null ? JSON.parse(val) : undefined),
  );
  return schema.parse(val !== null ? JSON.parse(val) : undefined);
}
function setValue<T>(storage: Storage, path: string[], value: T): void {
  const key = ["darts", ...path].join(".");
  console.debug(`Setting value for "${key}" = "${JSON.stringify(value)}";\n\tRaw value:`, value);
  storage.setItem(key, JSON.stringify(value));
}

type ZObjStoreState<T extends ZodObject<any>> = T extends ZodObject<infer S>
  ? { [K in keyof S]: WritableComputedRef<TypeOf<S[K]>> }
  : never;
type PersistentZodStore<K extends string, S extends ZodObject<any>> = ReturnType<
  typeof defineStore<
    K,
    ZObjStoreState<S>,
    {},
    { writeAllToStorage: (forceDefaults?: boolean) => void }
  >
> & {
  storage: Storage;
  key: K;
  schema: S;
  schemaDefaulted: ZodDefault<S>;
};

const ALL_STORES = new Map<string, PersistentZodStore<string, any>>();
const INTERNAL_REFS = new Map<string, { r: Ref<any>; s: ZodTypeAny }>();
addEventListener("storage", ({ key, newValue }) => {
  if (key && key.startsWith("darts.")) {
    const internal = INTERNAL_REFS.get(key);
    if (internal && newValue !== null) {
      const val = internal.s.parse(JSON.parse(newValue));
      console.debug(`Value changed externally "${key}" = "${newValue}";\n\tResult:`, val);
      internal.r.value = val;
    }
  }
});

/** A persistent (sessionStorage or localStorage backed) store where each property is stored under [key].[prop] = val by converting to/from json */
export const objZodStore = <K extends string, S extends ZodObject<any>>(
  key: K,
  type: "local" | "session",
  schema: S,
): PersistentZodStore<K, S> => {
  if (ALL_STORES.has(key)) {
    throw new Error(`Store with key: "${key}" already exists!`);
  }
  const storage = type === "local" ? localStorage : sessionStorage;
  const makeRef = <Key extends keyof TypeOf<S> & string>(
    propKey: Key,
    propSchema: S["shape"][Key],
  ): WritableComputedRef<TypeOf<S["shape"][Key]>> => {
    const current = ref(getValue<typeof propSchema>(storage, propSchema, key, propKey));
    INTERNAL_REFS.set(`darts.${key}.${propKey}`, {
      r: current,
      s: propSchema,
    });
    console.log(`Loaded value: darts.${key}.${propKey} =`, current.value); //XXX
    return computed({
      get: () => current.value,
      set: (val) => {
        current.value = val;
        setValue(storage, [key, propKey], val);
      },
    });
  };
  const store = Object.assign(
    defineStore(key, () => {
      const refs = Object.entries(schema.shape).reduce(
        (acc, [propKey, propSchema]) =>
          Object.assign(acc, {
            [propKey]: makeRef(propKey, propSchema),
          }),
        {} as {
          [K in keyof TypeOf<S>]: WritableComputedRef<TypeOf<S>[K]>;
        },
      );
      return {
        // eslint-disable-next-line no-self-assign
        writeAllToStorage: (forceDefaults = false) =>
          Object.entries(refs).forEach(
            ([propKey, propRef]) =>
              (propRef.value = forceDefaults
                ? schema.shape[propKey].parse(undefined)
                : propRef.value),
          ),
        ...refs,
      };
    }),
    { storage, key, schema: schema.default({}) },
  ) as unknown as PersistentZodStore<string, any>;
  ALL_STORES.set(key, store);
  return store as PersistentZodStore<K, S>;
};

/** API method exposed to write default preferences to storage, useful for making it easy to modify the defaults */
export const writeLocalPrefs = (path: string | RegExp, forceDefaults = false) => {
  if (!path) {
    console.error(
      'Unspecified prefs to write! Pass the key of the store to write, or use "*" or a regex to write all or multiple.',
    );
  } else if (path === "*") {
    [...ALL_STORES.values()].forEach((s) => s().writeAllToStorage(forceDefaults));
  } else if (typeof path === "string") {
    const useStore = ALL_STORES.get(path);
    if (useStore !== undefined) {
      const store = useStore();
      store.writeAllToStorage(forceDefaults);
    }
  } else {
    [...ALL_STORES.values()]
      .filter(({ key }) => path.test(key))
      .forEach((s) => s().writeAllToStorage(forceDefaults));
  }
};
