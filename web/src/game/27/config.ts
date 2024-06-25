import { makeConfigComposable, StorageLocation, type StorageValue } from "@/config";
import type { SideDisplay } from "@/views/GameView27";

export const use27Config = makeConfigComposable("twentyseven", {
  defaultView: {
    fallback: "history",
    location: StorageLocation.Local,
    merge: "replace",
    parse: (s) => (s in ["game", "history"] ? (s as "game" | "history") : undefined),
  } satisfies StorageValue<"game" | "history">,
  sideDisplay: {
    fallback: "summary",
    location: StorageLocation.Local,
    merge: "replace",
    parse: (s) =>
      s in ["none", "summary", "entries", "combined"] ? (s as SideDisplay) : undefined,
  } satisfies StorageValue<SideDisplay>,
  defaultPlayers: {
    fallback: () => {
      const res = [
        "y5IM9Fi0VhqwZ6gAjil6",
        "6LuRdib3wFxhbcjjh0au",
        "Gt8I7XPbPWiQ92FGsTtR",
        "jcfFkGCY81brr8agA3g3",
        "jpBEiBzn9QTVN0C6Hn1m",
      ];
      // Player doesn't play on Fridays
      if (new Date().getDay() !== 5) {
        res.push("k7GNyCogBy79JE4qhvAj");
      }
      return res;
    },
    location: StorageLocation.Local,
    merge: "replace",
    parse: "json",
  },
  realWinsPlayers: {
    fallback: [
      "y5IM9Fi0VhqwZ6gAjil6",
      "6LuRdib3wFxhbcjjh0au",
      "Gt8I7XPbPWiQ92FGsTtR",
      "jcfFkGCY81brr8agA3g3",
      "jpBEiBzn9QTVN0C6Hn1m",
    ],
    location: StorageLocation.Local,
    merge: "replace",
    parse: "json",
  },
});
