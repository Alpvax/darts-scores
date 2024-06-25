import { StorageLocation, makeConfigComposable } from ".";

export const usePlayerConfig = makeConfigComposable("playerConfig", {
  allowGuestPlayers: {
    fallback: false,
    location: StorageLocation.Local,
    merge: "replace",
    parse: "json",
  },
});
