/// <reference types="vite/client" />

declare module "vue-select" {
  import Vue from "vue";

  export default class VSelect extends Vue {}
}

declare module "array-keyed-map" {
  declare class ArrayKeyedMap<K, V> {
    constructor(initialEntries = [] as [K[], V][]);

    set(path: K[], value: V): ThisType;

    has(path: K[]): boolean;

    get(path: K[]): V | undefined;

    delete(path: K[]): boolean;

    get size(): number;

    clear(): void;

    hasPrefix(path: K[]): boolean;

    *[Symbol.iterator](): Generator<[K[], V], void>;

    *entries(): Generator<[K[], V], void>;

    *keys(): Generator<K[], void>;

    *values(): Generator<V, void>;

    forEach<T>(callback: (this: T, val: V, key: K[], map: ThisType) => void, thisArg: T): void;
  }
  export = ArrayKeyedMap;
}
