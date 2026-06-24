import { getStorage } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";
import { firebaseApp } from "./firebaseApp.js";

const storage = getStorage(firebaseApp);

export { storage };
