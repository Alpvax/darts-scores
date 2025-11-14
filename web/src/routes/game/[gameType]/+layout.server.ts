import { lookup } from '$lib/gameTypes';
import type { LayoutServerLoad } from "./$types";
import { error, redirect } from '@sveltejs/kit';

export const load: LayoutServerLoad = async ({ params, parent }) => {
    const gameType = lookup.get(params.gameType);
    console.log(params, gameType);

	const urls = Object.keys(import.meta.glob("./../**/game/+page.svelte"));
    console.log("Urls:", urls);
	let matches = urls.map((urls) => urls.match(/\/applications\/[A-Za-z]+\//g));
	let flat = matches.flat(1)
	console.log(matches, flat);

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