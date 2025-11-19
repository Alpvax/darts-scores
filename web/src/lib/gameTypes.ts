import type { LayeredConfig } from "$config/impl";

const gameTypesDef = {
	twentyseven: {
		name: "Twentyseven",
		aliases: ["27"],
    // config: import("$config/game/twentyseven").then(m => m.config),
    config: {
      module: import("$config/game/twentyseven"),
      export: "config",
    },
	},
	bullseye: {
		name: "Bullseye Challenge",
	},
} as const satisfies {
	[k: string]: string | {
		name: string;
		aliases?: string[];
		config?: LayeredConfig<any> | ConfigImportDef<any, any> | Promise<LayeredConfig<any>>;
	}
};

type ConfigImportDef<M extends Record<string, object>, K extends keyof M> = {
  module: Promise<M>;
  export: K;
}

const t27mod = import("$config/game/twentyseven");
const t27conf = t27mod.then(m => m.config) satisfies Promise<LayeredConfig<any>>;
const t27sat = t27conf satisfies Promise<LayeredConfig<any>>

export type GameType = {
	readonly route: string;
	readonly name: string;
	readonly aliases: string[];
}

type ConfigFor<C extends LayeredConfig<any> | ConfigImportDef<any, any> | Promise<LayeredConfig<any>>>// | boolean>
= C extends LayeredConfig<infer T>
	? LayeredConfig<T>
  : C extends ConfigImportDef<infer M, infer K>
    ? M[K] extends LayeredConfig<any>
      ? Promise<M[K]>
      : [never, "export is not a layered config"]
    : C extends Promise<LayeredConfig<infer T>>
      ? Promise<LayeredConfig<T>>
      : null;

type NormalisedGameTypes<T extends {
	[k: string]: string | {
		name: string;
		aliases?: string[];
		config?: LayeredConfig<any> | ConfigImportDef<any, any> | Promise<LayeredConfig<any>>;
	}
}> = {
	[K in (keyof T) & string as K extends "about" ? never : K]: {
		route: `/${K}`;
		name: T[K] extends { name: string }
			? T[K]["name"]
			: T[K];
		aliases: T[K] extends { aliases: string[] }
			? T[K]["aliases"]
			: [];
		config: T[K] extends { config: any }
			? ConfigFor<T[K]["config"]>
			: null
	};
};
type AliasLookupT<T extends {
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
	[K in keyof U & string as Exclude<U[K], Omit<U, K>[keyof Omit<U, K>]> extends string ? Exclude<U[K], Omit<U, K>[keyof Omit<U, K>]> : never]: K
}: never;

type ValidPaths<T extends {
	[k: string]: string | {
		name: string;
		aliases?: string[];
	}
}> = keyof NormalisedGameTypes<T> | keyof AliasLookupT<T>;

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
		aliasLookup: AliasLookupT<T>,
		lookup: Map<string, GameType>,
	});
}
const meta = normalise(gameTypesDef);
export const gameTypes = meta.gameTypes;
export default gameTypes;
export const aliasLookup = meta.aliasLookup;
/** Check whether the passed in type is either a gameType key or a gameType Alias */
export const isValidGameType = (param: string): param is GameTypeOrAlias => meta.lookup.has(param);
export const get: {
  <K extends keyof AliasLookup>(alias: K): GameTypes[AliasLookup[K]];
  <K extends keyof GameTypes>(id: K): GameTypes[K];
  <K extends string>(idOrAlias: K): K extends keyof AliasLookup
  ? GameTypes[AliasLookup[K]]
  : K extends keyof GameTypes
    ? GameTypes[K]
    : undefined;
} = (idOrAlias: string) => meta.lookup.get(idOrAlias);
export type GameTypes = typeof gameTypes;
type AliasLookup = typeof aliasLookup;
export type GameIds = keyof GameTypes & string;
export type GameAlias = keyof typeof aliasLookup & string;
export type GameTypeOrAlias = GameIds | GameAlias;
