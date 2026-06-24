import { auth } from "../packages/firebase/firebaseAuth.js";
import { db } from "../packages/firebase/firebaseFirestore.js";
import { firebaseApp } from "../packages/firebase/firebaseApp.js";

export { firebaseApp as app, auth, db };
