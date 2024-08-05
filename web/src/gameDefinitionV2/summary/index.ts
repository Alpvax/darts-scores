import type { VNodeChild } from "vue";
import type { Position } from "..";
import type { PlayerDataFull, PlayerTurnData, TurnKey, TurnStatsType } from "../types";
import type { GameDefinition } from "../definition";

export type SummaryFieldDef<T, PlayerGameStats extends {}> = {
  label: string;
  value: (playerData: PlayerGameStats) => T;
  cmp: (a: T, b: T) => number;
  display: (value: T, playerData: PlayerGameStats) => VNodeChild;
  /** Tooltip / hover element */
  extended?: (value: T, playerData: PlayerGameStats) => VNodeChild;
  //TODO: implement click-filter
};

export type StatsTypeForGame<
  G extends GameDefinition<any, any, any, any, any, any, any, any, any>,
> =
  G extends GameDefinition<
    any,
    any,
    any,
    infer PlayerState,
    any,
    infer TurnType,
    infer SoloStats,
    infer FullPlayerStats,
    infer PlayerId
  >
    ? StatsTypeFor<
        TurnType,
        PlayerDataFull<PlayerState, TurnType, SoloStats, FullPlayerStats, PlayerId>
      >
    : never;
export type StatsTypeFor<
  TurnType,
  PlayerData extends {
    playerId: PlayerId;
    completed: boolean;
    turns: PlayerTurnData<TurnType>;
    score: number;
    displayName?: string;
    // handicap?: Handicap<Turns>
    position: Position;
  },
  PlayerId extends string = string,
> = {
  [K in TurnKey<TurnType> & string as `round.${K}`]: K extends keyof TurnStatsType<TurnType>
    ? TurnStatsType<TurnType>[K]
    : never;
} & {
  [K in TurnKey<TurnType> & number as `round.${K}`]: K extends keyof TurnStatsType<TurnType>
    ? TurnStatsType<TurnType>[K]
    : never;
} & Omit<
    PlayerData,
    "playerId" | "completed" | "turns" | "displayName" /*| "handicap"*/ | "position"
  >;
