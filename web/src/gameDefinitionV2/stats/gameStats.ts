import type { FixedLengthArray } from "@/utils/types";
import type { ArrayGameDef, ObjectGameDef } from "..";
import type { TurnMeta } from "../rounds";

// type ArrayRoundStats<PlayerState, RoundStats, FixedRoundCount extends number = number> = {
//   rounds:
// }

type PlayerStatsFactory<PlayerState, RoundStats, GameStats> = (
  state: PlayerState,
  rounds: RoundStats,
) => GameStats;

type ArrayGameStatsFactory<
  PlayerState,
  RoundStats,
  GameStats,
  FixedRoundCount extends number,
> = PlayerStatsFactory<PlayerState, FixedLengthArray<RoundStats, FixedRoundCount>, GameStats>;
type ObjGameStatsFactory<PlayerState, RoundStats extends {}, GameStats> = PlayerStatsFactory<
  PlayerState,
  RoundStats,
  GameStats
>;

export const playerGameStatsFactoryFor: {
  <
    GameId extends string,
    PlayerState,
    V,
    RoundStats,
    UntakenVal extends V | undefined,
    Len extends number = number,
  >(
    gameDef: ArrayGameDef<GameId, PlayerState, V, RoundStats, UntakenVal, Len>,
  ): void;
  <
    GameId extends string,
    PlayerState,
    Rounds extends {
      [k: string | number | symbol]: TurnMeta<any, any, any>;
    },
  >(
    gameDef: ObjectGameDef<GameId, PlayerState, Rounds>,
  ): void;
} = (...args: any[]) => undefined as any;
