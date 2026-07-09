import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { firebaseApp } from "./firebaseApp.js";

const db = getFirestore(firebaseApp);

export { db };
