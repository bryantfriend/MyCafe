// js/firebase-init.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBJYVVwZvPGWezU0nPkfPQE8wpnElRZTIU",
  authDomain: "mycafe-39b53.firebaseapp.com",
  projectId: "mycafe-39b53",
  storageBucket: "mycafe-39b53.appspot.com",
  messagingSenderId: "11006381908561",
  appId: "1:11006381908561:web:d3a911adc3259ea4fc2e70"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db };
