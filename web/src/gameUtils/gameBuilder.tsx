import type { ClassBindings } from "@/utils";
import type { PositionsOrder } from "./playerData";
import type { FullTurnData, FullTurnDataStats, RoundNoStats, RoundWStats, TurnStats } from "./round";

type GameMetaBase = {
  /**
   * The start score for each game.
   * Can use a factory function to allow for player handicaps.
   */
  startScore: number | ((playerId: string) => number);
  /**
   * Which direction to sort the positions.<br/>
   * `"highestFirst"` means the player(s) with the highest score are in first place.<br/>
   * `"lowestFirst"` means the player(s) with the lowest score are in first place.<br/>
   */
  positionOrder: PositionsOrder;
};
type GameMetaNRS<V> = GameMetaBase & {
  /** The list of rounds for the game. Probably use `@/gameUtils/round.arrayRoundsBuilder`*/
  rounds: Iterable<RoundNoStats<V>>;// | Iterator<RoundNoStats<V>>;
};
type GameMetaWRS<V, RS extends TurnStats> = GameMetaBase & {
  /** The list of rounds for the game. Probably use `@/gameUtils/round.arrayRoundsBuilder`*/
  rounds: Iterable<RoundWStats<V, RS>>;// | Iterator<RoundWStats<V, RS>>;
};

type BuilderNRS<V, K extends string | number = string | number> = {
    withRoundStats: <RS extends TurnStats>(factory: (data: FullTurnData<V, K>) => RS) => BuilderWRS<V, RS, K>;
    withRowClasses: (factory: (data: FullTurnData<V, K>[]) => ClassBindings) => Omit<BuilderNRS<V, K>, "withRoundStats" | "withRowClasses">
    withCellClasses: (factory: (data: FullTurnData<V, K>) => ClassBindings) => Omit<BuilderNRS<V, K>, "withRoundStats" | "withCellClasses">
}
type BuilderWRS<V, RS extends TurnStats, K extends string | number = string | number> = {
    withRowClasses: (factory: (data: FullTurnDataStats<V, RS, K>[]) => ClassBindings) => Omit<BuilderWRS<V, RS, K>, "withRowClasses">
    withCellClasses: (factory: (data: FullTurnDataStats<V, RS, K>) => ClassBindings) => Omit<BuilderWRS<V, RS, K>, "withCellClasses">
}
export default function builder(meta: GameMetaBase) {
    function withArrayRounds<V>(rounds: Iterable<RoundNoStats<V>>): BuilderNRS<V, number>;
    function withArrayRounds<V, RS extends TurnStats>(rounds: Iterable<RoundWStats<V, RS>>): BuilderWRS<V, RS, number>;
    function withArrayRounds<V, RS extends TurnStats>(rounds: Iterable<RoundNoStats<V>> | Iterable<RoundWStats<V, RS>>) {}
    return {
        withArrayRounds
    }
}
