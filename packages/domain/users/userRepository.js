import {
  onAuthStateChanged,
  sendPasswordResetEmail,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  updateDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { auth } from "../../firebase/firebaseAuth.js";
import { db } from "../../firebase/firebaseFirestore.js";

function getCurrentAuthenticatedUser() {
  return new Promise(function(resolve, reject) {
    const unsubscribe = onAuthStateChanged(
      auth,
      function(user) {
        unsubscribe();
        resolve(user);
      },
      function(error) {
        unsubscribe();
        reject(error);
      }
    );
  });
}

async function signOutCurrentUser() {
  await signOut(auth);
}

async function sendPasswordReset(email) {
  await sendPasswordResetEmail(auth, email);
}

async function getUserById(userId) {
  const userSnap = await getDoc(doc(db, "users", userId));

  if (!userSnap.exists()) {
    return null;
  }

  return Object.assign({ id: userSnap.id }, userSnap.data());
}

async function listUsers() {
  const snap = await getDocs(collection(db, "users"));
  return snap.docs.map(function(userDoc) {
    return Object.assign({ id: userDoc.id }, userDoc.data());
  });
}

async function createUserProfile(userData) {
  const created = await addDoc(collection(db, "users"), userData);
  return created.id;
}

async function updateUserProfile(userId, userData) {
  await updateDoc(doc(db, "users", userId), userData);
}

async function deleteUserProfile(userId) {
  await deleteDoc(doc(db, "users", userId));
}

export {
  createUserProfile,
  deleteUserProfile,
  getCurrentAuthenticatedUser,
  getUserById,
  listUsers,
  sendPasswordReset,
  signOutCurrentUser,
  updateUserProfile
};
