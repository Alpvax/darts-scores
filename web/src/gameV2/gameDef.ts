import type { AsRound, OptionalTurnDataFor, Round, RoundDef, TurnDataFor } from "./roundDef";

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
  getTakenData: <K extends keyof Rounds>(round: K) => TurnDataFor<Rounds[K]> | null;
  getRoundData: <K extends keyof Rounds>(round: K) => OptionalTurnDataFor<Rounds[K]>;
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
      let takenRounds = new Map();
      let allRounds = rounds.reduce((obj, round) => {
        const turnData = round.makeTurnData(undefined, score, playerId);
        score += turnData.deltaScore;
        return Object.assign(obj, { [round.key]: turnData });
      }, {}) as PlayerStateCore<RoundsObj<Rounds>>["allRounds"];
      return {
        takenRounds,
        allRounds,
        getTakenData: (round) => takenRounds.get(round) ?? null,
        getRoundData: (round) => allRounds[round],
        ...startState,
      };
    },
    rounds,
    getRound: (round) => roundsObj[round],
  };
};

export type RoundsFor<G extends GameDefinition<any, any>> =
  G extends GameDefinition<infer R, any> ? { [K in keyof R]: R[K] } : never;
export type PlayerStateFor<G extends GameDefinition<any, any>> =
  G extends GameDefinition<any, infer P> ? { [K in keyof P]: P[K] } : never;
