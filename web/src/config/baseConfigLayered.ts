import type { RouteLocationRaw } from "vue-router";
import {
  makeLayeredConfigComposable,
  type AnyLayeredDef,
  type LayeredStorageDefinition2,
} from "./layeredConfig";

export type DefaultView = { default: string; games: Record<string, string> };

export const useBasicConfig = makeLayeredConfigComposable({
  "onload:defaultGame": {
    fallback: { name: "twentyseven" },
    browser: {
      key: "onload:defaultGame",
      convert: "json",
    },
    merge: "replace",
  } satisfies AnyLayeredDef<RouteLocationRaw>,
  "onload:defaultView": {
    fallback: { default: "history", games: {} },
    browser: {
      key: "onload:defaultView",
      convert: {
        fromString: (s) => {
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
        toString: (v) => (typeof v === "string" ? v : JSON.stringify(v)),
      },
    },
    merge: ({ fallback, volatile, session, local }) => {
      const res = fallback;
      for (const part of [local, session, volatile]) {
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
  } as LayeredStorageDefinition2<DefaultView, "local" | "session">,
  tiebreakTypes: {
    fallback: ["Bullseye", "Double 20", "High score"],
    browser: {
      key: "tiebreakTypes",
      convert: "json",
    },
    merge: ({ fallback, session, local }) => {
      const all = new Set<string>(
        [...(session ?? []), ...(local ?? [])].filter((s) => s) as string[],
      );
      return all.size > 0 ? [...all] : fallback;
    },
  } satisfies AnyLayeredDef<string[]>,
});
