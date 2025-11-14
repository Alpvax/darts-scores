<script lang="ts">
	let { children, data } = $props();

	// const urls = Object.keys(import.meta.glob("./../**/game/+page.svelte"));
	// let matches = urls.map((urls) => urls.match(/\/applications\/[A-Za-z]+\//g));
	// let flat = matches.flat(1)
	// console.log(matches, flat);
</script>

<svelte:head>
    <title>Darts Scoreboard - {data.gameType?.name}</title>
</svelte:head>

{@render children()}