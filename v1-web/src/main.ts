import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";
import "./registerServiceWorker";
import router from "./router";

createApp(App).use(router).use(createPinia()).mount("#app");

// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDlxprk1nL3NfhOjvvv8t7b_849NS9hndA",
  authDomain: "alpvax-darts-scores.firebaseapp.com",
  projectId: "alpvax-darts-scores",
  storageBucket: "alpvax-darts-scores.appspot.com",
  messagingSenderId: "747461320838",
  appId: "1:747461320838:web:31f1c7482bbfb1a001b107",
  measurementId: "G-YBGZQ1456K",
};

// Initialize Firebase
initializeApp(firebaseConfig);
// const analytics = getAnalytics(app);
