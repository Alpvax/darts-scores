<script setup lang="ts">
import { RouterLink, RouterView } from "vue-router";
</script>

<template>
  <header>
    <div class="wrapper">
      <nav>
        <RouterLink :to="{ name: 'twentysevenGame' }">Game</RouterLink>
        <RouterLink :to="{ name: 'twentysevenHistory' }">History</RouterLink>
      </nav>
    </div>
  </header>

  <RouterView />
  <ContextMenu />
</template>

<style scoped>
header {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 2em;
}
header > .wrapper {
  /* display: none; TODO: nav bar */
  display: inline-block;
  background-color: var(--color-background);
  box-shadow: 0 2px 5px;
  position: fixed;
  top: 0;
  left: 50%;
  transform: translate(-50%);
  font-size: large;
  width: max-content;
  padding: 0.5em;
  line-height: 1.5;
  max-height: 100vh;
  transition: all 0.5s;
  border-radius: 0.3em;
}
header:not(:hover) > .wrapper {
  transform: translate(-50%, -90%);
  font-size: medium;
}

.logo {
  display: block;
  margin: 0 auto 2rem;
}

nav {
  width: 100%;
  /* font-size: 12px; */
  text-align: center;
  /* margin-top: 2rem; */
}

nav a.router-link-active {
  color: var(--color-text);
  font-weight: bold;
  font-style: italic;
  cursor: default;
}

nav a.router-link-active:hover {
  background-color: transparent;
}

nav a {
  display: inline-block;
  padding: 0 1rem;
  border-left: 1px solid var(--color-border);
}

nav a:not(:first-of-type) {
  border-left: 1px solid var(--color-border);
  /* border: 0; */
}

/* @media (min-width: 1024px) {
  header {
    display: flex;
    place-items: center;
    padding-right: calc(var(--section-gap) / 2);
  }

  .logo {
    margin: 0 2rem 0 0;
  }

  header .wrapper {
    display: flex;
    place-items: flex-start;
    flex-wrap: wrap;
  }

  nav {
    text-align: left;
    margin-left: -1rem;
    font-size: 1rem;

    padding: 1rem 0;
    margin-top: 1rem;
  }
} */
</style>
