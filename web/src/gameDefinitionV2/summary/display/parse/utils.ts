import { z } from "zod";

export function binOpSchema<S extends z.ZodTypeAny>(schema: S): z.ZodTuple<[S, S], S>;
export function binOpSchema<S extends z.ZodTypeAny>(
  schemaFactory: () => S,
): z.ZodLazy<z.ZodTuple<[S, S], S>>;
export function binOpSchema<S extends z.ZodTypeAny>(schemaFactory: S | (() => S)) {
  return typeof schemaFactory === "function"
    ? z.lazy(() => {
        const schema = schemaFactory();
        return z.tuple([schema, schema]).rest(schema);
      })
    : z.tuple([schemaFactory, schemaFactory]).rest(schemaFactory);
}

export const discriminated = <
  Discriminator extends string,
  Options extends [
    [[string, ...string[]], z.ZodRawShape],
    ...[[string, ...string[]], z.ZodRawShape][],
  ],
>(
  discriminator: Discriminator,
  discriminants: Options,
) =>
  z.discriminatedUnion(
    discriminator,
    discriminants.map(([[key, ...alias], shape]) =>
      z.object({
        [discriminator]:
          alias !== undefined ? z.enum([key, ...alias]).transform(() => key) : z.literal(key),
        ...shape,
      }),
    ) as {
      [I in keyof Options]: [Options[I]] extends [
        [[infer K, ...(infer A)[]], infer S extends z.ZodRawShape],
      ]
        ? z.ZodObject<{
            [P in Discriminator | keyof S]: P extends Discriminator
              ? z.ZodType<K, z.ZodTypeDef, K | A>
              : S[P];
          }>
        : never;
    },
  );

// ========== Operator Helpers ==========

export type SelectOperator<Lookup extends { [k: string]: string }, Op> = keyof {
  [K in keyof Lookup as Lookup[K] extends Op ? K : never]: any;
};

export const makeReverseOpLookup = <M extends { [k: string]: readonly [...string[]] }>(
  operatorMap: M,
) =>
  Object.entries(operatorMap).reduce(
    (acc, [op, sym]) => Object.assign(acc, { [op]: op }, ...sym.map((s) => ({ [s]: op }))),
    {} as {
      [Op in keyof M & string]: Op;
    } & {
      [Op in keyof M & string as M[Op][number]]: Op;
    },
  );
// export const zodOperatorUnionSchema = <OpName extends string, OpSym extends string>(lookup: { [K in OpName]: OpSym }): z.ZodEnum<[OpName | OpSym, OpName | OpSym, ...(OpName | OpSym)[]]> => z.enum(Object.entries(lookup).flat() as unknown as [OpName | OpSym, OpName | OpSym, ...(OpName | OpSym)[]])
export const zodOperatorUnionSchema = <
  OpName extends string,
  OpSym extends string,
  // Lookup extends { [K in OpName]: readonly [...OpSym[]] },
>(lookup: { [K in OpName]: readonly [...OpSym[]] }): z.ZodEnum<
  [OpName | OpSym, OpName | OpSym, ...(OpName | OpSym)[]]
> =>
  z.enum(
    (Object.entries(lookup) as unknown as [OpName, OpSym[]]).flatMap(([name, sym]) => [
      name,
      ...sym,
    ]) as unknown as [OpName | OpSym, OpName | OpSym, ...(OpName | OpSym)[]],
  );

/**
 * Zod rawcreate helper to log the errors as they occur, and return the default error message
 * @param args passed to console.log
 * @returns
 */
export const errorMap = (...args: any[]) =>
  ({
    errorMap: (issue, ctx) => {
      console.debug("[PARSE]", ...args, ctx.data, issue);
      return { message: ctx.defaultError };
    },
  }) satisfies z.RawCreateParams;
