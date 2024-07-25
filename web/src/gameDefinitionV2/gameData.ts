import type { FixedLengthArray, NumericRange } from "@/utils/types";
import type { AnyGameDefinition, ArrayGameDef, InitialStateFactory, ObjectGameDef } from ".";
import type { TurnMeta } from "./rounds";
import { reactive, ref } from "vue";

type PlayerGameDataFactory = {
  <PlayerState, V, RoundStats, UntakenVal extends V | undefined, Len extends number = number>(
    makeInitialState: InitialStateFactory<PlayerState>,
  ): void;
  <
    PlayerState,
    Rounds extends {
      [k: string | number | symbol]: TurnMeta<any, any, any>;
    },
  >(
    gameDef: ObjectGameDef<any, PlayerState, Rounds>,
  ): void;
};

type GameState<PlayerState, RoundState extends {} | any[], PlayerId extends string = string> = Map<
  PlayerId,
  {
    state: PlayerState;
    turns: RoundState;
    latestTurnTaken?: keyof RoundState;
  }
>;
type GameStateFor<
  G /* extends ArrayGameDef<any, any, any, any, any, any> /*| ObjectGameDef<any, any, any>*/,
  PlayerId extends string = string,
> =
  G extends ArrayGameDef<any, infer PlayerState, infer V, any, infer _UntakenVal, infer Len>
    ? GameState<PlayerState, FixedLengthArray<_UntakenVal, Len>, PlayerId>
    : G extends ObjectGameDef<
          any,
          infer PlayerState,
          infer Rounds extends Record<any, TurnMeta<any, any, any>>
        >
      ? GameState<
          PlayerState,
          {
            [K in keyof Rounds]: Rounds[K] extends TurnMeta<infer V, any, any>
              ? V | undefined
              : never;
          },
          PlayerId
        >
      : [never, "Unknown GameDefinition:", G];

interface PlayerGameState<
  PlayerState,
  RoundIdx extends string | number | symbol,
  RoundV extends { [K in RoundIdx]: any },
  RoundStats extends { [K in RoundIdx]: any },
  RoundUntaken extends { [K in RoundIdx]: any },
> {
  readonly state: PlayerState;
  /**
   * Return the current value for the given round, or the undefined if the turn has not yet been taken.
   * @param round the index or key of the round to get
   */
  getRaw<K extends RoundIdx>(round: K): RoundV[K] | undefined;
  /**
   * Set the value for the given round. Setting the value to undefined is equivalent to "unplaying" a round, or returning it to it's unplayed state.
   * @param round the index or key of the round to set
   * @param value
   */
  setValue<K extends RoundIdx>(round: K, value: RoundV[K] | undefined): void;
  /**
   * Return the current value for the given round, or the untakenValue if the turn has not yet been taken.
   * Used for calculating scores and stats.
   * @param round the index or key of the round to get
   */
  getValue<K extends RoundIdx>(round: K): RoundUntaken[K];
  getRoundStats<K extends RoundIdx>(round: K): RoundStats[K];
  readonly deltaScores: { [K in RoundIdx]: number };
}

type PlayerGameStateFactory = {
  <
    PlayerState,
    V,
    Stats,
    UntakenVal extends V | undefined,
    Len extends number = number,
    PlayerId extends string = string,
  >(
    gameDef: ArrayGameDef<any, PlayerState, V, Stats, UntakenVal, Len>,
    playerId: PlayerId,
  ): number extends Len
    ? PlayerGameState<PlayerState, number, V[], Stats[], UntakenVal[]>
    : PlayerGameState<
        PlayerState,
        NumericRange<Len>,
        Record<number, V>,
        Record<number, Stats>,
        Record<number, UntakenVal>
      >;
  <
    PlayerState,
    Rounds extends { [k: string | number | symbol]: TurnMeta<any, any, any> },
    PlayerId extends string = string,
  >(
    gameDef: ObjectGameDef<any, PlayerState, Rounds>,
    playerId: PlayerId,
  ): PlayerGameState<
    PlayerState,
    keyof Rounds,
    { [K in keyof Rounds]: Rounds[K] extends TurnMeta<infer V, infer S, infer U> ? V : never },
    { [K in keyof Rounds]: Rounds[K] extends TurnMeta<infer V, infer S, infer U> ? S : never },
    { [K in keyof Rounds]: Rounds[K] extends TurnMeta<infer V, infer S, infer U> ? U : never }
  >;
};

export const makePlayerGameState: PlayerGameStateFactory = <
  G extends AnyGameDefinition<Len>,
  Len extends number = number,
  PlayerId extends string = string,
>(
  gameDef: G,
  playerId: PlayerId,
) => {
  switch (gameDef.type) {
    case "fixedObj": {
      type Meta =
        G extends ObjectGameDef<any, infer PlayerState, infer Rounds>
          ? {
              state: PlayerState;
              values: {
                [K in keyof Rounds]?: Rounds[K] extends TurnMeta<infer V, any, infer U> ? V : never;
              };
              stats: {
                [K in keyof Rounds]: Rounds[K] extends TurnMeta<any, infer S, any> ? S : never;
              };
              unplayed: {
                [K in keyof Rounds]: Rounds[K] extends TurnMeta<any, any, infer U> ? U : never;
              };
            }
          : never;
      const state = reactive<Meta["state"]>(gameDef.makeInitialState(playerId));
      const values = reactive<Meta["values"]>({});
      const getUnplayed = <K extends keyof Meta["unplayed"]>(key: K) => {
        const def: TurnMeta<Meta["values"][K], Meta["stats"][K], Meta["unplayed"][K]> =
          gameDef.rounds[key];
        switch (typeof def.untakenValue) {
          case "undefined":
            return undefined;
          case "function":
            return (def.untakenValue as () => Meta["unplayed"][K])();
          default:
            return structuredClone(def.untakenValue) as Meta["unplayed"][K];
        }
      };
      const getValue: ReturnType<PlayerGameStateFactory>["getValue"] = (key) =>
        values[key] ?? getUnplayed(key);
      const getRoundStats: ReturnType<PlayerGameStateFactory>["getRoundStats"] = (key) =>
        gameDef.rounds[key].turnStats(getValue(key));
      // <K extends keyof Meta["unplayed"]>(key: K) => {
      //   const def: TurnMeta<Meta["values"][K], Meta["stats"][K], Meta["unplayed"][K]> = gameDef.rounds[key];
      //   return gameDef.rounds[key].turnStats(getValue(key))
      // }
      return Object.defineProperty(
        {
          state,
          getRaw: (key) => values[key],
          getValue,
          // @ts-expect-error
          setValue: (key, val) => (values[key] = val),
          getRoundStats,
        } satisfies Omit<ReturnType<PlayerGameStateFactory>, "deltaScores">,
        "deltaScores",
        {
          enumerable: true,
          configurable: false,
          get: () =>
            Object.entries(gameDef.rounds).reduce((deltas, [key, def]) =>
              Object.assign(deltas, {
                [key]: (def as TurnMeta<any, any, any>).deltaScore(getValue(key)),
              }),
            ),
        },
      ) as ReturnType<PlayerGameStateFactory>;
    }
    case "dynamic": {
      type Meta =
        G extends ArrayGameDef<any, infer PlayerState, infer V, infer S, infer U, any>
          ? {
              state: PlayerState;
              values: V;
              stats: S;
              unplayed: U;
              meta: TurnMeta<V, S, U>;
            }
          : never;
      const state = reactive<Meta["state"]>(gameDef.makeInitialState(playerId));
      const turns = ref<Meta["values"][]>([]);
      const cachedDefs = [] as Meta["meta"][];
      const getOrCacheDef = (idx: number) => {
        let def = cachedDefs[idx];
        if (def === undefined) {
          def = gameDef.roundFactory(idx);
          cachedDefs[idx] = def;
        }
        return def;
      };
      const getUnplayed = (idx: number) => {
        const def = getOrCacheDef(idx);
        switch (typeof def.untakenValue) {
          case "undefined":
            return undefined;
          case "function":
            return (def.untakenValue as () => Meta["unplayed"])();
          default:
            return structuredClone(def.untakenValue) as Meta["unplayed"];
        }
      };
      const getValue: ReturnType<PlayerGameStateFactory>["getValue"] = (idx) =>
        turns.value[idx as number] ?? getUnplayed(idx as number);
      const getRoundStats: ReturnType<PlayerGameStateFactory>["getRoundStats"] = (idx) =>
        getOrCacheDef(idx as number).turnStats(getValue(idx));
      return Object.defineProperty(
        {
          state,
          getRaw: (idx) => turns.value[idx as number],
          getValue,
          // @ts-expect-error
          setValue: (idx, val) => (turns.value[idx as number] = val),
          getRoundStats,
        } satisfies Omit<ReturnType<PlayerGameStateFactory>, "deltaScores">,
        "deltaScores",
        {
          enumerable: true,
          configurable: false,
          get: () => turns.value.map((_, idx) => getOrCacheDef(idx).deltaScore(getValue(idx))),
        },
      ) as ReturnType<PlayerGameStateFactory>;
    }
    case "fixedArray": {
      type Meta =
        G extends ArrayGameDef<any, infer PlayerState, infer V, infer S, infer U, infer L>
          ? {
              state: PlayerState;
              values: V;
              stats: S;
              unplayed: U;
              len: L;
              meta: TurnMeta<V, S, U>;
            }
          : never;
      const state = reactive<Meta["state"]>(gameDef.makeInitialState(playerId));
      const turns = ref<Meta["values"]>([]);
      const getUnplayed = (idx: keyof typeof gameDef.rounds) => {
        const def = gameDef.rounds[idx];
        switch (typeof def.untakenValue) {
          case "undefined":
            return undefined;
          case "function":
            return (def.untakenValue as () => Meta["unplayed"])();
          default:
            return structuredClone(def.untakenValue) as Meta["unplayed"];
        }
      };
      const getValue: ReturnType<PlayerGameStateFactory>["getValue"] = (idx) =>
        turns.value[idx as keyof typeof gameDef.rounds] ??
        getUnplayed(idx as keyof typeof gameDef.rounds);
      const getRoundStats: ReturnType<PlayerGameStateFactory>["getRoundStats"] = (idx) =>
        gameDef.rounds[idx as keyof typeof gameDef.rounds].turnStats(getValue(idx));
      return Object.defineProperty(
        {
          state,
          getRaw: (idx) => turns.value[idx as number],
          getValue,
          setValue: (idx, val) => (turns.value[idx as number] = val),
          getRoundStats,
        } satisfies Omit<ReturnType<PlayerGameStateFactory>, "deltaScores">,
        "deltaScores",
        {
          enumerable: true,
          configurable: false,
          get: () =>
            (gameDef.rounds as Meta["meta"][]).map((def, idx) => def.deltaScore(getValue(idx))),
        },
      ) as ReturnType<PlayerGameStateFactory>;
    }
  }
};
// abstract class PlayerGameState<PlayerState, RoundDefs extends Record<string | number, TurnMeta<any, any, any>>, PlayerId extends string = string> {
//   constructor(
//     readonly makmakeInitialState: InitialStateFactory<PlayerState, PlayerId>,
//     private readonly roundDefs: RoundDefs,
//   ) {}

//   /**
//    * Return the current value for the given round, or the undefined if the turn has not yet been taken.
//    * @param round the index or key of the round to get
//    */
//   abstract getRaw<K extends keyof RoundDefs>(round: K): RoundDefs[K] extends TurnMeta<infer V, any, infer U> ? V | undefined : never;
//   /**
//    * Set the value for the given round. Setting the value to undefined is equivalent to "unplaying" a round, or returning it to it's unplayed state.
//    * @param round the index or key of the round to set
//    * @param value
//    */
//   abstract setValue<K extends keyof RoundDefs>(round: K, value: RoundDefs[K] extends TurnMeta<infer V, any, infer U> ? V | undefined : never): void;
//   /**
//    * Return the current value for the given round, or the untakenValue if the turn has not yet been taken.
//    * Used for calculating scores and stats.
//    * @param round the index or key of the round to get
//    */
//   getValue<K extends keyof RoundDefs>(round: K): RoundDefs[K] extends TurnMeta<any, any, infer U> ? U : never {
//     const current = this.getRaw(round);
//     if (current === undefined) {
//       const untaken = this.roundDefs[round].untakenValue;
//       // @ts-expect-error
//       return typeof untaken === "function" ? untaken() : untaken
//     }
//     return current
//   }
//   getRoundStats<K extends keyof RoundDefs>(round: K): RoundDefs[K] extends TurnMeta<any, infer S, any> ? S : never {
//     // @ts-ignore
//     return this.roundDefs[round].turnStats(this.getValue(round));
//   }
//   get deltaScores() {
//     return (Array.isArray(this.roundDefs)
//       ? this.roundDefs.map((def, round) => def.deltaScore(this.getValue(round)))
//       : [...Object.entries(this.roundDefs)].reduce((acc, [round, def]) => Object.assign(acc, { [round]: def.deltaScore(this.getValue(round)) }), {})
//     ) as {
//       [K in keyof RoundDefs]: number;
//     }
//   }
// }

// interface PlayerGameState<PlayerState, RoundDefs extends Record<any, TurnMeta<any, any, any>> | TurnMeta<any, any, any>[]> {
//   readonly state: PlayerState;
//   // readonly rounds: {
//   //   [K in keyof RoundDefs]?: RoundDefs[K] extends TurnMeta<infer V, infer Stats, infer UntakenVal>
//   //     ? V
//   //     : never;
//   // };
//   getRaw: <K extends keyof RoundDefs>(round: K) => RoundDefs[K] extends TurnMeta<infer V, any, any> ? V | undefined : never;
//   getForCalc: <K extends keyof RoundDefs>(round: K) => RoundDefs[K] extends TurnMeta<any, any, infer UntakenVal> ? UntakenVal : never;
// }

// const playerGameState = <PlayerState, RoundDefs extends Record<any, TurnMeta<any, any, any>> | TurnMeta<any, any, any>[]>(
//   makeInitialState: InitialStateFactory<PlayerState>,
//   roundDefs: RoundDefs,
// ) => (playerId: string): PlayerGameState<PlayerState, RoundDefs> => {
//   type Raw = {
//     [K in keyof RoundDefs]?: RoundDefs[K] extends TurnMeta<infer V, any, infer UntakenVal>
//       ? V
//       : never;
//   };
//   type Untaken = {
//     [K in keyof RoundDefs]: RoundDefs[K] extends TurnMeta<any, any, infer UntakenVal>
//       ? () => UntakenVal
//       : never;
//   };
//   const state = makeInitialState(playerId);
//   const untakenValues = (Array.isArray(roundDefs)
//     ? Array.from(roundDefs, (def: TurnMeta<any, any, any>) => {
//       switch (typeof def.untakenValue) {
//         case "undefined":
//           return () => undefined;
//         case "function":
//           return def.untakenValue;
//         default:
//           return () => structuredClone(def.untakenValue);
//       }
//     })
//     : {}) as Untaken
//   const rawValues = (Array.isArray(roundDefs)
//     ? Array.from(roundDefs, () => undefined)
//     : {}) as Raw
//   return {
//     state,
//     getRaw: <K extends keyof RoundDefs>(round: K) => rawValues
//   }
// }

type T27 = GameStateFor<
  ArrayGameDef<
    "twentyseven",
    { score: number; jesus?: boolean },
    NumericRange<4>,
    { cliff: boolean; dd: boolean; hits: number },
    NumericRange<4>,
    20
  >
>;

type TObj = GameStateFor<
  ObjectGameDef<
    "twentyseven",
    { score: number; foo?: boolean; bar?: number },
    {
      round1: TurnMeta<number, { baz: number; far: boolean }, number | undefined>;
      round2: TurnMeta<number, { baz: number; far: boolean }, number | undefined>;
      round3: TurnMeta<number, { x: number; y: boolean }, number | undefined>;
      round4: TurnMeta<number, {}, number | undefined>;
      round5: TurnMeta<number, { y: number }, number | undefined>;
    }
  >
>;
