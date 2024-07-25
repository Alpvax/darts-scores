// import { registerPrefsZod } from "@/utils/preferences/internal";
// import { ZodAny, z } from "zod";

type FormatArg =
  | {
      type: "numfmt";
      numfmt: Intl.NumberFormat;
    }
  | {
      type: "fmtArgs";
      args: Intl.NumberFormatOptions;
    }
  | {
      type: "inherit";
      parents: string[];
      overrides?: FormatArg;
    }; /* | {
  type: "function";
  func: (val: number) => string;
}*/

const PARENT_FORMATS = new Map<string, FormatArg>();
const BASE_ARGS = {
  maximumFractionDigits: 2,
} satisfies Intl.NumberFormatOptions;
const BASE_FORMAT = { type: "fmtArgs", args: BASE_ARGS } satisfies FormatArg;
PARENT_FORMATS.set("DEFAULT", BASE_FORMAT);

// const makeFormat = (format: FormatArg): ((val: number) => string) => {
//   switch (format.type) {
//     // case "function": return format.func;
//     case "numfmt":
//       return format.numfmt.format;
//     case "fmtArgs": {
//       const fmt = new Intl.NumberFormat(undefined, format.args);
//       return fmt.format;
//     }
//     case "inherit": {
//       const parent = PARENT_FORMATS.get(format.parent) ?? BASE_FORMAT;
//     }
//     default:
//       return (val) => val.t;
//   }
// };

// const formatSchema = z
//   .object({
//     localeMatcher: z.string().optional(), //.enum(Intl.Locale.prototype.getNumberingSystems()).optional(),
//     style: z.enum(["decimal", "currency", "percent", "unit"]).optional(),
//     currency: z
//       .string()
//       .describe('ISO 4217 currency code. Required if style set to "currency"')
//       .optional(),
//     currencyDisplay: z.enum(["code", "symbol", "narrowSymbol", "name"]).optional(),
//     currencySign: z.enum(["standard", "accounting"]).optional(),
//     // unit:
//     // unitDisplay:
//     useGrouping: z.boolean().optional(),
//     minimumIntegerDigits: z.number().min(1).max(21).optional(),
//     minimumFractionDigits: z.number().min(0).max(20).optional(),
//     maximumFractionDigits: z.number().min(0).max(20).optional(),
//     minimumSignificantDigits: z.number().min(1).max(21).optional(),
//     maximumSignificantDigits: z.number().min(1).max(21).optional(),
//   })
//   .describe(
//     "The options object (second parameter) of Intl.NumberFormat." +
//       "See https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat/NumberFormat",
//   )
//   .passthrough();
// // .transform((opts) => new Intl.NumberFormat(undefined, opts));

// const summaryMetaLabelSchema = z.string().min(1);
// const summaryMetaFormatSchema = formatSchema.or(z.string().startsWith("!").min(2));
// const BWSchema = z.enum(["best", "worst"]);
// const highlightSchema = z
//   .record(z.enum(["highest", "lowest"]))
//   .or(
//     z
//       .array(BWSchema)
//       .min(1)
//       .max(2)
//       .refine((items) => items.length === 1 || items.length === new Set(items).size, {
//         message: "each criteria can only be specified once",
//       }),
//   )
//   .or(BWSchema);

export type HighlightRules =
  | Record<string, "highest" | "lowest">
  | ("best" | "worst")[]
  | "best"
  | "worst";

// type Overrides<
//   T,
//   Z extends z.ZodType<T, Def, Input>,
//   Def extends z.ZodTypeDef = z.ZodTypeDef,
//   Input = T,
// > = {
//   schema: Z;
//   default: T;
//   overrides: Record<string, T>;
// };
// type ValOrOverride<Z extends ZodAny> = z.infer<Z> | {};

// // registerPrefsZod(
// //   "displayMetadata",
// //   z
// //     .object({
// //       core: z.object({}).default({}),
// //     })
// //     .default({}),
// // );

// export type DisplayMetadata = {
//   label: z.output<typeof summaryMetaLabelSchema>;
//   format?: z.output<typeof summaryMetaFormatSchema>;
//   highlight?: z.output<typeof highlightSchema>;
// };
