import { type Handle, redirect } from '@sveltejs/kit';


export const handle: Handle = async ({ event, resolve }) => {
    console.log("handle link:", event.url.pathname);//XXX
    if (event.url.pathname.startsWith("/game/")) {
        const [gameType, view] = event.url.pathname.substring(6).split(/\/(.*)/, 2);
        console.log(gameType,view)
        console.log(`url: /game/${gameType}/${view}`)
        if (!view) {
            console.debug(`Redirecting from url due to missing view: gameType = "${gameType}", view = "${view}"`);
            //TODO: load from config
            redirect(307, `/game/${gameType}/history`);
        }
    }

    return await resolve(event);
};
