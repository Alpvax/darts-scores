import type {
  RoundShapes,
  RoundsValuesMap,
  RoundsStatsMap,
  RoundsValues,
} from "@/components/game/Rounds";
import { computed, type Ref } from "vue";
import type { TakenTurnData, TurnData, TurnStats } from "./roundDeclaration";
import type { GameStatsForRounds, GameStats } from "./statsAccumulator";
import type {
  AnyGameMetadata,
  GameMetaINS,
  GameMetaIRS,
  GameMetaKNS,
  GameMetaKRS,
} from "./gameMeta";

export type PlayerDataT<
  RS extends TurnStats,
  T extends TurnData<any, RS>,
  GS extends GameStatsForRounds<RS>,
> = {
  playerId: string;
  /** Whether the player has completed all rounds */
  complete: boolean;
  /** The final score if finished, or the current score if in progress */
  score: number;
  /**
   * A Map of the completed rounds, with non completed rounds missing from the map. <br/>
   * Key is round index; value is {@link TakenTurnData}, including the value, delta score of the round and score at this round.
   * */
  turns: Map<number, TakenTurnData<T extends TurnData<infer V, RS> ? V : never, RS>>;
  /**
   * A Map of the all rounds, with non completed rounds missing from the map. <br/>
   * Key is round index; value is {@link TurnData}, including the value, delta score of the round and score at this round.
   * */
  allTurns: Map<number, T>;
  /** The player's current position */
  position: number;
  /** A list of playerIds that the player is tied with, empty list for no players tied with this player */
  tied: string[];
  stats: GameStats<RS, GS>;
};

export type PlayerDataFor<
  M extends
    | GameMetaINS<any, any>
    | GameMetaIRS<any, any, any>
    | GameMetaKNS<any, any, any>
    | GameMetaKRS<any, any, any, any>,
> = M extends AnyGameMetadata<infer V, infer RS, infer GS, infer K>
  ? PlayerDataT<RS, TurnData<V, RS, K>, GS>
  : never;

export type PlayerDataBase = {
  playerId: string;
  /** Whether the player has completed all rounds */
  complete: false;
  /** The final score if finished, or the current score if in progress */
  score: number;
  /** The scores after each round, only including played rounds */
  scores: number[];
  /** The scores differences for each round, only including played rounds */
  deltaScores: number[];
  /** The player's current position */
  position: number;
  /** A list of playerIds that the player is tied with, empty list for no players tied with this player */
  tied: string[];
};

export type PlayerDataWStats<S extends Record<string, any>> = PlayerDataBase & {
  /** Combined stats for the entire game */
  gameStats: S;
};

export type PlayerDataPartial<
  R extends RoundShapes,
  S extends Record<string, any>,
> = PlayerDataBase & {
  /** A map of the completed rounds, with non completed rounds missing from the map */
  rounds: RoundsValuesMap<R>;
  /** A map of round to stats, with non completed rounds missing from the map */
  roundStats: RoundsStatsMap<R>;
  /** Combined stats for the entire game */
  gameStats: S;
};
export type PlayerDataComplete<R extends RoundShapes, S extends Record<string, any>> = Omit<
  PlayerDataPartial<R, S>,
  "complete"
> & {
  complete: true;
  roundsComplete: RoundsValues<R>;
};
export type PlayerData<R extends RoundShapes, S extends Record<string, any>> =
  | PlayerDataPartial<R, S>
  | PlayerDataComplete<R, S>;

// ================ Player Positions =======================
export type PositionsOrder = "highestFirst" | "lowestFirst";
export type DisplayPosRowPositions = "head" | "body" | "foot" | "none";

export type Position = { pos: number; posOrdinal: string; players: string[] };

export const makePlayerPositions = (
  playerScores: Ref<Map<string, number>>,
  positionOrder: PositionsOrder,
) => {
  const playerPositions = computed(() => {
    const orderedScores = [...playerScores.value.values()];
    orderedScores.sort((a, b) => {
      switch (positionOrder) {
        case "highestFirst":
          return b - a;
        case "lowestFirst":
          return a - b;
      }
    });
    const scorePlayerLookup = [...playerScores.value.entries()].reduce((acc, [pid, score]) => {
      if (acc.has(score)) {
        acc.get(score)!.push(pid);
      } else {
        acc.set(score, [pid]);
      }
      return acc;
    }, new Map<number, string[]>());

    const { ordered, playerLookup } = orderedScores.reduce(
      ({ scores, ordered, playerLookup }, score, idx) => {
        const pos = idx + 1;
        // Assumes < 21 players in a game
        const posOrdinal = pos === 1 ? "st" : pos === 2 ? "nd" : pos === 3 ? "rd" : "th";
        if (!scores.has(score)) {
          scores.add(score);
          const players = scorePlayerLookup.get(score)!;
          ordered.push({ pos, posOrdinal, players });
          for (const p of players) {
            playerLookup.set(p, { pos, posOrdinal, players });
          }
        }
        return { scores, ordered, playerLookup };
      },
      {
        scores: new Set<number>(),
        ordered: [] as Position[],
        playerLookup: new Map<string, Position>(),
      },
    );

    return { ordered, playerLookup };
  });
  type PosRowFactory = (displayWhen: DisplayPosRowPositions) => JSX.Element | undefined;
  type CombinedData = { displayPositions: DisplayPosRowPositions; players: string[] };
  function posRowFactory(
    displayPositions: Ref<DisplayPosRowPositions>,
    players: Ref<string[]>,
    rowClasses?: string,
  ): PosRowFactory;
  function posRowFactory(combinedRef: Ref<CombinedData>, rowClasses?: string): PosRowFactory;
  function posRowFactory(
    arg0: Ref<DisplayPosRowPositions | CombinedData>,
    arg1?: Ref<string[]> | string,
    arg2?: string,
  ): PosRowFactory {
    const [displayPositions, players, rowClasses] =
      typeof arg0.value === "string"
        ? [arg0 as Ref<DisplayPosRowPositions>, arg1! as Ref<string[]>, arg2]
        : [
            computed(() => (arg0.value as CombinedData).displayPositions),
            computed(() => (arg0.value as CombinedData).players),
            arg1 as string | undefined,
          ];
    return (displayWhen: DisplayPosRowPositions) =>
      // Only display when requested, and only if everyone isn't tied
      displayPositions.value === displayWhen ? (
        <tr class={"positionRow" + (rowClasses ? ` ${rowClasses}` : "")}>
          <td class="rowLabel">Position</td>
          {players.value.map((pid) => {
            const { pos, posOrdinal } = playerPositions.value.playerLookup.get(pid)!;
            return (
              <td>
                {pos}
                <sup>{posOrdinal}</sup>
              </td>
            );
          })}
        </tr>
      ) : undefined;
  }
  return {
    playerPositions,
    posRowFactory,
  };
};
