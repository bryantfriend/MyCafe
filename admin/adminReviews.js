import {
  collection,
  getDocs
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

import { db } from '../js/firebase-init.js';
import { runIntentPipeline } from '../packages/icf/pipeline/runIntentPipeline.js';
import { escapeHtml } from '../packages/ui/renderHelpers.js';
import { getReviewBadgeLabels } from '../packages/domain/reviews/reviewTrust.js';

export async function renderReviewsPanel(container) {
  container.innerHTML = `
    <h2 class="text-2xl font-bold mb-4">📝 Review Moderation</h2>

    <div class="mb-4 flex flex-wrap gap-4">
      <select id="reviewStatusFilter" class="border px-3 py-2 rounded">
        <option value="">All Reviews</option>
        <option value="flagged">Flagged</option>
        <option value="pending">Pending</option>
        <option value="approved">Approved</option>
        <option value="auto-approved">Auto-approved</option>
      </select>
      <select id="reviewStarFilter" class="border px-3 py-2 rounded">
        <option value="">Any Rating</option>
        <option value="5">5 stars</option>
        <option value="4">4 stars</option>
        <option value="3">3 stars</option>
        <option value="2">2 stars</option>
        <option value="1">1 star</option>
      </select>
      <input id="reviewCafeFilter" type="text" placeholder="Cafe" class="border px-3 py-2 rounded">
      <input id="reviewLanguageFilter" type="text" placeholder="Language" class="border px-3 py-2 rounded">
      <input id="reviewDateFilter" type="date" class="border px-3 py-2 rounded">
    </div>

    <div id="reviewList" class="space-y-4"></div>
  `;

  const allReviews = await loadAllReviews();
  renderReviewList(allReviews);

  function applyFilters() {
    const status = document.getElementById('reviewStatusFilter').value;
    const rating = document.getElementById('reviewStarFilter').value;
    const cafe = document.getElementById('reviewCafeFilter').value.toLowerCase();
    const language = document.getElementById('reviewLanguageFilter').value.toLowerCase();
    const date = document.getElementById('reviewDateFilter').value;
    const filtered = allReviews.filter(function(review) {
      const statusMatch = !status
        || (status === 'flagged' && review.flagged)
        || (status === 'pending' && !review.approved)
        || (status === 'approved' && review.approved)
        || (status === 'auto-approved' && review.moderationStatus === 'auto-approved');
      const ratingMatch = !rating || Number(review.rating) === Number(rating);
      const cafeMatch = !cafe || `${review.cafeName || ''} ${review.cafeId || ''}`.toLowerCase().includes(cafe);
      const languageMatch = !language || String(review.language || '').toLowerCase().includes(language);
      const reviewDate = review.createdAt?.toDate?.() || review.timestamp?.toDate?.() || null;
      const dateMatch = !date || (reviewDate && reviewDate.toISOString().startsWith(date));
      return statusMatch && ratingMatch && cafeMatch && languageMatch && dateMatch;
    });
    renderReviewList(filtered);
  }

  ['reviewStatusFilter', 'reviewStarFilter', 'reviewCafeFilter', 'reviewLanguageFilter', 'reviewDateFilter'].forEach(function(id) {
    document.getElementById(id).addEventListener('input', applyFilters);
    document.getElementById(id).addEventListener('change', applyFilters);
  });
}

async function loadAllReviews() {
  const snap = await getDocs(collection(db, 'reviews'));
  const reviews = [];
  snap.forEach(function(reviewDoc) {
    reviews.push({ id: reviewDoc.id, ...reviewDoc.data() });
  });
  return reviews;
}

async function requireIntentSuccess(result, fallbackMessage) {
  if (!result || !result.ok) {
    throw new Error(result && result.message ? result.message : fallbackMessage);
  }
  return result;
}

function renderReviewList(reviews) {
  const container = document.getElementById('reviewList');
  container.innerHTML = '';

  if (reviews.length === 0) {
    container.innerHTML = '<p class="text-gray-500">No reviews found for this filter.</p>';
    return;
  }

  reviews.forEach(function(review) {
    const div = document.createElement('div');
    div.className = 'border bg-white p-4 rounded shadow';
    const snippet = (review.text || '').slice(0, 140);
    const badges = getReviewBadgeLabels(review);
    const spamFlags = review.spamFlags || [];

    div.innerHTML = `
      <div class="flex justify-between items-start gap-4">
        <div>
          <h3 class="font-semibold">${escapeHtml(review.username || review.name || review.userId || 'Guest')} · ${escapeHtml(review.cafeName || review.cafeId || 'Cafe')}</h3>
          <p><strong>Rating:</strong> ${escapeHtml(review.rating || '')} ⭐ <strong>Language:</strong> ${escapeHtml(review.language || 'n/a')}</p>
          <p><strong>Trust:</strong> ${escapeHtml(review.trustLabel || review.trustLevel || 'guest')} · score ${escapeHtml(review.trustScore ?? 0)} · spam ${escapeHtml(review.spamScore ?? 0)}</p>
          <div class="review-badge-row">
            ${badges.map(function(badge) { return `<span>${escapeHtml(badge)}</span>`; }).join('')}
            ${spamFlags.map(function(flag) { return `<span class="risk">${escapeHtml(flag)}</span>`; }).join('')}
          </div>
          <p><strong>Snippet:</strong> ${escapeHtml(snippet)}</p>
          <p><strong>Status:</strong> ${escapeHtml(review.moderationStatus || (review.flagged ? 'Flagged' : review.approved ? 'Approved' : 'New / unapproved'))}</p>
          ${review.flagged ? '<p class="text-red-600">⚠️ Flagged for moderation</p>' : ''}
          ${review.imageUrl ? `<img src="${escapeHtml(review.imageUrl)}" alt="review image" class="w-32 mt-2 rounded border">` : ''}
          <details class="mt-3 bg-gray-50 rounded p-3">
            <summary class="cursor-pointer font-semibold">Review detail</summary>
            <p class="mt-2">${escapeHtml(review.text || '')}</p>
            <label class="block mt-3 text-sm">Flag reason
              <input class="flag-reason border px-2 py-1 rounded w-full mt-1" value="${escapeHtml(review.flagReason || '')}">
            </label>
            <label class="block mt-3 text-sm">Translated versions
              <textarea class="translations-field border px-2 py-1 rounded w-full mt-1" rows="4">${escapeHtml(JSON.stringify(review.translations || {}, null, 2))}</textarea>
            </label>
            <div class="flex flex-wrap gap-2 mt-3">
              <button class="save-detail-btn bg-blue-600 text-white px-3 py-1 rounded">Save detail</button>
              <button class="verify-visit-btn bg-green-100 text-green-800 px-3 py-1 rounded" type="button">Mark verified visit</button>
              <button class="translate-btn bg-yellow-600 text-white px-3 py-1 rounded">Translate All</button>
              ${review.imageUrl ? '<button class="delete-photo-btn bg-red-100 text-red-700 px-3 py-1 rounded">Delete photo</button>' : ''}
            </div>
          </details>
        </div>
        <div class="flex flex-col gap-2">
          <button class="approve-btn bg-green-600 text-white px-3 py-1 rounded">✅ Approve</button>
          <button class="reject-btn bg-yellow-600 text-white px-3 py-1 rounded">Reject</button>
          <button class="delete-btn bg-red-600 text-white px-3 py-1 rounded">🗑️ Delete</button>
        </div>
      </div>
    `;

    bindReviewActions(div, review);
    container.appendChild(div);
  });
}

function bindReviewActions(div, review) {
  div.querySelector('.approve-btn').addEventListener('click', async function() {
    await requireIntentSuccess(await runIntentPipeline('AdminUpdateReviewIntent', {
      reviewId: review.id,
      reviewUserId: review.userId || '',
      awardTrust: true,
      reviewPatch: {
        approved: true,
        flagged: false,
        moderationStatus: 'approved',
        reviewedAt: new Date()
      }
    }), 'Review could not be approved.');
    div.remove();
  });

  div.querySelector('.reject-btn').addEventListener('click', async function() {
    await requireIntentSuccess(await runIntentPipeline('AdminUpdateReviewIntent', {
      reviewId: review.id,
      reviewPatch: {
        approved: false,
        flagged: true,
        moderationStatus: 'rejected',
        flagReason: div.querySelector('.flag-reason')?.value || 'Rejected by admin',
        reviewedAt: new Date()
      }
    }), 'Review could not be rejected.');
    div.remove();
  });

  div.querySelector('.save-detail-btn').addEventListener('click', async function() {
    let translations = {};
    try {
      translations = JSON.parse(div.querySelector('.translations-field').value || '{}');
    } catch {
      alert('Translations must be valid JSON.');
      return;
    }
    await requireIntentSuccess(await runIntentPipeline('AdminUpdateReviewIntent', {
      reviewId: review.id,
      reviewPatch: {
        flagReason: div.querySelector('.flag-reason').value.trim(),
        translations: translations
      }
    }), 'Review detail could not be saved.');
  });

  div.querySelector('.verify-visit-btn').addEventListener('click', async function() {
    await requireIntentSuccess(await runIntentPipeline('AdminUpdateReviewIntent', {
      reviewId: review.id,
      reviewPatch: {
        verifiedVisit: true,
        verifiedAt: new Date()
      }
    }), 'Review could not be verified.');
    div.querySelector('.review-badge-row').insertAdjacentHTML('afterbegin', '<span>Verified visit</span>');
  });

  div.querySelector('.translate-btn').addEventListener('click', async function() {
    const translations = review.translations || {};
    ['ru', 'ky', 'en', 'uz', 'tg', 'zh', 'ko', 'ar', 'hi', 'ur', 'bn', 'ug', 'tr'].forEach(function(lang) {
      translations[lang] = translations[lang] || { text: review.text || '' };
    });
    await requireIntentSuccess(await runIntentPipeline('AdminUpdateReviewIntent', {
      reviewId: review.id,
      reviewPatch: { translations: translations }
    }), 'Review translations could not be saved.');
    div.querySelector('.translations-field').value = JSON.stringify(translations, null, 2);
  });

  div.querySelector('.delete-photo-btn')?.addEventListener('click', async function() {
    await requireIntentSuccess(await runIntentPipeline('AdminUpdateReviewIntent', {
      reviewId: review.id,
      reviewPatch: { imageUrl: '' }
    }), 'Review photo could not be removed.');
    div.querySelector('img')?.remove();
  });

  div.querySelector('.delete-btn').addEventListener('click', async function() {
    if (confirm('Are you sure you want to delete this review?')) {
      await requireIntentSuccess(await runIntentPipeline('AdminDeleteReviewIntent', {
        reviewId: review.id
      }), 'Review could not be deleted.');
      div.remove();
    }
  });
}

export async function checkReviewAlerts() {
  const snap = await getDocs(collection(db, 'reviews'));
  let flaggedCount = 0;
  let pendingCount = 0;

  snap.forEach(function(reviewDoc) {
    const review = reviewDoc.data();
    if (review.flagged) {
      flaggedCount += 1;
    }
    if (!review.approved) {
      pendingCount += 1;
    }
  });

  return { flaggedCount, pendingCount };
}
