import { doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { db } from "../../firebase/firebaseFirestore.js";

async function getCafeMenu(cafeId) {
  const cafeSnap = await getDoc(doc(db, "cafes", cafeId));

  if (!cafeSnap.exists()) {
    return null;
  }

  return cafeSnap.data().menu || {};
}

async function updateCafeMenu(cafeId, menu) {
  await updateDoc(doc(db, "cafes", cafeId), { menu: menu });
}

export { getCafeMenu, updateCafeMenu };
