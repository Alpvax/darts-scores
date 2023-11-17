import type { TurnData, TurnStats } from "./roundDeclaration";

type BoolTS<T extends TurnStats> = {
  [K in keyof T as T[K] extends boolean ? K : never]: T[K];
};
type NumericTS<T extends TurnStats> = {
  [K in keyof T as T[K] extends number ? K : never]: T[K];
};

export type ArrayGameStats<T extends TurnStats> = {
  turnStats: T[];
} & Partial<
  {
    [K in keyof BoolTS<T> & string as `${K}Count`]: number;
  } & {
    [K in keyof NumericTS<T> & string as `${K}Total` | `${K}CountNZ`]: number;
  }
>;

export type GameStatsForRounds<T extends TurnStats, V = any> = {
  [K in string as K extends keyof T ? never : K]: V;
};

export type GameStats<T extends TurnStats, G extends GameStatsForRounds<T>> = ArrayGameStats<T> & G;

export class ArrayStatsAccumulatorGame<
  V,
  T extends TurnStats,
  G extends GameStatsForRounds<T>,
  RK extends number /*TODO: non numeric rounds | [...string[]]*/ = number,
> {
  private readonly turns = new Map<RK, T>();
  private readonly game = {} as Omit<ArrayGameStats<T>, "turnStats">;
  constructor(
    private readonly gameStatsFactory: (
      stats: ArrayGameStats<T>,
      turns: { all: TurnData<V, T>[]; taken: TurnData<V, T>[] },
    ) => G,
  ) {}

  addRound(roundKey: RK, stats: T) {
    this.turns.set(roundKey, stats);
    Object.entries(stats).forEach(([k, v]) => {
      if (typeof v === "boolean") {
        this.addBoolRS(k as keyof BoolTS<T> & string, v);
      } else {
        this.addNumericRS(k as keyof NumericTS<T> & string, v);
      }
    });
  }
  private mapGameVal<K extends keyof Omit<ArrayGameStats<T>, "turnStats">>(
    key: K,
    f: (val: number) => number,
  ) {
    (this.game[key] as number) = f((this.game[key] ?? 0) as number);
  }
  private addBoolRS(statKey: keyof BoolTS<T> & string, value: boolean) {
    if (value) {
      this.mapGameVal(`${statKey}Count`, (count) => count + 1);
    }
  }
  private addNumericRS(statKey: keyof NumericTS<T> & string, value: number) {
    this.mapGameVal(`${statKey}Total`, (total) => total + value);
    if (value !== 0) {
      this.mapGameVal(`${statKey}CountNZ`, (count) => count + 1);
    }
  }

  result(turns: { all: TurnData<V, T>[]; taken: TurnData<V, T>[] }): GameStats<T, G> {
    const stats = {
      turnStats: Array.from({ length: this.turns.size }, (_, i) =>
        this.turns.get(i as RK /*TODO: non numeric rounds */),
      ).filter((t) => t !== undefined) as T[],
      ...this.game,
    } as ArrayGameStats<T>;
    return {
      ...stats,
      ...this.gameStatsFactory(stats, turns),
    };
  }
}

export const makeGameStatsFactoryFor =
  <T extends TurnStats>() =>
  <G extends GameStatsForRounds<T>>(gameStatsFactory: (stats: ArrayGameStats<T>) => G) => ({
    createGameAcc: () => new ArrayStatsAccumulatorGame(gameStatsFactory),
    //TODO: createSummaryAcc: () => {},
  });
export default makeGameStatsFactoryFor;
