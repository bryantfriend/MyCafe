import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  updateDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { db } from "../../firebase/firebaseFirestore.js";

async function createCircle(circleData) {
  const circleRef = await addDoc(collection(db, "cafeCircles"), circleData);
  return circleRef.id;
}

async function getCircleById(circleId) {
  const circleSnap = await getDoc(doc(db, "cafeCircles", circleId));

  if (!circleSnap.exists()) {
    return null;
  }

  return Object.assign({ id: circleSnap.id }, circleSnap.data());
}

async function listCircles() {
  const snap = await getDocs(collection(db, "cafeCircles"));
  return snap.docs.map(function(circleDoc) {
    return Object.assign({ id: circleDoc.id }, circleDoc.data());
  });
}

async function updateCircle(circleId, circleData) {
  await updateDoc(doc(db, "cafeCircles", circleId), circleData);
}

export { createCircle, getCircleById, listCircles, updateCircle };
