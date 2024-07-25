/**
 * A `T[]` of length `Len`
 */
export type FixedLengthArray<T, Len extends number, R extends T[] = []> = number extends Len
  ? T[]
  : R["length"] extends Len
    ? R
    : FixedLengthArray<T, Len, [...R, T]>;

type _NumericRangeInternal<
  End extends number,
  Start extends number = 0,
  Full extends never[] = [],
  E extends never[] = [],
  R = never,
> = number extends End
  ? number
  : Full["length"] extends End
    ? R
    : E["length"] extends Start
      ? _NumericRangeInternal<End, Start, [never, ...Full], E, R | Full["length"]>
      : _NumericRangeInternal<End, Start, [never, ...Full], [never, ...E], R>;
/**
 * A union of numbers from `Start`(inclusive) to `End`(exclusive).
 * For example, `NumericRange<4>` = `0 | 1 | 2 | 3`
 */
export type NumericRange<End extends number, Start extends number = 0> = _NumericRangeInternal<
  End,
  Start
>;

/**
 * Find the maximum of a number union (such as a NumericRange)
 */
export type NumericMaximum<N extends number, R extends never[] = []> = number extends N
  ? number
  : R["length"] extends N
    ? NumericMaximum<N, [never, ...R]>
    : R["length"];

/**
 * A Record of numeric keys in the range 0..Len (excluding Len), with values `T`.
 * Equivalent to a `T[]` of length `Len`
 */
export type FixedLengthArrayObj<T, Len extends number> = {
  [K in NumericRange<Len>]: T;
};

/**
 * A tuple of types from 0..Len (excluding Len), looking up each type from `T`
 */
export type FixedLengthArrayLookup<
  T extends { [k: NumericRange<Len>]: any },
  Len extends number,
  R extends T[keyof T][] = [],
> = number extends Len
  ? T[]
  : R["length"] extends Len
    ? R
    : R["length"] extends keyof T
      ? FixedLengthArrayLookup<T, Len, [...R, T[R["length"]]]>
      : FixedLengthArrayLookup<T, Len, R>;

/**
 * A tuple of numbers from 0..Len (excluding Len)
 */
export type CountedFixedLenArray<Len extends number, R extends number[] = []> = number extends Len
  ? number[]
  : R["length"] extends Len
    ? R
    : CountedFixedLenArray<Len, [...R, R["length"]]>;

export type ValuesSubset<V, T> = T extends {}
? {
    [K in keyof T as T[K] extends V ? K : never]: T[K];
  }
: {};
