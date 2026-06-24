import { renderUsersPanel } from './adminUsers.js';
import { renderCafesPanel } from './adminCafes.js';
import { renderReviewsPanel } from './adminReviews.js';
import { renderCirclesPanel } from './adminCircles.js';
import { runIntentPipeline } from '../packages/icf/pipeline/runIntentPipeline.js';
import { signOutCurrentUser } from '../packages/domain/users/userService.js';
import { redirectToLogin } from '../packages/ui/authUiHelpers.js';

const content = document.getElementById('adminContent');
const reviewAlert = document.getElementById('reviewAlert');

function renderDashboardHome() {
  content.innerHTML = `
    <div class="grid grid-cols-1 gap-6">
      <button id="cardUsers" class="w-full text-left bg-white p-4 rounded shadow transition-all transform hover:-translate-y-1 hover:shadow-lg">
        <h2 class="text-xl font-semibold mb-1">👥 Users</h2>
        <p class="text-sm text-gray-600">Add, edit, or remove users</p>
      </button>

      <button id="cardCafes" class="w-full text-left bg-white p-4 rounded shadow transition-all transform hover:-translate-y-1 hover:shadow-lg">
        <h2 class="text-xl font-semibold mb-1">🏪 Cafes</h2>
        <p class="text-sm text-gray-600">✨ Manage cafe details and premium features</p>
      </button>

      <button id="cardReviews" class="w-full text-left bg-white p-4 rounded shadow transition-all transform hover:-translate-y-1 hover:shadow-lg">
        <h2 class="text-xl font-semibold mb-1">📝 Reviews</h2>
        <p class="text-sm text-gray-600">❗ Moderate user reviews</p>
      </button>

      <button id="cardCircles" class="w-full text-left bg-white p-4 rounded shadow transition-all transform hover:-translate-y-1 hover:shadow-lg">
        <h2 class="text-xl font-semibold mb-1">🪑 Cafe Circles</h2>
        <p class="text-sm text-gray-600">View and manage cafe circles</p>
      </button>

      <section class="bg-white p-4 rounded shadow">
        <h2 class="text-xl font-semibold mb-2">🧠 Future Panels</h2>
        <div class="grid md:grid-cols-3 gap-2 text-sm text-gray-700">
          <span>Promo Codes / Subscriptions</span>
          <span>Flagged Content Log</span>
          <span>Activity / Audit Log</span>
          <span>Notification Center</span>
          <span>Language & Translation Tools</span>
        </div>
      </section>
    </div>
  `;

  wireClick('cardUsers', loadUsersPanel);
  wireClick('cardCafes', loadCafesPanel);
  wireClick('cardReviews', loadReviewsPanel);
  wireClick('cardCircles', loadCirclesPanel);
}

async function handleLogout() {
  try {
    await signOutCurrentUser();
    window.location.href = '/';
  } catch (err) {
    console.log('Logout failed:', err);
  }
}

async function loadUsersPanel() {
  content.innerHTML = '<h2 class="text-xl mb-4">Loading Users...</h2>';
  await renderUsersPanel(content);
}

async function loadCafesPanel() {
  content.innerHTML = '<h2 class="text-xl mb-4">Loading Cafes...</h2>';
  await renderCafesPanel(content);
}

async function loadReviewsPanel() {
  content.innerHTML = '<h2 class="text-xl mb-4">Loading Reviews...</h2>';
  await renderReviewsPanel(content);
}

async function loadCirclesPanel() {
  content.innerHTML = '<h2 class="text-xl mb-4">Loading Cafe Circles...</h2>';
  await renderCirclesPanel(content);
}

function wireClick(id, handler) {
  const element = document.getElementById(id);

  if (!element) {
    return;
  }

  element.addEventListener('click', function() {
    handler();
  });
}

function hideMobileDrawer() {
  const mobileDrawer = document.getElementById('mobileDrawer');

  if (mobileDrawer) {
    mobileDrawer.classList.add('hidden');
  }
}

function openMobileDrawer() {
  const mobileDrawer = document.getElementById('mobileDrawer');

  if (mobileDrawer) {
    mobileDrawer.classList.remove('hidden');
  }
}

function renderAccessDenied() {
  document.body.innerHTML = '<main class="p-8"><h1 class="text-2xl font-bold">Admin access required</h1><p class="mt-2">This panel is only available to MyCafe admins.</p><a class="text-blue-700 underline" href="/dashboard.html">Go to dashboard</a></main>';
}

function renderLoadError(result) {
  const message = result && result.message ? result.message : 'Unable to load admin panel.';
  content.innerHTML = '<section class="bg-white p-4 rounded shadow"><h1 class="text-xl font-bold">Admin panel unavailable</h1><p class="mt-2 text-gray-700">' + message + '</p></section>';
}

function setReviewAlert(reviewAlerts) {
  let icon = '';

  if (!reviewAlert || !reviewAlerts) {
    return;
  }

  if (reviewAlerts.flaggedCount > 0) {
    icon += '🔴';
  }
  if (reviewAlerts.pendingCount > 0) {
    icon += '🟡';
  }

  reviewAlert.textContent = icon;
}

function wireNavigation() {
  wireClick('navHome', renderDashboardHome);
  wireClick('navUsers', loadUsersPanel);
  wireClick('navCafes', loadCafesPanel);
  wireClick('navReviews', loadReviewsPanel);
  wireClick('navCircles', loadCirclesPanel);
  wireClick('logoutBtn', handleLogout);
  wireClick('logoutBtnTop', handleLogout);
  wireClick('mobileMenuToggle', openMobileDrawer);
  wireClick('mobileClose', hideMobileDrawer);
  wireClick('logoutBtnMobile', handleLogout);

  wireClick('navHomeMobile', function() {
    hideMobileDrawer();
    renderDashboardHome();
  });
  wireClick('navUsersMobile', async function() {
    hideMobileDrawer();
    await loadUsersPanel();
  });
  wireClick('navCafesMobile', async function() {
    hideMobileDrawer();
    await loadCafesPanel();
  });
  wireClick('navReviewsMobile', async function() {
    hideMobileDrawer();
    await loadReviewsPanel();
  });
  wireClick('navCirclesMobile', async function() {
    hideMobileDrawer();
    await loadCirclesPanel();
  });
}

async function initAdminPanel() {
  const result = await runIntentPipeline('LoadAdminDashboardIntent', {});
  let firstError = null;

  if (!result.ok) {
    firstError = result.errors && result.errors.length ? result.errors[0] : null;

    if (firstError && firstError.code === 'auth-required') {
      redirectToLogin('/admin/adminPanel.html');
      return;
    }

    if (firstError && firstError.code === 'permission-denied') {
      renderAccessDenied();
      return;
    }

    renderLoadError(result);
    return;
  }

  wireNavigation();
  setReviewAlert(result.data.reviewAlerts);
  renderDashboardHome();
}

initAdminPanel();
