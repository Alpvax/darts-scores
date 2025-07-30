import "./assets/main.css";

import * as _ from "./initFirebase";
import { createApp } from "vue";
import { createPinia } from "pinia";

import App from "./App.vue";
import router from "./router";
import initialiseAPI from "./utils/consoleAPI";
import contextMenu from "./contextMenu";

const app = createApp(App);

app.use(createPinia());
app.use(router);
app.use(contextMenu);

app.mount("#app");

initialiseAPI();

//Run GameDefV2 tests
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import * as _test from "@/gameDefinitionV2/tests"; //XXX
