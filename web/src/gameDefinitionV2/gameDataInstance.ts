import type { FixedLengthArray, NumericRange } from "@/utils/types";
import type { Position } from ".";
import type { ArrayGameDefBuilder } from "./builder";
import type { TurnMeta } from "./rounds";
import type {
  GameInstanceData,
  TurnMetaType,
  SoloStatsFactory,
  FullStatsFactory,
  PlayerTurnData,
  TurnValueType,
  PlayerDataForSolo,
} from "./types";
import { expandRoundStats } from "./summary/roundStats";

export function makeGameInstanceFactoryFor<
  GameType extends string,
  PlayerState extends { startScore: number },
  SharedState extends {},
  V,
  RoundStats,
  Len extends number,
  SoloStats extends {},
  FullPlayerStats extends {},
  PlayerId extends string = string,
>(
  gameDef: ArrayGameDefBuilder<
    GameType,
    PlayerState,
    SharedState,
    V,
    RoundStats,
    V,
    Len,
    SoloStats,
    FullPlayerStats
  >,
): GameInstanceData<
  PlayerState,
  SharedState,
  { valueType: V; statsType: RoundStats; length: Len },
  SoloStats,
  FullPlayerStats,
  PlayerId
> {
  let roundsMeta: FixedLengthArray<TurnMeta<V, RoundStats, V>, Len>;
  if (gameDef.maxLength > 50) {
    console.warn("Limiting to 50 rounds instead of:", gameDef.maxLength);
    // @ts-expect-error
    roundsMeta = Array.from({ length: 50 }, (_, i) => gameDef.getRound(i as NumericRange<Len>));
  } else {
    // @ts-expect-error
    roundsMeta = Array.from({ length: gameDef.maxLength }, (_, i) =>
      gameDef.getRound(i as NumericRange<Len>),
    );
  }
  return makeGameInstanceFunc<
    PlayerState,
    SharedState,
    { valueType: V; statsType: RoundStats; length: Len },
    SoloStats,
    FullPlayerStats,
    PlayerId
  >(
    roundsMeta,
    "highestFirst", //gameDef.positionOrder,
    gameDef.soloStatsFactory,
    gameDef.fullStatsFactory,
  );
}

export const makeGameInstanceFunc = <
  PlayerState extends { startScore: number },
  SharedState,
  TurnType,
  SoloStats extends {},
  FullPlayerStats extends {},
  PlayerId extends string = string,
>(
  roundsMeta: TurnMetaType<TurnType>,
  positionOrder: "highestFirst" | "lowestFirst",
  soloStatsFactory: SoloStatsFactory<PlayerState, TurnType, SoloStats, PlayerId>,
  fullStatsFactory: FullStatsFactory<
    PlayerState,
    SharedState,
    TurnType,
    SoloStats,
    FullPlayerStats,
    PlayerId
  >,
): GameInstanceData<PlayerState, SharedState, TurnType, SoloStats, FullPlayerStats, PlayerId> => {
  return (pDataRaw, shared) => {
    const pDataSolo = new Map(
      [...pDataRaw].map(([pid, { startScore, turns, ...raw }]) => {
        let score = startScore;
        const newTurns = (Array.isArray(turns) ? [] : {}) as PlayerTurnData<TurnType>;
        for (const [key, value] of Object.entries(turns) as [
          keyof TurnValueType<TurnType>,
          TurnValueType<TurnType>,
        ][]) {
          // @ts-expect-error
          const r = roundsMeta[key];
          const deltaScore = r.deltaScore(value);
          score += deltaScore;
          // @ts-expect-error
          newTurns[key] = {
            value,
            stats: r.turnStats(value),
            deltaScore,
            endingScore: score,
          };
        }
        const dataForSolo = {
          ...raw,
          playerId: pid,
          turns: newTurns,
          score,
          roundStatsGameSummary: expandRoundStats(
            // @ts-expect-error
            Object.values(newTurns).map(({ stats }) => stats),
          ),
        } as PlayerDataForSolo<PlayerState, TurnType, PlayerId>;
        return [pid, Object.assign(dataForSolo, soloStatsFactory(dataForSolo))]; // as [PlayerId, PlayerDataSolo<PlayerState, TurnKey, TurnValues, TurnStats, SoloStats, PlayerId>]
      }),
    );
    const positions = (() => {
      const orderedScores = [...pDataSolo.values()].map(({ score }) => score);
      orderedScores.sort((a, b) => {
        switch (positionOrder) {
          case "highestFirst":
            return b - a;
          case "lowestFirst":
            return a - b;
        }
      });
      const scorePlayerLookup = [...pDataSolo].reduce((acc, [pid, { score }]) => {
        if (acc.has(score)) {
          acc.get(score)!.push(pid);
        } else {
          acc.set(score, [pid]);
        }
        return acc;
      }, new Map<number, PlayerId[]>());

      const { ordered, playerLookup } = orderedScores.reduce(
        ({ scores, ordered, playerLookup }, score, idx) => {
          const pos = idx + 1;
          if (!scores.has(score)) {
            scores.add(score);
            const players = scorePlayerLookup.get(score)!;
            ordered.push({ pos, players });
            for (const p of players) {
              playerLookup.set(p, { pos, players });
            }
          }
          return { scores, ordered, playerLookup };
        },
        {
          scores: new Set<number>(),
          ordered: [] as Position[],
          playerLookup: new Map<PlayerId, Position>(),
        },
      );

      return { ordered, playerLookup };
    })();
    return {
      players: new Map(
        [...pDataSolo].map(([pid, soloData]) => {
          const dataForFull = {
            position: positions.playerLookup.get(pid)!,
            ...soloData,
          };
          return [
            pid,
            Object.assign(dataForFull, fullStatsFactory(dataForFull, shared, positions)),
          ];
        }),
      ),
      positionsOrdered: positions.ordered,
    };
  };
};
