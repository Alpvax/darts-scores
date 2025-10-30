import { computed, reactive, type ComputedRef, type WritableComputedRef } from "vue";

const STORAGE_MAP = reactive(
  new Map<
    string,
    {
      session?: string;
      local?: string;
    }
  >(),
);

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
      STORAGE_MAP.set(key, {});
    }
    if (event.storageArea === sessionStorage) {
      STORAGE_MAP.get(key)!.session = event.newValue ?? undefined;
    }
    if (event.storageArea === localStorage) {
      STORAGE_MAP.get(key)!.local = event.newValue ?? undefined;
    }
  }
});

export function sessionStorageRef(key: string, writable: false): ComputedRef<string | undefined>;
export function sessionStorageRef(
  key: string,
  writable: true,
): WritableComputedRef<string | undefined>;
export function sessionStorageRef(
  key: string,
  writable: boolean,
): WritableComputedRef<string | undefined> | ComputedRef<string | undefined> {
  setSessionStorage(key, sessionStorage.getItem(key) ?? undefined);
  return writable
    ? computed({
        get: () => STORAGE_MAP.get(key)?.session,
        set: (s) => {
          setSessionStorage(key, s);
          sessionStorage.setItem;
        },
      })
    : computed(() => STORAGE_MAP.get(key)?.session);
}

export function localStorageRef(key: string, writable: false): ComputedRef<string | undefined>;
export function localStorageRef(
  key: string,
  writable: true,
): WritableComputedRef<string | undefined>;
export function localStorageRef(
  key: string,
  writable: boolean,
): WritableComputedRef<string | undefined> | ComputedRef<string | undefined> {
  setLocalStorage(key, localStorage.getItem(key) ?? undefined);
  return writable
    ? computed({
        get: () => STORAGE_MAP.get(key)?.local,
        set: (s) => {
          setLocalStorage(key, s);
          localStorage.setItem;
        },
      })
    : computed(() => STORAGE_MAP.get(key)?.local);
}
