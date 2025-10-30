import type { NumericRange, ValuesSubset } from "@/utils/types";
import type { InitialStateFactory, Position } from "..";
import {
  defineTurn,
  type TurnMeta,
  type TurnMetaDef,
  type TurnMetaDefFor,
  type TurnMetaDefLookup,
} from "../rounds";
import type { FullStatsFactory, PlayerDataRaw, SoloStatsFactory } from "../types";
import { GameDefinition, type DatabaseAdapter } from "../definition";
import type { GameResult } from "../gameResult";

type GameDefBuilderBase<GameType extends string, PlayerState extends {}, SharedState extends {}> = {
  /** Unique identifier for this game type. */
  readonly gameType: GameType;
  /** Factory to make the initial state for a given player */
  readonly makeInitialPlayerState: InitialStateFactory<PlayerState>;
  /** Factory to make shared game state */
  readonly makeSharedState: () => SharedState;
};

export function gameDefinitionBuilder<GameType extends string>(
  gameType: GameType,
): <PlayerState extends {}, SharedState extends {}>(
  makeInitialState: InitialStateFactory<PlayerState>,
  makeSharedState: () => SharedState,
) => GameDefBuilder<GameType, PlayerState, SharedState>;
export function gameDefinitionBuilder<
  GameType extends string,
  PlayerState extends {},
  SharedState extends {},
>(
  gameType: GameType,
  makeInitialState: InitialStateFactory<PlayerState>,
  makeSharedState: () => SharedState,
): GameDefBuilder<GameType, PlayerState, SharedState>;
export function gameDefinitionBuilder<
  GameType extends string,
  PlayerState extends {},
  SharedState extends {},
>(
  gameType: GameType,
  makeInitialState?: InitialStateFactory<PlayerState>,
  makeSharedState?: () => SharedState,
) {
  return makeInitialState === undefined
    ? <PlayerState extends {}, SharedState extends {}>(
        makeInitialState: InitialStateFactory<PlayerState>,
        makeSharedState: () => SharedState,
      ) =>
        new GameDefBuilder<GameType, PlayerState, SharedState>(
          gameType,
          makeInitialState,
          makeSharedState,
        )
    : new GameDefBuilder(gameType, makeInitialState, makeSharedState!);
}

class GameDefBuilder<GameType extends string, PlayerState extends {}, SharedState extends {}>
  implements GameDefBuilderBase<GameType, PlayerState, SharedState>
{
  constructor(
    readonly gameType: GameType,
    readonly makeInitialPlayerState: InitialStateFactory<PlayerState>,
    readonly makeSharedState: () => SharedState,
  ) {}

  // @ts-ignore
  // No args (only types specified)
  withArrayRounds<V, Stats>(): {
    <Len extends number>(
      length: Len,
      turnFactory: (index: NumericRange<Len>) => TurnMetaDef<V, Stats>,
    ): TurnMetaDefLookup<ReturnType<typeof turnFactory>> extends TurnMeta<
      any,
      any,
      infer UntakenVal
    >
      ? ArrayGameDefBuilderNoStats<GameType, PlayerState, SharedState, V, Stats, UntakenVal, Len>
      : unknown;
    (
      turnFactory: (index: number) => TurnMetaDef<V, Stats>,
    ): TurnMetaDefLookup<ReturnType<typeof turnFactory>> extends TurnMeta<
      any,
      any,
      infer UntakenVal
    >
      ? ArrayGameDefBuilderNoStats<GameType, PlayerState, SharedState, V, Stats, UntakenVal, number>
      : unknown;
  };
  // Single arg (dynamic length)
  withArrayRounds<V, Stats>(
    turnFactory: (index: number) => TurnMetaDef<V, Stats>,
  ): TurnMetaDefLookup<ReturnType<typeof turnFactory>> extends TurnMeta<any, any, infer UntakenVal>
    ? ArrayGameDefBuilderNoStats<GameType, PlayerState, SharedState, V, Stats, UntakenVal, number>
    : unknown;
  // 2 args (fixed length, factory)
  withArrayRounds<V, Stats, Len extends number>(
    length: Len,
    turnFactory: (index: NumericRange<Len>) => TurnMetaDef<V, Stats>,
  ): TurnMetaDefLookup<ReturnType<typeof turnFactory>> extends TurnMeta<any, any, infer UntakenVal>
    ? ArrayGameDefBuilderNoStats<GameType, PlayerState, SharedState, V, Stats, UntakenVal, Len>
    : unknown;
  withArrayRounds<V, Stats, Len extends number>(
    maybeLenOrFactory?: Len | ((index: number) => TurnMetaDef<V, Stats>),
    maybeFactory?: (index: number) => TurnMetaDef<V, Stats>,
  ) {
    return maybeLenOrFactory === undefined
      ? this.withArrayRounds.bind(this)
      : maybeFactory === undefined
        ? new ArrayGameDefBuilderNoStats(
            this,
            maybeLenOrFactory as (index: number) => TurnMetaDef<V, Stats>,
          )
        : new ArrayGameDefBuilderNoStats(this, maybeLenOrFactory as Len, maybeFactory);
  }

  withObjRounds<Rounds extends Record<any, TurnMetaDef<any, any>>, Order extends (keyof Rounds)[]>(
    rounds: Rounds,
    order: Order,
  ) {
    return new ObjectGameDefBuilder<
      GameType,
      PlayerState,
      SharedState,
      {
        [K in keyof Rounds]: TurnMetaDefLookup<Rounds[K]>;
      },
      Order
      // @ts-ignore
    >(this, rounds, order);
  }
}

export class ArrayGameDefBuilder<
  GameType extends string,
  PlayerState extends {},
  SharedState extends {},
  V,
  RoundStats,
  UntakenVal extends V | undefined,
  Len extends number,
  SoloStats extends {} = {},
  FullPlayerStats extends {} = {},
> implements GameDefBuilderBase<GameType, PlayerState, SharedState>
{
  readonly gameType: GameType;
  readonly makeInitialPlayerState: InitialStateFactory<PlayerState>;
  readonly makeSharedState: () => SharedState;

  readonly turnFactory: (index: NumericRange<Len>) => TurnMeta<V, RoundStats, UntakenVal>;
  readonly maxLength: Len;
  private cachedRoundMeta: TurnMeta<V, RoundStats, UntakenVal>[] = [];

  readonly soloStatsFactory: SoloStatsFactory<
    PlayerState,
    {
      valueType: UntakenVal;
      statsType: RoundStats;
      length: Len;
    },
    SoloStats
  >;
  readonly fullStatsFactory: FullStatsFactory<
    PlayerState,
    SharedState,
    {
      valueType: UntakenVal;
      statsType: RoundStats;
      length: Len;
    },
    SoloStats,
    FullPlayerStats
  >;

  constructor(
    {
      gameType,
      makeInitialPlayerState,
      makeSharedState,
    }: GameDefBuilderBase<GameType, PlayerState, SharedState>,
    length: Len,
    turnFactory: (index: NumericRange<Len>) => TurnMetaDef<V, RoundStats>,
    soloStatsFactory: SoloStatsFactory<
      PlayerState,
      {
        valueType: UntakenVal;
        statsType: RoundStats;
        length: Len;
      },
      SoloStats
    >,
    fullStatsFactory: FullStatsFactory<
      PlayerState,
      SharedState,
      {
        valueType: UntakenVal;
        statsType: RoundStats;
        length: Len;
      },
      SoloStats,
      FullPlayerStats
    >,
  );
  constructor(
    {
      gameType,
      makeInitialPlayerState,
      makeSharedState,
    }: GameDefBuilderBase<GameType, PlayerState, SharedState>,
    turnFactory: (index: number) => TurnMetaDef<V, RoundStats>,
    soloStatsFactory: SoloStatsFactory<
      PlayerState,
      {
        valueType: UntakenVal;
        statsType: RoundStats;
        length: Len;
      },
      SoloStats
    >,
    fullStatsFactory: FullStatsFactory<
      PlayerState,
      SharedState,
      {
        valueType: UntakenVal;
        statsType: RoundStats;
        length: Len;
      },
      SoloStats,
      FullPlayerStats
    >,
  );
  constructor(
    gameType: GameType,
    makeInitialPlayerState: InitialStateFactory<PlayerState>,
    makeSharedState: () => SharedState,
    turnFactory: (index: number) => TurnMetaDef<V, RoundStats>,
    soloStatsFactory: SoloStatsFactory<
      PlayerState,
      {
        valueType: UntakenVal;
        statsType: RoundStats;
        length: Len;
      },
      SoloStats
    >,
    fullStatsFactory: FullStatsFactory<
      PlayerState,
      SharedState,
      {
        valueType: UntakenVal;
        statsType: RoundStats;
        length: Len;
      },
      SoloStats,
      FullPlayerStats
    >,
  );
  constructor(
    gameType: GameType,
    makeInitialPlayerState: InitialStateFactory<PlayerState>,
    makeSharedState: () => SharedState,
    length: Len,
    turnFactory: (index: NumericRange<Len>) => TurnMetaDef<V, RoundStats>,
    soloStatsFactory: SoloStatsFactory<
      PlayerState,
      {
        valueType: UntakenVal;
        statsType: RoundStats;
        length: Len;
      },
      SoloStats
    >,
    fullStatsFactory: FullStatsFactory<
      PlayerState,
      SharedState,
      {
        valueType: UntakenVal;
        statsType: RoundStats;
        length: Len;
      },
      SoloStats,
      FullPlayerStats
    >,
  );
  constructor(
    baseOrGameType: GameType | GameDefBuilderBase<GameType, PlayerState, SharedState>,
    // (base: PS factory) else (Len | turnDef)
    arg1:
      | InitialStateFactory<PlayerState>
      | Len
      | ((index: NumericRange<Len>) => TurnMetaDef<V, RoundStats>),
    // (base: SS factory) else (turnDef | Solo)
    arg2:
      | (() => SharedState)
      | ((index: NumericRange<Len>) => TurnMetaDef<V, RoundStats>)
      | SoloStatsFactory<
          PlayerState,
          {
            valueType: UntakenVal;
            statsType: RoundStats;
            length: Len;
          },
          SoloStats
        >,
    // (base: Len | turnDef | Solo | Full
    arg3:
      | Len
      | ((index: NumericRange<Len>) => TurnMetaDef<V, RoundStats>)
      | SoloStatsFactory<
          PlayerState,
          {
            valueType: UntakenVal;
            statsType: RoundStats;
            length: Len;
          },
          SoloStats
        >
      | FullStatsFactory<
          PlayerState,
          SharedState,
          {
            valueType: UntakenVal;
            statsType: RoundStats;
            length: Len;
          },
          SoloStats,
          FullPlayerStats
        >,
    // (base: turnDef | Solo | Full
    arg4?:
      | ((index: NumericRange<Len>) => TurnMetaDef<V, RoundStats>)
      | SoloStatsFactory<
          PlayerState,
          {
            valueType: UntakenVal;
            statsType: RoundStats;
            length: Len;
          },
          SoloStats
        >
      | FullStatsFactory<
          PlayerState,
          SharedState,
          {
            valueType: UntakenVal;
            statsType: RoundStats;
            length: Len;
          },
          SoloStats,
          FullPlayerStats
        >,
    // (base: (len ? Full : Solo))
    arg5?:
      | SoloStatsFactory<
          PlayerState,
          {
            valueType: UntakenVal;
            statsType: RoundStats;
            length: Len;
          },
          SoloStats
        >
      | FullStatsFactory<
          PlayerState,
          SharedState,
          {
            valueType: UntakenVal;
            statsType: RoundStats;
            length: Len;
          },
          SoloStats,
          FullPlayerStats
        >,
    // (base: Full)
    arg6?: FullStatsFactory<
      PlayerState,
      SharedState,
      {
        valueType: UntakenVal;
        statsType: RoundStats;
        length: Len;
      },
      SoloStats,
      FullPlayerStats
    >,
  ) {
    let args: [
      (index: NumericRange<Len>) => TurnMetaDef<V, RoundStats>,
      SoloStatsFactory<
        PlayerState,
        {
          valueType: UntakenVal;
          statsType: RoundStats;
          length: Len;
        },
        SoloStats
      >,
      FullStatsFactory<
        PlayerState,
        SharedState,
        {
          valueType: UntakenVal;
          statsType: RoundStats;
          length: Len;
        },
        SoloStats,
        FullPlayerStats
      >,
      Len | undefined,
    ];
    if (typeof baseOrGameType === "string") {
      this.gameType = baseOrGameType;
      this.makeInitialPlayerState = arg1 as InitialStateFactory<PlayerState>;
      this.makeSharedState = arg2 as () => SharedState;
      args =
        typeof arg3 === "number"
          ? [
              arg4 as (index: NumericRange<Len>) => TurnMetaDef<V, RoundStats>,
              arg5 as SoloStatsFactory<
                PlayerState,
                {
                  valueType: UntakenVal;
                  statsType: RoundStats;
                  length: Len;
                },
                SoloStats
              >,
              arg6 as FullStatsFactory<
                PlayerState,
                SharedState,
                {
                  valueType: UntakenVal;
                  statsType: RoundStats;
                  length: Len;
                },
                SoloStats,
                FullPlayerStats
              >,
              arg3 as Len,
            ]
          : [
              arg3 as (index: number) => TurnMetaDef<V, RoundStats>,
              arg4 as SoloStatsFactory<
                PlayerState,
                {
                  valueType: UntakenVal;
                  statsType: RoundStats;
                  length: Len;
                },
                SoloStats
              >,
              arg5 as FullStatsFactory<
                PlayerState,
                SharedState,
                {
                  valueType: UntakenVal;
                  statsType: RoundStats;
                  length: Len;
                },
                SoloStats,
                FullPlayerStats
              >,
              undefined,
            ];
    } else {
      const { gameType, makeInitialPlayerState, makeSharedState } = baseOrGameType;
      this.gameType = gameType;
      this.makeInitialPlayerState = makeInitialPlayerState;
      this.makeSharedState = makeSharedState;
      args =
        typeof arg1 === "number"
          ? [
              arg2 as (index: NumericRange<Len>) => TurnMetaDef<V, RoundStats>,
              arg3 as SoloStatsFactory<
                PlayerState,
                {
                  valueType: UntakenVal;
                  statsType: RoundStats;
                  length: Len;
                },
                SoloStats
              >,
              arg4 as FullStatsFactory<
                PlayerState,
                SharedState,
                {
                  valueType: UntakenVal;
                  statsType: RoundStats;
                  length: Len;
                },
                SoloStats,
                FullPlayerStats
              >,
              arg1 as Len,
            ]
          : [
              arg1 as (index: NumericRange<Len>) => TurnMetaDef<V, RoundStats>,
              arg2 as SoloStatsFactory<
                PlayerState,
                {
                  valueType: UntakenVal;
                  statsType: RoundStats;
                  length: Len;
                },
                SoloStats
              >,
              arg3 as FullStatsFactory<
                PlayerState,
                SharedState,
                {
                  valueType: UntakenVal;
                  statsType: RoundStats;
                  length: Len;
                },
                SoloStats,
                FullPlayerStats
              >,
              undefined,
            ];
    }
    // @ts-ignore
    this.turnFactory = (i) => defineTurn(args[0]!(i));
    this.maxLength = args.length >= 4 ? args[3]! : (Number.MAX_SAFE_INTEGER as Len);
    this.soloStatsFactory = args[1];
    this.fullStatsFactory = args[2];
  }

  getRound(index: NumericRange<Len>): TurnMeta<V, RoundStats, UntakenVal> {
    if (index < 0 || index >= this.maxLength) {
      throw Error(`Out of round range! ${index} / ${this.maxLength}`);
    }
    let m = this.cachedRoundMeta.at(index);
    if (m === undefined) {
      m = this.turnFactory(index);
      this.cachedRoundMeta[index as number] = m;
    }
    return m;
  }

  build<
    Config,
    GResult extends GameResult<
      PlayerDataRaw<
        PlayerState,
        {
          valueType: UntakenVal;
          statsType: RoundStats;
          length: Len;
        }
      >
    > = GameResult<
      PlayerDataRaw<
        PlayerState,
        {
          valueType: UntakenVal;
          statsType: RoundStats;
          length: Len;
        }
      >
    >,
  >(
    positionOrder: "highestFirst" | "lowestFirst",
    dbAdapter: DatabaseAdapter<Config, GResult>,
  ): GameDefinition<
    GameType,
    Config,
    GResult,
    PlayerState,
    SharedState,
    {
      valueType: UntakenVal;
      statsType: RoundStats;
      length: Len;
    },
    SoloStats,
    FullPlayerStats
  > {
    return new GameDefinition(
      this.gameType,
      dbAdapter,
      positionOrder,
      this.makeSharedState,
      this.makeInitialPlayerState,
      this.soloStatsFactory,
      this.fullStatsFactory,
      // @ts-expect-error
      this.turnFactory,
    );
  }
}

class ArrayGameDefBuilderNoStats<
  GameType extends string,
  PlayerState extends {},
  SharedState extends {},
  V,
  RoundStats,
  UntakenVal extends V | undefined,
  Len extends number,
> extends ArrayGameDefBuilder<
  GameType,
  PlayerState,
  SharedState,
  V,
  RoundStats,
  UntakenVal,
  Len,
  {},
  {}
> {
  constructor(
    {
      gameType,
      makeInitialPlayerState,
      makeSharedState,
    }: GameDefBuilderBase<GameType, PlayerState, SharedState>,
    length: Len,
    turnFactory: (index: NumericRange<Len>) => TurnMetaDef<V, RoundStats>,
  );
  constructor(
    {
      gameType,
      makeInitialPlayerState,
      makeSharedState,
    }: GameDefBuilderBase<GameType, PlayerState, SharedState>,
    turnFactory: (index: number) => TurnMetaDef<V, RoundStats>,
  );
  constructor(
    gameType: GameType,
    makeInitialPlayerState: InitialStateFactory<PlayerState>,
    makeSharedState: () => SharedState,
    turnFactory: (index: number) => TurnMetaDef<V, RoundStats>,
  );
  constructor(
    gameType: GameType,
    makeInitialPlayerState: InitialStateFactory<PlayerState>,
    makeSharedState: () => SharedState,
    length: Len,
    turnFactory: (index: NumericRange<Len>) => TurnMetaDef<V, RoundStats>,
  );
  constructor(
    baseOrGameType: GameType | GameDefBuilderBase<GameType, PlayerState, SharedState>,
    arg1:
      | InitialStateFactory<PlayerState>
      | Len
      | ((index: NumericRange<Len>) => TurnMetaDef<V, RoundStats>),
    arg2?: (() => SharedState) | ((index: NumericRange<Len>) => TurnMetaDef<V, RoundStats>),
    arg3?: Len | ((index: NumericRange<Len>) => TurnMetaDef<V, RoundStats>),
    arg4?: (index: NumericRange<Len>) => TurnMetaDef<V, RoundStats>,
  ) {
    super(
      // @ts-expect-error
      baseOrGameType,
      arg1,
      arg2,
      arg3,
      arg4,
      () => ({}),
      () => ({}),
    );
  }

  // Curried no solo
  withGameStats(solo?: undefined): <FullPlayerStats extends {}>(
    fullStatsFactory: FullStatsFactory<
      PlayerState,
      SharedState,
      {
        valueType: UntakenVal;
        statsType: RoundStats;
        length: Len;
      },
      {},
      FullPlayerStats
    >,
  ) => ArrayGameDefBuilder<
    GameType,
    PlayerState,
    SharedState,
    V,
    RoundStats,
    UntakenVal,
    Len,
    {},
    FullPlayerStats
  >;
  // Curried with solo
  withGameStats<SoloStats extends {}>(
    soloStatsFactory: SoloStatsFactory<
      PlayerState,
      {
        valueType: UntakenVal;
        statsType: RoundStats;
        length: Len;
      },
      SoloStats
    >,
  ): <FullPlayerStats extends {}>(
    fullStatsFactory: FullStatsFactory<
      PlayerState,
      SharedState,
      {
        valueType: UntakenVal;
        statsType: RoundStats;
        length: Len;
      },
      {},
      FullPlayerStats
    >,
  ) => ArrayGameDefBuilder<
    GameType,
    PlayerState,
    SharedState,
    V,
    RoundStats,
    UntakenVal,
    Len,
    SoloStats,
    FullPlayerStats
  >;
  // Non curried no solo
  withGameStats<FullPlayerStats extends {}>(
    solo: undefined,
    fullStatsFactory: FullStatsFactory<
      PlayerState,
      SharedState,
      {
        valueType: UntakenVal;
        statsType: RoundStats;
        length: Len;
      },
      {},
      FullPlayerStats
    >,
  ): ArrayGameDefBuilder<
    GameType,
    PlayerState,
    SharedState,
    V,
    RoundStats,
    UntakenVal,
    Len,
    {},
    FullPlayerStats
  >;
  // Non curried with solo
  withGameStats<SoloStats extends {}, FullPlayerStats extends {}>(
    soloStatsFactory: SoloStatsFactory<
      PlayerState,
      {
        valueType: UntakenVal;
        statsType: RoundStats;
        length: Len;
      },
      SoloStats
    >,
    fullStatsFactory: FullStatsFactory<
      PlayerState,
      SharedState,
      {
        valueType: UntakenVal;
        statsType: RoundStats;
        length: Len;
      },
      {},
      FullPlayerStats
    >,
  ): ArrayGameDefBuilder<
    GameType,
    PlayerState,
    SharedState,
    V,
    RoundStats,
    UntakenVal,
    Len,
    SoloStats,
    FullPlayerStats
  >;
  withGameStats<SoloStats extends {}, FullPlayerStats extends {}>(
    soloStatsFactory?: SoloStatsFactory<
      PlayerState,
      {
        valueType: UntakenVal;
        statsType: RoundStats;
        length: Len;
      },
      SoloStats
    >,
    fullStatsFactory?: FullStatsFactory<
      PlayerState,
      SharedState,
      {
        valueType: UntakenVal;
        statsType: RoundStats;
        length: Len;
      },
      {},
      FullPlayerStats
    >,
  ) {
    const args =
      this.maxLength === Number.MAX_SAFE_INTEGER
        ? [this.gameType, this.makeInitialPlayerState, this.makeSharedState, this.turnFactory]
        : [
            this.gameType,
            this.makeInitialPlayerState,
            this.makeSharedState,
            this.maxLength,
            this.turnFactory,
          ];
    return fullStatsFactory
      ? new ArrayGameDefBuilder<
          GameType,
          PlayerState,
          SharedState,
          V,
          RoundStats,
          UntakenVal,
          Len,
          SoloStats,
          FullPlayerStats
        >(
          // @ts-ignore
          ...args,
          soloStatsFactory,
          fullStatsFactory,
        )
      : soloStatsFactory
        ? <FS extends {}>(
            fullStatsFactory: FullStatsFactory<
              PlayerState,
              SharedState,
              {
                valueType: UntakenVal;
                statsType: RoundStats;
                length: Len;
              },
              SoloStats,
              FS
            >,
          ) =>
            new ArrayGameDefBuilder<
              GameType,
              PlayerState,
              SharedState,
              V,
              RoundStats,
              UntakenVal,
              Len,
              SoloStats,
              FS
            >(
              // @ts-ignore
              ...args,
              soloStatsFactory,
              fullStatsFactory,
            )
        : <FS extends {}>(
            fullStatsFactory: FullStatsFactory<
              PlayerState,
              SharedState,
              {
                valueType: UntakenVal;
                statsType: RoundStats;
                length: Len;
              },
              {},
              FS
            >,
          ) =>
            new ArrayGameDefBuilder<
              GameType,
              PlayerState,
              SharedState,
              V,
              RoundStats,
              UntakenVal,
              Len,
              {},
              FS
            >(
              // @ts-ignore
              ...args,
              () => ({}),
              fullStatsFactory,
            );
  }
}

type TurnMetaDefObj<Rounds extends Record<any, TurnMeta<any, any, any>>> = {
  [K in keyof Rounds]: Rounds[K] extends TurnMeta<infer V, infer S, infer U>
    ? TurnMetaDefFor<V, S, U>
    : never;
};

class ObjectGameDefBuilder<
  GameType extends string,
  PlayerState extends {},
  SharedState extends {},
  Rounds extends Record<any, TurnMeta<any, any, any>>,
  Order extends (keyof Rounds)[],
> implements GameDefBuilderBase<GameType, PlayerState, SharedState>
{
  readonly gameType: GameType;
  readonly makeInitialPlayerState: InitialStateFactory<PlayerState>;
  readonly makeSharedState: () => SharedState;

  readonly rounds: Rounds;
  readonly order: Order;

  constructor(
    {
      gameType,
      makeInitialPlayerState,
      makeSharedState,
    }: GameDefBuilderBase<GameType, PlayerState, SharedState>,
    rounds: TurnMetaDefObj<Rounds>,
    order: Order,
  );
  constructor(
    gameType: GameType,
    makeInitialPlayerState: InitialStateFactory<PlayerState>,
    makeSharedState: () => SharedState,
    rounds: TurnMetaDefObj<Rounds>,
    order: Order,
  );
  constructor(
    baseOrGameType: GameType | GameDefBuilderBase<GameType, PlayerState, SharedState>,
    pStateOrRounds: InitialStateFactory<PlayerState> | TurnMetaDefObj<Rounds>,
    sStateOrOrder?: (() => SharedState) | Order,
    maybeRounds?: TurnMetaDefObj<Rounds>,
    maybeOrder?: Order,
  ) {
    let roundDefs: TurnMetaDefObj<Rounds>;
    if (typeof baseOrGameType === "string") {
      this.gameType = baseOrGameType;
      this.makeInitialPlayerState = pStateOrRounds as InitialStateFactory<PlayerState>;
      this.makeSharedState = sStateOrOrder as () => SharedState;
      roundDefs = maybeRounds!;
      this.order = maybeOrder!;
    } else {
      const { gameType, makeInitialPlayerState, makeSharedState } = baseOrGameType;
      this.gameType = gameType;
      this.makeInitialPlayerState = makeInitialPlayerState;
      this.makeSharedState = makeSharedState;
      roundDefs = pStateOrRounds as TurnMetaDefObj<Rounds>;
      this.order = sStateOrOrder as Order;
    }
    this.rounds = this.order.reduce(
      (rounds: Rounds, key) => Object.assign(rounds, { [key]: defineTurn(roundDefs[key]) }),
      {} as Rounds,
    );
  }
}
