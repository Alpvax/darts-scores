<script lang="ts">
  import GameLinks from '$lib/components/gameLinks.svelte';
  import {gameTypes} from "$lib/gameTypes";

  const gameLinks = Object.values(gameTypes).map(({route, name}) => ({
    route,
    label: name,
  }));
</script>
<h1>Select a game</h1>
<GameLinks {gameLinks}/>
<p>Visit <a href="https://svelte.dev/docs/kit">svelte.dev/docs/kit</a> to read the documentation</p>
