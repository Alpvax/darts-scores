import type { TurnStats } from "@/gameUtils/roundDeclaration";

type FocusResult =
  | {
      status: "success";
    }
  | {
      status: "outOfRange";
      excess: number;
    };

type TurnDataChange<Value, TurnStats extends {}> = {
  value: Value;
  stats: TurnStats;
  deltaScore: number;
};

export type TurnData<Value, TurnStats extends {}> = {
  playerId: string;
  roundKey: number | string;
  value: Value;
  stats: TurnStats;
  deltaScore: number;
  endScore: number;
};

export type RoundDef<
  Value,
  TurnStats extends {},
  TeamStats extends {},
  RoundKey extends string | number,
> = {
  key: RoundKey;
  label: string;
  focusOn: (playerIndex: number) => FocusResult;
  calculateTurnData: (
    value: Value | undefined,
    startScore: number,
    playerId: string,
  ) => TurnDataChange<Value, TurnStats>;
  makeTeamStats: (playerTurns: TurnData<Value, TurnStats>[]) => TeamStats;
};

export interface Round<
  Value,
  TurnStats extends {},
  TeamStats extends {},
  RoundKey extends string | number,
> extends RoundDef<Value, TurnStats, TeamStats, RoundKey> {
  makeTurnData: (value: Value, startScore: number, playerId: string) => TurnData<Value, TurnStats>;
}
export type AsRound<Def extends RoundDef<any, any, any, any>> =
  Def extends RoundDef<infer Value, infer TurnStats, infer TeamStats, infer RoundKey>
    ? Round<Value, TurnStats, TeamStats, RoundKey>
    : never;

export type TurnDataFor<T extends RoundDef<any, any, any, any>> =
  T extends RoundDef<infer Value, infer TurnStats, any, any> ? TurnData<Value, TurnStats> : never;
export type OptionalTurnDataFor<T extends RoundDef<any, any, any, any>> =
  T extends RoundDef<infer Value, infer TurnStats, any, any>
    ? TurnData<Value | undefined, TurnStats>
    : never;

// const makeTurnStatsFactory = <Value, TurnStats extends {}>(roundDef: RoundDef<Value, TurnStats, any>) =>
// (value: Value, startScore: number, playerId: string): TurnData<Value, TurnStats> => {
//   const change = roundDef.calculateTurnData(value, startScore, playerId);
//   return {
//     playerId,
//     roundDef.
//   };
// }

// class Round<Value, TurnStats extends {}, TeamStats extends {}> {
//   constructor(readonly roundDef: RoundDef<Value, TurnStats, TeamStats>) {}
//   get label() {
//     return this.roundDef.label;
//   }
//   makeTurnStats(value: Value, startScore: number, playerId: string) {

//   }
// }
