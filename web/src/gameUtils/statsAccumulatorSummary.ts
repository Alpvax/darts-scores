import { nonEmptyPowerSet } from "@/utils";
import type { TurnStats } from "./roundDeclaration";
import type { BoolTS, GameStats, GameStatsForRounds, NumericTS } from "./statsAccumulatorGame";

type BoolGS<S extends GameStats<any, any>> = {
  [K in keyof S as S[K] extends boolean ? K : never]: S[K];
};
type NumericGS<S extends GameStats<any, any>> = {
  [K in keyof S as S[K] extends number ? K : never]: S[K];
};
type TurnStatGS<S extends GameStats<any, any>> = S extends GameStats<infer RS, any>
  ? {
      [K in keyof BoolTS<RS> & string as `${K}Total` | `${K}Mean`]: number;
    } & {
      [K in keyof NumericTS<RS> & string as
        | `${K}Total`
        | `${K}TotalCountNZ`
        | `${K}Most`
        | `${K}Least`
        | `${K}Mean`
        | `${K}MeanCountNZ`]: number;
    }
  : never;

type StatWithRate = {
  total: number;
};

type SummaryStats<RS extends TurnStats, GS extends GameStatsForRounds<RS>> = {
  [K in keyof BoolGS<GameStats<RS, GS>> & string as `${K}:Total` | `${K}:Mean`]: number;
} & {
  [K in keyof NumericGS<GameStats<RS, GS>> & string as
    | `${K}:Highest`
    | `${K}:Lowest`
    | `${K}:Mean`]: number;
} & {
  turnStats: TurnStatGS<GameStats<RS, GS>>[];
};

class WinCounter {
  /** The current player. Excluded from all map keys */
  private readonly playerId: string;
  /** Total number of wins, with no filtering */
  private total = 0;
  /**
   * Map of `"[...playerId]"` (as string) to number of wins with at least those players (in addition to this player).
   * Will grow exponentially with total number of opponents. (`2**(num_opponents) - 1` keys)
   * (i.e 1 entry with 2 players total (1 opponent): `[a]`, 3 with 3 players: `[a], [b], [a, b]`, 7 with 4 players: `[a], [b], [c], [a, b], [a, c], [b, c], [a, b, c]`)
   */
  private readonly withAtLeastPlayers = new Map<string, number>();
  /**
   * Map of `"[...playerId]"` (as string) to number of wins with only those players in addition to this player.
   * May grow exponentially with total number of opponents, up to `2**(num_opponents) - 1` keys.
   * (i.e 1 entry with 2 players total (1 opponent): `[a]`, 3 with 3 players: `[a], [b], [a, b]`, 7 with 4 players: `[a], [b], [c], [a, b], [a, c], [b, c], [a, b, c]`)
   */
  private readonly withExactlyPlayers = new Map<string, number>();

  constructor(playerId: string) {
    this.playerId = playerId;
  }

  private incrementList(map: Map<string, number>, ordered: string[]) {
    if (ordered.length < 1) {
      return;
    }
    const key = JSON.stringify(ordered);
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  public addWin(players: string[]) {
    this.total += 1;
    const ordered = players.filter((pid) => pid !== this.playerId).toSorted();
    this.incrementList(this.withExactlyPlayers, ordered);
    for (const arr of nonEmptyPowerSet(ordered)) {
      this.incrementList(this.withAtLeastPlayers, arr);
    }
  }
  get wins() {
    return this.total;
  }
  getWins(requiredPlayers: string[], exact = false) {
    const ordered = requiredPlayers.filter((pid) => pid !== this.playerId).toSorted();
    const key = JSON.stringify(ordered);
    return (exact ? this.withExactlyPlayers.get(key) : this.withAtLeastPlayers.get(key)) ?? 0;
  }
}

type HLT = {
  highest: number;
  lowest: number;
  total: number;
};

function withRate(numGames: number, hlt: HLT): HLT & { mean: number };
function withRate(numGames: number, total: number): { total: number; mean: number };
function withRate(numGames: number, val: HLT | number) {
  return typeof val === "number"
    ? {
        total: val,
        mean: val / numGames,
      }
    : {
        ...val,
        mean: val.total / numGames,
      };
}

type GameSummary = Record<string, HLT | number>;

type Summary<G extends GameSummary> = {
  [K in keyof G]: G[K] extends number ? { total: number; mean: number } : HLT & { mean: number };
};

export class SummaryStatsAccumulator<
  V,
  RS extends TurnStats,
  GS extends GameStatsForRounds<RS>,
  S extends GameStats<RS, GS>,
> {
  private readonly games = new Map<string, S>();
  private readonly winCounter: WinCounter;
  constructor(playerId: string) {
    this.winCounter = new WinCounter(playerId);
  }

  /**
   *
   * @param gameId the game id
   * @param stats the player stats for the game
   * @param win false if the player did not win, a list of players in the game otherwise
   */
  addGame(gameId: string, stats: S, win: false | string[]) {
    this.games.set(gameId, stats);
    if (win) {
      this.winCounter.addWin(win);
    }
    // this.turns.set(roundKey, stats);
    // Object.entries(stats).forEach(([k, v]) => {
    //   if (typeof v === "boolean") {
    //     this.addBoolRS(k as keyof BoolTS<T> & string, v);
    //   } else {
    //     this.addNumericRS(k as keyof NumericTS<T> & string, v);
    //   }
    // });
  }
  // private mapGameVal<K extends keyof RoundStatsMapped<T>>(key: K, f: (val: number) => number) {
  //   (this.game[key] as number) = f((this.game[key] ?? 0) as number);
  // }
  // private incrementBoolCount<K extends keyof RoundStatsMapped<T>>(key: K, value: boolean) {
  //   if (!this.initializedKeys.has(key)) {
  //     this.initializedKeys.add(key);
  //     (this.game[key] as number) = value ? 1 : 0;
  //   } else if (value) {
  //     this.mapGameVal(key, (count) => count + 1);
  //   }
  // }
  // private addBoolRS(statKey: keyof BoolTS<T> & string, value: boolean) {
  //   this.incrementBoolCount(`${statKey}Count`, value);
  // }
  // private addNumericRS(statKey: keyof NumericTS<T> & string, value: number) {
  //   this.mapGameVal(`${statKey}Total`, (total) => total + value);
  //   this.incrementBoolCount(`${statKey}CountNZ`, value !== 0);
  // }

  get wins(): number {
    return this.winCounter.wins;
  }
  getWins(requiredPlayers: string[], exact = false) {
    return this.winCounter.getWins(requiredPlayers, exact);
  }

  result(filter?: (game: { id: string; stats: S }) => boolean): SummaryStats<RS, GS> {
    const allGames = [...this.games].map(([id, stats]) => ({ id, stats }));
    const games = filter ? allGames.filter(filter) : allGames;
    const turnStats: TurnStatGS<S>[] =
      games /*.map(({ stats:{ turnStats }}) => turnStats.map((roundStats, roundIdx) =>
      Object.entries(roundStats).reduce((acc, [k, v]) => {
        if (typeof v === "boolean") {
          acc[`${k}Total`] = v ? 1 : 0;
        } else {
          acc[`${k}Total`] = v
          acc[`${k}TotalCountNZ`] = v > 0 ? 1 : 0;
          this.addNumericRS(k as keyof NumericTS<T> & string, v);
        }
        return acc;
      }, {} as Record<string, { type: "bool"; flag: 0 | 1; } | { type: "num"; total: number }>)
    ))*/
        .reduce(
          (acc, { stats: { turnStats } }) => {
            turnStats.forEach((roundStats, i) => {
              if (acc.length < i || acc[i] === undefined) {
                acc[i] = {};
              }
              Object.entries(roundStats).forEach(([k, v]) => {
                if (typeof v === "boolean" && v) {
                  acc[i][`${k}Total`] += 1;
                } else {
                  acc[`${k}Total`] = v;
                  acc[`${k}TotalCountNZ`] = v > 0 ? 1 : 0;
                }
              });
            });
            return acc;
          },
          [] as Record<string, number>[],
        );
    return null!; //TODO: implement
    //   const stats = {
    //     turnStats: Array.from({ length: this.turns.size }, (_, i) =>
    //       this.turns.get(i as RK /*TODO: non numeric rounds */),
    //     ).filter((t) => t !== undefined) as T[],
    //     ...this.game,
    //   } as ArrayGameStats<T>;
    //   return {
    //     ...stats,
    //     ...this.gameStatsFactory(stats, turns),
    //     score: turns.all[turns.all.length - 1].score,
    //   };
  }
}
