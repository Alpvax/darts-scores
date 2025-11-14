const gameTypesDef = {
    twentyseven: {
        name: "Twentyseven",
        aliases: ["27"],
    },
    bullseye: {
        name: "Bullseye Challenge",
    },
} as const satisfies {
    [k: string]: string | {
        name: string;
        aliases?: string[];
    }
};

export type GameType = {
    readonly route: string;
    readonly name: string;
    readonly aliases: string[];
}

type NormalisedGameTypes<T extends {
    [k: string]: string | {
        name: string;
        aliases?: string[];
    }
}> = {
    [K in (keyof T) & string as K extends "about" ? never : K]: {
        route: `/${K}`;
        name: T[K] extends { name: string }
            ? T[K]["name"]
            : T[K];
        aliases: T[K] extends { aliases: string[] }
            ? T[K]["aliases"]
            : []
    };
};
type AliasLookup<T extends {
    [k: string]: string | {
        name: string;
        aliases?: string[];
    }
}> = {
    [K in keyof T & string as K extends "about" ? never : T[K] extends { aliases: readonly [...string[]] } ? K : never]: T[K] extends { aliases: readonly [...string[]] }
        ? Exclude<T[K]["aliases"][number], keyof T>
        : never
} extends infer U
? {
    [K in keyof U & string as Exclude<U[K], Omit<U, K>[keyof Omit<U, K>]> extends string ? Exclude<U[K], Omit<U, K>[keyof Omit<U, K>]> : never]: `/${K}`
}: never;

type ValidPaths<T extends {
    [k: string]: string | {
        name: string;
        aliases?: string[];
    }
}> = keyof NormalisedGameTypes<T> | keyof AliasLookup<T>;

function normalise<T extends {
    [k: string]: string | {
        name: string;
        aliases?: string[];
    }
}>(gameTypes: T) {
    if (Object.hasOwn(gameTypes, "about")) {
        throw new Error("\"about\" is an invalid gameType key!")
    }
    return (Object.entries(gameTypes) as ([keyof NormalisedGameTypes<T>, T[string]])[]).reduce(({gameTypes, aliasLookup, lookup}, [route, typ]) => {
        let gameType = Object.freeze({
            route: `/${route}`,
            name: typeof typ === "string" ? typ : typ.name,
            aliases: typeof typ === "string" || !typ.aliases ? [] : typ.aliases,
        });
        gameTypes[route] = gameType as NormalisedGameTypes<T>[typeof route];
        lookup.set(route, gameType);
        for (const alias of gameType.aliases as (keyof typeof aliasLookup & string)[]) {
            // May be undefined if it has already conflicted once, but will still return true from `hasOwn`
            if (Object.hasOwn(aliasLookup, alias)) {
                const old = aliasLookup[alias];
                if (old) { // Warn about the first instance as well as any future duplicates
                    console.warn(`Invalidating duplicate alias: "${alias}" defined on "${old}"`);
                }
                console.warn(`Invalidating duplicate alias: "${alias}" defined on "${route}"`);
                // Set to undefined rather than deleting due to still needing to pass the `hasOwn` check
                //@ts-ignore
                aliasLookup[alias] = undefined;
                lookup.delete(alias);
            } else {
                //@ts-ignore
                aliasLookup[alias] = gameType.route;
                lookup.set(alias, gameType);
            }
        }
        /* tslint:enable */
        return { gameTypes, aliasLookup, lookup }
    }, {
        gameTypes: {},
        aliasLookup: {},
        lookup: new Map(),
    } as {
        gameTypes: NormalisedGameTypes<T>,
        aliasLookup: AliasLookup<T>,
        lookup: Map<string, GameType>,
    });
}
export const {gameTypes, aliasLookup, lookup } = normalise(gameTypesDef);
export default gameTypes;
export type GameTypes = typeof gameTypes;
export type GameAlias = keyof typeof aliasLookup;
