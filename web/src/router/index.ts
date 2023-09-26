import { createRouter, createWebHistory, RouteRecordRaw } from "vue-router";
import GameView from "../views/GameView.vue";

const routes: RouteRecordRaw[] = [
  {
    path: "/",
    name: "game",
    component: GameView,
  },
  {
    path: "/about",
    name: "about",
    // route level code-splitting
    // this generates a separate chunk (about.[hash].js) for this route
    // which is lazy-loaded when the route is visited.
    component: () => import(/* webpackChunkName: "about" */ "../views/AboutView.vue"),
  },
  {
    path: "/history",
    name: "history",
    component: () => import(/* webpackChunkName: "history" */ "../views/HistoryView.vue"),
  },
  {
    path: "/game/:gameId",
    name: "pastGame",
    props: true,
    component: () => import(/* webpackChunkName: "prevGame" */ "../views/PastGameView.vue"),
  },
  {
    path: "/summaryV2",
    component: () => import(/* webpackChunkName: "summaryV2" */ "../views/SummaryView.vue"),
  },
  {
    path: "/summaryV3",
    component: () => import(/* webpackChunkName: "summaryV3" */ "../views/SummaryView3.vue"),
  },
];

const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes,
});

export default router;
