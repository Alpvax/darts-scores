export type GameStats<
  /** GameResult (what gets saved to the database) */ GR,
  /** SPGameStats (Player stats which are not in any way dependent on other players) */ SP,
  /** TeamStats (Stats for the entire list of players (e.g. num players, total hits, etc.))*/ TS,
  /** MPGameStats (Player stats which are dependent on other players in the game)*/ MP,
> = {
  buildGameStats: (game: GR) => {
    players: Map<string, { sp: SP; mp: MP }>;
    team: TS;
  };
};

interface CoreSummaryField {
  label: string;
  limitClasses?: {
    [k: string]: "highest" | "lowest" | undefined;
  };
  rateFormat?: true | Intl.NumberFormat | Intl.NumberFormatOptions;
}

// export const typeSym = Symbol("Descriminator for SummaryFields");

interface KeySummaryField<S extends { [k: string]: any }> extends CoreSummaryField {
  // [typeSym]?: "key";
  key: keyof S;
}
// export const keySummaryField = <S extends { [k: string]: any }>
// (field: Omit<KeySummaryField<S>, typeof typeSym>): KeySummaryField<S> =>
//   ({ [typeSym]: "key", ...field });
// interface RateSummaryField<S extends { [k: string]: any }> extends CoreSummaryField {
//   // [typeSym]: "rate";
//   key: keyof S;
//   fractionalDigits?: number;
// }
// export const rateSummaryField = <S extends { [k: string]: any }>
// (field: Omit<RateSummaryField<S>, typeof typeSym>): RateSummaryField<S> =>
//   ({ [typeSym]: "rate", ...field });
interface FuncSummaryField<S extends { [k: string]: any }> extends CoreSummaryField {
  // [typeSym]: "function";
  f: (stats: S) => number;
}
// export const funcSummaryField = <S extends { [k: string]: any }>
// (field: Omit<FuncSummaryField<S>, typeof typeSym>): FuncSummaryField<S> =>
//   ({ [typeSym]: "function", ...field });

export type SummaryField<S extends { [k: string]: any }>
= KeySummaryField<S>
// | RateSummaryField<S>
| FuncSummaryField<S>;

export const makeSummaryFields = <S extends { [k: string]: any }>
(factory: (
  // key: typeof keySummaryField,
  // rate: typeof rateSummaryField,
  // func: typeof funcSummaryField,
) => SummaryField<S>[]): SummaryField<S>[] => factory(
  // keySummaryField,
  // rateSummaryField,
  // funcSummaryField,
);
