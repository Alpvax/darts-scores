import type { TurnStats } from "@/gameUtils/roundDeclaration";
import type {
  AsRound,
  OptionalTurnDataFor,
  Round,
  RoundDef,
  TurnData,
  TurnDataFor,
} from "./roundDef";

export interface GameDefinition<
  Rounds extends {
    [k: string | number]: Round<any, any, any, any>;
  },
  PlayerState extends PlayerStateCore<Rounds>,
> {
  playerStartState: (playerId: string) => PlayerState;
  rounds: readonly [...Round<any, any, any, any>[]];
  getRound: <K extends keyof Rounds>(round: K) => Rounds[K];
}

type RoundsObj<Rounds extends readonly [...RoundDef<any, any, any, any>[]]> = {
  [K in Rounds[number]["key"]]: AsRound<Extract<Rounds[number], { key: K }>>;
};

type PlayerStateCore<
  Rounds extends {
    [k: string | number]: RoundDef<any, any, any, any>;
  },
> = {
  score: number;
  takenRounds: Map<keyof Rounds, TurnDataFor<Rounds[keyof Rounds]>>;
  allRounds: {
    [K in keyof Rounds]: OptionalTurnDataFor<Rounds[K]>;
  };
};

export const makeGameDefinition = <
  const Rounds extends readonly [...RoundDef<any, any, any, any>[]],
  AdditionalPlayerState extends {} = {},
>(definition: {
  playerStartState: (playerId: string) => { score: number } & AdditionalPlayerState;
  rounds: Rounds;
}): GameDefinition<
  RoundsObj<Rounds>,
  PlayerStateCore<RoundsObj<Rounds>> & AdditionalPlayerState
> => {
  const rounds = definition.rounds.map((roundDef: RoundDef<any, any, any, any>) => {
    return {
      makeTurnData: (valueIn, startScore, playerId) => {
        const { value, deltaScore, stats } = roundDef.calculateTurnData(
          valueIn,
          startScore,
          playerId,
        );
        const score = startScore + deltaScore;
        return {
          playerId,
          roundKey: roundDef.key,
          value,
          deltaScore,
          stats,
          endScore: score,
        } satisfies OptionalTurnDataFor<typeof roundDef>;
      },
      ...roundDef,
    } satisfies Round<any, any, any, any>;
  });
  const roundsObj = rounds.reduce(
    (obj, r) =>
      Object.assign(obj, {
        [r.key]: r,
      }),
    {},
  ) as RoundsObj<Rounds>;
  return {
    playerStartState: (playerId: string) => {
      const startState = definition.playerStartState(playerId);
      let score = startState.score;
      return {
        takenRounds: new Map(),
        allRounds: rounds.reduce((obj, round) => {
          const turnData = round.makeTurnData(undefined, score, playerId);
          score += turnData.deltaScore;
          return Object.assign(obj, { [round.key]: turnData });
        }, {}) as PlayerStateCore<RoundsObj<Rounds>>["allRounds"],
        ...startState,
      };
    },
    rounds,
    getRound: (round) => roundsObj[round],
  };
};
