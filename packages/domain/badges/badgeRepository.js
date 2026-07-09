import { doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { db } from "../../firebase/firebaseFirestore.js";

async function updateUserBadges(userId, badges) {
  await updateDoc(doc(db, "users", userId), { badges: badges });
}

export { updateUserBadges };
