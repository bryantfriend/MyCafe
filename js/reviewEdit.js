import { db } from './firebase-init.js';
import { setStatus } from '../packages/ui/renderHelpers.js';
import { runIntentPipeline } from '../packages/icf/pipeline/runIntentPipeline.js';
import {
  doc,
  getDoc,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

const status = document.getElementById('reviewEditStatus');
const form = document.getElementById('reviewEditForm');
const params = new URLSearchParams(window.location.search);
const reviewId = params.get('id') || '';
const token = params.get('token') || '';
let currentReview = null;

function setFormVisible(visible) {
  form.classList.toggle('hidden', !visible);
}

function fillForm(review) {
  document.getElementById('reviewEditCafeName').textContent = review.cafeName || review.cafeId || 'Cafe review';
  document.getElementById('editReviewName').value = review.name || review.username || '';
  document.getElementById('editReviewRating').value = String(review.rating || 5);
  document.getElementById('editReviewPhotoUrl').value = review.imageUrl || '';
  document.getElementById('editReviewText').value = review.text || '';
}

async function loadReview() {
  if (!reviewId || !token) {
    setStatus(status, 'This edit link is missing its review id or token.', 'error');
    return;
  }

  try {
    const reviewSnap = await getDoc(doc(db, 'reviews', reviewId));
    if (!reviewSnap.exists()) {
      setStatus(status, 'Review not found.', 'error');
      return;
    }

    currentReview = { id: reviewSnap.id, ...reviewSnap.data() };
    if (currentReview.editToken !== token) {
      setStatus(status, 'This edit link is not valid for that review.', 'error');
      return;
    }

    fillForm(currentReview);
    setFormVisible(true);
    setStatus(status, currentReview.approved ? 'Editing an approved review will send it back to moderation.' : 'Review is ready to edit.', 'info');
  } catch (error) {
    console.error('[reviewEdit] Could not load review.', error);
    setStatus(status, 'Review could not be loaded right now.', 'error');
  }
}

form.addEventListener('submit', async event => {
  event.preventDefault();
  if (!currentReview) return;

  const submitButton = form.querySelector('button[type="submit"]');
  submitButton.disabled = true;
  setStatus(status, 'Saving review changes...', 'info');

  try {
    const editResult = await runIntentPipeline('EditReviewWithTokenIntent', {
      reviewId: currentReview.id,
      editToken: token,
      name: document.getElementById('editReviewName').value.trim(),
      rating: Number(document.getElementById('editReviewRating').value),
      imageUrl: document.getElementById('editReviewPhotoUrl').value.trim(),
      text: document.getElementById('editReviewText').value.trim()
    });
    if (!editResult.ok) {
      throw new Error(editResult.message || 'Review changes could not be saved.');
    }
    setStatus(status, editResult.message || 'Review changes saved and sent for moderation.', 'success');
  } catch (error) {
    console.error('[reviewEdit] Could not save review.', error);
    setStatus(status, 'Review changes could not be saved.', 'error');
  } finally {
    submitButton.disabled = false;
  }
});

loadReview();
