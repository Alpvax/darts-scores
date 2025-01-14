export type Enumerate<N extends number, Acc extends number[] = []> = Acc["length"] extends N
  ? Acc[number]
  : Enumerate<N, [...Acc, Acc["length"]]>;
export type UnionToIntersection<T> =
  (T extends any ? (x: T) => any : never) extends (x: infer R) => any ? R : never;

export type RoundNums1_20 = Exclude<Enumerate<20>, 0>;
