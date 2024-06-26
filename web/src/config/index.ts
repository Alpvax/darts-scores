// export { ConfigValue } from "./configValue";
export { makeConfigComposable, type StorageValue } from "./storageInterfaceComposable";

type StartupConfig =
  | {
      gameType: string;
      view: "game" | "history";
    }
  | string;

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
