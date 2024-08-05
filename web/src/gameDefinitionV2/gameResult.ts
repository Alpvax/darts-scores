import type { FixedLengthArray } from "@/utils/types";

export type PlayerGameData<Turns, Extra extends {} = {}> = {
  playerId: string;
  // complete: boolean;
  turns: Turns;
  displayName?: string;
  // handicap?: Handicap<Turns>
} & Extra;

export type GameResult<PData extends PlayerGameData<any, any>, PlayerId extends string = string> = {
  date: Date;
  playerOrder: PlayerId[];
  tiebreak?: {
    players: PlayerId[];
    type: string;
    winner: PlayerId;
  };
  results: {
    [K in PlayerId]: PData;
  };
};

export type ArrayGameStats<Turns extends any[], TurnStats, GameStats extends {}> = GameStats & {
  rounds: { [K in keyof Turns]: TurnStats };
};

export type GameStatsFactory<GR extends GameResult<any, any>, Stats> =
  GR extends GameResult<PlayerGameData<infer Turns, infer Extra>, any>
    ? (turns: Turns, extra: Extra) => Stats
    : never;

type Test27Plyr = PlayerGameData<
  FixedLengthArray<0 | 1 | 2 | 3, 20>,
  {
    jesus?: boolean;
  }
>;
type Test27 = GameResult<Test27Plyr>;
type Stats27 = ArrayGameStats<
  Test27Plyr["turns"],
  {
    cliff: boolean;
    dd: boolean;
    hits: 0 | 1 | 2 | 3;
  },
  {
    fatNicks: boolean;
    dream: boolean;
    allPos: boolean;
    hans: number;
    goblins: boolean;
    piranhas: boolean;
    jesus: boolean;
  }
>;

// const statsFactory27: GameStatsFactory<Test27, Stats27> = (turns, extra) => ({
//   rounds:
// })

type TestBEPlyr = PlayerGameData<(0 | 1 | 2 | 3 | 5 | 6)[]>;
type TestBE = GameResult<TestBEPlyr>;
