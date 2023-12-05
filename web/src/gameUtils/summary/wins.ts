import type { SummaryEntryField, PlayerDataForStats } from ".";
import type { TurnData } from "../roundDeclaration";

type PlayerRequirement = "*" | string[] | { players: string[]; exact?: boolean };
export type PlayerRequirements = Record<string, PlayerRequirement>;

export class WinSummaryField<T extends TurnData<any, any>, Outputs extends PlayerRequirements>
  implements SummaryEntryField<T, WinsSummaryEntry, WinsSummaryValues<Outputs>>
{
  static create<T extends TurnData<any, any>>(): WinSummaryField<T, { all: "*" }>;
  static create<T extends TurnData<any, any>, O extends PlayerRequirements>(
    requirements: O,
  ): WinSummaryField<T, O>;
  static create<T extends TurnData<any, any>, O extends PlayerRequirements = { all: "*" }>(
    requirements?: O,
  ): WinSummaryField<T, O> {
    return new WinSummaryField(requirements ?? ({ all: "*" } as unknown as O));
  }

  constructor(readonly requirements: Outputs) {}
  entry(
    playerData: PlayerDataForStats<T>,
    opponents: string[],
    tiebreakWinner?: string,
  ): WinsSummaryEntry {
    return playerData.position === 1
      ? playerData.tied.length < 1
        ? { type: "outright", opponents }
        : { type: "tie", opponents, wonTiebreak: tiebreakWinner === playerData.playerId }
      : { type: "noWin", opponents };
  }
  emptySummary(): WinsSummaryValues<Outputs> {
    return Object.keys(this.requirements).reduce(
      (acc, key) =>
        Object.assign(acc, {
          [key]: {
            totalOutright: 0,
            meanOutright: 0,
            tiebreakWins: 0,
            tiebreaksPlayed: 0,
            tiebreakWinRate: 0,
            total: 0,
            mean: 0,
            gameCount: 0,
          },
        }),
      {} as WinsSummaryValues<Outputs>,
    );
  }
  summary(
    accumulated: WinsSummaryValues<Outputs>,
    _: number,
    entry: WinsSummaryEntry,
  ): WinsSummaryValues<Outputs> {
    const win = entry.type !== "noWin";
    const { tiebreak, tbWin } =
      entry.type === "tie"
        ? { tiebreak: true, tbWin: entry.wonTiebreak }
        : { tiebreak: false, tbWin: false };
    return (Object.entries(this.requirements) as [keyof Outputs, PlayerRequirement][]).reduce(
      (acc, [k, req]) => {
        const players = new Set(entry.opponents);
        const checkPlayers = (required: string[], exact = false) => {
          const hasAll = required.filter((pid) => !players.has(pid)).length < 1;
          return exact ? required.length === players.size && hasAll : hasAll;
        };
        if (
          req === "*" ||
          (Array.isArray(req) ? checkPlayers(req) : checkPlayers(req.players, req.exact))
        ) {
          acc[k].gameCount += 1;
          if (win) {
            if (tiebreak) {
              acc[k].tiebreaksPlayed += 1;
              if (tbWin) {
                acc[k].tiebreakWins += 1;
              }
              acc[k].tiebreakWinRate = acc[k].tiebreakWins / acc[k].tiebreaksPlayed;
            } else {
              acc[k].totalOutright += 1;
              acc[k].meanOutright = acc[k].totalOutright / acc[k].gameCount;
            }
            acc[k].total = acc[k].totalOutright + acc[k].tiebreakWins;
          }
          acc[k].mean = acc[k].total / acc[k].gameCount;
        }
        return acc;
      },
      accumulated,
    );
  }
}

/**
 * false = neither win nor in tiebreak
 * `{ type: "noWin", ... }` = Did not win
 * `{ type: "outright", ... }` = won outright (no tiebreak)
 * `{ type: "tie", ... }` = in tiebreak, but may not have won tiebreak
 */
type WinsSummaryEntry =
  | {
      type: "noWin";
      /** All players in game (except current player) */
      opponents: string[];
    }
  | {
      type: "outright";
      /** All players in game (except current player) */
      opponents: string[];
    }
  | {
      type: "tie";
      wonTiebreak: boolean;
      /** All players in game (except current player), not just those in the tiebreak */
      opponents: string[];
    };

type WinsSummaryValues<O extends PlayerRequirements> = Record<
  keyof O,
  {
    /** Number of times won outright */
    totalOutright: number;
    /** Average outright win rate (not including draws/tiebreaks) */
    meanOutright: number;
    /** Number of times won tiebreaks */
    tiebreakWins: number;
    /** Total number of tiebreaks played */
    tiebreaksPlayed: number;
    /** tiebreakWins / tiebreaksPlayed */
    tiebreakWinRate: number;
    /** Total wins (outright + tiebreak wins) */
    total: number;
    /** Average wins / game (outright + tiebreak wins) */
    mean: number;
    /** Games played fitting the requirements */
    gameCount: number;
  }
>;
