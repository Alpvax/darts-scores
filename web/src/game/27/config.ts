import { initDBData } from "@/config/database";
import { makeLayeredConfigComposable, type AnyLayeredDef } from "@/config/layeredConfig";
import type { SideDisplay } from "@/views/GameView27";
import { DocumentReference, doc, getFirestore } from "firebase/firestore";

type TwentySevenMeta = {
  defaultPlayers: string[];
  requiredPlayers: string[];
};

declare module "@/config/database" {
  export interface DatabaseConfig {
    twentysevenGameMeta?: DBData<TwentySevenMeta>;
  }
}

initDBData({
  key: "twentysevenGameMeta",
  dbRef: doc(getFirestore(), "game/twentyseven").withConverter<TwentySevenMeta>({
    fromFirestore(snapshot) {
      const data = snapshot.data();
      return {
        defaultPlayers: data?.defaultplayers?.map((r: DocumentReference) => r.id) ?? [],
        requiredPlayers: data?.defaultrequired?.map((r: DocumentReference) => r.id) ?? [],
      };
    },
    toFirestore() {
      throw new Error("Converting 27Meta to database unimplemented!");
    },
  }),
  load: "lazy",
});

export const use27Config = makeLayeredConfigComposable({
  sideDisplay: {
    fallback: "summary",
    browser: {
      key: "twentyseven:sideDisplay",
      convert: {
        toString: (v) => v,
        fromString: (s) =>
          ["none", "summary", "entries", "combined"].includes(s) ? (s as SideDisplay) : undefined,
      },
    },
    merge: "replace",
  } satisfies AnyLayeredDef<SideDisplay>,
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
    browser: {
      key: "twentyseven:defaultPlayers",
      convert: "json",
    },
    database: {
      key: "twentysevenGameMeta",
      get: (data) => data?.defaultPlayers,
    },
    merge: "replace",
  } satisfies AnyLayeredDef<string[], "twentysevenGameMeta">,
  realWinsPlayers: {
    fallback: () => [] as string[],
    browser: {
      key: "twentyseven:requiredPlayers",
      convert: "json",
    },
    database: {
      key: "twentysevenGameMeta",
      get: (data) => data?.requiredPlayers,
    },
    merge: "replace",
  } satisfies AnyLayeredDef<string[], "twentysevenGameMeta">,
  showHistoryOnSubmit: {
    fallback: true as boolean,
    browser: {
      key: "twentyseven:showHistoryOnSubmit",
      convert: "json",
    },
    merge: "replace",
  },
} as const);
