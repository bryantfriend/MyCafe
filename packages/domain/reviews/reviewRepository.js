import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  updateDoc,
  where
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { db } from "../../firebase/firebaseFirestore.js";

async function listReviews() {
  const snap = await getDocs(collection(db, "reviews"));
  return snap.docs.map(function(reviewDoc) {
    return Object.assign({ id: reviewDoc.id }, reviewDoc.data());
  });
}

async function listReviewsByUserId(userId) {
  const reviewsQuery = query(collection(db, "reviews"), where("userId", "==", userId));
  const snap = await getDocs(reviewsQuery);
  return snap.docs.map(function(reviewDoc) {
    return Object.assign({ id: reviewDoc.id }, reviewDoc.data());
  });
}

async function updateReview(reviewId, reviewData) {
  await updateDoc(doc(db, "reviews", reviewId), reviewData);
}

async function deleteReview(reviewId) {
  await deleteDoc(doc(db, "reviews", reviewId));
}

export { deleteReview, listReviews, listReviewsByUserId, updateReview };
