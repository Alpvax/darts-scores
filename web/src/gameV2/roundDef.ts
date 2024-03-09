import type { MoveFocus } from "@/utils";
import type { Ref, VNodeChild } from "vue";

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

export type TurnData<Value, TurnStats extends {}, RoundKey extends string | number> = {
  playerId: string;
  roundKey: RoundKey;
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
  /** The html to display.
   * @param value is a ref that can be used as a v-model value for the round input. Setting it will automatically move the focus to the next unentered input
   * @param extra is a combination of the TurnData (except for the value) and:
   *  `editable`: whether the rendered cell should allow editing the value, used to conditionally render input elements
   *  `focus`: a {@link MoveFocus} object to allow changing focus to different turns
   */
  display: (
  value: Ref<Value | undefined>,
  extra: Omit<TurnData<Value, TurnStats, RoundKey>, "value"> & {
    editable: boolean;
    focus: MoveFocus;
  },
) => VNodeChild;
  calculateTurnData: (
    value: Value | undefined,
    startScore: number,
    playerId: string,
  ) => TurnDataChange<Value, TurnStats>;
  makeTeamStats: (playerTurns: TurnData<Value, TurnStats, RoundKey>[]) => TeamStats;
};

export interface Round<
  Value,
  TurnStats extends {},
  TeamStats extends {},
  RoundKey extends string | number,
> extends RoundDef<Value, TurnStats, TeamStats, RoundKey> {
  makeTurnData: (value: Value, startScore: number, playerId: string) => TurnData<Value, TurnStats, RoundKey>;
}
export type AsRound<Def extends RoundDef<any, any, any, any>> =
  Def extends RoundDef<infer Value, infer TurnStats, infer TeamStats, infer RoundKey>
    ? Round<Value, TurnStats, TeamStats, RoundKey>
    : never;

export type TurnDataFor<T extends RoundDef<any, any, any, any>> =
  T extends RoundDef<infer Value, infer TurnStats, any, infer RoundKey> ? TurnData<Value, TurnStats, RoundKey> : never;
export type OptionalTurnDataFor<T extends RoundDef<any, any, any, any>> =
  T extends RoundDef<infer Value, infer TurnStats, any, infer RoundKey>
    ? TurnData<Value | undefined, TurnStats, RoundKey>
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
