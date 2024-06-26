import { createRouter, createWebHistory, type RouteLocationRaw } from "vue-router";
import { StorageInterface, StorageLocation } from "@/config/storageInterface";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/",
      redirect: (_to) => {
        const config = StorageInterface.defaultInstance()
          .addValueHandler<RouteLocationRaw>(
            {
              initial: { name: "twentyseven" },
              key: "onload:defaultGame",
              location: StorageLocation.Local,
              parse: JSON.parse,
              merge: (partial, initial) =>
                [StorageLocation.Volatile, StorageLocation.Session, StorageLocation.Local]
                  .map((l) => partial.get(l))
                  .find((v) => v) ?? initial,
            },
            true,
          )
          .readonlyRef();
        return config.value;
      },
    },
    {
      path: "/gameSelect",
      name: "gameSelect",
      component: () => import("../views/HomeView.vue"), //TODO: selection view
    },
    {
      path: "/about",
      name: "about",
      // route level code-splitting
      // this generates a separate chunk (About.[hash].js) for this route
      // which is lazy-loaded when the route is visited.
      component: () => import("../views/AboutView.vue"),
    },
    {
      path: "/twentyseven",
      alias: "/27",
      name: "twentyseven",
      redirect: (_to) => ({
        name: "twentysevenSummary", //TODO: dynamic
      }),
    },
    {
      path: "/twentyseven/game",
      alias: "/27/game",
      name: "twentysevenGame",
      // props: (route) => ({
      //   gameId: route.query.gameId,
      // }),
      // route level code-splitting
      // this generates a separate chunk (About.[hash].js) for this route
      // which is lazy-loaded when the route is visited.
      component: () => import("@/views/GameView27"),
    },
    {
      path: "/twentyseven/summary",
      alias: "/27/summary",
      name: "twentysevenSummary",
      // props: (route) => ({
      //   gameId: route.query.gameId,
      // }),
      component: () => import("@/views/SummaryView27.vue"),
    },
    {
      path: "/twentyseven/history",
      alias: "/27/history",
      name: "twentysevenHistory",
      // route level code-splitting
      // this generates a separate chunk (About.[hash].js) for this route
      // which is lazy-loaded when the route is visited.
      // component: () => import("@/views/GameView27.vue"),
      component: () => import("@/views/HistoryView27"),
    },
  ],
});

export default router;
