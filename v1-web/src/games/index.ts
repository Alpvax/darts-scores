import { ZodTypeAny, TypeOf } from "zod";
import { PlayerStatsHolder, StatsCounterFactory, statsCounterFactory } from "./summary/v2";

export type PlayerResultGetter<GR, PR> = (gameResult: GR, playerId: string) => PR;


type SummaryMetadata<GR, PS, F extends {
  [k: string]: SummaryFieldDeclaration<GR, PS>;
}> = {
  /** Function to get the total number of games played in order to calculate rates */
  numGamesGetter: (stats: PS) => number;
  /** Default (maximum) number of fixed digits to display for rates. If not specified, = 2 */
  defaultRateFractionalDigits?: number;
  fieldOrder: (keyof F)[];
}

type SFDecGame<GR> = {
  label: string;
  type: "game";
  value: (
    stats: GR,
    previous: number | undefined,
    extras: {
      playerId: string;
      // /**
      //  * @param stat the key of the value to convert to a rate using
      //  * `summaryMetadata.numGamesGetter` as the divisor
      //  * @param fixed the (maximum) number of digits to have after the decimal.
      //  * If undefined, the `summaryMetadata.defaultRateFractionalDigits` value is used.
      //  */
      // rate: (stat: string, fixed?: number) => number;
    },
  ) => number;
};
type SFDecPlayer<PS> = {
  label: string;
  type: "player";
  value: (
    stats: PS,
    extras: {
      playerId: string;
      /**
       * @param stat the value to convert to a rate using `summaryMetadata.numGamesGetter`
       * as the divisor
       * @param fixed the (maximum) number of digits to have after the decimal.
       * If < 0, default `toFixed` behaviour is used.
       * If undefined, the `summaryMetadata.defaultRateFractionalDigits` value is used.
       */
      rate: (stat: number, fixed?: number) => number;
    },
  ) => number;
};
type SFDecRate<GR, PS, K extends keyof (GR | PS)> = {
  label: string;
  type: "rate";
  input: K;
  /**
   * Formatting for the rate.
   * If number, the maximum number of fractional digits (after '.')
   * If undefined, `summaryMetadata.defaultRateFractionalDigits` value is used as the number.
   * Otherwise, the function is called with the rate.
   */
  display?: number | ((rate: number) => number);
}
export type SummaryFieldDeclaration<GR, PS> =
  SFDecGame<GR> | SFDecPlayer<PS> | SFDecRate<GR, PS, any>;
export type SummaryFieldDeclarations<GR, PS> = {
  [k: string]: SummaryFieldDeclaration<GR, PS>;
};
// export type SummaryFieldDeclarations<GR, PS> = {
//   numGames: (playerStats: PS) => number;
//   defaultFixed?: number;
//   gameFields: {
//     [k: string]: SFDecGame<GR, any>;
//   };
//   playerFields: {
//     [k: string]: SFDecPlayer<PS, any>;
//   };
// };

// type SummaryTypeRaw<SF extends SummaryFieldDeclarations<any, any>> = {
//   [K in keyof SF]: number;
// }
type SummaryType<SF extends SummaryFieldDeclarations<any, any>> = {
  [K in keyof SF]: number;
};
// type SummaryType<SF extends SummaryFieldDeclarations<any, any>> = SummaryTypeRaw<SF> & {
//   [K in keyof SF & string as `${K}Rate`]?: SF[K] extends SummaryFieldDeclaration<any, any, infer R>
//     ? R extends true ? number : never
//     : never
// };
// type SummaryTypeRatesToCalc<SF extends SummaryFieldDeclarations<any, any>> = {
//   [K in keyof SF & string as `${K}Rate`]: SF[K] extends SFDecGame<any, infer R>
//     ? R extends true ? number : never
//     : never
// }

// type AdditionalRate<
//   F extends { [k: string]: SummaryFieldDeclaration<any, any, any> },
//   K extends keyof F,
// > =
//   F[K] extends SummaryFieldDeclaration<any, any, infer R>
//     ? R extends false
//       ? never
//       : number
//     : never;
// type SummaryTypeRaw<SF extends SummaryFieldDeclarations<any, any>> = {
//   [K in keyof SF["gameFields"] & SF["playerFields"]]: number;
//   // SF["gameFields"][K] extends SummaryFieldDeclaration<any, any, any> ? T :
//   //   SF["playerFields"][K] extends SummaryFieldDeclaration<any, any, any> ? T : never;
// };
// type SummaryType<SF extends SummaryFieldDeclarations<any, any>> = {
//   [K in keyof SF["gameFields"] & SF["playerFields"]]: number;
//   // SF["gameFields"][K] extends SummaryFieldDeclaration<any, any, any, any> ? number :
//   //   SF["playerFields"][K] extends SummaryFieldDeclaration<any, any, any, any> ? number : never;
// } & {
//   [K in keyof SF["gameFields"] & SF["playerFields"] & string as `${K}Rate`]:
//   SF["gameFields"][K] extends SummaryFieldDeclaration<any, any, any>
//     ? AdditionalRate<SF["gameFields"], K>
//     : SF["gameFields"][K] extends SummaryFieldDeclaration<any, any, any>
//       ? AdditionalRate<SF["playerFields"], K>
//       : never;
// };

export type GameType<
  GR,
  PR,
  PS extends ZodTypeAny,
  SF extends SummaryFieldDeclarations<GR, TypeOf<PS>>,
> = {
  readonly key: string;
  readonly listPlayers: (gameResult: GR) => string[];
  readonly getPlayerResult: PlayerResultGetter<GR, PR>;
  readonly playerStatsFactory: StatsCounterFactory<PS, PR>;
  summaryFieldsDeclaration: SF;
  summaryMetadata: SummaryMetadata<GR, TypeOf<PS>, SF>;
};

export const buildStats = <
  GR,
  PR,
  PS extends ZodTypeAny,
  SF extends SummaryFieldDeclarations<GR, TypeOf<PS>>,
>(gameType: GameType< GR, PR, PS, SF>, games: Iterable<GR>): Map<string, SummaryType<SF>> => {
  const summary = new Map<string, SummaryType<SF>>();
  const ratesToCalc: Map<string, Map<keyof SF, {
    input?: keyof SummaryType<SF>;
    fmt: (stat: number) => number;
  }>> = new Map();
  const playerStatsHolders = new Map<string, PlayerStatsHolder<TypeOf<PS>, PR>>();
  // Default to 2 digits if not specified
  const defaultFixed = gameType.summaryMetadata.defaultRateFractionalDigits ?? 2;
  // Calculate game stats
  for (const game of games) {
    for (const playerId of gameType.listPlayers(game)) {
      if (!playerStatsHolders.has(playerId)) {
        playerStatsHolders.set(playerId, gameType.playerStatsFactory.create());
        summary.set(playerId, Object.assign({},
          ...gameType.summaryMetadata.fieldOrder.map(key => ({
            [key]: 0,
          })),
        ));
      }
      playerStatsHolders.get(playerId)!.add(gameType.getPlayerResult(game, playerId));
      const addRate = (
        stat: keyof SF,
        fmtfactory: () => (stat: number) => number,
        inputFactory?: () => keyof SummaryType<SF>,
      ): void => {
        if (!ratesToCalc.has(playerId)) {
          ratesToCalc.set(playerId, new Map());
        }
        if (!ratesToCalc.get(playerId)!.has(stat)) {
          ratesToCalc.get(playerId)!.set(stat, {
            input: inputFactory ? inputFactory() : undefined,
            fmt: fmtfactory(),
          });
        }
      };
      const extras = {
        playerId,
        rate: (stat: string, fixed?: number) => {
          addRate(stat, () => val => parseFloat(
            val.toFixed(fixed === undefined ? defaultFixed : fixed >= 0 ? fixed : undefined)));
          return 0;
        },
      };
      for (const [key, field] of gameType.summaryMetadata.fieldOrder.flatMap((k) => {
        const f = gameType.summaryFieldsDeclaration[k];
        return (f.type === "game" ? [[k, f]] : []) as [
          keyof SummaryType<SF>,
          SFDecGame<GR>,
        ][];
      })) {
        const playerSummary = summary.get(playerId) as SummaryType<SF>;
        playerSummary[key] = field.value(game, playerSummary[key], extras);
        // if (field.displayAdditionalRate !== undefined) {
        //   addRate(
        //     `${key as string}Rate`,
        //     () => {
        //       switch (typeof field.displayAdditionalRate) {
        //         case "boolean":
        //           return val => parseFloat(val.toFixed(defaultFixed));
        //         case "number":
        //           return val => parseFloat(val.toFixed(field.displayAdditionalRate as number));
        //         case "function":
        //           return field.displayAdditionalRate;
        //         default:
        //           throw Error(`Unreachable code reached! additional rate: ${
        //             JSON.stringify(field.displayAdditionalRate)
        //           }`);
        //       }
        //     },
        //     () => key,
        //   );
        // }
      }
    }
  }
  // Add player stats
  for (const [playerId, pSummary] of summary) {
    const numGames = gameType.summaryMetadata.numGamesGetter(pSummary);
    const rate = (val: number, fixed?: number): number => parseFloat((val / numGames)
      .toFixed(fixed === undefined ? defaultFixed : fixed >= 0 ? fixed : undefined));
    const extras = {
      playerId,
      rate,
    };
    for (const [key, field] of gameType.summaryMetadata.fieldOrder.flatMap((k) => {
      const f = gameType.summaryFieldsDeclaration[k];
      return (f.type === "player" ? [[k, f]] : []) as [keyof SF, SFDecPlayer<TypeOf<PS>>][];
    }) as [
      keyof SummaryType<SF>,
      SFDecPlayer<TypeOf<PS>>,
    ][]) {
      const value = field.value(playerStatsHolders.get(playerId)!, extras);
      (pSummary as SummaryType<SF>)[key] = value;
      // if (field.displayAdditionalRate !== undefined) {
      //   (pSummary as Record<string, number>)[(`${key as string}Rate`)] = (() => {
      //     switch (typeof field.displayAdditionalRate) {
      //       case "boolean":
      //         return rate(value);
      //       case "number":
      //         return rate(value, field.displayAdditionalRate);
      //       case "function":
      //         return field.displayAdditionalRate(value);
      //       default:
      //         throw Error(`Unreachable code reached! additional rate: ${
      //           JSON.stringify(field.displayAdditionalRate)
      //         }`);
      //     }
      //   })();
      // }
    }
    // if (ratesToCalc.has(playerId)) {
    //   for (const [key, rate] of ratesToCalc.get(playerId)!) {
    //     (pSummary as Record<string, number>)[key as string] =
    //       rate.fmt(pSummary[rate.input ?? key] / numGames);
    //   }
    // }
  }
  return summary;
};

export const makeGameType = <GR, PR>(
  key: string,
  listPlayers: (gameResult: GR) => string[],
  getPlayerResult: PlayerResultGetter<GR, PR>,
) => <
  PS extends ZodTypeAny,
  SF extends SummaryFieldDeclarations<GR, TypeOf<PS>>,
>(
  statsSchema: PS,
  statsAccumulator: (stats: TypeOf<PS>, playerGameResult: PR) => TypeOf<PS>,
  summaryFields: SF,
  summaryMetadata: SummaryMetadata<GR, TypeOf<PS>, SF>,
): GameType<GR, PR, PS, SF> => ({
  key,
  listPlayers,
  getPlayerResult,
  playerStatsFactory: statsCounterFactory(statsSchema, statsAccumulator),
  summaryFieldsDeclaration: summaryFields,
  summaryMetadata,
});

// type TestP = {
//   numGames: number;
//   cliffs: number;
// }
// const test = {
//   gameCount: {
//     label: "Total games played",
//     type: "player",
//     value: stats => stats.numGames,
//   } as SFDecPlayer<TestP, false>,
//   cliff: {
//     label: "Cliffs",
//     type: "player",
//     value: stats => stats.cliffs,
//     displayAdditionalRate: 2,
//   } as SFDecPlayer<TestP, true>,
//   win: {
//     label: "Wins",
//     type: "game",
//     value: (stats, prev) => prev ?? 0,
//     displayAdditionalRate: true,
//   } as SFDecGame<{}, true>,
// };
// type DAR = number | ((rate: number) => number) | undefined;
// const dar: DAR = 3;
// type GTTest = typeof test["cliff"];// extends SFDecWithRate ? true : false;
// type TEST = SummaryType<typeof test>;
// const testOut: TEST = {
//   cliff: 0,
//   cliffRate: 0,
//   gameCount: 1,
//   win: 1,
//   winRate: 1,
// };
// type T = typeof testOut;
// type ToCalc = SummaryTypeRatesToCalc<typeof test>;
