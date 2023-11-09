export type ClassBindings = undefined | string | Record<string, boolean> | string[];

export const formatClasses = (
  bindings: ClassBindings | (() => ClassBindings),
  ...extended: ClassBindings[]
): string => {
  const c = typeof bindings === "function" ? bindings() : bindings;
  const fmt = (c: ClassBindings) =>
    typeof c === "string"
      ? c
      : Array.isArray(c)
      ? c.join(" ")
      : typeof c === "object"
      ? [...Object.entries(c)].reduce((s, [k, v]) => (v ? `${s} ${k}` : s), "")
      : "";
  const base = fmt(c);
  if (extended === undefined || extended.length < 1) {
    return base;
  } else {
    const parts = [base, extended.map(fmt)];
    return parts.filter((s) => s.length > 0).join(" ");
  }
};

export type MoveFocus = {
  /** Change focus to the next round input */
  next: () => void;
  /** Change focus to the previous round input */
  prev: () => void;
  /** Change focus to the first unentered round input */
  empty: () => void;
};
