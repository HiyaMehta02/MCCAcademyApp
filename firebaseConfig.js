// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyD1rFW8T3SF6bE-eyqO2_GBTFdhvPhW53g",
  authDomain: "mccc-academy-app.firebaseapp.com",
  projectId: "mccc-academy-app",
  storageBucket: "mccc-academy-app.firebasestorage.app",
  messagingSenderId: "1056970433649",
  appId: "1:1056970433649:web:b09e326c76ba9b4ea527d0",
  measurementId: "G-JKWENHE5T8"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

