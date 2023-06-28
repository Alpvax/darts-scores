<template>
  <nav>
    <router-link to="/">
      Game
    </router-link>
    | <router-link to="/history">
      Past Games
    </router-link>
  </nav>
  <Suspense>
    <router-view />
    <template #fallback>
      Loading...
    </template>
  </Suspense>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import initialiseAPI from "./utils/consoleAPI";
export default defineComponent({
  setup() {
    initialiseAPI();
  },
});
</script>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
}

/* nav {
  padding: 30px;
} */

nav a {
  font-weight: bold;
  color: #2c3e50;
}

nav a.router-link-exact-active {
  color: #42b983;
}
</style>
