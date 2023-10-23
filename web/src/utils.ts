export type ClassBindings = undefined | string | Record<string, boolean> | string[];

export const extendClass = (
  bindings: ClassBindings | (() => ClassBindings),
  ...extended: ClassBindings[]
): ClassBindings => {
  const c = typeof bindings === "function" ? bindings() : bindings;
  if (extended === undefined || extended.length < 1) {
    return c;
  } else {
    return extended.reduce((a, b) => {
      if (a === undefined) {
        return b;
      }
      if (b === undefined) {
        return a;
      }
      const isStrB = typeof b === "string";
      const isArrB = Array.isArray(b);
      if (typeof a === "string") {
        return isStrB
          ? `${a} ${b}`
          : isArrB
          ? [...a.split(" "), ...b]
          : {
              [a]: true,
              ...b,
            };
      } else if (Array.isArray(a)) {
        return isStrB
          ? [...a, ...b.split(" ")]
          : isArrB
          ? [...a, ...b]
          : a.reduce((acc, clas) => {
              acc[clas] = true;
              return acc;
            }, b);
      } else {
        return isStrB
          ? { ...a, [b]: true }
          : isArrB
          ? b.reduce((acc, clas) => {
              acc[clas] = true;
              return acc;
            }, a)
          : { ...a, ...b };
      }
    }, c);
  }
};