import { lookup } from '$lib/gameTypes';
import type { LayoutServerLoad } from "./$types";
import { error, redirect } from '@sveltejs/kit';

export const load: LayoutServerLoad = async ({ params, parent }) => {
    const gameType = lookup.get(params.gameType);
    console.log(params, gameType);

    const p = await parent();

    
    if (!gameType) {
        //TODO: view of game by id
        error(404);//TODO: better error (invalid game type)
    }
    // console.log(`Redirecting to "${gameType.route}/history"`)
    //TODO: implement config
    // redirect(307, `/game${gameType.route}/history`);

    console.log("params:", params);
    return {
        gameType,
        ...p,
    };
};