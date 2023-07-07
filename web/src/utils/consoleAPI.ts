import { ClientPreferences, DisplayState, rawInterface, usePrefs } from "@/store/clientPreferences";

export const bitFieldGetter = (rawGetter: () => number, mask: number) =>
  () => (rawGetter() & mask) !== 0;
export const bitFieldSetter = (
  rawGetter: () => number,
  rawSetter: (value: number) => void,
  flag: number,
) =>(enabled: boolean) => {
  const state = rawGetter();
  const val = (state & flag) !== 0;
  if (val !== enabled) {
    rawSetter(state ^ flag);
  }
};
export const bitFieldProp = (rawGetter: () => number, rawSetter: (value: number) => void) =>
  (flag: number) => ({
    get: bitFieldGetter(rawGetter, flag),
    set: bitFieldSetter(rawGetter, rawSetter, flag),
  });

declare global {
  interface Window {
    enablePrefs: boolean;
    preferences: undefined | {
      getRaw: typeof rawInterface.getValue;
      setRaw: typeof rawInterface.setValue;
      useFunNames: boolean;
      subscribePlayers: boolean;
      guests: {
        flags: typeof DisplayState;
        displayGames: boolean;
        displaySummary: boolean;
        displaySelection: boolean;
      };
      twentyseven: {
        displayIngameHits: boolean;
        ingameSummary: ClientPreferences["ingameSummary27"];
      };
    };
  }
}

const displayFlagProp: (flag: number) => PropertyDescriptor = bitFieldProp(
  () => usePrefs().guestDisplay,
  val => usePrefs().guestDisplay = val,
);

// function prefsProp<K extends keyof ReturnType<typeof usePrefs>>(key: K): PropertyDescriptor {
//   const preferences = usePrefs();
//   return {
//     get: () => preferences[key],
//     set: (value: ReturnType<typeof usePrefs>[K]) => preferences[key] = value,
//   };
// }

export const initialiseAPI = (): void => {
  const preferences = usePrefs();
  Object.defineProperty(window, "enablePrefs", {
    get() {
      return this.preferences !== undefined;
    },
    set(enabled) {
      window.preferences = enabled
        ? Object.create(
          {
            getRaw: rawInterface.getValue,
            setRaw: rawInterface.setValue,
            guests: Object.create({ flags: DisplayState }, {
              displayGames: displayFlagProp(DisplayState.GAMES),
              displaySummary: displayFlagProp(DisplayState.SUMMARY),
              displaySelection: displayFlagProp(DisplayState.SELECTION),
            }),
            twentyseven: Object.create({}, {
              ingameSummary: {
                get: () => preferences.twentyseven.ingameSummary,
                set(val) {
                  preferences.twentyseven.ingameSummary = val;
                },
              },
              displayIngameHits: {
                get: () => preferences.twentyseven.ingameHits,
                set(val) {
                  preferences.twentyseven.ingameHits = val;
                },
              },
              roundDisplay: {
                get: () => preferences.twentyseven.roundDisplay,
                set(val) {
                  preferences.twentyseven.roundDisplay = val;
                },
              },
            }),
          }, {
            useFunNames: {
              get: () => preferences.useFunNames,
              set(val) {
                preferences.useFunNames = val;
              },
            },
            // subscribePlayers: {
            //   get: () => preferences.,
            //   set(val) {
            //     preferences.twentyseven.ingameSummary = val;
            //   },
            // },
          },
        )
        : undefined;
      console.log("Client preferences console api", enabled ? "enabled" : "disabled");
    },
  });

  if (process.env?.NODE_ENV === "development") {
    window.enablePrefs = true;
  }
};
export default initialiseAPI;
