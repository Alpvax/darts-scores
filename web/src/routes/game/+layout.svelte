<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
    import gameTypes from '$lib/gameTypes';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<nav>
	{#each Object.values(gameTypes) as gameType}
		<a href={gameType.route}>{gameType.name}</a>
	{/each}
</nav>

{@render children()}
