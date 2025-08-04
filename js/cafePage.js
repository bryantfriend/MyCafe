import { db } from './js/firebase-init.js';
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

const languageSelector = document.getElementById('languageSelector');
let currentLanguage = 'en';

languageSelector.addEventListener('change', (e) => {
  currentLanguage = e.target.value;
  renderPage(); // Re-render the whole page on language change
});

const urlParams = new URLSearchParams(window.location.search);
// cafeId will now be the restaurant name from the URL, e.g., "mano"
const cafeId = urlParams.get('id');

// This function still gets the main cafe info (name, socials) from Firestore
// It uses the cafeId (e.g., "mano") as the document ID
async function getCafeInfoFromFirestore(id) {
  if (!id) {
    console.error('Cafe ID is missing from URL');
    document.body.innerHTML = '<h1>Error: Cafe ID not provided in URL. Please access via a link like ?id=mano</h1>';
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

// *** MODIFIED FUNCTION ***
// This function now gets the menu from a dynamic path based on the cafeId
async function getMenuFromJson(id) {
    if (!id) {
      return null; // Don't try to fetch if there's no ID
    }
    // Construct the dynamic path, e.g., "assets/mano/menu.json"
    const menuPath = `assets/${id}/menu.json`;
    console.log(`Fetching menu from: ${menuPath}`); // Helpful for debugging

    try {
        const response = await fetch(menuPath);
        if (!response.ok) {
            throw new Error(`Menu file not found at ${menuPath}. Status: ${response.status}`);
        }
        const menuData = await response.json();
        return menuData;
    } catch (error) {
        console.error("Could not fetch local menu JSON:", error);
        // Hide the menu section if the json file doesn't exist
        const menuSection = document.getElementById('menuSection');
        if (menuSection) menuSection.style.display = 'none';
        return null;
    }
}


function renderCafeInfo(cafeData) {
  if (!cafeData) return;
  const translations = cafeData.translations?.[currentLanguage] || {};
  const name = translations.name || cafeData.name || "Cafe"; // Default name
  const description = translations.description || '';
  const socials = cafeData.socials || {};

  document.title = `MyCafe | ${name}`; // Update the page title
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
  if (!menuData || !Array.isArray(menuData)) {
    // Ensure the menu section is hidden if there's no data
    const menuSection = document.getElementById('menuSection');
    if (menuSection) menuSection.style.display = 'none';
    return;
  }
  
  // Make sure the menu section is visible if data is found
  const menuSection = document.getElementById('menuSection');
  if (menuSection) menuSection.style.display = 'block';

  const accordionContainer = document.getElementById('menuAccordion');
  accordionContainer.innerHTML = ''; // Clear previous menu

  menuData.forEach(category => {
    const categoryName = category[`category_${currentLanguage}`] || category.category_en;
    const categoryDiv = document.createElement('div');
    categoryDiv.className = 'border border-gray-200 rounded-lg overflow-hidden';
    
    const headerButton = document.createElement('button');
    headerButton.className = 'w-full text-left p-4 bg-gray-50 hover:bg-gray-200 focus:outline-none flex justify-between items-center';
    headerButton.innerHTML = `
        <h3 class="text-xl font-semibold">${categoryName}</h3>
        <span class="transform transition-transform duration-300">▼</span>
    `;
    
    const panelDiv = document.createElement('div');
    panelDiv.className = 'hidden p-4 bg-white';
    const itemsGrid = document.createElement('div');
    itemsGrid.className = 'grid gap-4 sm:grid-cols-2 md:grid-cols-3';

    category.items.forEach(item => {
      const translatedName = item.translations?.[currentLanguage]?.name || item.name;
      const translatedDesc = item.translations?.[currentLanguage]?.description || item.description || '';
      const photo = item.photo || '';
      const itemCard = document.createElement('div');
      itemCard.className = 'bg-white shadow rounded p-4 border';
      itemCard.innerHTML = `
        ${photo ? `<img src="${photo}" alt="${translatedName}" class="w-full h-32 object-cover rounded mb-2">` : ''}
        <h4 class="text-lg font-semibold">${translatedName}</h4>
        ${translatedDesc ? `<p class="text-sm text-gray-600 mb-1">${translatedDesc}</p>` : ''}
        <p class="font-bold text-gray-900">${item.price} сом</p>
      `;
      itemsGrid.appendChild(itemCard);
    });

    panelDiv.appendChild(itemsGrid);
    
    headerButton.addEventListener('click', () => {
        const isHidden = panelDiv.classList.contains('hidden');
        if (isHidden) {
            panelDiv.classList.remove('hidden');
            headerButton.querySelector('span').classList.add('rotate-180');
        } else {
            panelDiv.classList.add('hidden');
            headerButton.querySelector('span').classList.remove('rotate-180');
        }
    });

    categoryDiv.appendChild(headerButton);
    categoryDiv.appendChild(panelDiv);
    accordionContainer.appendChild(categoryDiv);
  });
}

// *** MODIFIED FUNCTION ***
// Main function to fetch all data and render the page
async function renderPage() {
    // Fetch both pieces of information at the same time
    const [cafeData, menuData] = await Promise.all([
        getCafeInfoFromFirestore(cafeId),
        getMenuFromJson(cafeId)
    ]);
    
    if (cafeData) {
        renderCafeInfo(cafeData);
    }
    if (menuData) {
        renderMenu(menuData);
    }
}

// Initial page load
renderPage();