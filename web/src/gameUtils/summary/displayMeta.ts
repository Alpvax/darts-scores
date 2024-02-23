// import { defineObjZodStore } from "@/stores/persistant/zodStore";
import { defineStore, storeToRefs } from "pinia";
// import { z, type ZodRawShape, type ZodTypeAny } from "zod";
import type { SummaryFieldKeysFor, SummaryAccumulatorFactory } from ".";

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
//   .passthrough()
//   .transform((opts) => new Intl.NumberFormat(undefined, opts));

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
// export const defaultedSummaryFieldMeta = (
//   label: string,
//   options?: {
//     format?: string | z.input<typeof formatSchema>;
//     best?: "highest" | "lowest" | "none";
//     highlight?: Record<string, "highest" | "lowest"> | ("best" | "worst")[] | "best" | "worst";
//   },
// ) =>
//   z
//     .object({
//       label: summaryMetaLabelSchema.default(label),
//       format: summaryMetaFormatSchema.default(options?.format ?? "!baseFmt"),
//       best: z.enum(["highest", "lowest", "none"]).default(options?.best ?? "highest"),
//       highlight: highlightSchema.default(options?.highlight ?? {}),
//     })
//     .default({});
// export type SummaryFieldMeta = z.infer<ReturnType<typeof defaultedSummaryFieldMeta>>;

// export const rateFieldMeta = <K extends string>(
//   key: K,
//   labelBase: string,
//   options?: {
//     label?: { plural?: string; rate?: string };
//     format?: string | z.input<typeof formatSchema>;
//     best?: "highest" | "lowest" | "none";
//     highlight?: Record<string, "highest" | "lowest"> | ("best" | "worst")[] | "best" | "worst";
//   },
// ) => {
//   const pluralMeta = defaultedSummaryFieldMeta(
//     (options?.label?.plural ?? "{}s").replaceAll("{}", labelBase),
//     { best: options?.best, highlight: options?.highlight },
//   );
//   return {
//     [`${key}.total`]: pluralMeta,
//     [`${key}.count`]: pluralMeta,
//     [`${key}.mean`]: defaultedSummaryFieldMeta(
//       (options?.label?.rate ?? "{} Rate").replaceAll("{}", labelBase),
//       { format: options?.format ?? "!rate", best: options?.best, highlight: options?.highlight },
//     ),
//   } as Record<
//     `${K}.total` | `${K}.count` | `${K}.mean`,
//     ReturnType<typeof defaultedSummaryFieldMeta>
//   >;
// };

// export const useSummaryCoreStore = defineObjZodStore(
//   "summaryCoreMeta",
//   "local",
//   z.object({
//     "score.highest": defaultedSummaryFieldMeta("Personal Best"),
//     "score.lowest": defaultedSummaryFieldMeta("Personal Worst"),
//     "score.mean": defaultedSummaryFieldMeta("Average Score"),
//     numGames: defaultedSummaryFieldMeta("Num games played", { best: "none" }),
//     ...rateFieldMeta("wins.all", "Win", {}),
//     // "wins.all.total": z.object({
//     //   label: z.string().min(1)
//     // }),
//     // "wins.all.mean": z.object({
//     //   label: z.string().min(1)
//     // }),
//     "!rate": z
//       .object({
//         format: formatSchema.default({ style: "percent", maximumFractionDigits: 2 }),
//       })
//       .default({}),
//     "!baseFmt": z
//       .object({
//         format: formatSchema.default({ maximumFractionDigits: 2 }),
//       })
//       .default({}),
//   }),
// );

// export const makeSummaryMetaStore = <S extends SummaryAccumulatorFactory<any, any, any, any>>(
//   storeKey: string,
//   internalKey: string,
//   fieldsSchema: Partial<Record<SummaryFieldKeysFor<S>, ZodTypeAny>>,
//   parentStore = useSummaryCoreStore,
// ) => {
//   const useStore = defineObjZodStore(internalKey, "local", z.object(fieldsSchema as ZodRawShape));
//   return defineStore(storeKey, () => {
//     const store = useStore();
//     const parent = parentStore();
//     return {
//       ...storeToRefs(parent),
//       ...storeToRefs(store),
//     };
//   });
// };
