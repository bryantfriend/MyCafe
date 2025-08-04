import { db } from './firebase-init.js';
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

const languageSelector = document.getElementById('languageSelector');
let currentLanguage = 'en';
let currentCafeData = null;
let currentMenuData = null;

languageSelector.addEventListener('change', (e) => {
  currentLanguage = e.target.value;
  // Just re-render with existing data, no need to fetch again
  if (currentCafeData) renderCafeInfo(currentCafeData);
  if (currentMenuData) renderMenu(currentMenuData);
});

const urlParams = new URLSearchParams(window.location.search);
const cafeId = urlParams.get('id'); // This is the Firestore unique ID

// Fetches cafe info from Firestore using the unique ID
async function getCafeInfoFromFirestore(id) {
  if (!id) {
    console.error('Cafe ID is missing from URL');
    document.body.innerHTML = '<h1>Error: Cafe ID not provided in URL. Please use a link like ?id=YOUR_CAFE_ID</h1>';
    return null;
  }
  const docRef = doc(db, 'cafes', id);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return docSnap.data();
  } else {
    console.error(`Cafe with ID '${id}' not found in Firestore.`);
    return null;
  }
}

// Fetches menu from a local JSON file using the cafe's path name (e.g., "mano")
async function getMenuFromJson(pathName) {
    if (!pathName) {
      console.error("Cannot fetch menu because 'path_name' is missing from the Firestore document.");
      return null;
    }
    const menuPath = `assets/${pathName}/menu.json`;
    console.log(`Fetching menu from: ${menuPath}`);

    try {
        const response = await fetch(menuPath);
        if (!response.ok) {
            throw new Error(`Menu file not found at ${menuPath}. Status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error("Could not fetch local menu JSON:", error);
        return null;
    }
}

function renderCafeInfo(cafeData) {
  const translations = cafeData.translations?.[currentLanguage] || {};
  const name = translations.name || cafeData.name || "Cafe";
  const description = translations.description || '';
  const socials = cafeData.socials || {};

  document.title = `MyCafe | ${name}`;
  document.getElementById('cafeInfo').innerHTML = `
    <h2 class="text-3xl font-bold mb-2">${name}</h2>
    <p class="mb-2">${description}</p>
    <div class="flex gap-3 text-blue-500">
      ${socials.instagram ? `<a href="${socials.instagram}" target="_blank">Instagram</a>` : ''}
      ${socials.tiktok ? `<a href="${socials.tiktok}" target="_blank">TikTok</a>` : ''}
    </div>
  `;
}

function renderMenu(menuData) {
  const menuSection = document.getElementById('menuSection');
  if (!menuData || !Array.isArray(menuData)) {
    if (menuSection) menuSection.style.display = 'none';
    return;
  }
  
  if (menuSection) menuSection.style.display = 'block';
  const accordionContainer = document.getElementById('menuAccordion');
  accordionContainer.innerHTML = '';

  menuData.forEach(category => {
    const categoryName = category[`category_${currentLanguage}`] || category.category_en;
    const categoryDiv = document.createElement('div');
    categoryDiv.className = 'border border-gray-200 rounded-lg overflow-hidden';
    
    const headerButton = document.createElement('button');
    headerButton.className = 'w-full text-left p-4 bg-gray-50 hover:bg-gray-200 focus:outline-none flex justify-between items-center';
    headerButton.innerHTML = `<h3 class="text-xl font-semibold">${categoryName}</h3><span class="transform transition-transform duration-300">▼</span>`;
    
    const panelDiv = document.createElement('div');
    panelDiv.className = 'hidden p-4 bg-white';
    const itemsGrid = document.createElement('div');
    itemsGrid.className = 'grid gap-4 sm:grid-cols-2 md:grid-cols-3';

    category.items.forEach(item => {
      const translatedName = item.translations?.[currentLanguage]?.name || item.name;
      const translatedDesc = item.translations?.[currentLanguage]?.description || item.description || '';
      const itemCard = document.createElement('div');
      itemCard.className = 'bg-white shadow rounded p-4 border';
      itemCard.innerHTML = `
        <h4 class="text-lg font-semibold">${translatedName}</h4>
        ${translatedDesc ? `<p class="text-sm text-gray-600 mb-1">${translatedDesc}</p>` : ''}
        <p class="font-bold text-gray-900">${item.price} сом</p>
      `;
      itemsGrid.appendChild(itemCard);
    });

    panelDiv.appendChild(itemsGrid);
    
    headerButton.addEventListener('click', () => {
        const isHidden = panelDiv.classList.contains('hidden');
        panelDiv.classList.toggle('hidden', !isHidden);
        headerButton.querySelector('span').classList.toggle('rotate-180', !isHidden);
    });

    categoryDiv.appendChild(headerButton);
    categoryDiv.appendChild(panelDiv);
    accordionContainer.appendChild(categoryDiv);
  });
}

// *** MODIFIED MAIN FUNCTION ***
// This function now runs sequentially to solve the problem
async function renderPage() {
    // 1. Fetch the main cafe info from Firestore first
    const cafeData = await getCafeInfoFromFirestore(cafeId);
    
    // If we can't find the cafe, stop.
    if (!cafeData) return;
    
    // 2. Use the "path_name" field from the cafe data to find the menu file
    const menuData = await getMenuFromJson(cafeData.path_name);
    
    // 3. Store the data globally so language changes don't require new fetches
    currentCafeData = cafeData;
    currentMenuData = menuData;
    
    // 4. Render the components with the data we found
    renderCafeInfo(currentCafeData);
    renderMenu(currentMenuData);
}

// Initial page load
renderPage();
