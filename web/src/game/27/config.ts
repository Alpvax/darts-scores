import { makeConfigComposable, StorageLocation, type StorageValue } from "@/config";
import type { SideDisplay } from "@/views/GameView27";
import { doc, getFirestore, onSnapshot } from "firebase/firestore";

const DB_REF_27 = doc(getFirestore(), "games", "twentyseven");
const DB_META: {
  defaultPlayers: string[];
  requiredPlayers: string[];
} = {
  defaultPlayers: [],
  requiredPlayers: [],
};
export const UNSUBSCRIBE = onSnapshot(DB_REF_27, (snapshot) => {
  const data = snapshot.data();
  if (data) {
    if (data.defaultplayers) {
      DB_META.defaultPlayers = data.defaultPlayers;
    }
    if (data.requiredplayers) {
      DB_META.requiredPlayers = data.requiredplayers;
    }
  }
});

export const use27Config = makeConfigComposable("twentyseven", {
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
    fallback: () => DB_META.requiredPlayers,
    recalculateFallback: true,
    location: StorageLocation.Local,
    merge: "replace",
    parse: "json",
  },
});
