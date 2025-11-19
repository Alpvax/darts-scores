<script lang="ts">
  import type { NavElement } from "$lib/state/nav.svelte";

  const { gameLinks }: { gameLinks: NavElement[] } = $props();
</script>

{#each gameLinks as entry}
  {#if typeof entry === "function"}
    {@render entry()}
  {:else}
    <a href={entry.route}>
      {#if typeof entry.label === "function"}
        {@render entry.label()}
      {:else}
        {entry.label}
      {/if}
    </a>
  {/if}
{/each}