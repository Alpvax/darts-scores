import { defineStore } from "pinia";
import { Ref, WritableComputedRef, computed, reactive, ref, watch } from "vue";
import { z } from "zod";
import { summaryFields } from "@/games/27";
import { bitFieldProp } from "../utils/consoleAPI";


export namespace DisplayState {
  export const NONE = 0;
  export const GAMES = 1;
  export const SUMMARY = 2;
  export const SELECTION = 4;
};

export const SUMMARY_INGAME_OPTIONS = {
  none: "None",
  current: "Current player",
  playing: "Players in the current game",
  common: "Non guest players",
  all: "All players",
};

const schemaSummary27 = z.object({
  players: z.enum(
    Object.keys(SUMMARY_INGAME_OPTIONS) as unknown as (readonly [string, ...string[]]),
  ).default("none"),
  display: z.object({
    rounds: z.boolean().default(true),
    ...summaryFields.reduce((obj, { slotId }) => {
      obj[slotId] = z.boolean().default(true);
      return obj;
    }, {} as { [k: string]: z.ZodDefault<z.ZodBoolean> }),
  }).default({}),
});

const prefsSchema = z.object({
  displayGuests: z.number().int().min(0).max(7).default(DisplayState.GAMES | DisplayState.SUMMARY),
  displayDisabledPlayerGames: z.boolean().default(true),
  useFunNames: z.boolean().default(true),
  subscribePlayers: z.boolean().default(false),
  debugLoadedPlayers: z.boolean().default(process.env?.NODE_ENV === "development"),
  saveGamesInProgress: z.boolean().default(true),
  roundDisplay27: z.enum(["total", "cliffs", "dd", "games"])
    .default("games"),
  ingameHits27: z.boolean().default(true),
  ingameSummary27: schemaSummary27.default(schemaSummary27.parse({})),
});

export type ClientPreferences = z.infer<typeof prefsSchema>;

// const DEFAULT_PREFS: ClientPreferences = Object.freeze(prefsSchema.default());

function getValue<K extends keyof ClientPreferences>(key: K): ClientPreferences[K] {
  const val = localStorage.getItem("darts." + key);
  console.debug(
    `Getting value for "${key}" = "${val}";\n\tResult:`,
    prefsSchema.shape[key].parse(val !== null ? JSON.parse(val) : undefined),
  );
  return prefsSchema.shape[key]
    .parse(val !== null ? JSON.parse(val) : undefined) as ClientPreferences[K];
}
function setValue<K extends keyof ClientPreferences>(key: K, value: ClientPreferences[K]): void {
  console.debug(`Setting value for "${key}" = "${JSON.stringify(value)}";\n\tRaw value:`, value);
  localStorage.setItem("darts." + key, JSON.stringify(value));
}

export const rawInterface = {
  getValue, setValue,
};

const displayFlagRef = (guestDisplay: Ref<number>, flag: number):
WritableComputedRef<boolean> => computed(bitFieldProp(
  () => guestDisplay.value,
  val => guestDisplay.value = val,
)(flag));
//   {
//   get: displayFlagGetter(flag),
//   set: displayFlagSetter(flag),
// });
function prefsObjRef<T extends Record<string, keyof ClientPreferences>>(props: T): {
  [K in keyof T]: ClientPreferences[T[K]];
} {
  return reactive(Object.create({}, Object.entries(props).reduce((obj, [p, key]) => {
    obj[p] = {
      get: () => getValue(key),
      set: value => setValue(key, value),
    };
    return obj;
  }, {} as PropertyDescriptorMap)));
}
function prefsRef<K extends keyof ClientPreferences>(key: K): Ref<ClientPreferences[K]> {
  const r = ref(getValue(key)) as Ref<ClientPreferences[K]>;
  watch(r, val => setValue(key, val));
  // return computed({
  //   get: () => getValue(key),
  //   set: (value: ClientPreferences[K]) => setValue(key, value),
  // });
  return r;
}

export const usePrefs = defineStore("preferences", () => {
  const guestDisplay = prefsRef("displayGuests");
  return {
    /** Whether to display results for guests on the history */
    displayGuestGames: displayFlagRef(guestDisplay, DisplayState.GAMES),
    /** Whether to display stats for guests in the summary */
    displayGuestSummary: displayFlagRef(guestDisplay, DisplayState.SUMMARY),
    /** Whether to allow selecting guests when starting a game */
    displayGuestSelection: displayFlagRef(guestDisplay, DisplayState.SELECTION),
    guestDisplay,
    displayDisabledPlayerGames: prefsRef("displayDisabledPlayerGames"),
    useFunNames: prefsRef("useFunNames"),
    saveGamesInProgress: prefsRef("saveGamesInProgress"),
    twentyseven: prefsObjRef({
      ingameHits: "ingameHits27",
      ingameSummary: "ingameSummary27",
      roundDisplay: "roundDisplay27",
    }),
    debug: {
      debugLoadedPlayers: getValue("debugLoadedPlayers"),
    },
  };
});


