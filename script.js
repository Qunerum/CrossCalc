let allItems = [], translations = {}, currentLang = localStorage.getItem('crosscalc_lang') || 'en';
const langFile = 'lang.json', databaseFile = 'db.json';

async function initCommon() {
	await loadTranslations();
	applyLanguage();
}
async function loadTranslations() {
	try {
		const response = await fetch(langFile);
		translations = await response.json();
	} catch (error) { console.error("Translate error:", error); }
}
function setLanguage(lang) {
	currentLang = lang;
	localStorage.setItem('crosscalc_lang', lang);
	applyLanguage();
	if (document.getElementById('searchInput')) filterItems();
}
function applyLanguage() {
	if (!translations[currentLang]) return;
	const cclang = 'ccl', elements = document.querySelectorAll(`[${cclang}]`);
	elements.forEach(el => {
		const key = el.getAttribute(cclang);
		if (translations[currentLang][key]) el.textContent = translations[currentLang][key];
	});
	const searchInput = document.getElementById('searchInput');
	if (searchInput && translations[currentLang]['search_placeholder']) searchInput.placeholder = translations[currentLang]['search_placeholder'];
}
const rares = [
	"9b9b9b", // Base
	"ffffff", // Common
	"3688ff", // Rare
	"42c2b6", // Special
	"b333ff", // Epic
	"ff9a00", // Legendary
	"ff5100"  // Relic
], factions = [
	"...",
	"Engineers",
	"Lunatics",
	"Nomads",
	"Scavengers",
	"Steppenwolfs",
	"Dawn's Children",
	"Firestarters"
];
// index.html
async function initIndexPage() {
	await initCommon();
	try {
		const response = await fetch(databaseFile), data = await response.json();
		allItems = [];
		for (const category in data) data[category].forEach(item => { allItems.push({ ...item, category: category }); });
		displayItems(allItems);
	} catch (error) {
		console.error("Error while loading Database:", error);
		const container = document.getElementById('itemsContainer');
		const errText = translations[currentLang]?.error_load || "Loading error.";
		if (container) container.innerHTML = `<p style="color: red;">${errText}</p>`;
	}
}
function displayItems(items) {
	const container = document.getElementById('itemsContainer');
	if (!container) return;
	container.innerHTML = '';
	if (items.length === 0) {
		const noItemsText = translations[currentLang]?.no_items || "No matching items.";
		container.innerHTML = `<p>${noItemsText}</p>`;
		return;
	}
	let lastCategory = null;
	items.forEach(item => {
		if (item.category && item.category !== lastCategory) {
			lastCategory = item.category;
			const separator = document.createElement('div');
			separator.className = 'category-separator';
			separator.innerHTML = `<h3>${item.category}</h3><hr>`;
			container.appendChild(separator);
		}
		const card = document.createElement('a');
		card.className = 'card';
		card.style.setProperty('--rare', `#${rares[item.rare]}`);
		card.href = `item.html?id=${item.id}`;
		card.style.textDecoration = 'none';
		card.style.color = '#ffffff';
		card.innerHTML = `
		<stit>${item.name}</stit>
		<sdes>${factions[item.faction]}</sdes>
		<sdes>${item.type}</sdes>
		<sdes>${item.ps} PS</sdes>
		`;
		container.appendChild(card);
	});
}
function filterItems() {
	const searchInput = document.getElementById('searchInput');
	if (!searchInput) return;
	const query = searchInput.value.toLowerCase(), filtered = allItems.filter(item => { return item.name.toLowerCase().startsWith(query); });
	displayItems(filtered);
}
// item.html
async function initItemPage() {
	await initCommon();
	const urlParams = new URLSearchParams(window.location.search), itemId = urlParams.get('id'), container = document.getElementById('itemDetails');
	if (!itemId) {
		if (container) container.innerHTML = '<h2>No item selected.</h2>';
		return;
	}
	try {
		const response = await fetch(databaseFile), data = await response.json();
		let item = null;
		for (const category in data) {
			const match = data[category].find(i => i.id === itemId);
			if (match) {
				item = match;
				item.category = category;
				break;
			}
		}
		if (container) {
			if (item) {
				const faction = translations[currentLang].faction,
					category = translations[currentLang].category,
					type = translations[currentLang].type,
					ps = translations[currentLang].ps,
					durab = translations[currentLang].durability,
					mass = translations[currentLang].mass;
					pcs = translations[currentLang].pcs,
					req_mat = translations[currentLang].req_mat;
				container.style.setProperty('--rare', `#${rares[item.rare]}`);
				let craftingHTML = '';
				if (item.craft && item.craft.length > 0) {
					let cardsHTML = '';
					item.craft.forEach(ing => {
						let ingData = null;
						for (const cat in data) {
							const match = data[cat].find(i => i.id === ing.id);
							if (match) {
								ingData = match;
								break;
							}
						}
						const ingName = ingData ? ingData.name : ing.id,
						ingRare = ingData ? rares[ingData.rare] : "9b9b9b",
						ingType = ingData ? ingData.type : "(NULL)",
						ingFaction = ingData ? factions[ingData.faction] : "(NULL)",
						ingCount = ing.amount;
						cardsHTML += `
						<a href="item.html?id=${ing.id}" class="card" style="--rare: #${ingRare}; text-decoration: none; color: #fff;">
						<stit>${ingName}</stit>
						<des>${ingCount} ${pcs}</des>
						<sdes>${ingFaction}</sdes>
						<sdes>${ingType}</sdes>
						</a>
						`;
					});
					craftingHTML = `
					<div class="craft-section">
					<h3>${req_mat}:</h3>
					<div class="craft-grid">${cardsHTML}</div>
					</div>
					`;
				}
				container.style.setProperty('--rare', `#${rares[item.rare]}`);
				container.innerHTML = `
				<tit>${item.name}</tit><id>${item.id}</id>
				<des><b>${faction}:</b> ${factions[item.faction]}</des>
				<des><b>${category}:</b> <sl>${item.category}</sl></des>
				<des><b>${type}:</b> ${item.type}</des>
				<des><b>${ps}:</b> ${item.ps}</des>
				<des><b>${durab}:</b> ${item.durability}</des>
				<des><b>${mass}:</b> ${item.mass} kg</des>
				${craftingHTML}
				`;
				document.title = item.name + " - CrossCalc";
			} else container.innerHTML = '<h2>Item not found.</h2>';
		}
	} catch (error) {
		console.error("Error loading details:", error);
		if (container) container.innerHTML = '<p style="color: red;">Data loading error.</p>';
	}
}
document.addEventListener('DOMContentLoaded', () => {
	if (document.getElementById('itemsContainer')) initIndexPage();
	else if (document.getElementById('itemDetails')) initItemPage();
});
