// js/firebase-init.js

// --- VERSION UPDATED FOR CONSISTENCY ---
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBJYVVwZvPGWezU0nPkfPQE8wpnElRZTIU",
  authDomain: "mycafe-39b53.firebaseapp.com",
  projectId: "mycafe-39b53",
  storageBucket: "mycafe-39b53.appspot.com",
  // --- Double-check this value in your Firebase console ---
  messagingSenderId: "110063819085", // Example of a 12-digit ID
  appId: "1:110063819085:web:d3a911adc3259ea4fc2e70"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db };
