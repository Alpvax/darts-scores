import {
  CollectionReference, DocumentData, DocumentReference, DocumentSnapshot, Firestore, FirestoreError,
  Query, QueryConstraint, QueryDocumentSnapshot, SnapshotOptions, Unsubscribe,
  WithFieldValue, addDoc, collection, doc, getDoc, getDocs, getFirestore, onSnapshot, query,
} from "firebase/firestore";

/**
 * @param GR The raw result from a game.
 * @param DB The result stored in the database
 * @param SR The result of a game, possibly including any calculated stats
 */
export interface GameResultConverter<GR, DB, SR> {
  /**
   * Convert the raw result of a game (scores, number of hits etc.) to the
   * data object to be stored in the database
   */
  toDB: (result: GR) => DB;
  /**
   * Convert the result data object from the database to the extended summary of a game.
   * For example, stats/scores can be calculated from the raw stored hits.
   */
  fromDB: (databaseResult: DB) => SR;
}

export class GameType<GR, DB extends DocumentData, SR> {
  private db: Firestore | null = null;
  private dbPath: string;
  private dbRef: CollectionReference<DB, DB> | null = null;
  constructor(
    readonly key: string,
    readonly convertor: GameResultConverter<GR, DB, SR>,
  ) {
    if (key.length < 1) {
      throw new Error("GameType key must not be empty!");
    }
    this.dbPath = `game/${this.key}/games`;
  }

  get databaseRef(): CollectionReference {
    this.initRef();
    return this.dbRef!;
  }
  set databaseRef(ref: string | CollectionReference<DB, DB> | Firestore) {
    if (typeof ref === "string") {
      if (this.dbRef === null || this.dbPath !== ref) {
        this.dbPath = ref;
        this.dbRef = null;
      }
    } else if (ref instanceof CollectionReference) {
      this.db = ref.firestore;
      this.dbPath = ref.path;
      this.dbRef = ref;
    } else {
      this.db = ref;
      this.dbRef = null;
    }
  }

  private initRef(reInit = false): void {
    if (this.db === null) {
      this.db = getFirestore();
    }
    if (reInit || this.dbRef === null) {
      this.dbRef = collection(this.db!, this.dbPath).withConverter(this.dbRef?.converter ?? {
        toFirestore(result: WithFieldValue<DB>): DB {
          return result as DB;
        },
        fromFirestore(snapshot: QueryDocumentSnapshot, options: SnapshotOptions): DB {
          return snapshot.data(options) as DB;
        },
      });
    }
  }

  save(rawResult: GR): Promise<DocumentReference<DB, DB>> {
    this.initRef();
    return addDoc(this.dbRef!, this.convertor.toDB(rawResult));
  }
  async getResult(id: string): Promise<SR | undefined> {
    const data = (await getDoc(doc(this.dbRef!, id))).data();
    return data ? this.convertor.fromDB(data) : undefined;
  }
  newQuery(...constraints: QueryConstraint[]): Query<DB, DB> {
    this.initRef();
    return query(this.dbRef!, ...constraints);
  }
  async getResults(query: Query<DB, DB>): Promise<[string, SR][]>;
  async getResults(...queryConstraints: QueryConstraint[]): Promise<[string, SR][]>;
  async getResults(
    query: Query<DB, DB> | QueryConstraint,
    ...constraints: QueryConstraint[]
  ): Promise<[string, SR][]> {
    const docs = (await getDocs(query instanceof Query
      ? query
      : this.newQuery(query, ...constraints))).docs;
    return docs.map(snap => [snap.id, this.convertor.fromDB(snap.data()!)]);
  }
  /** Callback will not be called if the document does not exist */
  subscribeToResult(
    id: string,
    callback: (result: SR, snapshot: DocumentSnapshot<DB, DB>) => void,
    error?: (error: FirestoreError) => void,
  ): Unsubscribe {
    this.initRef();
    return onSnapshot(doc(this.dbRef!, id), (doc) => {
      if (doc.exists()) {
        callback(this.convertor.fromDB(doc.data()), doc);
      }
    }, error);
  }
  subscribeToQuery(
    query: Query<DB, DB>,
    callback: (result: SR, snapshot: QueryDocumentSnapshot<DB, DB>) => void,
    error?: (error: FirestoreError) => void,
  ): Unsubscribe {
    this.initRef();
    return onSnapshot(
      query,
      snap => snap.forEach(doc => callback(this.convertor.fromDB(doc.data()), doc)),
      error,
    );
  }
  subscribeTo(...args: [
    ...QueryConstraint[],
    (result: SR, snapshot: QueryDocumentSnapshot<DB, DB>) => void,
    (error: FirestoreError) => void,
  ]): Unsubscribe {
    const cbIdx = args.findLastIndex(arg => arg instanceof QueryConstraint) + 1;
    const constraints = args.slice(0, cbIdx) as QueryConstraint[];
    const callback = args[cbIdx] as (result: SR, snapshot: QueryDocumentSnapshot<DB, DB>) => void;
    this.initRef();
    return onSnapshot(
      this.newQuery(...constraints),
      snap => snap.forEach(doc => callback(this.convertor.fromDB(doc.data()), doc)),
      args.length > cbIdx + 1 ? args[cbIdx + 1] as ((error: FirestoreError) => void) : undefined,
    );
  }
}
