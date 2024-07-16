import { StorageLocation, makeConfigComposable } from ".";

export const usePlayerConfig = makeConfigComposable("playerConfig", {
  allowGuestPlayers: {
    fallback: false,
    location: StorageLocation.Local,
    merge: "replace",
    parse: "json",
  },
  defaultOrder: {
    fallback: {
      y5IM9Fi0VhqwZ6gAjil6: 0,
      "6LuRdib3wFxhbcjjh0au": 1,
      Gt8I7XPbPWiQ92FGsTtR: 2,
      jcfFkGCY81brr8agA3g3: 3,
      jpBEiBzn9QTVN0C6Hn1m: 4,
      k7GNyCogBy79JE4qhvAj: 5,
      AlEJO3R0J4gQGRjtPFX2: 6,
      SdTEJu1U6SRQWy17SFhI: 26, //Oz
      EKGT81fQhIrRKN612KN0: 25, //DF
      HAWsKLvWF63KPvHerbHS: 26, //J
      iN8Z0QkFisg7jBjqhCjc: 27, //AF
      nJuOYSdzMOnKeXjtnFuJ: 999, //Dir
      igJDSkjA2OgSi7uBtKs2: 999, //VMT_C
      "65wMPJtleXsbMS4I69vv": 999, //VMT_A
      jvKnY0PqPiaufMJn0fF7: 999, //A
      IydxZDS72v1RtiZzAiV6: 999, //DD
    } as Record<string, number>,
    location: StorageLocation.Local,
    merge: (partial, fallback) => {
      const res = structuredClone(fallback);
      const local = partial.get(StorageLocation.Local) as Record<string, number> | undefined;
      const session = partial.get(StorageLocation.Local) as Record<string, number> | undefined;
      if (local) {
        for (const [pid, ord] of Object.entries(local)) {
          res[pid] = ord;
        }
      }
      if (session) {
        for (const [pid, ord] of Object.entries(session)) {
          res[pid] = ord;
        }
      }
      return res as Record<string, number>;
    },
    parse: "json",
  },
});
