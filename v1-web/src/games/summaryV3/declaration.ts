type ArrayFields<T, K extends keyof T, A extends readonly unknown[]> =
  A[number] extends T
    ? A[number][K]
    : [never, "NotArrayOf:", T, A];

type FieldInObjArray<T, K extends keyof T, A extends readonly unknown[]> =
  A extends readonly [infer X, ...infer Rest]
    ? X extends T
      ? X[K] extends ArrayFields<T, K, Rest>
        ? [never, "Encountered duplicate value:", X] // false
        : FieldInObjArray<T, K, Rest>
      : [never, "NotArrayOf:", T, A]
    : true;
type UniqueFieldArray<T, K extends keyof T, A extends readonly unknown[]> =
  FieldInObjArray<T, K, A> extends [never, ...infer Err]
    ? [never, ...Err]
    : A

/**
 * - `["highest" | "lowest", boolean]` = [`best` high or low, include `worst` class].
 *    - `[x, false]` is equivalent to `[_, "best"]`.
 *    - `[x, true]` is equivalent to `[_, "best", "worst"]`
 * - `["highest" | "lowest", string]`  = [best high or low, best class name].
 *    - `[x, "name"]` is equivalent to `{ name: x }`
 * - `["highest" | "lowest", string, string]` =
 *      [`best` high or low, best class name, worst class name].
 *    - `["highest", "nameB", "nameW"]` is equivalent to `{ nameB: "highest", nameW: "lowest" }`
 * - `Record<string, "highest" | "lowest" | ((score: number) => boolean)>` = ```{
 *      bestClassName?: "highest", // class to add to the top score
 *      worstClassName?: "lowest", // class to add to the bottom score
 *      customClassName?: score => score === 0, // custom predicate to apply class
 *      ...
 *    }```
 * - `(score: number) => Record<string, boolean>` =
 *      effectively the same as a vuejs computed class binding.
 */
type ClassHighlight
/** whether `best` score is the highest or lowest score, no other highlighting */
= "highest" | "lowest"
/** whether `best` score is the highest or lowest score, whether to include the `worst` class */
| readonly ["highest" | "lowest", boolean]
/** whether best score is the highest or lowest score, with className for best score */
| readonly ["highest" | "lowest", string]
/** whether best score is the highest or lowest score, with classNames for best and worst scores */
| readonly ["highest" | "lowest", string, string]
/** Classes to add when the score is the highest / lowest / matches the predicate */
| Record<string, "highest" | "lowest" | ((score: number) => boolean)>
/** Function to return classes based on the score (return value uses vuejs syntax) */
| ((score: number) => Record<string, boolean>);

export type SummaryField<T> = {
  key: string;
  label: string;
  format?: Intl.NumberFormat | Intl.NumberFormatOptions;
  value: (stats: T) => number;
  /**
   * Classes to add based on the value.
   *
   * @see {@link ClassHighlight} for details.
   */
  highlight?: ClassHighlight;
  rate?: string | {
    key?: string;
    label: string;
    format?: Intl.NumberFormat | Intl.NumberFormatOptions;
    highlight?: ClassHighlight;
  } | [string, Intl.NumberFormat | Intl.NumberFormatOptions];
};

/**
 * @param T the player summary type to retrieve values from
 * @param A the summary fields array, to ensure unique keys
 */
export type SummaryFields<T, A extends readonly SummaryField<T>[]> =
  UniqueFieldArray<SummaryField<T>, "key", A>;

const DEFAULT_RATE_FORMAT = new Intl.NumberFormat(undefined, {
  style: "percent",
  maximumFractionDigits: 2,
});
export const makeSummaryFields = <T>(
  defaultRateFormat: Intl.NumberFormat | Intl.NumberFormatOptions = DEFAULT_RATE_FORMAT,
) => <A extends readonly SummaryField<T>[], F extends SummaryFields<T, A>>(
  fields: F,
): F => fields;

export type SummaryFieldKeys<A extends SummaryFields<any, any>> =
  A extends readonly SummaryField<any>[]
    ? A[number] extends SummaryField<any>
      ? A[number]["rate"] extends string
        ? `${A[number]["key"]}_rate` | A[number]["key"]
        : A[number]["rate"] extends { key: infer R }
          ? R | A[number]["key"]
          : A[number]["key"]
      : [never, "NotSummaryField:", A[number]]
    : [never, "NotArray:", A];

// export type SummaryFieldsObj<T, A extends SummaryFields<T, any>> = {
//   [K in keyof A & number]: A[K] extends SummaryField<T>
//     ? A[K]["rate"] extends {
//       key: infer R,
//     } ?
//     : false;
// }

const test = makeSummaryFields()([
  {
    key: "testWRate",
    label: "test with rate",
    value: _ => 3,
    rate: "Test Rate",
  },
  {
    key: "testNoRate",
    label: "test without rate",
    value: _ => 3,
  },
] as const);

type TestKeys = SummaryFieldKeys<typeof test>;

type R<A extends SummaryFields<any, any>> =
  A extends readonly SummaryField<any>[]
    ? A[number] extends SummaryField<any>
      ? A[number]["rate"] extends undefined
        ? [never, "NoRate:", A[number]]
        : A[number]["rate"]
      : [never, "NotSummaryField:", A[number]]
    : [never, "NotArray:", A];

type R2<T> = T extends SummaryField<any>
  ? T["rate"] extends undefined
    ? [never, "NoRate:", T]
    : T["rate"]
  : [never, "NotSummaryField:", T]

type TestR = R<typeof test>;
type TestR2 = R2<typeof test[0]>;

