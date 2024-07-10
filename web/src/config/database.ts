import {
  type DocumentData,
  DocumentReference,
  type Unsubscribe,
  DocumentSnapshot,
  onSnapshot,
  getDoc,
} from "firebase/firestore";
import { type Ref, ref, computed } from "vue";

export interface DatabaseConfig extends Record<string, DBData<any, any> | undefined> {}

type DbDataDef<K extends keyof DatabaseConfig> = {
  key: K;
  dbRef: NonNullable<DatabaseConfig[K]>["dbRef"];
  /**
   * "subscribe" => attach a listener to always have the latest values.
   * "immediate" => get the data from the database immediately.
   * "lazy"      => `update` must be manually called to retrieve the data.
   */
  load: "subscribe" | "immediate" | "lazy";
  // fromDb?: (snapshot: DocumentSnapshot) => DatabaseConfig[K] extends DBData<infer V, any> ? V : never;
  // updateDb?: (val: DatabaseConfig[K] extends DBData<infer V, any> ? V : never) => void;
};
export type DBData<AppModelType = DocumentData, DbModelType extends DocumentData = DocumentData> = {
  key: keyof DatabaseConfig;
  dbRef: DocumentReference<AppModelType, DbModelType>;
  /**
   * Unsubscribe to any future updates.
   * Will have no effect if the data is not subscribed.
   */
  unsubscribe: Unsubscribe | null;
  /**
   * Force an update of the data from the database.
   * Will have no effect if the data is subscribed.
   */
  update: () => Promise<void>;
  /**
   * Value when defined,
   * `null` when still waiting for data
   * `undefined` when missing from database
   */
  ref: Ref<AppModelType | null | undefined>;
};

export type AppModelTypeFor<K extends keyof DatabaseConfig> = DatabaseConfig[K] extends
  | DBData<infer T, any>
  | undefined
  ? T
  : unknown;

const DB_DATA: DatabaseConfig = {};

const NOOP_PROMISE = async () => {};
export const initDBData = <K extends keyof DatabaseConfig>(
  def: DbDataDef<K>,
): NonNullable<DatabaseConfig[K]> => {
  console.debug("Initialising DBData:", def);
  if (DB_DATA[def.key] !== undefined) {
    console.error("Defined database config multiple times!");
    return DB_DATA[def.key]!;
  }
  type DbTypes =
    DatabaseConfig[K] extends DBData<infer AppModelType, infer DbModelType>
      ? [AppModelType, DbModelType]
      : [DocumentData, DocumentData];
  const r: Ref<DbTypes[0] | null | undefined> = ref(null);
  const updateRef = (snap: DocumentSnapshot<DbTypes[0], DbTypes[1]>) => {
    if (!snap.exists()) {
      console.log("Attempted to retrieve non existant config from database");
    }
    r.value = snap.data();
  };
  let unsubscribe: Unsubscribe | null;
  let update: () => Promise<void>;
  if (def.load === "subscribe") {
    unsubscribe = onSnapshot<DbTypes[0], DbTypes[1]>(def.dbRef, updateRef);
    update = NOOP_PROMISE;
  } else {
    unsubscribe = null;
    let updating: Promise<void> | null = null;
    update = async () => {
      if (updating) {
        await updating;
        updating = null;
      } else {
        updating = getDoc<DbTypes[0], DbTypes[1]>(def.dbRef).then(updateRef);
        return updating;
      }
    };
    if (def.load === "immediate") {
      update();
    }
  }
  const data = {
    key: def.key,
    dbRef: def.dbRef,
    unsubscribe,
    update,
    ref: computed({
      get: () => r.value,
      set: (val) => {
        console.error(
          `Setting database values not yet implemented! No operation performed.\n"${def.key}" =`,
          val,
        );
        //TODO: implement database saving of config values
      },
    }),
  };
  DB_DATA[def.key] = data;
  return data;
};

export const getDBData = <K extends keyof DatabaseConfig>(key: K): DatabaseConfig[K] =>
  DB_DATA[key];
