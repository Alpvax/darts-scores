<script lang="ts">
  import { page } from '$app/state';

  const { children, data } = $props();

  const view = $derived.by(() => {
    switch ((page.route.id!.match(/^(?<=\/game\/[gameType=gameType])[^\/]+/i) ?? [])[0]) {
      case "history":
        return "History";
      case "new":
        return "New Game";
      case "view":
        return "Past Game";
			default:
				return "Invalid view!"
    }
  });
  // const urls = Object.keys(import.meta.glob("./../**/game/+page.svelte"));
  // let matches = urls.map((urls) => urls.match(/\/applications\/[A-Za-z]+\//g));
  // let flat = matches.flat(1)
  // console.log(matches, flat);
</script>

<svelte:head>
    <title>Darts Scoreboard - {data.gameType?.name} - {view}</title>
</svelte:head>

<nav>
  <a href="history">History</a>
  <a href="new">New Game</a>
  <!-- <a href="view">History</a> -->
</nav>

{@render children()}