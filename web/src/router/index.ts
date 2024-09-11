import { createRouter, createWebHistory } from "vue-router";
import { useBasicConfig } from "@/config/baseConfigLayered";
import { nextTick } from "vue";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/",
      redirect: () => useBasicConfig.getValue("onload:defaultGame"),
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
      redirect: ({ path }) => {
        const def = useBasicConfig.getValue("onload:defaultView");
        return `${path}/${def.games["twentyseven"] ?? def.default}`;
      },
      children: [
        // { path: "", component: () => import("../views/HomeView.vue") },
        {
          path: "game/:gameId?",
          name: "twentysevenGame",
          meta: {
            title: {
              viewType: "Game",
            },
          },
          props: (route) => ({
            gameId: route.query.gameId ?? undefined,
          }),
          component: () => import("@/views/GameView27"),
        },
        {
          path: "history",
          name: "twentysevenHistory",
          meta: {
            title: {
              viewType: "History",
            },
          },
          component: () => import("@/views/HistoryView27"),
        },
        {
          path: "summary",
          meta: {
            title: {
              viewType: "Summary",
            },
          },
          component: () => import("@/views/SummaryView27.vue"),
        },
      ],
    },
    // {
    //   path: "/twentyseven/game/:gameId?",
    //   alias: "/27/game",
    //   name: "twentysevenGame",
    //   props: (route) => ({
    //     gameId: route.query.gameId ?? undefined,
    //   }),
    //   // route level code-splitting
    //   // this generates a separate chunk (About.[hash].js) for this route
    //   // which is lazy-loaded when the route is visited.
    //   component: () => import("@/views/GameView27"),
    // },
    // {
    //   path: "/twentyseven/summary",
    //   alias: "/27/summary",
    //   name: "twentysevenSummary",
    //   // props: (route) => ({
    //   //   gameId: route.query.gameId,
    //   // }),
    //   component: () => import("@/views/SummaryView27.vue"),
    // },
    // {
    //   path: "/twentyseven/history",
    //   alias: "/27/history",
    //   name: "twentysevenHistory",
    //   // route level code-splitting
    //   // this generates a separate chunk (About.[hash].js) for this route
    //   // which is lazy-loaded when the route is visited.
    //   // component: () => import("@/views/GameView27.vue"),
    //   component: () => import("@/views/HistoryView27"),
    // },
  ],
});

const DEFAULT_TITLE = "Darts Scoreboard";

router.afterEach((to) => {
  nextTick(() => {
    const title = to.meta.title;
    switch (typeof title) {
      case "string":
        document.title = title;
        break;
      case "object":
        if ("append" in title) {
          document.title = `${DEFAULT_TITLE} - ${title.append}`;
        } else {
          const gameTitle = title.gameType
            ? title.viewType
              ? `${title.gameType} ${title.viewType}`
              : title.gameType
            : title.viewType;
          document.title = gameTitle
            ? `${title.base ?? DEFAULT_TITLE} - ${gameTitle}`
            : `${DEFAULT_TITLE} App`;
        }
        break;
      default:
        document.title = `${DEFAULT_TITLE} App`;
        break;
    }
  });
});

declare module "vue-router" {
  interface RouteMeta {
    title?:
      | string
      | {
          append: string;
        }
      | {
          base?: string;
          gameType?: string;
          viewType?: string;
        };
  }
}

export default router;
