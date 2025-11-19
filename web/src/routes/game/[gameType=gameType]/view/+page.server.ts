import { get } from "$lib/gameTypes";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ params, parent }) => {
    const gameType = get(params.gameType);
    return {
        ...await parent(),
        gameType,
    }
};