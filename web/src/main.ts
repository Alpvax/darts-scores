import "./assets/main.css";

import { createApp } from "vue";
import { createPinia } from "pinia";
import { initializeApp } from "firebase/app";

import App from "./App.vue";
import router from "./router";

initializeApp({
  apiKey: "AIzaSyDlxprk1nL3NfhOjvvv8t7b_849NS9hndA",
  authDomain: "alpvax-darts-scores.firebaseapp.com",
  projectId: "alpvax-darts-scores",
  storageBucket: "alpvax-darts-scores.appspot.com",
  messagingSenderId: "747461320838",
  appId: "1:747461320838:web:31f1c7482bbfb1a001b107",
  measurementId: "G-YBGZQ1456K",
});

const app = createApp(App);

app.use(createPinia());
app.use(router);

app.mount("#app");