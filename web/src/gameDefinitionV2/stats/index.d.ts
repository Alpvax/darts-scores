import type { ValuesSubset } from "@/utils/types";
import type { CalculatedPlayerData } from "../gameData";

export type BoolStats<Stats> = ValuesSubset<boolean, Stats>;
export type NumericStats<Stats> = ValuesSubset<number, Stats>;

export type SoloGameStatsFactory<
  G /* extends ArrayGameDef<any, any, any, any, any, any> /*| ObjectGameDef<any, any, any>*/,
  SoloStats extends {},
  PlayerId extends string = string,
> =
  CalculatedPlayerData<G, PlayerId> extends infer PData
    ? {
        (playerData: PData): SoloStats;
      }
    : never;
