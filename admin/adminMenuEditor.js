import {
  doc,
  getDoc
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import {
  getDownloadURL,
  ref,
  uploadBytes
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js';

import { db } from '../js/firebase-init.js';
import { runIntentPipeline } from '../packages/icf/pipeline/runIntentPipeline.js';
import { storage } from '../packages/firebase/firebaseStorage.js';
import {
  normalizeOrderLink,
  renderOrderLinkButtons,
  sortOrderLinks,
  supportedOrderLinkTypes,
  validateOrderLink
} from '../packages/domain/menus/orderLinks.js';
import {
  buildMenuDrafts,
  getMenuTranslationSummary,
  getTranslationCoverage,
  getTranslationTargets
} from '../packages/i18n/translationEngine.js';

function escapeHtml(value) {
  return String(value || '').replace(/[&<>"']/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  }[character]));
}

function normalizeMenu(menuData) {
  if (!menuData) return [];

  if (Array.isArray(menuData)) {
    return menuData.map(category => ({
      category_en: category.category_en || category.name || '',
      category_ru: category.category_ru || '',
      category_ky: category.category_ky || '',
      translations: category.translations || {},
      items: Array.isArray(category.items) ? category.items : []
    }));
  }

  return Object.entries(menuData).map(([categoryName, items]) => ({
    category_en: categoryName,
    category_ru: '',
    category_ky: '',
    translations: {},
    items: Array.isArray(items) ? items : []
  }));
}

function getSafeFileName(file) {
  return file.name.toLowerCase().replace(/[^a-z0-9.]+/g, '-').replace(/^-|-$/g, '') || 'menu-image';
}

async function uploadMenuImage(cafeId, file) {
  const path = `cafes/${cafeId}/menu/${Date.now()}-${getSafeFileName(file)}`;
  const imageRef = ref(storage, path);
  const result = await uploadBytes(imageRef, file);
  return getDownloadURL(result.ref);
}

export async function renderMenuEditor(cafeId, container) {
  const cafeRef = doc(db, 'cafes', cafeId);
  const cafeSnap = await getDoc(cafeRef);

  if (!cafeSnap.exists()) {
    container.innerHTML = '<p class="text-red-600">Cafe not found.</p>';
    return;
  }

  const cafe = cafeSnap.data();
  const menu = normalizeMenu(cafe.menu);

  container.innerHTML = `
    <div class="flex flex-wrap items-start justify-between gap-3 mb-5">
      <div>
        <button id="backToCafesBtn" class="text-blue-700 underline mb-3" type="button">Back to cafes</button>
        <h2 class="text-2xl font-bold">Edit Menu for ${escapeHtml(cafe.name || 'Cafe')}</h2>
        <p class="text-sm text-gray-600 mt-1">Add categories, item descriptions, prices, availability, and photos for the phone menu.</p>
      </div>
      <div class="flex flex-wrap gap-2">
        <button id="draftTranslationsBtn" class="bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700" type="button">Draft Missing Translations</button>
        <button id="addCategoryBtn" class="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700" type="button">Add Category</button>
        <button id="saveMenuBtn" class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700" type="button">Save Menu</button>
      </div>
    </div>
    <div id="menuSaveStatus" class="hidden mb-4 rounded border px-3 py-2 text-sm"></div>
    <div id="translationAdminSummary" class="translation-summary-grid mb-4"></div>
    <div id="menuEditor" class="space-y-5"></div>
  `;

  const editor = container.querySelector('#menuEditor');
  renderCategories(editor, menu);
  renderTranslationSummary(container, menu);

  container.querySelector('#backToCafesBtn').addEventListener('click', async () => {
    const { renderCafesPanel } = await import('./adminCafes.js');
    await renderCafesPanel(container);
  });

  container.querySelector('#addCategoryBtn').addEventListener('click', () => {
    editor.insertAdjacentHTML('beforeend', renderCategoryCard({
      category_en: '',
      category_ru: '',
      category_ky: '',
      translations: {},
      items: []
    }));
  });

  container.querySelector('#draftTranslationsBtn').addEventListener('click', async event => {
    const button = event.currentTarget;
    setSaveStatus(container, 'Drafting missing translations...', 'info');
    button.disabled = true;

    try {
      const draftMenu = buildMenuDrafts(await readMenuFromDOM(editor, cafeId));
      const draftResult = await runIntentPipeline('AdminUpdateCafeIntent', {
        cafeId,
        cafePatch: { menu: draftMenu }
      });
      if (!draftResult.ok) {
        throw new Error(draftResult.message || 'Translation drafts could not be saved.');
      }
      renderCategories(editor, draftMenu);
      renderTranslationSummary(container, draftMenu);
      setSaveStatus(container, 'Translation drafts created. Review statuses before publishing.', 'success');
    } catch (error) {
      console.error('[adminMenuEditor] Translation draft failed.', error);
      setSaveStatus(container, 'Translation drafts could not be saved.', 'error');
    } finally {
      button.disabled = false;
    }
  });

  container.querySelector('#saveMenuBtn').addEventListener('click', async event => {
    const button = event.currentTarget;
    setSaveStatus(container, 'Saving menu...', 'info');
    button.disabled = true;

    try {
      const updatedMenu = await readMenuFromDOM(editor, cafeId);
      const saveResult = await runIntentPipeline('AdminUpdateCafeIntent', {
        cafeId,
        cafePatch: { menu: updatedMenu }
      });
      if (!saveResult.ok) {
        throw new Error(saveResult.message || 'Menu could not be saved.');
      }
      renderTranslationSummary(container, updatedMenu);
      setSaveStatus(container, 'Menu saved. The phone menu will use these updates immediately.', 'success');
    } catch (error) {
      console.error('[adminMenuEditor] Menu save failed.', error);
      setSaveStatus(container, 'Menu could not be saved. Check image upload permissions and required fields.', 'error');
    } finally {
      button.disabled = false;
    }
  });

  editor.addEventListener('click', event => {
    const target = event.target;
    if (target.classList.contains('remove-item')) {
      target.closest('.item-row')?.remove();
    }
    if (target.classList.contains('delete-category')) {
      target.closest('.category-card')?.remove();
    }
    if (target.classList.contains('add-item')) {
      target.closest('.category-card')?.querySelector('.item-list')?.insertAdjacentHTML('beforeend', renderItemRow({}));
    }
    if (target.classList.contains('add-order-link')) {
      const itemRow = target.closest('.item-row');
      const linkList = itemRow.querySelector('.admin-order-link-list');
      const nextSort = linkList.querySelectorAll('.admin-order-link-row').length + 1;
      linkList.insertAdjacentHTML('beforeend', renderAdminOrderLinkRow({ sortOrder: nextSort }));
    }
    if (target.classList.contains('remove-order-link')) {
      target.closest('.admin-order-link-row')?.remove();
    }
  });

  editor.addEventListener('change', event => {
    const input = event.target;
    if (!input.classList.contains('image-file-input')) return;
    const file = input.files?.[0];
    const preview = input.closest('.item-row')?.querySelector('.image-preview');
    if (file && preview) {
      preview.src = URL.createObjectURL(file);
      preview.classList.remove('hidden');
    }
  });
}

function setSaveStatus(container, message, type) {
  const status = container.querySelector('#menuSaveStatus');
  const classes = {
    info: 'border-blue-200 bg-blue-50 text-blue-800',
    success: 'border-green-200 bg-green-50 text-green-800',
    error: 'border-red-200 bg-red-50 text-red-800'
  };

  status.className = `mb-4 rounded border px-3 py-2 text-sm ${classes[type] || classes.info}`;
  status.textContent = message;
}

function renderCategories(container, menu) {
  container.innerHTML = menu.length
    ? menu.map(category => renderCategoryCard(category)).join('')
    : renderCategoryCard({ category_en: '', category_ru: '', category_ky: '', translations: {}, items: [] });
}

function renderTranslationSummary(container, menu) {
  const summary = getMenuTranslationSummary(menu);
  const summaryNode = container.querySelector('#translationAdminSummary');
  if (!summaryNode) return;

  summaryNode.innerHTML = `
    <article class="owner-analytics-card">
      <span>Translation coverage</span>
      <strong>${summary.percent}%</strong>
      <small>${summary.approved}/${summary.total} approved across priority languages.</small>
    </article>
    <article class="owner-analytics-card">
      <span>Needs review</span>
      <strong>${summary.needsReview}</strong>
      <small>Drafts and partial translations waiting for admin review.</small>
    </article>
    <article class="owner-analytics-card">
      <span>Missing</span>
      <strong>${summary.missing}</strong>
      <small>Use draft generation to fill these slots.</small>
    </article>
  `;
}

function renderTranslationStatusPills(translations, fields) {
  const coverage = getTranslationCoverage(translations || {}, fields);
  return `
    <div class="translation-status-row">
      ${coverage.statuses.map(status => `
        <span class="translation-status-pill ${escapeHtml(status.code)}">${escapeHtml(status.language.label)} ${escapeHtml(status.label)}</span>
      `).join('')}
    </div>
  `;
}

function renderCategoryCard(category) {
  const items = category.items || [];
  const categoryTranslations = JSON.stringify(category.translations || {}, null, 2);

  return `
    <section class="category-card border rounded bg-white shadow p-4">
      <textarea class="category-translations hidden">${escapeHtml(categoryTranslations)}</textarea>
      <div class="grid md:grid-cols-3 gap-3 mb-3">
        <label class="text-sm font-semibold">Category English
          <input type="text" class="category-en border px-2 py-1 rounded w-full mt-1" value="${escapeHtml(category.category_en || category.name || '')}" placeholder="Breakfasts">
        </label>
        <label class="text-sm font-semibold">Category Russian
          <input type="text" class="category-ru border px-2 py-1 rounded w-full mt-1" value="${escapeHtml(category.category_ru || '')}" placeholder="Завтраки">
        </label>
        <label class="text-sm font-semibold">Category Kyrgyz
          <input type="text" class="category-ky border px-2 py-1 rounded w-full mt-1" value="${escapeHtml(category.category_ky || '')}" placeholder="Эртең мененки тамактар">
        </label>
      </div>
      ${renderTranslationStatusPills(category.translations || {}, ['name'])}
      <div class="flex flex-wrap gap-2 mb-3">
        <button class="add-item text-green-700 text-sm underline" type="button">Add Item</button>
        <button class="delete-category text-red-700 text-sm underline" type="button">Delete Category</button>
      </div>
      <div class="item-list space-y-3">
        ${items.map(item => renderItemRow(item)).join('')}
      </div>
    </section>
  `;
}

function renderAdminOrderLinkTypeOptions(selectedType) {
  var html = [];
  var i = 0;

  for (i = 0; i < supportedOrderLinkTypes.length; i += 1) {
    var type = supportedOrderLinkTypes[i];
    html.push('<option value="' + escapeHtml(type) + '" ' + (type === selectedType ? 'selected' : '') + '>' + escapeHtml(type) + '</option>');
  }

  return html.join('');
}

function renderAdminOrderLinkRow(link) {
  var normalizedLink = normalizeOrderLink(link || {});

  return `
    <div class="admin-order-link-row grid lg:grid-cols-[140px_minmax(130px,1fr)_minmax(180px,1.5fr)_90px_90px_auto] md:grid-cols-2 gap-2 items-end border rounded p-2 bg-white" data-order-link-id="${escapeHtml(normalizedLink.id)}">
      <label class="text-xs font-semibold">Type
        <select class="order-link-type border px-2 py-1 rounded w-full mt-1">${renderAdminOrderLinkTypeOptions(normalizedLink.type)}</select>
      </label>
      <label class="text-xs font-semibold">Label
        <input class="order-link-label border px-2 py-1 rounded w-full mt-1" type="text" value="${escapeHtml(normalizedLink.label)}" placeholder="WhatsApp">
      </label>
      <label class="text-xs font-semibold">URL
        <input class="order-link-url border px-2 py-1 rounded w-full mt-1" type="url" value="${escapeHtml(normalizedLink.url)}" placeholder="https://...">
      </label>
      <label class="text-xs font-semibold">Sort
        <input class="order-link-sort border px-2 py-1 rounded w-full mt-1" type="number" min="1" value="${escapeHtml(normalizedLink.sortOrder)}">
      </label>
      <label class="text-xs font-semibold flex items-center gap-2 pb-2">
        <input class="order-link-active" type="checkbox" ${normalizedLink.isActive === false ? '' : 'checked'}> Active
      </label>
      <button class="remove-order-link text-red-700 underline text-sm pb-2" type="button">Remove</button>
    </div>
  `;
}

function renderAdminOrderLinksEditor(item) {
  var links = sortOrderLinks(item.orderLinks || []);
  var rows = [];
  var i = 0;

  for (i = 0; i < links.length; i += 1) {
    rows.push(renderAdminOrderLinkRow(links[i]));
  }

  return `
    <details class="admin-order-link-editor mt-3 bg-white border rounded p-3" open>
      <summary class="cursor-pointer font-semibold text-sm">Order links</summary>
      <div class="admin-order-link-list grid gap-2 mt-3">
        ${rows.join('')}
      </div>
      <div class="flex flex-wrap gap-2 items-center mt-3">
        <button class="add-order-link text-green-700 text-sm underline" type="button">+ Add Link</button>
        <div class="admin-order-link-preview">${renderOrderLinkButtons(links, { includeInactive: false }) || '<small class="text-gray-500">No active order buttons.</small>'}</div>
      </div>
    </details>
  `;
}

function readOrderLinksFromAdminRow(row) {
  var rows = row.querySelectorAll('.admin-order-link-row');
  var links = [];
  var i = 0;
  var j = 0;

  for (i = 0; i < rows.length; i += 1) {
    var linkRow = rows[i];
    var rawLink = {
      id: linkRow.dataset.orderLinkId || '',
      type: linkRow.querySelector('.order-link-type').value.trim(),
      label: linkRow.querySelector('.order-link-label').value.trim(),
      url: linkRow.querySelector('.order-link-url').value.trim(),
      sortOrder: Number(linkRow.querySelector('.order-link-sort').value || i + 1),
      isActive: linkRow.querySelector('.order-link-active').checked
    };

    if (!rawLink.label && !rawLink.url) {
      continue;
    }

    var errors = validateOrderLink(rawLink);
    if (errors.length > 0) {
      var messages = [];
      for (j = 0; j < errors.length; j += 1) {
        messages.push(errors[j].message);
      }
      throw new Error(messages.join(' '));
    }

    links.push(normalizeOrderLink(rawLink));
  }

  return sortOrderLinks(links);
}
function renderItemRow(item) {
  const translations = JSON.stringify(item.translations || {}, null, 2);
  const image = item.image || item.imageUrl || item.photo || '';

  return `
    <div class="item-row border rounded p-3 bg-gray-50">
      <div class="grid lg:grid-cols-4 md:grid-cols-2 gap-3">
        <label class="text-sm font-semibold">Item name
          <input type="text" class="name-input border px-2 py-1 rounded w-full mt-1" value="${escapeHtml(item.name || '')}" placeholder="Latte">
        </label>
        <label class="text-sm font-semibold">Price
          <input type="text" class="price-input border px-2 py-1 rounded w-full mt-1" value="${escapeHtml(item.price || '')}" placeholder="170/220">
        </label>
        <label class="text-sm font-semibold lg:col-span-2">Image URL
          <input type="url" class="image-input border px-2 py-1 rounded w-full mt-1" value="${escapeHtml(image)}" placeholder="https://...">
        </label>
        <label class="text-sm font-semibold md:col-span-2">Description
          <textarea class="description-input border px-2 py-1 rounded w-full mt-1" rows="2" placeholder="Short ingredients or notes">${escapeHtml(item.description || '')}</textarea>
        </label>
        <label class="text-sm font-semibold">Upload photo
          <input type="file" class="image-file-input border px-2 py-1 rounded w-full mt-1" accept="image/*">
        </label>
        <div class="flex items-end gap-4">
          <label class="flex items-center gap-2 text-sm">
            <input type="checkbox" class="available-input" ${item.available === false ? '' : 'checked'}>
            Available
          </label>
          <label class="flex items-center gap-2 text-sm">
            <input type="checkbox" class="archived-input" ${item.archived ? 'checked' : ''}>
            Hide
          </label>
        </div>
      </div>
      ${renderAdminOrderLinksEditor(item || {})}
      <div class="grid md:grid-cols-[96px_minmax(0,1fr)_auto] gap-3 mt-3 items-start">
        <img src="${escapeHtml(image)}" alt="" class="image-preview ${image ? '' : 'hidden'} w-24 h-24 object-cover rounded border bg-white">
        <label class="text-sm font-semibold">Translations JSON
          <textarea class="translations-input border px-2 py-1 rounded w-full mt-1 font-mono text-xs" rows="4" placeholder='{"ru":{"name":"..."}, "ky":{"name":"..."}}'>${escapeHtml(translations)}</textarea>
        </label>
        <button class="remove-item text-red-700 underline self-center" type="button">Remove</button>
      </div>
      ${renderTranslationStatusPills(item.translations || {}, ['name'])}
      <details class="mt-3 bg-white border rounded p-3">
        <summary class="cursor-pointer font-semibold text-sm">Translation review status</summary>
        <div class="grid md:grid-cols-4 gap-2 mt-3">
          ${getTranslationTargets().map(language => `
            <label class="text-xs font-semibold">${escapeHtml(language.label)}
              <select class="translation-status-select border px-2 py-1 rounded w-full mt-1" data-language="${escapeHtml(language.code)}">
                <option value="needs-review" ${item.translations?.[language.code]?.status !== 'approved' ? 'selected' : ''}>Needs review</option>
                <option value="approved" ${item.translations?.[language.code]?.status === 'approved' ? 'selected' : ''}>Approved</option>
              </select>
            </label>
          `).join('')}
        </div>
      </details>
    </div>
  `;
}

async function readMenuFromDOM(editor, cafeId) {
  const categoryCards = editor.querySelectorAll('.category-card');
  const menu = [];

  for (const categoryCard of categoryCards) {
    const categoryName = categoryCard.querySelector('.category-en')?.value.trim();
    if (!categoryName) continue;

    const items = [];
    const itemRows = categoryCard.querySelectorAll('.item-row');

    for (const row of itemRows) {
      const name = row.querySelector('.name-input')?.value.trim();
      const price = row.querySelector('.price-input')?.value.trim();
      if (!name || !price) continue;

      const imageFile = row.querySelector('.image-file-input')?.files?.[0];
      const image = imageFile
        ? await uploadMenuImage(cafeId, imageFile)
        : row.querySelector('.image-input')?.value.trim();

      let translations = {};
      try {
        translations = JSON.parse(row.querySelector('.translations-input')?.value || '{}');
      } catch {
        translations = {};
      }

      row.querySelectorAll('.translation-status-select').forEach(select => {
        const languageCode = select.dataset.language;
        translations[languageCode] = Object.assign({}, translations[languageCode] || {}, {
          status: select.value || 'needs-review',
          reviewedAt: new Date().toISOString()
        });
      });

      items.push({
        name,
        description: row.querySelector('.description-input')?.value.trim() || '',
        price,
        image: image || '',
        available: row.querySelector('.available-input')?.checked !== false,
        archived: row.querySelector('.archived-input')?.checked || false,
        orderLinks: readOrderLinksFromAdminRow(row),
        translations
      });
    }

    let categoryTranslations = {};
    try {
      categoryTranslations = JSON.parse(categoryCard.querySelector('.category-translations')?.value || '{}');
    } catch {
      categoryTranslations = {};
    }
    const categoryRu = categoryCard.querySelector('.category-ru')?.value.trim() || '';
    const categoryKy = categoryCard.querySelector('.category-ky')?.value.trim() || '';
    if (categoryRu) {
      categoryTranslations.ru = Object.assign({}, categoryTranslations.ru || {}, { name: categoryRu });
    }
    if (categoryKy) {
      categoryTranslations.ky = Object.assign({}, categoryTranslations.ky || {}, { name: categoryKy });
    }

    menu.push({
      category_en: categoryName,
      category_ru: categoryRu,
      category_ky: categoryKy,
      translations: categoryTranslations,
      items
    });
  }

  return menu;
}

