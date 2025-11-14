import { lookup } from '$lib/gameTypes';
import type { PageServerLoad } from "./$types";
import { error, redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ params, parent }) => {
    const gameType = lookup.get(params.gameType);
    console.log(params, gameType);

    const p = await parent();

    
    if (!gameType) {
        //TODO: view of game by id
        error(404);//TODO: better error (invalid game type)
    }

    console.log("params:", params);
    return {
        // gameType,
        ...p,
    };
};