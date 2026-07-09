import { auth, db } from './firebase-init.js';
import { supportedLanguages, getStoredLanguage, setStoredLanguage } from './i18n.js';
import { getReviewBadgeLabels, getReviewEditUrl, getUserTrustLevel } from '../packages/domain/reviews/reviewTrust.js';
import {
  evaluateLoyalty,
  getUnsyncedLocalEvents,
  markLocalEventsSynced,
  readLocalLoyalty
} from '../packages/domain/loyalty/loyaltyEngine.js';
import { escapeHtml } from '../packages/ui/renderHelpers.js';
import { runIntentPipeline } from '../packages/icf/pipeline/runIntentPipeline.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

const profileForm = document.getElementById('profileForm');
const accountNotice = document.getElementById('accountNotice');
const languageSelect = document.getElementById('language');
const privacySettings = document.getElementById('privacySettings');
const questsList = document.getElementById('questsList');
const badgeGrid = document.getElementById('badgeGrid');
const couponList = document.getElementById('couponList');
const userReviews = document.getElementById('userReviews');
const favoritesList = document.getElementById('favoritesList');
const photoGallery = document.getElementById('photoGallery');
const reviewSort = document.getElementById('reviewSort');

const privacyFields = [
  ['profilePublic', 'Profile'],
  ['reviewsPublic', 'Reviews'],
  ['badgesPublic', 'Badges'],
  ['xpPublic', 'XP level'],
  ['favoritesPublic', 'Favorites'],
  ['photosPublic', 'Uploaded photos']
];

function getLocalFavorites() {
  try {
    return JSON.parse(localStorage.getItem('mycafe:favorites') || '[]');
  } catch {
    return [];
  }
}

function saveLocalFavorites(favorites) {
  localStorage.setItem('mycafe:favorites', JSON.stringify(favorites || []));
}
function requireIntentSuccess(result) {
  if (!result || !result.ok) {
    throw new Error(result && result.message ? result.message : 'Intent could not be completed.');
  }

  return result;
}

const demoUser = {
  nickname: 'Guest Explorer',
  email: '',
  profilePicUrl: '',
  bio: 'Cafe notes, favorite corners, and new menu finds.',
  language: getStoredLanguage(),
  xp: 35,
  level: 1,
  badges: [],
  coupons: [],
  loyaltyEvents: [],
  favorites: getLocalFavorites(),
  settings: {
    profilePublic: false,
    reviewsPublic: false,
    badgesPublic: true,
    xpPublic: true,
    favoritesPublic: false,
    photosPublic: false
  },
  flagged: false,
  quests: { active: {}, completed: [] }
};

let currentUser = null;
let currentUserData = demoUser;
let currentReviews = [];
let currentLoyalty = evaluateLoyalty(demoUser, readLocalLoyalty());

function populateLanguages() {
  languageSelect.innerHTML = supportedLanguages.map(language => `
    <option value="${language.code}">${language.label} - ${language.name}</option>
  `).join('');
}

function renderNotice() {
  accountNotice.classList.toggle('hidden', !!currentUser);
  accountNotice.textContent = currentUser
    ? ''
    : 'Guest dashboard preview. Log in to save profile changes, earn badges, and sync quests.';
}

function renderProfile(userData) {
  document.getElementById('nickname').value = userData.nickname || '';
  document.getElementById('profilePicUrl').value = userData.profilePicUrl || '';
  document.getElementById('bio').value = userData.bio || '';
  languageSelect.value = userData.language || getStoredLanguage();

  privacySettings.innerHTML = privacyFields.map(([key, label]) => `
    <label class="flex items-center justify-between gap-3 bg-white rounded p-3 border">
      <span>${label}</span>
      <input type="checkbox" data-privacy="${key}" ${userData.settings?.[key] ? 'checked' : ''}>
    </label>
  `).join('');
}

function renderLevel(userData) {
  const xp = Number(currentLoyalty.xp || userData.xp || 0);
  const level = Math.max(1, Number(currentLoyalty.level || userData.level || Math.floor(xp / 100) + 1));
  const progress = Math.min(100, xp % 100);
  document.getElementById('levelLabel').textContent = `Level ${level}`;
  document.getElementById('xpLabel').textContent = `${xp} XP · ${100 - progress} XP to next level`;
  document.getElementById('xpBar').style.width = `${progress}%`;
  document.getElementById('approvalLabel').textContent = level >= 2 && !userData.flagged
    ? 'Auto-approved reviews'
    : 'Manual moderation';
  const trust = getUserTrustLevel({ ...userData, xp, level });
  document.getElementById('trustLabel').textContent = userData.flagged ? 'Flagged for review' : trust.label;
}

function renderQuests() {
  const quests = currentLoyalty.quests || [];
  if (!quests.length) {
    questsList.innerHTML = '<p>No active quests right now.</p>';
    return;
  }

  questsList.innerHTML = quests.map(quest => {
    const progress = Number(quest.progress || 0);
    const total = Number(quest.target || 1);
    const percent = Math.min(100, Math.round((progress / total) * 100));
    return `
      <article class="cafe-card ${quest.completed ? 'quest-complete' : ''}">
        <div class="cafe-card-body">
          <h3>${escapeHtml(quest.name)}</h3>
          <p>${escapeHtml(quest.description || 'Complete the requirement and earn XP.')}</p>
          <div class="w-full bg-gray-200 rounded h-3 overflow-hidden my-3">
            <div class="bg-green-700 h-3" style="width: ${percent}%"></div>
          </div>
          <p class="text-sm text-gray-600">${progress}/${total} · ${quest.completed ? 'Completed' : 'In progress'} · ${escapeHtml(quest.xp)} XP</p>
          ${quest.coupon ? `<small class="loyalty-reward">Reward: ${escapeHtml(quest.coupon.title)}</small>` : ''}
        </div>
      </article>
    `;
  }).join('');
}

function renderBadges() {
  badgeGrid.innerHTML = (currentLoyalty.badges || []).map(badge => {
    const unlocked = badge.unlocked;
    return `
      <article class="cafe-card ${unlocked ? '' : 'opacity-60'}" title="${badge.requirement}">
        <div class="cafe-card-body">
          <h3>${unlocked ? 'Badge' : 'Locked'} · ${escapeHtml(badge.name)}</h3>
          <p>${escapeHtml(badge.requirement)}</p>
          <p class="text-sm text-gray-600">${badge.progress || 0}${badge.target ? `/${badge.target}` : ''} · ${badge.xp} XP bonus</p>
        </div>
      </article>
    `;
  }).join('');
}

function renderCoupons() {
  const coupons = currentLoyalty.coupons || [];
  couponList.innerHTML = coupons.length ? coupons.map(coupon => `
    <article class="coupon-card ${coupon.redeemed ? 'redeemed' : ''}">
      <div>
        <strong>${escapeHtml(coupon.title)}</strong>
        <p>${escapeHtml(coupon.description)}</p>
      </div>
      <span>${coupon.redeemed ? 'Redeemed' : 'Unlocked'}</span>
    </article>
  `).join('') : '<p class="empty-state">Complete quests to unlock cafe coupons.</p>';
}

function sortReviews(reviews) {
  const sort = reviewSort.value;
  return [...reviews].sort((a, b) => {
    const aDate = a.createdAt?.seconds || 0;
    const bDate = b.createdAt?.seconds || 0;
    if (sort === 'oldest') return aDate - bDate;
    if (sort === 'liked') return (b.likes || 0) - (a.likes || 0);
    return bDate - aDate;
  });
}

function renderReviews() {
  const sorted = sortReviews(currentReviews);
  userReviews.innerHTML = sorted.length ? sorted.map(review => `
    <article class="bg-white rounded border p-3">
      <div class="flex justify-between gap-3">
        <strong>${escapeHtml(review.cafeName || review.cafeId || 'Cafe')}</strong>
        <span>${review.rating || 5} stars</span>
      </div>
      <div class="review-badge-row">
        ${getReviewBadgeLabels(review).map(badge => `<span>${escapeHtml(badge)}</span>`).join('')}
      </div>
      <p>${escapeHtml(review.text || '')}</p>
      <small>${review.likes || 0} likes · ${escapeHtml(review.moderationStatus || (review.flagged ? 'Flagged' : review.approved ? 'Approved' : 'Pending'))}</small>
      ${review.editToken ? `<div class="mt-2"><a class="secondary-link" href="${escapeHtml(getReviewEditUrl(review.id, review.editToken))}">Edit review</a></div>` : ''}
    </article>
  `).join('') : '<p class="empty-state">No reviews yet.</p>';
}

function renderFavorites(userData) {
  const favorites = userData.favorites || [];
  favoritesList.innerHTML = favorites.length ? favorites.map(cafeId => `
    <article class="bg-white rounded border p-3">
      <strong>${escapeHtml(cafeId)}</strong>
      <div class="flex gap-2 mt-2">
        <button class="secondary-link" type="button">Add note</button>
        <button class="secondary-link" type="button" data-remove-favorite="${escapeHtml(cafeId)}">Remove from favorites</button>
      </div>
    </article>
  `).join('') : '<p class="empty-state">No favorites saved yet.</p>';
}

function renderPhotos(reviews) {
  const photos = reviews.filter(review => review.imageUrl);
  photoGallery.innerHTML = photos.length ? photos.map(review => `
    <article class="cafe-card">
      <img src="${escapeHtml(review.imageUrl)}" alt="Review photo">
      <div class="cafe-card-body">
        <h3>${escapeHtml(review.cafeName || review.cafeId || 'Cafe photo')}</h3>
        <button class="secondary-link" type="button">Set visibility</button>
      </div>
    </article>
  `).join('') : '<p class="empty-state">No uploaded photos yet.</p>';
}

function getDerivedLoyaltyEvents(userData, reviews) {
  const favoriteEvents = (userData.favorites || []).map(cafeId => ({
    id: `derived-favorite-${cafeId}`,
    type: 'favorite',
    cafeId,
    xp: 0,
    createdAt: new Date().toISOString()
  }));
  const reviewEvents = (reviews || []).flatMap(review => {
    const events = [{
      id: `derived-review-${review.id || review.cafeId || review.createdAt?.seconds || Date.now()}`,
      type: 'review',
      cafeId: review.cafeId || '',
      xp: 0,
      createdAt: review.createdAt || new Date().toISOString()
    }];
    if (review.imageUrl) {
      events.push({
        id: `derived-photo-review-${review.id || review.cafeId || review.createdAt?.seconds || Date.now()}`,
        type: 'photo-review',
        cafeId: review.cafeId || '',
        xp: 0,
        createdAt: review.createdAt || new Date().toISOString()
      });
    }
    return events;
  });
  return [...favoriteEvents, ...reviewEvents];
}

async function loadUserData(user) {
  if (!user) return demoUser;
  try {
    const userSnap = await getDoc(doc(db, 'users', user.uid));
    const localFavorites = getLocalFavorites();
    const loadedUser = userSnap.exists()
      ? { ...demoUser, ...userSnap.data(), email: user.email }
      : { ...demoUser, nickname: user.displayName || '', email: user.email };
    if ((!loadedUser.favorites || !loadedUser.favorites.length) && localFavorites.length) {
      loadedUser.favorites = localFavorites;
    }
    return loadedUser;
  } catch (error) {
    console.warn('[dashboard] Could not load user profile.', error);
    return { ...demoUser, email: user.email };
  }
}

async function syncLocalLoyalty(user, userData) {
  if (!user) return userData;
  const localState = readLocalLoyalty();
  const unsyncedEvents = getUnsyncedLocalEvents(userData, localState);
  const loyalty = evaluateLoyalty(userData, localState);
  const loyaltyPatch = { coupons: loyalty.coupons };

  if (unsyncedEvents.length) {
    loyaltyPatch.loyaltyEvents = [
      ...(Array.isArray(userData.loyaltyEvents) ? userData.loyaltyEvents : []),
      ...unsyncedEvents
    ];
  }

  if (!unsyncedEvents.length && !loyalty.coupons.length) return userData;

  try {
    await requireIntentSuccess(await runIntentPipeline('SyncUserLoyaltyIntent', {
      userId: user.uid,
      loyaltyPatch
    }));
    markLocalEventsSynced(unsyncedEvents);
    return { ...userData, ...loyaltyPatch };
  } catch (error) {
    console.warn('[dashboard] Could not sync loyalty events.', error);
    return userData;
  }
}

async function removeFavorite(cafeId) {
  const favorites = (currentUserData.favorites || []).filter(id => id !== cafeId);
  currentUserData = { ...currentUserData, favorites };
  saveLocalFavorites(favorites);
  renderFavorites(currentUserData);

  if (currentUser) {
    try {
      await requireIntentSuccess(await runIntentPipeline('UpdateUserFavoritesIntent', {
        userId: currentUser.uid,
        favorites
      }));
    } catch (error) {
      console.warn('[dashboard] Could not sync favorite removal.', error);
    }
  }
}

async function loadUserReviews(user) {
  if (!user) return [];
  try {
    const reviewsQuery = query(collection(db, 'reviews'), where('userId', '==', user.uid));
    const snapshot = await getDocs(reviewsQuery);
    return snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
  } catch (error) {
    console.warn('[dashboard] Could not load reviews.', error);
    return [];
  }
}

function renderAll() {
  const displayUserData = {
    ...currentUserData,
    loyaltyEvents: [
      ...(Array.isArray(currentUserData.loyaltyEvents) ? currentUserData.loyaltyEvents : []),
      ...getDerivedLoyaltyEvents(currentUserData, currentReviews)
    ]
  };
  currentLoyalty = evaluateLoyalty(displayUserData, readLocalLoyalty());
  renderNotice();
  renderProfile(currentUserData);
  renderLevel(currentUserData);
  renderQuests();
  renderBadges();
  renderCoupons();
  renderReviews();
  renderFavorites(currentUserData);
  renderPhotos(currentReviews);
}

profileForm.addEventListener('submit', async event => {
  event.preventDefault();
  const settings = {};
  document.querySelectorAll('[data-privacy]').forEach(input => {
    settings[input.dataset.privacy] = input.checked;
  });

  currentUserData = {
    ...currentUserData,
    nickname: document.getElementById('nickname').value.trim(),
    profilePicUrl: document.getElementById('profilePicUrl').value.trim(),
    bio: document.getElementById('bio').value.trim(),
    language: languageSelect.value,
    settings
  };

  setStoredLanguage(currentUserData.language);

  if (currentUser) {
    await requireIntentSuccess(await runIntentPipeline('UpdateUserProfileIntent', {
      userId: currentUser.uid,
      profile: currentUserData
    }));
    accountNotice.classList.remove('hidden');
    accountNotice.textContent = 'Profile saved.';
    setTimeout(renderNotice, 1600);
  } else {
    renderNotice();
  }
});

reviewSort.addEventListener('change', renderReviews);

favoritesList.addEventListener('click', event => {
  const button = event.target.closest('[data-remove-favorite]');
  if (!button) return;
  removeFavorite(button.dataset.removeFavorite);
});

onAuthStateChanged(auth, async user => {
  currentUser = user;
  currentUserData = await loadUserData(user);
  currentUserData = await syncLocalLoyalty(user, currentUserData);
  currentReviews = await loadUserReviews(user);
  renderAll();
});

populateLanguages();
