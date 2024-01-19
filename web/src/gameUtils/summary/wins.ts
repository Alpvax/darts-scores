import type { SummaryEntryField, PlayerDataForStats } from ".";
import type { TurnData } from "../roundDeclaration";

type PlayerRequirement =
  | "*"
  | string[]
  | { players: string[]; exact?: boolean }
  | ((opponents: Set<string>) => boolean);
export type PlayerRequirements = Record<string, PlayerRequirement>;
type PlayerReqsInternal<O extends PlayerRequirements> = {
  [K in keyof O]: (opponents: Set<string>) => boolean;
};

const reqTrue = () => true;
const checkPlayers =
  (required: string[], exact = false) =>
  (opponents: Set<string>) => {
    const hasAll = required.filter((pid) => !opponents.has(pid)).length < 1;
    return exact ? required.length === opponents.size && hasAll : hasAll;
  };
const isObjReq = (req: PlayerRequirement): req is { players: string[]; exact?: boolean } =>
  typeof req === "object" && Object.hasOwn(req, "players");

export class WinSummaryField<T extends TurnData<any, any, any>, Outputs extends PlayerRequirements>
  implements SummaryEntryField<T, WinsSummaryEntry, WinsSummaryValues<Outputs>>
{
  static create<T extends TurnData<any, any, any>>(): WinSummaryField<T, { all: "*" }>;
  static create<T extends TurnData<any, any, any>, O extends PlayerRequirements>(
    requirements: O,
  ): WinSummaryField<T, O>;
  static create<T extends TurnData<any, any, any>, O extends PlayerRequirements = { all: "*" }>(
    requirements?: O,
  ): WinSummaryField<T, O> {
    return new WinSummaryField(requirements ?? ({ all: "*" } as unknown as O));
  }

  readonly requirements: PlayerReqsInternal<Outputs>;
  constructor(requirements: Outputs) {
    this.requirements = Object.entries(requirements).reduce(
      (reqs, [k, req]: [keyof Outputs, PlayerRequirement]) =>
        Object.assign(reqs, {
          [k]: (req === "*"
            ? reqTrue
            : Array.isArray(req)
              ? checkPlayers(req)
              : isObjReq(req)
                ? checkPlayers(req.players, req.exact)
                : req) satisfies (opponents: Set<string>) => boolean,
        }),
      {} as PlayerReqsInternal<Outputs>,
    );
  }
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
          } satisfies WinsSummaryValues<Outputs>[keyof Outputs],
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
    return (
      Object.entries(this.requirements) as [keyof Outputs, (opponents: Set<string>) => boolean][]
    ).reduce((acc, [k, req]) => {
      const opponents = new Set(entry.opponents);
      if (req(opponents)) {
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
          }
          acc[k].total = acc[k].totalOutright + acc[k].tiebreakWins;
        }
        acc[k].mean = acc[k].total / acc[k].gameCount;
        acc[k].meanOutright = acc[k].totalOutright / acc[k].gameCount;
      }
      return acc;
    }, accumulated);
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
