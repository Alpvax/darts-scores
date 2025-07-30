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
