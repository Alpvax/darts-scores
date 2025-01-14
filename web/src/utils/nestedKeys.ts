// A trap for a function call.
const applyTrap: ProxyHandler<object>["apply"] = () => {
  throw new Error("Unsupported operation");
};

// A trap for the new operator.
const constructTrap: ProxyHandler<object>["construct"] = () => {
  throw new Error("Unsupported operation");
};

// A trap for Object.defineProperty.
const definePropertyTrap: ProxyHandler<object>["defineProperty"] = () => {
  throw new Error("As yet Unsupported operation");
};

// A trap for the delete operator.
const deletePropertyTrap: ProxyHandler<object>["deleteProperty"] = () => {
  throw new Error("As yet Unsupported operation");
};

// A trap for getting property values.
const getTrap: ProxyHandler<object>["get"] = (target, key, reciever) => {
  if (typeof key === "string") {
    if (key in target) {
      return Reflect.get(target, key, reciever);
    }
    const parts = key.split(".");
    if (parts.length < 2) {
      return undefined;
    }
    const last = parts.pop()!;
    let obj: any = target; //TODO: lookup from reciever?
    for (const part of parts) {
      if (part in obj) {
        if (typeof obj[part] === "object") {
          obj = obj[part];
        } else {
          return undefined;
        }
      } else {
        return undefined;
      }
    }
    return obj[last];
  }
};
// A trap for Object.getOwnPropertyDescriptor.
const getOwnPropertyDescriptorTrap: ProxyHandler<object>["getOwnPropertyDescriptor"] = () => {
  throw new Error("As yet Unsupported operation");
};

// A trap for Object.getPrototypeOf.
const getPrototypeOfTrap: ProxyHandler<object>["getPrototypeOf"] = () => {
  throw new Error("As yet Unsupported operation");
};

// A trap for the in operator.
const hasTrap: ProxyHandler<object>["has"] = (target, p) => {
  if (p in target) {
    return true;
  }
  if (typeof p === "string") {
    const parts = p.split(".");
    const l = parts.length;
    let obj: any = target;
    for (const [i, part] of parts.entries()) {
      if (part in obj) {
        if (i === l - 1) {
          return true;
        }
        if (typeof obj[part] === "object") {
          obj = obj[part];
        }
      } else {
        return false;
      }
    }
  }
  return false;
};

// A trap for Object.isExtensible.
const isExtensibleTrap: ProxyHandler<object>["isExtensible"] = () => {
  throw new Error("As yet Unsupported operation");
};

// A trap for Object.getOwnPropertyNames and Object.getOwnPropertySymbols.
const getKeysRecursive = <T extends Record<string, any>>(obj: T, prefix?: string): string[] => {
  const keys = Object.getOwnPropertyNames(obj).flatMap((k: keyof T & string) =>
    typeof obj[k] === "object" && !Array.isArray(obj[k])
      ? [k, ...getKeysRecursive(obj[k] as Record<string, any>, k)]
      : [k],
  );
  return prefix ? keys.map((k) => `${prefix}.${k}`) : keys;
};
const ownKeysTrap: ProxyHandler<any>["ownKeys"] = getKeysRecursive;
// const ownKeysFlatOnlyTrap: ProxyHandler<object>["ownKeys"] = (target) => Object.getOwnPropertyNames(target).flatMap((k: keyof typeof target) => {
//   if (typeof target[k] === "object") {
//     let keys = [];
//     let obj =
//   }
// })

// A trap for Object.preventExtensions.
const preventExtensionsTrap: ProxyHandler<object>["preventExtensions"] = () => {
  throw new Error("Unsupported operation");
};

// A trap for setting property values.
const setTrap: ProxyHandler<object>["set"] = () => {
  throw new Error("As yet Unsupported operation");
};

// A trap for Object.setPrototypeOf.
const setPrototypeOfTrap: ProxyHandler<object>["setPrototypeOf"] = () => {
  throw new Error("Unsupported operation");
};

const handlers: ProxyHandler<object> = {
  apply: applyTrap,
  construct: constructTrap,
  // defineProperty: definePropertyTrap,
  // deleteProperty: deletePropertyTrap,
  get: getTrap,
  // getOwnPropertyDescriptor: getOwnPropertyDescriptorTrap,
  // getPrototypeOf: getPrototypeOfTrap,
  has: hasTrap,
  // isExtensible: isExtensibleTrap,
  ownKeys: ownKeysTrap,
  // preventExtensions: preventExtensionsTrap,
  // set: setTrap,
  // setPrototypeOf: setPrototypeOfTrap,
};

export const nestedAccessProxy = <T extends object>(obj: T): NestedKeys<T> =>
  new Proxy(obj, handlers) as NestedKeys<T>;
// Just return the same object but without the original properties exposed. //TODO: Fix?
// Is a proxy, so all the original properties and methods are still available and will be displayed on print
export const flattenedAccessProxy = <T extends object>(obj: T): Flatten<T> =>
  nestedAccessProxy(obj) as Flatten<T>;

/**
 * Like Flatten, but also preserve the initial structure
 * (i.e. obj["a.b.c"] is also accessible as obj.a["b.c"] or obj.a.b.c or obj["a.b"].c)
 */
type NestedKeys<T extends object> = object extends T
  ? T
  : T & {
        [K in keyof T]-?: (
          x: NonNullable<T[K]> extends infer V
            ? V extends object
              ? V extends any[]
                ? Pick<T, K>
                : Pick<T, K> &
                    (NestedKeys<V> extends infer FV
                      ? {
                          [P in keyof FV as `${Extract<K, string | number>}.${Extract<P, string | number>}`]: FV[P];
                        } extends infer VFlat
                        ? undefined extends T[K]
                          ? Partial<VFlat>
                          : VFlat
                        : never
                      : never)
              : Pick<T, K>
            : never,
        ) => void;
      } extends Record<string, (y: infer O) => void>
    ? { [K in keyof O]: O[K] }
    : never;

/**
 * Flattens an object, changing access from obj.a.b.c into obj["a.b.c"]
 */
type Flatten<T extends object> = object extends T
  ? T
  : {
        [K in keyof T]: (
          x: NonNullable<T[K]> extends infer V
            ? V extends object
              ? V extends any[]
                ? Pick<T, K>
                : Flatten<V> extends infer FV
                  ? {
                      [P in keyof FV as `${Extract<K, string | number>}.${Extract<P, string | number>}`]: FV[P];
                    } extends infer VFlat
                    ? undefined extends T[K]
                      ? Partial<VFlat>
                      : VFlat
                    : never
                  : never
              : Pick<T, K>
            : never,
        ) => void;
      } extends Record<string, (y: infer O) => void>
    ? { [K in keyof O]: O[K] }
    : never;

// TODO: proper tests:
// (() => {
//   const obj: {
//     a: string;
//     b: number;
//     maybeC?: {
//       some: string[];
//       thing?: boolean;
//       optional?: number;
//     };
//   } = {
//     a: "hello",
//     b: 3,
//     maybeC: {
//       some: ["foo", "bar"],
//       thing: true,
//     },
//   };
//   let p = nestedAccessProxy(obj);
//   console.log("Proxy:", obj, "=>", p);
//   console.log(Object.getOwnPropertyNames(p));
//   console.log("maybeC.thing:", p.maybeC?.thing, p["maybeC.thing"]);
// })()
