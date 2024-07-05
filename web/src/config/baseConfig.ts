import type { RouteLocationRaw } from "vue-router";
import { StorageLocation } from ".";
import { makeConfigComposable, type StorageValue } from "./storageInterfaceComposable";

export type DefaultView = { default: string; games: Record<string, string> };

export const useBasicConfig = makeConfigComposable({
  "onload:defaultGame": {
    fallback: { name: "twentyseven" },
    location: StorageLocation.Local,
    parse: "rawString",
    merge: "replace",
  } satisfies StorageValue<RouteLocationRaw>,
  "onload:defaultView": {
    fallback: { default: "history", games: {} },
    location: StorageLocation.Local,
    parse: (s) => {
      const res: Partial<DefaultView> = {};
      try {
        const obj = JSON.parse(s);
        if ("default" in obj) {
          res.default = obj.default;
        }
        if ("games" in obj) {
          res.games = obj.games;
        }
      } catch (error) {
        res.default = s;
      }
      return res;
    },
    merge: (partial, fallback) => {
      const res = fallback;
      for (const loc of [
        StorageLocation.Local,
        StorageLocation.Session,
        StorageLocation.Volatile,
      ]) {
        const part = partial.get(loc);
        if (part) {
          if (part.default) {
            res.default = part.default;
          }
          if (part.games) {
            Object.entries(part.games)
              .filter(([_, v]) => v !== undefined)
              .forEach(([g, v]) => (res.games[g] = v!));
          }
        }
      }
      return res;
    },
  } /*satisfies*/ as StorageValue<DefaultView>,
});
