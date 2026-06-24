import { getFunctions } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-functions.js";
import { firebaseApp } from "./firebaseApp.js";

const functions = getFunctions(firebaseApp);

export { functions };
