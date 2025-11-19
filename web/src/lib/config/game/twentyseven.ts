import type { BrowserStorage, BrowserStorageState } from "$config/impl/browserStorage";
import { layeredConfigBuilder } from "../impl";

export type SideDisplay = "none" | "summary" | "entries" | "combined";
export type RoundsField27 = "cliffs" | "doubleDoubles" | "total" | "nonZero";

type PlayerId = string;

declare module "$config/impl/browserStorage" {
  interface BrowserStorage {
    twentyseven: BrowserStorageState<{
      defaultView: "history" | "new" | "view";
      sideDisplay: SideDisplay;
      defaultPlayers: PlayerId[];
      realWinsPlayers: PlayerId[];
      showHistoryOnSubmit: boolean;
      summaryRoundsField: RoundsField27;
    }>
  }
}
      
//     sideDisplay: {
//     fallback: "summary",
//     browser: {
//       key: "twentyseven:sideDisplay",
//       convert: {
//         toString: (v) => v,
//         fromString: (s) =>
//           ["none", "summary", "entries", "combined"].includes(s) ? (s as SideDisplay) : undefined,
//       },
//     },
//     merge: "replace",
//   } satisfies AnyLayeredDef<SideDisplay>,
//   defaultPlayers: {
//     fallback: () => {
//       const res = [
//         "y5IM9Fi0VhqwZ6gAjil6",
//         "6LuRdib3wFxhbcjjh0au",
//         "Gt8I7XPbPWiQ92FGsTtR",
//         "jcfFkGCY81brr8agA3g3",
//         "jpBEiBzn9QTVN0C6Hn1m",
//       ];
//       // Player doesn't play on Fridays
//       if (new Date().getDay() !== 5) {
//         res.push("k7GNyCogBy79JE4qhvAj");
//       }
//       return res;
//     },
//     browser: {
//       key: "twentyseven:defaultPlayers",
//       convert: "json",
//     },
//     database: {
//       key: "twentysevenGameMeta",
//       get: (data) => data?.defaultPlayers,
//     },
//     merge: "replace",
//   } satisfies AnyLayeredDef<string[], "twentysevenGameMeta">,
//   realWinsPlayers: {
//     fallback: () => [] as string[],
//     browser: {
//       key: "twentyseven:requiredPlayers",
//       convert: "json",
//     },
//     database: {
//       key: "twentysevenGameMeta",
//       get: (data) => data?.requiredPlayers,
//     },
//     merge: "replace",
//   } satisfies AnyLayeredDef<string[], "twentysevenGameMeta">,
//   showHistoryOnSubmit: {
//     fallback: true as boolean,
//     browser: {
//       key: "twentyseven:showHistoryOnSubmit",
//       convert: "json",
//     },
//     merge: "replace",
//   },
//   summaryRoundsField: {
//     fallback: "total" as RoundsField27,
//     browser: {
//       key: "twentyseven:summaryRoundsField",
//       convert: "rawString",
//     },
//     merge: "replace",
//   } satisfies AnyLayeredDef<RoundsField27>,
// } as const);
//     }>;
//   }
// }


export const config = layeredConfigBuilder<BrowserStorage["twentyseven"]>(({volatile, initBrowserLayers}) => [
  volatile(),
  ...initBrowserLayers("twentyseven", {
    defaultView: {
      fallback: "history",
      validate: s => ["history", "new", "view"].includes(s),
    },
    sideDisplay: {
      fallback: "summary",
      validate: s => ["none", "summary", "entries", "combined"].includes(s)
    },
    defaultPlayers: {
      kind: "json",
      fallback: () => [
        "y5IM9Fi0VhqwZ6gAjil6",
        "6LuRdib3wFxhbcjjh0au",
        "Gt8I7XPbPWiQ92FGsTtR",
        "jcfFkGCY81brr8agA3g3",
        "jpBEiBzn9QTVN0C6Hn1m",
      ],
    },
    realWinsPlayers: {
      kind: "json",
      fallback: () => [
        "y5IM9Fi0VhqwZ6gAjil6",
        "6LuRdib3wFxhbcjjh0au",
        "Gt8I7XPbPWiQ92FGsTtR",
        "jcfFkGCY81brr8agA3g3",
        "jpBEiBzn9QTVN0C6Hn1m",
      ],
    },
    showHistoryOnSubmit: {
      kind: "json",
      fallback: true,
    },
    summaryRoundsField: {
      fallback: "total",
      validate: s => ["cliffs", "doubleDoubles", "total", "nonZero"].includes(s)
    },
  }),
]);
