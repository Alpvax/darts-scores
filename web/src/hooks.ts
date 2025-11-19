import { type Reroute } from '@sveltejs/kit';
import { aliasLookup, type GameAlias } from '$lib/gameTypes';


export const reroute: Reroute = async ({ url }) => {
    if (url.pathname.startsWith("/game/")) {
        const [gameType, view] = url.pathname.substring(6).split(/\/(.*)/);
        if (Object.hasOwn(aliasLookup, gameType)) {
            const route = aliasLookup[gameType as GameAlias];
            console.debug(`Redirecting game alias: "${gameType}" -> "/${route}" with view: "${view}": /game/${route}/${view}`);
            return `/game/${route}/${view}`
        }
    }
};
