import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { firebaseConfig } from "./firebaseConfig.js";

const firebaseApp = initializeApp(firebaseConfig);

export { firebaseApp };
