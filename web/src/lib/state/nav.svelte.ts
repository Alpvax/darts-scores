import type { Snippet } from "svelte";
import { SvelteMap } from "svelte/reactivity";

export type NavElement = {
  route: string;
  label: string | Snippet;
} | Snippet;


export const navEntries = new SvelteMap<string, NavElement>();