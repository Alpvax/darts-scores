import { get, gameTypes } from '$lib/gameTypes';
import { navEntries } from '$lib/state/nav.svelte';
import type { LayoutServerLoad } from "./$types";
import { error, redirect } from '@sveltejs/kit';

export const load: LayoutServerLoad = async ({ params, parent }) => {
  //TODO: add sub-nav elements
  for (const {route, name} of Object.values(gameTypes)) {
    navEntries.set(route, {
      route: `/game${route}`,
      label: name,
    })
  }

  const gameType = get(params.gameType);
  console.log(params, gameType);

  const p = await parent();

  
  if (!gameType) {
    //TODO: view of game by id?
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