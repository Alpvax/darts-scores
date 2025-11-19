import { createRawSnippet, type Snippet } from 'svelte';
import type { LayoutServerLoad } from "./$types";
import { navEntries } from '$lib/state/nav.svelte';


export const load: LayoutServerLoad = async () => {
  return {
    navEntries: [...navEntries.values()],
  };
};