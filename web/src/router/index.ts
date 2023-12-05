import { createRouter, createWebHistory } from "vue-router";
import HomeView from "../views/HomeView.vue";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/",
      name: "home",
      component: HomeView,
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
      path: "/twentyseven/game",
      alias: "/27/game",
      name: "twentyseven",
      // props: (route) => ({
      //   gameId: route.query.gameId,
      // }),
      // route level code-splitting
      // this generates a separate chunk (About.[hash].js) for this route
      // which is lazy-loaded when the route is visited.
      // component: () => import("@/views/GameView27.vue"),
      component: () => import("@/views/GameView27v3"),
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
