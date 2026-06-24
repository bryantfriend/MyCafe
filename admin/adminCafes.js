import {
  collection,
  getDocs,
  doc,
  updateDoc
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import {
  getDownloadURL,
  ref,
  uploadBytes
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js';
import { renderMenuEditor } from './adminMenuEditor.js';

import { db } from '../js/firebase-init.js';
import { storage } from '../packages/firebase/firebaseStorage.js';
import {
  buildTranslationDrafts,
  getTranslationCoverage
} from '../packages/i18n/translationEngine.js';
import {
  buildMonetizationPayload,
  cafePlanCatalog,
  getInvoiceTotal,
  getPlanStatus,
  normalizeMonetization
} from '../packages/domain/monetization/cafePlans.js';

let panelContainer = null;

function escapeHtml(value) {
  return String(value || '').replace(/[&<>"']/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  }[character]));
}

function normalizeTags(tags) {
  if (Array.isArray(tags)) return tags.join(', ');
  return String(tags || '');
}

function getCafeImage(cafe) {
  return cafe.imageUrl || cafe.coverImageUrl || cafe.logoUrl || cafe.photos?.[0] || '../assets/logo.png';
}

function renderCafeTranslationStatus(cafe) {
  const coverage = getTranslationCoverage(cafe.translations || {}, ['name', 'description']);
  return `
    <div class="translation-status-row">
      ${coverage.statuses.map(status => `<span class="translation-status-pill ${escapeHtml(status.code)}">${escapeHtml(status.language.label)} ${escapeHtml(status.label)}</span>`).join('')}
    </div>
  `;
}

function getSafeFileName(file) {
  return file.name.toLowerCase().replace(/[^a-z0-9.]+/g, '-').replace(/^-|-$/g, '') || 'cafe-image';
}

async function uploadCafeAsset(cafeId, file, folder) {
  const imageRef = ref(storage, `cafes/${cafeId}/${folder}/${Date.now()}-${getSafeFileName(file)}`);
  const result = await uploadBytes(imageRef, file);
  return getDownloadURL(result.ref);
}

export async function renderCafesPanel(container) {
  panelContainer = container;
  container.innerHTML = `
    <h2 class="text-2xl font-bold mb-4">🏪 Manage Cafes</h2>

    <div class="mb-4 flex flex-wrap gap-3">
      <input id="cafeSearch" type="text" placeholder="Search cafes or owners..." class="border px-3 py-2 rounded w-72">
    </div>

    <div id="cafeList" class="space-y-4 overflow-x-auto"></div>
  `;

  const cafes = await loadCafes();
  renderCafeList(cafes);

  document.getElementById('cafeSearch').addEventListener('input', () => {
    const search = document.getElementById('cafeSearch').value.toLowerCase();
    const filtered = cafes.filter(cafe =>
      `${cafe.name || ''} ${cafe.ownerId || ''} ${(cafe.extraAdmins || []).join(' ')}`.toLowerCase().includes(search)
    );
    renderCafeList(filtered);
  });
}

async function loadCafes() {
  const snapshot = await getDocs(collection(db, 'cafes'));
  const cafes = [];
  snapshot.forEach(doc => {
    cafes.push({ id: doc.id, ...doc.data() });
  });
  return cafes;
}

function renderCafeList(cafes) {
  const container = document.getElementById('cafeList');
  container.innerHTML = '';

  cafes.forEach(cafe => {
    const div = document.createElement('div');
    div.className = 'bg-white rounded shadow p-4';
    const cafeImage = getCafeImage(cafe);

    div.innerHTML = `
      <div class="flex flex-wrap items-start justify-between gap-3 mb-3">
        <div class="flex gap-3 items-start">
          <img src="${escapeHtml(cafeImage)}" alt="" class="w-20 h-20 object-cover rounded border bg-gray-50 cafe-preview">
          <div>
            <h3 class="text-xl font-semibold">${escapeHtml(cafe.name || 'Untitled cafe')}</h3>
            <p class="text-sm text-gray-600">Owner: ${escapeHtml(cafe.ownerId || 'N/A')}</p>
            <p class="text-sm text-gray-600">${escapeHtml(cafe.address || cafe.location?.address || 'No address yet')}</p>
          </div>
        </div>
        <div class="flex flex-wrap gap-2">
          <a class="text-sm underline text-blue-600" href="../cafe.html?id=${encodeURIComponent(cafe.id)}" target="_blank" rel="noopener">View phone menu</a>
          <button class="text-sm underline text-blue-600 menu-btn" type="button">Edit menu</button>
        </div>
      </div>

      <details class="mb-3" open>
        <summary class="cursor-pointer font-medium">Business profile</summary>
        <div class="grid md:grid-cols-2 gap-3 mt-3">
          <label class="block text-sm">Cafe name
            <input type="text" value="${escapeHtml(cafe.name || '')}" class="name-input border px-2 py-1 rounded w-full mt-1">
          </label>
          <label class="block text-sm">Slug
            <input type="text" value="${escapeHtml(cafe.slug || cafe.path_name || cafe.id)}" class="slug-input border px-2 py-1 rounded w-full mt-1" placeholder="mano">
          </label>
          <label class="block text-sm md:col-span-2">Description
            <textarea class="description-input border px-2 py-1 rounded w-full mt-1" rows="3" placeholder="Short phone-menu description">${escapeHtml(cafe.description || '')}</textarea>
          </label>
          <label class="block text-sm md:col-span-2">Cafe translations JSON
            <textarea class="translations-input border px-2 py-1 rounded w-full mt-1 font-mono text-xs" rows="5" placeholder='{"ru":{"name":"...","description":"...","status":"approved"}}'>${escapeHtml(JSON.stringify(cafe.translations || {}, null, 2))}</textarea>
          </label>
          <div class="md:col-span-2">
            ${renderCafeTranslationStatus(cafe)}
            <button class="text-sm underline text-yellow-700 draft-cafe-translations-btn" type="button">Draft missing cafe translations</button>
          </div>
          <label class="block text-sm">Address
            <input type="text" value="${escapeHtml(cafe.address || cafe.location?.address || '')}" class="address-input border px-2 py-1 rounded w-full mt-1">
          </label>
          <label class="block text-sm">Tags
            <input type="text" value="${escapeHtml(normalizeTags(cafe.tags))}" class="tags-input border px-2 py-1 rounded w-full mt-1" placeholder="coffee, breakfast, desserts">
          </label>
          <label class="block text-sm">Cover image URL
            <input type="url" value="${escapeHtml(cafe.imageUrl || cafe.coverImageUrl || '')}" class="image-url-input border px-2 py-1 rounded w-full mt-1" placeholder="https://...">
          </label>
          <label class="block text-sm">Upload cover image
            <input type="file" class="cover-file-input border px-2 py-1 rounded w-full mt-1" accept="image/*">
          </label>
          <label class="block text-sm">Logo URL
            <input type="url" value="${escapeHtml(cafe.logoUrl || '')}" class="logo-url-input border px-2 py-1 rounded w-full mt-1" placeholder="https://...">
          </label>
          <label class="block text-sm">Upload logo
            <input type="file" class="logo-file-input border px-2 py-1 rounded w-full mt-1" accept="image/*">
          </label>
        </div>
      </details>

      <div class="grid md:grid-cols-2 gap-3 mb-3">
        <label class="block text-sm">Current owner
          <input type="text" value="${escapeHtml(cafe.ownerId || '')}" class="owner-input border px-2 py-1 rounded w-full mt-1">
        </label>
        <label class="block text-sm">Extra admin accounts
          <input type="text" value="${escapeHtml((cafe.extraAdmins || []).join(', '))}" class="extra-admins-input border px-2 py-1 rounded w-full mt-1" placeholder="uid1, uid2">
        </label>
      </div>

      <details class="mb-2">
        <summary class="cursor-pointer font-medium">Monetization packages</summary>
        ${renderMonetizationControls(cafe)}
      </details>

      <div class="flex flex-wrap items-center gap-3">
        <button class="bg-blue-600 text-white px-4 py-1 rounded hover:bg-blue-700 save-btn" type="button">Save cafe</button>
        <span class="save-status text-sm text-gray-600"></span>
      </div>
    `;

    const saveBtn = div.querySelector('.save-btn');
    saveBtn.addEventListener('click', async () => {
      const status = div.querySelector('.save-status');
      saveBtn.disabled = true;
      status.textContent = 'Saving...';

      const newOwnerId = div.querySelector('.owner-input').value.trim();
      const extraAdmins = div.querySelector('.extra-admins-input').value.split(',').map(item => item.trim()).filter(Boolean);

      try {
        const coverFile = div.querySelector('.cover-file-input')?.files?.[0];
        const logoFile = div.querySelector('.logo-file-input')?.files?.[0];
        const uploadedCoverUrl = coverFile ? await uploadCafeAsset(cafe.id, coverFile, 'cover') : '';
        const uploadedLogoUrl = logoFile ? await uploadCafeAsset(cafe.id, logoFile, 'logo') : '';
        const imageUrl = uploadedCoverUrl || div.querySelector('.image-url-input').value.trim();
        const logoUrl = uploadedLogoUrl || div.querySelector('.logo-url-input').value.trim();
        let translations = {};
        try {
          translations = JSON.parse(div.querySelector('.translations-input').value || '{}');
        } catch {
          status.textContent = 'Cafe translations JSON is invalid.';
          saveBtn.disabled = false;
          return;
        }

        const monetizationPayload = readMonetizationPayload(div, cafe);
        const updated = {
          name: div.querySelector('.name-input').value.trim(),
          slug: div.querySelector('.slug-input').value.trim(),
          path_name: div.querySelector('.slug-input').value.trim(),
          description: div.querySelector('.description-input').value.trim(),
          address: div.querySelector('.address-input').value.trim(),
          tags: div.querySelector('.tags-input').value.split(',').map(item => item.trim()).filter(Boolean),
          imageUrl,
          coverImageUrl: imageUrl,
          logoUrl,
          translations,
          ownerId: newOwnerId,
          extraAdmins,
          ...monetizationPayload,
          updatedAt: new Date()
        };

        await updateDoc(doc(db, 'cafes', cafe.id), updated);
        div.querySelector('.cafe-preview').src = imageUrl || logoUrl || getCafeImage(cafe);
        status.textContent = 'Saved';
      } catch (error) {
        console.error('[adminCafes] Cafe save failed.', error);
        status.textContent = 'Could not save. Check image upload permissions and required fields.';
      } finally {
        saveBtn.disabled = false;
      }
    });

    div.querySelectorAll('.cover-file-input, .logo-file-input').forEach(input => {
      input.addEventListener('change', () => {
        const file = input.files?.[0];
        if (file) {
          div.querySelector('.cafe-preview').src = URL.createObjectURL(file);
        }
      });
    });

    const menuBtn = div.querySelector('.menu-btn');
    menuBtn.addEventListener('click', () => {
      panelContainer.innerHTML = ''; // Clear main panel
      renderMenuEditor(cafe.id, panelContainer);
    });

    div.querySelector('.draft-cafe-translations-btn').addEventListener('click', () => {
      let translations = {};
      try {
        translations = JSON.parse(div.querySelector('.translations-input').value || '{}');
      } catch {
        translations = {};
      }
      const drafted = buildTranslationDrafts({
        name: div.querySelector('.name-input').value.trim(),
        description: div.querySelector('.description-input').value.trim()
      }, translations, ['name', 'description']);
      div.querySelector('.translations-input').value = JSON.stringify(drafted, null, 2);
    });

    div.querySelector('.add-invoice-btn').addEventListener('click', () => {
      const invoicesInput = div.querySelector('.monetization-invoices');
      let invoices = [];
      try {
        invoices = JSON.parse(invoicesInput.value || '[]');
      } catch {
        invoices = [];
      }
      const invoiceNumber = div.querySelector('.invoice-number-input').value.trim() || `INV-${Date.now()}`;
      const amount = Number(div.querySelector('.invoice-amount-input').value || 0);
      const status = div.querySelector('.invoice-status-input').value;
      invoices.push({
        id: invoiceNumber,
        amount,
        status,
        issuedAt: new Date().toISOString()
      });
      invoicesInput.value = JSON.stringify(invoices, null, 2);
      div.querySelector('.invoice-number-input').value = '';
      div.querySelector('.invoice-amount-input').value = '';
    });

    container.appendChild(div);
  });
}

function renderMonetizationControls(cafe) {
  const monetization = normalizeMonetization(cafe);
  const status = getPlanStatus(cafe);
  const invoiceTotal = getInvoiceTotal(cafe);
  return `
    <div class="ml-4 mt-2 grid gap-3 monetization-controls">
      <div class="rounded border bg-gray-50 p-3">
        <div class="flex flex-wrap gap-2 justify-between">
          <strong>${escapeHtml(status.label)}</strong>
          <span class="text-sm text-gray-600">${monetization.invoices.length} invoices · ${invoiceTotal} som</span>
        </div>
        <div class="grid md:grid-cols-2 gap-2 mt-3">
          <label class="text-sm">Package status
            <select class="monetization-status border px-2 py-1 rounded w-full mt-1">
              ${['free', 'trial', 'paid', 'paused', 'expired'].map(statusOption => `
                <option value="${statusOption}" ${monetization.status === statusOption ? 'selected' : ''}>${statusOption}</option>
              `).join('')}
            </select>
          </label>
          <label class="text-sm">Expiration date
            <input class="monetization-expires border px-2 py-1 rounded w-full mt-1" type="date" value="${getDateInputValue(monetization.expiresAt)}">
          </label>
          <label class="text-sm">Trial starts
            <input class="monetization-trial-start border px-2 py-1 rounded w-full mt-1" type="date" value="${getDateInputValue(monetization.trialStartedAt)}">
          </label>
          <label class="text-sm">Trial ends
            <input class="monetization-trial-end border px-2 py-1 rounded w-full mt-1" type="date" value="${getDateInputValue(monetization.trialEndsAt)}">
          </label>
        </div>
      </div>
      <div class="rounded border bg-white p-3">
        <strong>Active cafe plans</strong>
        <div class="grid md:grid-cols-2 gap-2 mt-3">
          ${cafePlanCatalog.map(plan => `
            <label class="text-sm flex gap-2 items-start border rounded p-2">
              <input type="checkbox" data-package-id="${escapeHtml(plan.id)}" ${monetization.activePackageIds.includes(plan.id) ? 'checked' : ''} ${plan.id === 'free-listing' ? 'disabled' : ''}>
              <span>
                <strong>${escapeHtml(plan.name)}</strong>
                <small class="block text-gray-600">${escapeHtml(plan.priceLabel)} · ${escapeHtml(plan.description)}</small>
              </span>
            </label>
          `).join('')}
        </div>
      </div>
      <div class="rounded border bg-gray-50 p-3">
        <strong>Invoices</strong>
        <div class="grid md:grid-cols-3 gap-2 mt-2">
          <input class="invoice-number-input border px-2 py-1 rounded" placeholder="Invoice #" type="text">
          <input class="invoice-amount-input border px-2 py-1 rounded" placeholder="Amount som" type="number" min="0">
          <select class="invoice-status-input border px-2 py-1 rounded">
            <option value="draft">Draft</option>
            <option value="sent">Sent</option>
            <option value="paid">Paid</option>
            <option value="overdue">Overdue</option>
          </select>
        </div>
        <button class="add-invoice-btn text-sm underline text-blue-600 mt-2" type="button">Add invoice to JSON</button>
        <textarea class="monetization-invoices border px-2 py-1 rounded w-full mt-2 font-mono text-xs" rows="5">${escapeHtml(JSON.stringify(monetization.invoices, null, 2))}</textarea>
      </div>
      <label class="text-sm">Admin notes
        <textarea class="monetization-notes border px-2 py-1 rounded w-full mt-1" rows="3" placeholder="Trial terms, sales context, invoice notes, renewal risk">${escapeHtml(monetization.adminNotes || '')}</textarea>
      </label>
    </div>
  `;
}

function readMonetizationPayload(parent, cafe) {
  let invoices = [];
  try {
    invoices = JSON.parse(parent.querySelector('.monetization-invoices')?.value || '[]');
  } catch {
    throw new Error('Monetization invoices JSON is invalid.');
  }

  const activePackageIds = [...parent.querySelectorAll('[data-package-id]')]
    .filter(input => input.checked || input.dataset.packageId === 'free-listing')
    .map(input => input.dataset.packageId);

  return buildMonetizationPayload({
    activePackageIds,
    status: parent.querySelector('.monetization-status')?.value || normalizeMonetization(cafe).status,
    trialStartedAt: getDateFromClass(parent, '.monetization-trial-start'),
    trialEndsAt: getDateFromClass(parent, '.monetization-trial-end'),
    expiresAt: getDateFromClass(parent, '.monetization-expires'),
    invoices,
    adminNotes: parent.querySelector('.monetization-notes')?.value.trim() || ''
  });
}

function renderPremiumFeatureToggle(label, enabled, expirationDate, note) {
  const dateStr = getDateInputValue(expirationDate);
  return `
    <div class="border rounded p-3 bg-gray-50">
      <label class="flex items-center gap-2 text-sm font-semibold">
        <input type="checkbox" data-feature-enabled="${label}" ${enabled ? 'checked' : ''}>
        ${label} active
      </label>
      <div class="grid md:grid-cols-2 gap-2 mt-2">
        <label class="text-sm">Expiration date
          <input type="date" data-feature="${label}" value="${dateStr}" class="border px-2 py-1 rounded w-full mt-1">
        </label>
        <label class="text-sm">Reason note
          <input type="text" data-feature-note="${label}" value="${escapeHtml(note || '')}" class="border px-2 py-1 rounded w-full mt-1" placeholder="refund, promo, manual override">
        </label>
      </div>
    </div>
  `;
}

function getDateFromField(parent, label) {
  const input = parent.querySelector(`input[data-feature="${label}"]`);
  return input && input.value ? new Date(input.value) : null;
}

function getDateFromClass(parent, selector) {
  const value = parent.querySelector(selector)?.value || '';
  return value ? new Date(value).toISOString() : '';
}

function getDateInputValue(value) {
  if (!value) return '';
  const date = value.seconds ? new Date(value.seconds * 1000) : new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().split('T')[0];
}

function getEnabledFromField(parent, label) {
  return !!parent.querySelector(`input[data-feature-enabled="${label}"]`)?.checked;
}

function getNoteFromField(parent, label) {
  return parent.querySelector(`input[data-feature-note="${label}"]`)?.value.trim() || '';
}
