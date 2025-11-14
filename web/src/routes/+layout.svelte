<script lang="ts">
	import icon from '$lib/assets/Dartboard_unlabeled.svg';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={icon} />
</svelte:head>

<style>
	#navLogo {
		position: absolute;
		max-height: 5vw;
		max-width: 25vw;
		right: 0vw;
	}
</style>

<nav>
	<img id="navLogo" src={icon} alt="Logo: dart board"/>
	<a href="/">Select game</a>
	<a href="/about">About</a>
	{@render navExtra()}
</nav>

{@render children()}
