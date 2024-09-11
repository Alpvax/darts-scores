// import { writeLocalPrefs } from "@/stores/persistant/zodStore";

import { useBasicConfig } from "@/config/baseConfigLayered";
import { makeConsoleApi, type LayeredConfigAPIFor } from "@/config/layeredConfig";
// import { use27Config } from "@/game/27/config";

declare global {
  interface Window {
    enablePrefs: boolean;
    // writeLocalPrefs: undefined | typeof writeLocalPrefs;
    preferences:
      | undefined
      | {
          useFunNames: boolean;
          // subscribePlayers: boolean;
          // guests: {
          //   displayGames: boolean;
          //   displaySummary: boolean;
          //   displaySelection: boolean;
          // };
          baseConfig: LayeredConfigAPIFor<typeof useBasicConfig>;
          // config27: LayeredConfigAPIFor<typeof use27Config>;
        };
  }
}

export const initialiseAPI = (): void => {
  // const preferences = usePrefs();
  Object.defineProperty(window, "enablePrefs", {
    get() {
      return this.preferences !== undefined;
    },
    set(enabled) {
      if (enabled) {
        // (window.writeLocalPrefs = writeLocalPrefs),
        window.preferences = Object.create(
          {
            baseConfig: makeConsoleApi(useBasicConfig),
            // config27: makeConsoleApi(use27Config),
            // guests: Object.create({ flags: DisplayState }, {
            //   displayGames: displayFlagProp(DisplayState.GAMES),
            //   displaySummary: displayFlagProp(DisplayState.SUMMARY),
            //   displaySelection: displayFlagProp(DisplayState.SELECTION),
            // }),
          },
          {
            useFunNames: {
              get: () => true,
              set: (_val) => console.log("UNIMPLEMENTED!"),
              // get: () => preferences.useFunNames,
              // set(val) {
              //   preferences.useFunNames = val;
              // },
            },
            // saveGamesInProgress: {
            //   get: () => preferences.saveGamesInProgress,
            //   set(val) {
            //     preferences.saveGamesInProgress = val;
            //   },
            // },
            // displayPlayerPosition: {
            //   get: () => preferences.displayPlayerPosition,
            //   set(val) {
            //     preferences.displayPlayerPosition = val;
            //   },
            // },
            // subscribePlayers: {
            //   get: () => preferences.,
            //   set(val) {
            //     preferences.twentyseven.ingameSummary = val;
            //   },
            // },
          },
        );
      } else {
        // window.writeLocalPrefs = undefined;
        window.preferences = undefined;
      }
      console.log("Client preferences console api", enabled ? "enabled" : "disabled");
    },
  });

  if (import.meta.env.DEV) {
    window.enablePrefs = true;
  }
};
export default initialiseAPI;
