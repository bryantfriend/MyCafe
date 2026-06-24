import { addDoc, collection } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { db } from "../../firebase/firebaseFirestore.js";

async function trackAnalyticsEvent(eventData) {
  const eventRef = await addDoc(collection(db, "analyticsEvents"), eventData);
  return eventRef.id;
}

export { trackAnalyticsEvent };
