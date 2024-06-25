import { RowMetadata } from "@/utils/display";

export const summaryFields: RowMetadata[] = [
  {
    label: "Personal Best",
    slotId: "pb",
  },
  {
    label: "Personal Worst",
    slotId: "pw",
  },
  {
    label: "Average score",
    slotId: "mean",
  },
  {
    label: "Real Wins",
    slotId: "filteredW",
  },
  {
    label: "Total Wins",
    slotId: "wins",
  },
  {
    label: "Total games played",
    slotId: "gameCount",
  },
  {
    label: "Win rate",
    slotId: "winR",
  },
  {
    label: "Fat Nicks",
    slotId: "fn",
  },
  {
    label: "Cliffs",
    slotId: "cliff",
  },
  {
    label: "Cliff Rate",
    slotId: "cliffR",
  },
  {
    label: "Double Doubles",
    slotId: "dd",
  },
  {
    label: "Double Double Rate",
    slotId: "ddR",
  },
  {
    label: "Hans",
    slotId: "hans",
  },
  {
    label: "Goblins",
    slotId: "goblins",
  },
  {
    label: "Piranhas",
    slotId: "piranhas",
  },
  {
    label: "Jesus",
    slotId: "jesus",
  },
  {
    label: "All Positive",
    slotId: "ap",
  },
  {
    label: "Furthest Dream",
    slotId: "farDream",
  },
  {
    label: "Furthest Positive",
    slotId: "farPos",
  },
  {
    label: "Most Hits",
    slotId: "mostHits",
  },
  {
    label: "Least Hits",
    slotId: "leastHits",
  },
  {
    label: "Average Hits",
    slotId: "meanHits",
  },
];

export type PlayerGameResult27 = {
  rounds: number[];
  cliffs: number;
  score: number;
  allPositive: boolean;
  jesus?: boolean;
};
export type Result27 = {
  version: 1;
  date: string;
  winner: string | {
    tie: string[];
    tiebreak: { //TODO: implement tiebreak
      winner?: string;
      // [k: string | number]: any;
    };
  };
  game: {
    [player: string]: PlayerGameResult27;
  };
}
