import {
  type SummaryEntryField,
  type PlayerDataForStats,
  type SummaryDisplayMetadata,
  type NormalisedDisplayMetaInputs,
  defaultRateFmt,
  type DisplayMetaInputs,
  normaliseDMI,
  type ScoreDirection,
} from ".";
import type { TurnData } from "../roundDeclaration";

type PlayerRequirement =
  | "*"
  | string[]
  | { players: string[]; exact?: boolean }
  | ((opponents: Set<string>) => boolean);
export type PlayerRequirements = Record<string, PlayerRequirement>;
type PlayerReqsInternal<O extends PlayerRequirements> = {
  [K in keyof O]: (players: Set<string>) => boolean;
};

type WinsDMI = Omit<DisplayMetaInputs<WinsSummaryValuesEntry>, "best"> & { best?: ScoreDirection };
type WinsDMIs<O extends PlayerRequirements> = {
  [K in keyof O]?: WinsDMI;
};

export namespace WinsDisplayMeta {
  export type Single = WinsDMI;
  export type Record<O extends PlayerRequirements> = WinsDMIs<O>;
  export type Data<O extends PlayerRequirements> =
    | {
        requirements: O;
        displayMeta?: Record<O>;
      }
    | {
        requirements?: never;
        displayMeta: Single;
      };
}

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
  implements SummaryEntryField<T, WinsSummaryDefinition, WinsSummaryValues<Outputs>>
{
  static create<T extends TurnData<any, any, any>>(
    displayMeta?: WinsDMI,
  ): WinSummaryField<T, { all: "*" }>;
  static create<T extends TurnData<any, any, any>, O extends PlayerRequirements>(
    requirements: O,
    displayMeta?: WinsDMIs<O>,
  ): WinSummaryField<T, O>;
  static create<T extends TurnData<any, any, any>, O extends PlayerRequirements = { all: "*" }>(
    requirements?: O,
    displayMeta?: WinsDMI | WinsDMIs<O>,
  ): WinSummaryField<T, O> {
    let req: O;
    let dmi: { [K in keyof O]?: NormalisedDisplayMetaInputs<WinsSummaryValuesEntry> };
    const defaultAll = (allMeta?: WinsDMI) => ({
      all: normaliseDMI(
        allMeta ? { best: "highest", ...(allMeta as WinsDMI) } : { best: "highest", label: "" },
      ),
    });
    if (requirements === undefined) {
      req = { all: "*" } as unknown as O;
      dmi = defaultAll(displayMeta as WinsDMI);
    } else {
      req = requirements;
      dmi = displayMeta
        ? Object.entries(displayMeta).reduce(
            (acc, [k, meta]: [keyof O, WinsDMI]) =>
              Object.assign(acc, {
                [k]: normaliseDMI({
                  best: "highest",
                  ...meta,
                }),
              }),
            defaultAll() as {
              [K in keyof O]?: NormalisedDisplayMetaInputs<WinsSummaryValuesEntry>;
            },
          )
        : defaultAll();
    }
    return new WinSummaryField(req, dmi);
  }

  display: SummaryDisplayMetadata<WinsSummaryValues<Outputs>>;
  readonly requirements: PlayerReqsInternal<Outputs>;
  constructor(
    requirements: Outputs,
    displayMeta?: { [K in keyof Outputs]?: NormalisedDisplayMetaInputs<WinsSummaryValuesEntry> },
  ) {
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
    this.display = {};
    if (displayMeta) {
      const fmt = (template: string) => (l: string) =>
        l.length > 0 ? `${l} ${template}` : template;
      for (const [k, meta] of Object.entries(displayMeta) as [
        keyof Outputs & string,
        NormalisedDisplayMetaInputs<WinsSummaryValuesEntry>,
      ][]) {
        this.display[`${k}.totalOutright` as keyof typeof this.display] = meta.getMeta(
          "totalOutright",
          { label: fmt("Outright Wins") },
        );
        this.display[`${k}.meanOutright` as keyof typeof this.display] = meta.getMeta(
          "meanOutright",
          { label: fmt("Outright Win Rate"), format: defaultRateFmt },
        );
        this.display[`${k}.tiebreakWins` as keyof typeof this.display] = meta.getMeta(
          "tiebreakWins",
          { label: fmt("Tiebreak Wins") },
        );
        this.display[`${k}.tiebreaksPlayed` as keyof typeof this.display] = meta.getMeta(
          "tiebreaksPlayed",
          { label: fmt("Tiebreak Wins") },
        );
        this.display[`${k}.tiebreakWinRate` as keyof typeof this.display] = meta.getMeta(
          "tiebreakWinRate",
          { label: fmt("Tiebreak Win Rate"), format: defaultRateFmt },
        );
        this.display[`${k}.total` as keyof typeof this.display] = meta.getMeta("total", {
          label: fmt("Wins"),
        });
        this.display[`${k}.mean` as keyof typeof this.display] = meta.getMeta("mean", {
          label: fmt("Win Rate"),
          format: defaultRateFmt,
        });
      }
    }
  }
  entry(
    playerData: PlayerDataForStats<T>,
    opponents: string[],
    tiebreakWinner?: string,
  ): WinsSummaryDefinition {
    return playerData.position === 1
      ? playerData.tied.length < 1
        ? { type: "outright", players: [playerData.playerId, ...opponents] }
        : {
            type: "tie",
            players: [playerData.playerId, ...opponents],
            wonTiebreak: tiebreakWinner === playerData.playerId,
          }
      : { type: "noWin", players: [playerData.playerId, ...opponents] };
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
    entry: WinsSummaryDefinition,
  ): WinsSummaryValues<Outputs> {
    const win = entry.type !== "noWin";
    const { tiebreak, tbWin } =
      entry.type === "tie"
        ? { tiebreak: true, tbWin: entry.wonTiebreak }
        : { tiebreak: false, tbWin: false };
    return (
      Object.entries(this.requirements) as [keyof Outputs, (players: Set<string>) => boolean][]
    ).reduce((acc, [k, req]) => {
      if (req(new Set(entry.players))) {
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
type WinsSummaryDefinition =
  | {
      type: "noWin";
      /** All players in game (including current player) */
      players: string[];
    }
  | {
      type: "outright";
      /** All players in game (including current player) */
      players: string[];
    }
  | {
      type: "tie";
      wonTiebreak: boolean;
      /** All players in game (including current player), not just those in the tiebreak */
      players: string[];
    };

type WinsSummaryValues<O extends PlayerRequirements> = Record<keyof O, WinsSummaryValuesEntry>;
type WinsSummaryValuesEntry = {
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
};
