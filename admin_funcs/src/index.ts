import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore"

const app = initializeApp({
  credential: cert("./serviceAccount.json"),
  projectId: "alpvax-darts-scores",
  storageBucket: "alpvax-darts-scores.appspot.com",
})


const db = getFirestore();
db.settings({ ignoreUndefinedProperties: true });

type DBResultv1 = {
  dataVersion: 1;
  date: string;
  winner:
    | string
    | {
        tie: string[];
        tiebreak: {
          //TODO: implement tiebreak
          winner?: string;
          // [k: string | number]: any;
        };
      };
  game: {
    [player: string]: {
      rounds: number[];
      cliffs: number;
      score: number;
      allPositive: boolean;
      jesus?: boolean;
      fnAmnesty?: boolean;
      handicap?: number;
    };
  };
};
type DBResultv2 = {
  dataVersion: 2;
  date: Timestamp;
  /** Player ids in order of play */
  players: string[];
  winner:
    | string
    | {
        tie: string[];
        tiebreak: {
          type: string;
          winner: string;
        };
      };
  game: {
    [player: string]: {
      rounds: number[];
      score: number;
      jesus?: boolean;
      handicap?: number;
      displayName?: string;
    };
  };
};

const defaultOrder: Record<string, number> = {
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
}

const games27 = db.collection("game/twentyseven/games");
games27
  .where("dataVersion", "==", 1)
  .get()
  .then(querySnapshot => {
    querySnapshot.docs.forEach(doc => {
      const data = doc.data() as DBResultv1
      const v2: DBResultv2 = {
        dataVersion: 2,
        date: Timestamp.fromDate(new Date(data.date)),
        players: Object.keys(data.game).toSorted((a, b) => (defaultOrder[a] ?? 999) - (defaultOrder[b] ?? 999)),
        winner: typeof data.winner === "string"
          ? data.winner
          : {
            tie: data.winner.tie,
            tiebreak: {
              type: "UNKNOWN",
              winner: data.winner.tiebreak.winner ?? "",
            }
          },
        game: (Object.entries(data.game) as [string, DBResultv1["game"][string]][]).reduce(
          (acc, [key, { rounds, score, jesus, handicap }]) => Object.assign(acc, { [key]: {
            rounds,
            score,
            jesus,
            handicap,
          }}),
          {} as any,
        ),
      }
      console.log("Converting:", doc.id, games27.doc(doc.id).set(v2));
    });
  });