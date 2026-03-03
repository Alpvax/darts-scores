import { code as cCode } from "currency-codes-ts";
import { z } from "zod";

// NumberFormatOptions
// //ES5
// localeMatcher?: "lookup" | "best fit" | undefined;
// style?: NumberFormatOptionsStyle | undefined;
// currency?: string | undefined;
// currencyDisplay?: NumberFormatOptionsCurrencyDisplay | undefined;
// useGrouping?: NumberFormatOptionsUseGrouping | undefined;
// minimumIntegerDigits?: number | undefined;
// minimumFractionDigits?: number | undefined;
// maximumFractionDigits?: number | undefined;
// minimumSignificantDigits?: number | undefined;
// maximumSignificantDigits?: number | undefined;
// //ES2020
// numberingSystem?: string | undefined;
// compactDisplay?: "short" | "long" | undefined;
// notation?: "standard" | "scientific" | "engineering" | "compact" | undefined;
// signDisplay?: NumberFormatOptionsSignDisplay | undefined;
// unit?: string | undefined;
// unitDisplay?: "short" | "long" | "narrow" | undefined;
// currencySign?: "standard" | "accounting" | undefined;
// //ES2023
// roundingPriority?: "auto" | "morePrecision" | "lessPrecision" | undefined;
// roundingIncrement?: 1 | 2 | 5 | 10 | 20 | 25 | 50 | 100 | 200 | 250 | 500 | 1000 | 2000 | 2500 | 5000 | undefined;
// roundingMode?: "ceil" | "floor" | "expand" | "trunc" | "halfCeil" | "halfFloor" | "halfExpand" | "halfTrunc" | "halfEven" | undefined;
// trailingZeroDisplay?: "auto" | "stripIfInteger" | undefined;

// ResolvedNumberFormatOptions
// //ES5
// locale: string;
// numberingSystem: string;
// style: NumberFormatOptionsStyle;
// currency?: string;
// currencyDisplay?: NumberFormatOptionsCurrencyDisplay;
// minimumIntegerDigits: number;
// minimumFractionDigits?: number;
// maximumFractionDigits?: number;
// minimumSignificantDigits?: number;
// maximumSignificantDigits?: number;
// useGrouping: ResolvedNumberFormatOptionsUseGrouping;
// //ES2020
// compactDisplay?: "short" | "long";
// notation: "standard" | "scientific" | "engineering" | "compact";
// signDisplay: NumberFormatOptionsSignDisplay;
// unit?: string;
// unitDisplay?: "short" | "long" | "narrow";
// currencySign?: "standard" | "accounting";
// //ES2023
// roundingPriority: "auto" | "morePrecision" | "lessPrecision";
// roundingMode: "ceil" | "floor" | "expand" | "trunc" | "halfCeil" | "halfFloor" | "halfExpand" | "halfTrunc" | "halfEven";
// roundingIncrement: 1 | 2 | 5 | 10 | 20 | 25 | 50 | 100 | 200 | 250 | 500 | 1000 | 2000 | 2500 | 5000;
// trailingZeroDisplay: "auto" | "stripIfInteger";

/** Taken from https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/Locale/getNumberingSystems#supported_numbering_system_types */
// prettier-ignore
const numberingSystem = z.enum([
"adlm", "ahom", "arab", "arabext", "armn", "armnlow", "bali", "beng", "bhks", "brah", "cakm", "cham", "cyrl", "deva", "ethi",
"finance", "fullwide", "geor", "gong", "gonm", "grek", "greklow", "gujr", "guru", "hanidays", "hanidec", "hans", "hansfin",
"hant", "hantfin", "hebr", "hmng", "hmnp", "java", "jpan", "jpanfin", "jpanyear", "kali", "khmr", "knda", "lana", "lanatham",
"laoo", "latn", "lepc", "limb", "mathbold", "mathdbl", "mathmono", "mathsanb", "mathsans", "mlym", "modi", "mong", "mroo", "mtei",
"mymr", "mymrshan", "mymrtlng", "native", "newa", "nkoo", "olck", "orya", "osma", "rohg", "roman", "romanlow", "saur", "shrd",
"sind", "sinh", "sora", "sund", "takr", "talu", "taml", "tamldec", "telu", "thai", "tirh", "tibt", "traditio", "vaii", "wara", "wcho",
]);
const useGroupingKey = z.enum(["min2", "auto", "always"]) satisfies z.ZodType<
  keyof Intl.NumberFormatOptionsUseGroupingRegistry,
  any,
  any
>;

// ES5 common properties
const style = z.enum(["decimal", "percent", "currency", "unit"]) satisfies z.ZodType<
  Intl.NumberFormatOptionsStyle,
  any,
  any
>;
const currency = z
  .custom<string /*Exclude<ReturnType<typeof cCode>, undefined>*/>(
    (data) => typeof data === "string" && cCode(data) !== undefined,
  )
  .optional();
const currencyDisplay = (
  z.enum(["code", "symbol", "name", "narrowSymbol"]) satisfies z.ZodType<
    Intl.NumberFormatOptionsCurrencyDisplay,
    any,
    any
  >
).optional();
const minimumIntegerDigits = z.number().min(1).max(21);
const minimumFractionDigits = z.number().min(0).max(100).optional();
const maximumFractionDigits = z.number().min(0).max(100).optional();
const minimumSignificantDigits = z.number().min(1).max(21).optional();
const maximumSignificantDigits = z.number().min(1).max(21).optional();

// ES2020 common properties
const compactDisplay = z.enum(["short", "long"]).optional();
const notation = z.enum(["standard", "scientific", "engineering", "compact"]);
const signDisplay = z.enum(["auto", "never", "always", "exceptZero"]) satisfies z.ZodType<
  Intl.NumberFormatOptionsSignDisplay,
  any,
  any
>;
/** Taken from https://tc39.es/ecma402/#table-sanctioned-single-unit-identifiers */
// prettier-ignore
const validUnitParts = new Set([
  "acre", "bit", "byte", "celsius", "centimeter", "day", "degree", "fahrenheit", "fluid-ounce", "foot", "gallon", "gigabit",
  "gigabyte", "gram", "hectare", "hour", "inch", "kilobit", "kilobyte", "kilogram", "kilometer", "liter", "megabit",
  "megabyte", "meter", "microsecond", "mile", "mile-scandinavian", "milliliter", "millimeter", "millisecond", "minute", "month",
  "nanosecond", "ounce", "percent", "petabyte", "pound", "second", "stone", "terabit", "terabyte", "week", "yard", "year",
] as const);
const unit = z.custom<
  typeof validUnitParts extends Set<infer K extends string> ? K | `${K}-per-${K}` : string
>((data) => {
  const parts = data.split("-per-");
  switch (parts.length) {
    case 1:
      return validUnitParts.has(parts);
    case 2:
      return validUnitParts.has(parts[0]) && validUnitParts.has(parts[1]);
  }
  return false;
});
const unitDisplay = z.enum(["short", "long", "narrow"]).optional();
const currencySign = z.enum(["standard", "accounting"]).optional();

// ES2023 common properties
const roundingPriority = z.enum(["auto", "morePrecision", "lessPrecision"]);
const roundingIncrement = z
  .literal(1)
  .or(z.literal(2))
  .or(z.literal(5))
  .or(z.literal(10))
  .or(z.literal(20))
  .or(z.literal(25))
  .or(z.literal(50))
  .or(z.literal(100))
  .or(z.literal(200))
  .or(z.literal(250))
  .or(z.literal(500))
  .or(z.literal(1000))
  .or(z.literal(2000))
  .or(z.literal(2500))
  .or(z.literal(5000));
const roundingMode = z.enum([
  "ceil",
  "floor",
  "expand",
  "trunc",
  "halfCeil",
  "halfFloor",
  "halfExpand",
  "halfTrunc",
  "halfEven",
]);
const trailingZeroDisplay = z.enum(["auto", "stripIfInteger"]);

export namespace NumberFormat {
  export const numberFormatOptions: z.ZodType<Intl.NumberFormatOptions> = z
    .object({
      localeMatcher: z.enum(["lookup", "best fit"]),
      style,
      currency,
      currencyDisplay,
      useGrouping: z.union([useGroupingKey, z.enum(["true", "false"]), z.boolean()]),
      minimumIntegerDigits,
      minimumFractionDigits,
      maximumFractionDigits,
      minimumSignificantDigits,
      maximumSignificantDigits,
      //ES2020
      numberingSystem,
      compactDisplay,
      notation,
      signDisplay,
      unit,
      unitDisplay,
      currencySign,
      //ES2023
      roundingPriority,
      roundingIncrement,
      roundingMode,
      trailingZeroDisplay,
    })
    .partial();

  export const resolvedNumberFormatOptions: z.ZodType<Intl.ResolvedNumberFormatOptions> = z.object({
    locale: z.string().min(1),
    numberingSystem,
    style,
    currency,
    currencyDisplay,
    minimumIntegerDigits,
    minimumFractionDigits,
    maximumFractionDigits,
    minimumSignificantDigits,
    maximumSignificantDigits,
    useGrouping: z.union([useGroupingKey, z.literal(false)]),
    //ES2020
    compactDisplay,
    notation,
    signDisplay,
    unit,
    unitDisplay,
    currencySign,
    //ES2023
    roundingPriority,
    roundingIncrement,
    roundingMode,
    trailingZeroDisplay,
  });

  export const formatOptionsSchema: z.ZodType<
    Intl.NumberFormatOptions | Intl.ResolvedNumberFormatOptions
  > = z.union([numberFormatOptions, resolvedNumberFormatOptions]);
}
export const formatOptionsSchema = NumberFormat.formatOptionsSchema;
