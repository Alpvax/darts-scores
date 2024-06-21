import type { RouteLocationRaw } from "vue-router";
import { StorageLocation, type StorageMeta, type StorageMetaTyped } from "./storageInterfaceV2";

const baseConfigValues = {
  "onload:defaultGame": {
    fallback: { name: "twentyseven" },
    location: StorageLocation.Local,
    parse: JSON.parse,
    merge: "replace",
  },
} satisfies StorageMetaTyped<{
  "onload:defaultGame": RouteLocationRaw;
}>;