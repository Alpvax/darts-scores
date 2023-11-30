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
      : false;
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
          },
        }),
      {} as WinsSummaryValues<Outputs>,
    );
  }
  summary(
    accumulated: WinsSummaryValues<Outputs>,
    numGames: number,
    entry: WinsSummaryEntry,
  ): WinsSummaryValues<Outputs> {
    if (!entry) {
      return accumulated;
    }
    const { tiebreak, tbWin } =
      entry.type === "outright"
        ? { tiebreak: false, tbWin: false }
        : { tiebreak: true, tbWin: entry.wonTiebreak };
    for (const [k, req] of Object.entries(this.requirements) as [
      keyof Outputs,
      PlayerRequirement,
    ][]) {
      const players = new Set(entry.opponents);
      const checkPlayers = (required: string[], exact = false) => {
        const hasAll = required.filter((pid) => !players.has(pid)).length < 1;
        return exact ? required.length === players.size && hasAll : hasAll;
      };
      if (
        req === "*" ||
        (Array.isArray(req) ? checkPlayers(req) : checkPlayers(req.players, req.exact))
      ) {
        if (tiebreak) {
          accumulated[k].tiebreaksPlayed += 1;
          if (tbWin) {
            accumulated[k].tiebreakWins += 1;
          }
          accumulated[k].tiebreakWinRate =
            accumulated[k].tiebreakWins / accumulated[k].tiebreaksPlayed;
        } else {
          accumulated[k].totalOutright += 1;
          accumulated[k].meanOutright = accumulated[k].totalOutright / numGames;
        }
        accumulated[k].total = accumulated[k].totalOutright + accumulated[k].tiebreakWins;
        accumulated[k].mean = accumulated[k].total / numGames;
      }
      return accumulated;
    }
    return Object.entries(entry).reduce(
      (acc, [k, total]) =>
        Object.assign(acc, {
          [k]: {
            total,
            mean: total / numGames,
          },
        }),
      accumulated,
    );
  }
}

/**
 * false = neither win nor in tiebreak
 * `{ type: "outright", ... }` = won outright (no tiebreak)
 * `{ type: "tie", ... }` = in tiebreak, but may not have won tiebreak
 */
type WinsSummaryEntry =
  | false
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
  }
>;
