import type { AnyGameMetadata } from "@/gameUtils/gameMeta";
import type { TurnStats } from "@/gameUtils/roundDeclaration";
import type { GameStats, GameStatsForRounds } from "@/gameUtils/statsAccumulatorGame";
import { usePlayerStore } from "@/stores/player";
import { computed, defineComponent, type PropType } from "vue";

type BoolGS<S extends GameStats<any, any>> = {
  [K in keyof S as S[K] extends boolean ? K : never]: S[K];
};
type NumericGS<S extends GameStats<any, any>> = {
  [K in keyof S as S[K] extends number ? K : never]: S[K];
};
type TurnStatGS<S extends GameStats<any, any>> = S extends GameStats<infer RS, any>
  ? { turnStats: RS[] }
  : never;

type SummaryStats<RS extends TurnStats, GS extends GameStatsForRounds<RS>> = {
  [K in keyof BoolGS<GameStats<RS, GS>> & string as `${K}:Total` | `${K}:Mean`]: number;
} & {
  [K in keyof NumericGS<GameStats<RS, GS>> & string as
    | `${K}:Highest`
    | `${K}:Lowest`
    | `${K}:Mean`]: number;
} & {
  turns: GameStats<RS, GS>["turnStats"][]; //TODO: proper types
} & {
  //[K in keyof TurnStatGS<S> & string as `${K}Total` | `${K}CountNZ`]: number;
};

export const createSummaryComponent = <RS extends TurnStats, GS extends GameStatsForRounds<RS>>(
  meta: AnyGameMetadata<any, RS, GS>,
) => {
  return defineComponent(
    (props, { slots }) => {
      const playerStats = computed(() =>
        props.games.reduce((map, game) => {
          game.forEach((stats, pid) => {
            if (!map.has(pid)) {
              map.set(pid, stats); //TODO: init summary
            }
          });
          return map;
        }, new Map<string, SummaryStats<RS, GS>>()),
      );

      const playerStore = usePlayerStore();
      return () => (
        <table>
          <thead>
            <tr>
              {slots.topLeftCell ? slots.topLeftCell() : <th>&nbsp;</th>}
              {props.players.map((pid) => (
                <th class="playerName">{playerStore.playerName(pid).value}</th>
              ))}
            </tr>
          </thead>
          <tbody></tbody>
        </table>
      );
    },
    {
      props: {
        players: { type: Array as PropType<string[]>, required: true },
        games: { type: Array as PropType<Map<string, GameStats<RS, GS>>[]>, required: true },
      },
    },
  );
};
