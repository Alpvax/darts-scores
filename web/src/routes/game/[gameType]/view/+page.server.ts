import { lookup } from "$lib/gameTypes";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ params, parent }) => {
    const gameType = lookup.get(params.gameType);
    return {
        ...await parent(),
        gameType,
    }
};