import type { VNodeChild } from "vue";
import type { IntoTaken, TurnData } from "../roundDeclaration";
import type { HighlightRules } from "./displayMetaV2";
import { BoolSummaryField, NumericSummaryField } from "./primitive";
import { countUntil, countWhile } from "./roundCount";
import { RoundStatsSummaryField, type RoundStatsDisplayMetaInput } from "./roundStats";
import { ScoreSummaryField, type ScoreEntryDisplay } from "./score";
import { WinSummaryField, type PlayerRequirements, type WinsDisplayMeta } from "./wins";

// Re-exports for convenience
export { type PlayerRequirements } from "./wins";

//TODO: use PlayerData instead of inline type declaration
export type PlayerDataForStats<T extends TurnData<any, any, any>> = {
  playerId: string;
  /** Whether the player has completed all rounds */
  complete: boolean;
  /** The final score if finished, or the current score if in progress */
  score: number;
  /**
   * A Map of the completed rounds, with non completed rounds missing from the map. <br/>
   * Key is round index; value is {@link TakenTurnData}, including the value, delta score of the round and score at this round.
   * */
  turns: Map<number, IntoTaken<T>>;
  /**
   * A Map of all the rounds. <br/>
   * Key is round index; value is {@link TurnData}, including the value, delta score of the round and score at this round.
   * */
  allTurns: Map<number, T>;
  /** The player's current position */
  position: number;
  /** A list of playerIds that the player is tied with, empty list for no players tied with this player */
  tied: string[];
};

export type GameResult<T extends TurnData<any, any, any>, P extends string = string> = {
  date: Date;
  /** Ordered list of players in game */
  players: { pid: P; displayName?: string; handicap?: number }[];
  results: Map<P, PlayerDataForStats<T>>;
  tiebreakWinner?: P;
};

interface SummaryValueRecord {
  [key: string]: SummaryValueRecord | number;
}

/**
 * Which value is the best value.
 * e.g. in golf, "lowest" score is the winning score.
 * but in 27, "highest" score is the winning score.
 */
export type ScoreDirection = "highest" | "lowest" | "none";

export interface SummaryEntryField<
  T extends TurnData<any, any, any>,
  E,
  S extends SummaryValueRecord,
> {
  /** Create an entry for a single game */
  //TODO: use PlayerData instead of inline type declaration
  entry(playerData: PlayerDataForStats<T>, opponents: string[], tiebreakWinner?: string): E;
  /** Create an empty summary (the initial / zero values, when no games have been played) */
  emptySummary(): S;
  /** Accumulate an entry into the summary */
  summary(accumulated: S, numGames: number, entry: E): S;
  /** Default display data */
  display: SummaryDisplayMetadata<S>;
}

export type EntryDisplayMetadataSingle<T> = {
  label?: string;
  display?: (value: T) => VNodeChild;
  /** Values to ignore highlighting for */
  ignoreHighlight?: (value: T) => boolean;
  combineTeamValues: (a: T, b: T) => T;
  combinedDisplay?: (value: T, playerCount: number, numFmt: Intl.NumberFormat) => VNodeChild;
};
export type EntryDisplayMetadataMultiple<T extends Record<string, any>> = {
  [K in keyof T & string]: EntryDisplayMetadata<T[K]>;
};
export type EntryDisplayMetadata<T> =
  T extends Record<string, any>
    ? EntryDisplayMetadataMultiple<T> | EntryDisplayMetadataSingle<T>
    : // Handle boolean expanding to `true | false`
      T extends boolean
      ? EntryDisplayMetadataSingle<boolean>
      : EntryDisplayMetadataSingle<T>;
export interface SummaryEntryFieldWithGameEntryDisplay<
  T extends TurnData<any, any, any>,
  E,
  S extends SummaryValueRecord,
  D extends EntryDisplayMetadata<E> = EntryDisplayMetadata<E>,
> extends SummaryEntryField<T, E, S> {
  entryFieldDisplay: D;
}

export type SummaryDisplayMetadata<S extends SummaryValueRecord> = {
  [K in FlattenSummaryKeysInternal<S>]?: FieldDisplayMetadata;
};
export type FieldDisplayMetadata = {
  best?: ScoreDirection; // | Ref<ScoreDirection>;
  label?: string; // | Ref<string>;
  formatArgs?: Intl.NumberFormatOptions; // | Ref<Intl.NumberFormatOptions>;
  highlight?: HighlightRules; // | Ref<HighlightRules>;
};
export type DisplayMetaArg<T, Keys extends string> =
  | T
  | { [K in Keys]?: T }
  | [T, { [K in Keys]?: T }];
export type DisplayMetaInputs<T extends Record<string, any>> = {
  best: ScoreDirection;
  label: DisplayMetaArg<string, keyof T & string>;
  format?: DisplayMetaArg<Intl.NumberFormatOptions, keyof T & string>;
  highlight?: DisplayMetaArg<HighlightRules, keyof T & string>;
};
type DisplayMetaInputsFor<T extends SummaryEntryField<any, any, any>> =
  T extends SummaryEntryField<any, any, infer S> ? DisplayMetaInputs<S> : never;
type DMIGetter<T extends Record<string, any>, V, U = V> = (
  key: keyof T & string,
  fallback?: (def: U, best: ScoreDirection) => V,
) => V;
export type NormalisedDisplayMetaInputs<T extends Record<string, any>> = {
  best: ScoreDirection;
  getLabel: DMIGetter<T, string | undefined, string>;
  getFormatArgs: DMIGetter<T, Intl.NumberFormatOptions | undefined>;
  getHighlight: DMIGetter<T, HighlightRules | undefined>;
  getMeta: (
    key: keyof T & string,
    fallbacks?: {
      label?: (def: string, best: ScoreDirection) => string | undefined;
      format?: (
        def: Intl.NumberFormatOptions | undefined,
        best: ScoreDirection,
      ) => Intl.NumberFormatOptions | undefined;
      highlight?: (
        def: HighlightRules | undefined,
        best: ScoreDirection,
      ) => HighlightRules | undefined;
    },
  ) => {
    best: ScoreDirection;
    label: string | undefined;
    formatArgs: Intl.NumberFormatOptions | undefined;
    highlight: HighlightRules | undefined;
  };
};
export const defaultHighlight = (
  h: HighlightRules | undefined,
  best: ScoreDirection,
): HighlightRules =>
  h === undefined
    ? best === "none"
      ? {}
      : {
          best,
        }
    : h;
export const defaultFmt = (f: Intl.NumberFormatOptions | undefined): Intl.NumberFormatOptions =>
  Object.assign({ maximumFractionDigits: 2 }, f);
export const defaultRateFmt = (f: Intl.NumberFormatOptions | undefined): Intl.NumberFormatOptions =>
  Object.assign({ style: "percent", maximumFractionDigits: 2 }, f);
export const normaliseDMI = <T extends Record<string, any>>(
  inputs: DisplayMetaInputs<T>,
): NormalisedDisplayMetaInputs<T> => {
  const makeFB = <T>(
    fallback?: (a: T, best: ScoreDirection) => T | undefined,
  ): ((a: T | undefined) => T | undefined) =>
    fallback ? (a) => fallback(a!, inputs.best) : (a) => a;
  const getLabel: DMIGetter<T, string | undefined, string> = (key, fallback) => {
    const fb = makeFB(fallback);
    switch (typeof inputs.label) {
      case "string":
        return fb(inputs.label);
      case "object":
        if (Array.isArray(inputs.label)) {
          return inputs.label[1][key] ?? fb(inputs.label[0]);
        }
        return inputs.label[key];
    }
  };
  const getFormatArgs: DMIGetter<T, Intl.NumberFormatOptions | undefined> = (key, fallback) => {
    const fb = makeFB(fallback ?? defaultFmt);
    if (inputs.format === undefined) {
      return fb(undefined);
    } else if (Array.isArray(inputs.format)) {
      return defaultFmt(inputs.format[1][key]) ?? fb(inputs.format[0]);
    } else if (Object.hasOwn(inputs.format, key)) {
      return defaultFmt((inputs.format as { [K in keyof T]?: Intl.NumberFormatOptions })[key]);
    }
    return fb(inputs.format);
  };
  const getHighlight: DMIGetter<T, HighlightRules | undefined> = (key, fallback) => {
    const fb = makeFB(fallback ?? defaultHighlight);
    if (inputs.highlight === undefined) {
      return fb(undefined);
    } else if (typeof inputs.highlight === "string") {
      return fb(inputs.highlight);
    } else if (Array.isArray(inputs.highlight)) {
      if (inputs.highlight.length === 2 && typeof inputs.highlight[1] === "object") {
        return inputs.highlight[1][key] ?? fb(inputs.highlight[0]);
      } else {
        return fb(inputs.highlight as HighlightRules);
      }
    } else if (Object.hasOwn(inputs.highlight, key)) {
      return (inputs.highlight as { [K in keyof T]?: HighlightRules })[key];
    }
    return fb(inputs.highlight as HighlightRules | undefined);
  };
  return {
    best: inputs.best,
    getLabel,
    getFormatArgs,
    getHighlight,
    getMeta: (key, fb) => ({
      best: inputs.best,
      label: getLabel(key, fb?.label),
      formatArgs: getFormatArgs(key, fb?.format),
      highlight: getHighlight(key, fb?.highlight),
    }),
  };
};

type SummaryEntryCore<T extends TurnData<any, any, any>, P extends PlayerRequirements> = {
  score: ScoreSummaryField<T>;
  wins: WinSummaryField<T, P>;
};
export type SummaryEntryFields<T extends TurnData<any, any, any>> = Record<
  string,
  SummaryEntryField<T, any, any>
>;
export type SummaryDefinition<
  T extends TurnData<any, any, any>,
  S extends SummaryEntryFields<T>,
  P extends PlayerRequirements = { all: "*" },
> = SummaryEntryCore<T, P> & S;

export type SummaryValues<
  E extends SummaryDefinition<T, S, P>,
  T extends TurnData<any, any, any>,
  S extends SummaryEntryFields<T>,
  P extends PlayerRequirements = { all: "*" },
> = {
  [Key in keyof E]: E[Key] extends SummaryEntryField<T, any, infer S> ? S : never;
} & {
  numGames: number;
};
export type SummaryEntryValues<
  S extends SummaryDefinition<T, E, P>,
  T extends TurnData<any, any, any>,
  E extends SummaryEntryFields<T>,
  P extends PlayerRequirements = { all: "*" },
> = {
  [Key in keyof S]: S[Key] extends SummaryEntryField<T, infer Entry, any> ? Entry : never;
} & {
  numGames: 1;
};

const calcDeltaVal = <V extends number | SummaryValueRecord>(prev: V, val: V): V => {
  if (typeof val === "number" && typeof prev === "number") {
    return (val - prev) as V;
  } else {
    return Object.keys(val).reduce(
      (acc, k) =>
        Object.assign(acc, {
          [k]: calcDeltaVal((prev as SummaryValueRecord)[k], (val as SummaryValueRecord)[k]),
        }),
      {} as V,
    );
  }
};

type SummaryAccumulatorFactoryFunc<
  S extends SummaryDefinition<T, R, P>,
  T extends TurnData<any, any, any>,
  R extends SummaryEntryFields<T>,
  P extends PlayerRequirements = { all: "*" },
> = () => {
  /**
   * @param playerData the data for the curent player
   * @param allPlayers the ids of all the players in the game
   * @param tiebreakWinner the player who won the tiebreak, if applicable
   * @returns The changes to all values between the previous game and this one
   */
  addGame(
    playerData: PlayerDataForStats<T>,
    allPlayers: string[],
    tiebreakWinner?: string,
  ): SummaryValues<S, T, R, P>;
  /**
   * @param playerData the data for the curent player
   * @param allPlayers the ids of all the players in the game
   * @param tiebreakWinner the player who won the tiebreak, if applicable
   * @returns The changes to all values between the previous game and this one. Does not modify the summary
   */
  getDeltas(
    playerData: PlayerDataForStats<T>,
    allPlayers: string[],
    tiebreakWinner?: string,
  ): SummaryValues<S, T, R, P>;
  /** The current summary values. SHOULD NOT BE OVERWRITTEN OR MODIFIED! */
  summary: SummaryValues<S, T, R, P>;
};
export const SummaryFieldsKeySymbol = Symbol("summary fields");
export type SummaryAccumulatorFactory<
  S extends SummaryDefinition<T, E, P>,
  T extends TurnData<any, any, any>,
  E extends SummaryEntryFields<T>,
  P extends PlayerRequirements = { all: "*" },
> = SummaryAccumulatorFactoryFunc<S, T, E, P> & {
  [SummaryFieldsKeySymbol]: Record<keyof S, SummaryEntryField<T, any, any>>;
  entriesFor: {
    <Pid extends string = string>(
      playerResults: Map<Pid, PlayerDataForStats<T>>,
      tiebreakWinner?: Pid,
    ): Map<Pid, SummaryEntryValues<S, T, E, P>>;
    <Pid extends string = string>(
      game: GameResult<T, Pid>,
    ): Map<Pid, SummaryEntryValues<S, T, E, P>>;
  };
  /**
   * Look up the start value for a given field
   * @param key the field key to look for
   */
  lookupZeroVal(key: SummaryFieldKeys<S, T, P>): number;
  /**
   * Look up the display metadata for a given field
   * @param key the field key to look for
   */
  getDisplayMetadata(key: SummaryFieldKeys<S, T, P>): FieldDisplayMetadata;
};
export const summaryAccumulatorFactory = <
  S extends SummaryDefinition<T, E, P>,
  T extends TurnData<any, any, any>,
  E extends SummaryEntryFields<T>,
  P extends PlayerRequirements = { all: "*" },
>(
  /** is higher score better, or lower score */
  scoreProperties: ScoreFieldArgs,
  fields: Omit<S, "score">,
): SummaryAccumulatorFactory<S, T, E, P> => {
  type SVTyp = SummaryValues<S, T, E, P>;
  const [scoreDirection, scoreOpts] =
    typeof scoreProperties === "string"
      ? [scoreProperties]
      : [
          scoreProperties.best,
          {
            minScore: scoreProperties.min,
            maxScore: scoreProperties.max,
            scoreEntryDisplay: scoreProperties.scoreEntryDisplay,
          },
        ];
  const fieldEntries = [
    ["score", new ScoreSummaryField(scoreDirection, scoreOpts)],
    ...Object.entries(fields),
  ] as [keyof S, SummaryEntryField<T, any, any>][];
  const makeEmpty = () =>
    fieldEntries.reduce(
      (summary, [k, field]) =>
        Object.assign(summary, {
          [k]: field.emptySummary(),
        }),
      { numGames: 0 } as SVTyp,
    );

  const startValues = makeEmpty();
  const cachedStartValue = new Map<SummaryFieldKeys<S, T, P>, number>();
  const lookupZeroVal = (key: SummaryFieldKeys<S, T, P>) => {
    if (cachedStartValue.has(key)) {
      return cachedStartValue.get(key);
    }
    let val: any = startValues;
    for (const p of key.split(".")) {
      val = val[p];
    }
    cachedStartValue.set(key, val);
    return val;
  };

  const displayMetadata = fieldEntries.reduce(
    // @ts-ignore
    (acc, [k, { display }]) => {
      for (const [dk, df] of Object.entries(display)) {
        if (df !== undefined) {
          acc[`${k as string}.${dk}` as SummaryFieldKeys<S, T, P>] = df;
        }
      }
      return acc;
    },
    {} as { [K in SummaryFieldKeys<S, T, P>]?: FieldDisplayMetadata },
  );
  const getDisplayMetadata = (key: SummaryFieldKeys<S, T, P>): FieldDisplayMetadata =>
    key === "numGames"
      ? { best: "none", label: "Total Games Played" }
      : (displayMetadata[key] ?? {});
  console.log(
    "DEBUGGING FIELD DISPLAY:",
    new Map(Object.entries(fields).map(([k, { display }]) => [k, display])),
  ); //XXX

  const factory: SummaryAccumulatorFactoryFunc<S, T, E, P> = () => {
    // due to "Type instantiation is excessively deep and possibly infinite"
    // @ts-ignore
    const summary = fieldEntries.reduce(
      (summary, [k, field]) =>
        Object.assign(summary, {
          [k]: field.emptySummary(),
        }),
      { numGames: 0 } as SVTyp,
    );
    const makeGameDeltas = (pData: PlayerDataForStats<T>, players: string[], tbWinner?: string) => {
      return fieldEntries.reduce(
        ({ newSummary, deltas }, [key, field]) => {
          const entry = field.entry(
            pData,
            players.filter((pid) => pid !== pData.playerId),
            tbWinner,
          );
          // Deep clone previous value, keep symbol keys (top level only)
          const prev = structuredClone(summary[key]);
          for (const sym of Object.getOwnPropertySymbols(summary[key])) {
            Object.defineProperty(prev, sym, Object.getOwnPropertyDescriptor(summary[key], sym)!);
          }
          newSummary[key] = field.summary(prev, newSummary.numGames, entry);
          deltas[key] =
            summary.numGames < 1
              ? newSummary[key]
              : Object.entries(newSummary[key]).reduce(
                  (acc, [k, v]) =>
                    Object.assign(acc, {
                      [k]: calcDeltaVal(prev[k], v),
                    }),
                  {} as SVTyp[typeof key],
                );
          return { newSummary, deltas };
        },
        {
          newSummary: { numGames: summary.numGames + 1 } as SVTyp,
          deltas: { numGames: 1 } as SVTyp,
        },
      );
    };
    return {
      addGame: (pData, players, tbWinner) => {
        const { newSummary, deltas } = makeGameDeltas(pData, players, tbWinner);
        for (const [k, v] of Object.entries(newSummary) as [keyof S, SVTyp[keyof S]][]) {
          summary[k] = v;
        }
        return deltas;
      },
      getDeltas: (pData, players, tbWinner) => makeGameDeltas(pData, players, tbWinner).deltas,
      summary,
    };
  };

  function entriesFor<Pid extends string = string>(
    game: GameResult<T, Pid>,
  ): Map<Pid, SummaryEntryValues<S, T, E, P>>;
  function entriesFor<Pid extends string = string>(
    playerResults: Map<Pid, PlayerDataForStats<T>>,
    tiebreakWinner?: Pid,
  ): Map<Pid, SummaryEntryValues<S, T, E, P>>;
  function entriesFor<Pid extends string = string>(
    gameOrRes: GameResult<T, Pid> | Map<Pid, PlayerDataForStats<T>>,
    tiebreakWinner?: Pid,
  ): Map<Pid, SummaryEntryValues<S, T, E, P>> {
    const [results, tbWinner] = Object.hasOwn(gameOrRes, "date")
      ? [
          (gameOrRes as GameResult<T, Pid>).results,
          (gameOrRes as GameResult<T, Pid>).tiebreakWinner,
        ]
      : [gameOrRes as Map<Pid, PlayerDataForStats<T>>, tiebreakWinner];
    const players = [...results.keys()];
    return new Map(
      [...results].map(([pid, pData]) => [
        pid,
        // @ts-ignore
        fieldEntries.reduce(
          (acc, [key, field]) =>
            Object.assign(acc, {
              [key]: field.entry(
                pData,
                players.filter((pid) => pid !== pData.playerId),
                tbWinner,
              ),
            }),
          { numGames: 1 } as SummaryEntryValues<S, T, E, P>,
        ),
      ]),
    );
  }
  return Object.assign(factory, {
    [SummaryFieldsKeySymbol]: { score: fieldEntries[0][1], ...fields } as Record<
      keyof S,
      SummaryEntryField<T, any, any>
    >,
    entriesFor,
    lookupZeroVal,
    getDisplayMetadata,
  });
};

type FieldFactoryUtils<T extends TurnData<any, any, any>> = {
  /** Count rounds until the predicate passes, returning the index of the passed round (so 0 would be first round passed) */
  countUntil: typeof countUntil<T>;
  /** Count rounds until the predicate fails, returning the index of the failed round (so 0 would be first round failed) */
  countWhile: typeof countWhile<T>;
  /** Make numeric stat */
  numeric: (
    calculate: (data: PlayerDataForStats<T>) => number,
    // @ts-ignore
    displayMeta: DisplayMetaInputsFor<NumericSummaryField<T>>,
    maxPerGame?: number,
  ) => NumericSummaryField<T>;
  /** Make boolean stat */
  boolean: (
    calculate: (data: PlayerDataForStats<T>) => boolean,
    displayMeta: DisplayMetaInputsFor<BoolSummaryField<T>>,
  ) => BoolSummaryField<T>;
  /** Make round stats accumulator */
  roundStats: <K extends string>(
    roundKeys: K[],
    defaults: T extends TurnData<any, infer RS, any> ? RS : never,
    displayMeta?: RoundStatsDisplayMetaInput<
      T extends TurnData<any, infer RS, any> ? RS : never,
      K
    >,
  ) => RoundStatsSummaryField<T, T extends TurnData<any, infer RS, any> ? RS : never, K>;
};
type ScoreFieldArgs =
  | "highest"
  | "lowest"
  | {
      best: "highest" | "lowest";
      min?: number;
      max?: number;
      scoreEntryDisplay?: ScoreEntryDisplay;
    };
export const makeSummaryAccumulatorFactoryFor =
  <T extends TurnData<any, any, any>>(): {
    <
      S extends Record<
        Exclude<string, "wins" | "score" | "numGames">,
        SummaryEntryField<T, any, any>
      >,
    >(
      /** is higher score better, or lower score */
      scoreProperties: ScoreFieldArgs,
      fieldFactory: (fieldUtils: FieldFactoryUtils<T>) => S,
    ): SummaryAccumulatorFactory<S & SummaryEntryCore<T, { all: "*" }>, T, S, { all: "*" }>;
    <
      S extends Record<
        Exclude<string, "wins" | "score" | "numGames">,
        SummaryEntryField<T, any, any>
      >,
      P extends PlayerRequirements,
    >(
      /** is higher score better, or lower score */
      scoreProperties: ScoreFieldArgs,
      fieldFactory: (fieldUtils: FieldFactoryUtils<T>) => S,
      winsData?: P | WinsDisplayMeta.Data<P>,
    ): SummaryAccumulatorFactory<S & SummaryEntryCore<T, P>, T, S, P>;
  } =>
  <
    S extends Record<
      Exclude<string, "wins" | "score" | "numGames">,
      SummaryEntryField<T, any, any>
    >,
    P extends PlayerRequirements,
  >(
    /** is higher score better, or lower score */
    scoreProperties: ScoreFieldArgs,
    fieldFactory: (fieldUtils: FieldFactoryUtils<T>) => S,
    winsData?: P | WinsDisplayMeta.Data<P>,
  ) =>
    makeSummaryAccumulatorFactory<T, S, P>(scoreProperties, fieldFactory, winsData);
export function makeSummaryAccumulatorFactory<
  T extends TurnData<any, any, any>,
  S extends Record<Exclude<string, "wins" | "score" | "numGames">, SummaryEntryField<T, any, any>>,
>(
  /** is higher score better, or lower score */
  scoreProperties: ScoreFieldArgs,
  fieldFactory: (fieldUtils: FieldFactoryUtils<T>) => S,
): SummaryAccumulatorFactory<S & SummaryEntryCore<T, { all: "*" }>, T, S, { all: "*" }>;
export function makeSummaryAccumulatorFactory<
  T extends TurnData<any, any, any>,
  S extends Record<Exclude<string, "wins" | "score" | "numGames">, SummaryEntryField<T, any, any>>,
  P extends PlayerRequirements,
>(
  /** is higher score better, or lower score */
  scoreProperties: ScoreFieldArgs,
  fieldFactory: (fieldUtils: FieldFactoryUtils<T>) => S,
  winsData?: P | WinsDisplayMeta.Data<P>,
): SummaryAccumulatorFactory<S & SummaryEntryCore<T, P>, T, S, P>;
export function makeSummaryAccumulatorFactory<
  T extends TurnData<any, any, any>,
  S extends Record<Exclude<string, "wins" | "score" | "numGames">, SummaryEntryField<T, any, any>>,
  P extends PlayerRequirements,
>(
  /** is higher score better, or lower score */
  scoreProperties: ScoreFieldArgs,
  fieldFactory: (fieldUtils: FieldFactoryUtils<T>) => S,
  winsData?: P | WinsDisplayMeta.Data<P>,
): SummaryAccumulatorFactory<S & SummaryEntryCore<T, P>, T, S, P> {
  let wins: WinSummaryField<T, P>;
  if (winsData) {
    const isData = (wd: typeof winsData): wd is WinsDisplayMeta.Data<P> =>
      Object.hasOwn(wd, "requirements") || Object.hasOwn(wd, "displayMeta");
    if (isData(winsData)) {
      if (winsData.requirements) {
        wins = WinSummaryField.create(
          winsData.requirements,
          winsData.displayMeta as WinsDisplayMeta.Record<P> | undefined,
        );
      } else {
        wins = WinSummaryField.create(
          winsData.displayMeta as WinsDisplayMeta.Single | undefined,
        ) as WinSummaryField<T, P>;
      }
    } else {
      wins = WinSummaryField.create(winsData);
    }
  } else {
    wins = WinSummaryField.create() as WinSummaryField<T, P>;
  }
  return summaryAccumulatorFactory<S & SummaryEntryCore<T, P>, T, S, P>(scoreProperties, {
    wins,
    ...fieldFactory({
      countUntil: countUntil as typeof countUntil<T>,
      countWhile: countWhile as typeof countWhile<T>,
      numeric: <T extends TurnData<any, any, any>>(
        calculate: (data: PlayerDataForStats<T>) => number,
        displayMeta: DisplayMetaInputsFor<NumericSummaryField<T>>,
        maxPerGame?: number,
      ) => new NumericSummaryField<T>(calculate, normaliseDMI(displayMeta), maxPerGame),
      boolean: <T extends TurnData<any, any, any>>(
        calculate: (data: PlayerDataForStats<T>) => boolean,
        displayMeta: DisplayMetaInputsFor<BoolSummaryField<T>>,
      ) => new BoolSummaryField<T>(calculate, normaliseDMI(displayMeta)),
      roundStats: <T extends TurnData<any, any, any>, K extends string>(
        roundKeys: K[],
        defaults: T extends TurnData<any, infer RS, any> ? RS : never,
        displayMeta: any,
      ) => new RoundStatsSummaryField(roundKeys, defaults, displayMeta),
    }),
  } as Omit<SummaryDefinition<T, S, P>, "score">);
}
export default makeSummaryAccumulatorFactoryFor;

type FlattenSummaryKeysInternal<S extends SummaryValueRecord, Key = keyof S> = Key extends string
  ? S[Key] extends SummaryValueRecord
    ? `${Key}.${FlattenSummaryKeysInternal<S[Key]>}`
    : `${Key}`
  : never;

export type SummaryFieldKeys<
  S extends SummaryDefinition<T, any, P>,
  T extends TurnData<any, any, any>,
  P extends PlayerRequirements = { all: "*" },
> = FlattenSummaryKeysInternal<SummaryValues<S, T, any, P>>;

export type SummaryFieldKeysFor<F extends SummaryAccumulatorFactory<any, any, any, any>> =
  F extends SummaryAccumulatorFactory<infer S, infer T, any, infer P>
    ? SummaryFieldKeys<S, T, P>
    : never;

export type SummaryEntryKeys<
  S extends SummaryDefinition<T, any, P>,
  T extends TurnData<any, any, any>,
  P extends PlayerRequirements = { all: "*" },
  Key extends keyof S = keyof S,
> = Key extends string
  ? S[Key] extends SummaryEntryFieldWithGameEntryDisplay<T, any, any, infer Entry>
    ? Entry extends EntryDisplayMetadataMultiple<any>
      ? `${Key}.${keyof Entry & string}`
      : `${Key}`
    : never
  : never;

export type SummaryEntryKeysFor<F extends SummaryAccumulatorFactory<any, any, any, any>> =
  F extends SummaryAccumulatorFactory<infer S, infer T, any, infer P>
    ? SummaryEntryKeys<S, T, P>
    : never;

type EDMFields<S extends SummaryDefinition<T, any, any>, T extends TurnData<any, any, any>> = {
  [K in keyof S & string as S[K] extends SummaryEntryFieldWithGameEntryDisplay<any, any, any, any>
    ? K
    : never]: S[K];
};
type FlattenEDM<
  S extends SummaryDefinition<T, any, any>,
  T extends TurnData<any, any, any>,
  Key extends keyof EDMFields<S, T> & string = keyof EDMFields<S, T> & string,
> =
  S[Key] extends SummaryEntryFieldWithGameEntryDisplay<T, any, any, infer Entry>
    ? Entry extends EntryDisplayMetadataMultiple<infer R>
      ? {
          [K in keyof R & string as `${Key}.${K}`]: R[K];
        }
      : Entry extends EntryDisplayMetadataSingle<infer U>
        ? { [K in Key as `${Key}`]: U }
        : never
    : never;
type UnionToIntersection<U> = (U extends any ? (x: U) => void : never) extends (x: infer I) => void
  ? I
  : never;
export type EntryDisplayFieldTypes<
  S extends SummaryDefinition<T, any, any>,
  T extends TurnData<any, any, any>,
> = UnionToIntersection<
  {
    [K in keyof EDMFields<S, T> & string]: FlattenEDM<S, T, K>;
  }[keyof EDMFields<S, T> & string]
>;
