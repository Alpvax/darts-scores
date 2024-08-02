import type { VNodeChild } from "vue";

export type SummaryFieldDef<T, PlayerGameStats extends {}> = {
  label: string;
  value: (playerData: PlayerGameStats) => T;
  cmp: (a: T, b: T) => number;
  display: (value: T, playerData: PlayerGameStats) => VNodeChild;
  /** Tooltip / hover element */
  extended?: (value: T, playerData: PlayerGameStats) => VNodeChild;
  //TODO: implement click-filter
};
