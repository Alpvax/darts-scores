abstract class Field<D extends string, R> {
  abstract add(prevValue: number, deps: { [K in D]: number }, result: R): number;
}

export function builder<R>(): Builder<R, {}> {
  return Builder.create();
}

export class Builder<R, F extends Record<string, {}>> {
  static create<R>(): Builder<R, {}> {
    return new Builder({});
  }
  private constructor(readonly fields: F) {}
  addField<K extends string>(key: K, field: Field<keyof F & string, R>):
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  Builder<R, F & { [k in K]: {} }> {
    Object.assign(this.fields, { [key]: field });
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    return this as Builder<R, F & { [k in K]: {} }>;
  }
}

