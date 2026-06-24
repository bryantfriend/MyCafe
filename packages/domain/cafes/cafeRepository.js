import {
  collection,
  doc,
  getDoc,
  getDocs,
  updateDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { db } from "../../firebase/firebaseFirestore.js";

async function getCafeById(cafeId) {
  const cafeSnap = await getDoc(doc(db, "cafes", cafeId));

  if (!cafeSnap.exists()) {
    return null;
  }

  return Object.assign({ id: cafeSnap.id }, cafeSnap.data());
}

async function listCafes() {
  const snap = await getDocs(collection(db, "cafes"));
  return snap.docs.map(function(cafeDoc) {
    return Object.assign({ id: cafeDoc.id }, cafeDoc.data());
  });
}

async function updateCafe(cafeId, cafeData) {
  await updateDoc(doc(db, "cafes", cafeId), cafeData);
}

export { getCafeById, listCafes, updateCafe };
