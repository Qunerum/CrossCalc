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
		for (const category in data) {
			const sortedCategoryItems = [...data[category]].sort((a, b) => a.rare - b.rare);
			sortedCategoryItems.forEach(item => { allItems.push({ ...item, category: category }); });
		}
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
function countItemInCraftTree(currentItemId, targetId, allData, currentQuantity = 1) {
	let totalCount = 0, targetItem = null;
	for (const cat in allData) {
		const match = allData[cat].find(i => i.id.toLowerCase() === currentItemId.toLowerCase());
		if (match) {
			targetItem = match;
			break;
		}
	}
	if (currentItemId.toLowerCase() === targetId.toLowerCase()) totalCount += currentQuantity;
	if (!targetItem || !targetItem.craft || targetItem.craft.length === 0) return totalCount;
	const craftCount = targetItem.craft_count || 1, multiplier = currentQuantity / craftCount;
	targetItem.craft.forEach(ing => {
		const ingAmount = ing.amount * multiplier;
		totalCount += countItemInCraftTree(ing.id, targetId, allData, ingAmount);
	});
	return totalCount;
}
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
				const t = translations[currentLang] || {},
					faction = t.faction || "Faction",
					category = t.category || "Category",
					type = t.type || "Type",
					ps = t.ps || "PS",
					durab = t.durability || "Durability",
					mass = t.mass || "Mass",
					pcs = t.pcs || "pcs",
					req_mat = t.req_mat || "Required materials",
					_for = t.for || "for",
					total = t.total || "Total",
					market = t.market || "Market & Profit Calculator",
					atax = t.atax || "After Tax (10% fee)",
					coins = t.coins || "Coins",
					tcc = t.tcc || "Total Craft Cost",
					dsp = t.dsp || "Desired Selling Price (Market)",
					eg = t.eg || "e.g.";
				let forPcs = "";
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
						const ingID = ing.id,
							ingName = ingData ? ingData.name : `#${ingID}`,
							ingRare = ingData ? rares[ingData.rare] : "dd2222",
							ingType = ingData ? ingData.type : "(NULL)",
							ingCount = ing.amount;
						cardsHTML += `
						<a href="item.html?id=${ing.id}" class="card" style="--rare: #${ingRare}; text-decoration: none; color: #fff;">
						<stit>${ingName}</stit>
						<des>${ingCount} ${pcs}</des>
						<sdes>${ingType}</sdes>
						<sdes>#${ingID}</sdes>
						</a>
						`;
					});
					const cc = item.craft_count;
					if (cc > 1) forPcs = ` (${_for} ${cc} ${pcs})`;
					const resourceCategoryKey = Object.keys(data).find(cat => cat.toLowerCase() === 'resources'),
						resourceItems = resourceCategoryKey ? data[resourceCategoryKey] : [],
						resourceCounts = {};
					resourceItems.forEach(res => {
						const count = countItemInCraftTree(item.id, res.id, data);
						if (count > 0) {
							resourceCounts[res.id] = count;
						}
					});
					let tTotalsHTML = '', marketInputsHTML = '', totalCoinCost = 0;
					const marketPrices = JSON.parse(localStorage.getItem('crosscalc_prices')) || {};
					for (const [resId, count] of Object.entries(resourceCounts)) {
						const resData = resourceItems.find(r => r.id === resId), resName = resData ? resData.name : resId;
						tTotalsHTML += `<des data-res="${resId}"><b>${resName}:</b> ${count}</des>`;
						const price = marketPrices[resId] || 0;
						totalCoinCost += (count / 1000) * price;
						marketInputsHTML += `
						<div class="market-input-group">
						<label>${resName} (1k):</label>
						<input type="number" class="market-price-input" data-res="${resId}" value="${price || ''}" placeholder="0">
						</div>
						`;
					}
					craftingHTML = `
					<div class="craft-section">
					<stit>${req_mat}${forPcs}:</stit><br><br>
					<div class="craft-grid">${cardsHTML}</div><br>
					<stit>${total}:</stit>
					${tTotalsHTML}
					</div>
					<div class="market-calculator"><hr>
					<stit>${market}:</stit><br>
					<div class="market-inputs-grid">
					${marketInputsHTML}
					</div>
					<div class="market-total-box"><des><b>${tcc}:</b> <span id="totalCostDisplay" class="market-total-value">${totalCoinCost.toFixed(2)}</span> ${coins}</des></div>
					<div class="market-field">
					<label>${dsp}:</label>
					<input type="number" id="sellPriceInput" class="market-sell-input" placeholder="${eg} 250">
					<div class="market-profit-box"><des><b>${atax}:</b> <span id="netProfitDisplay" class="market-profit-value">0.00</span> ${coins}</des></div>
					</div>
					</div>
					`;
				}
				container.style.setProperty('--rare', `#${rares[item.rare]}`);
				container.innerHTML = `
				<tit>${item.name}</tit><id>#${item.id}</id>
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
document.addEventListener('input', (e) => {
	if (e.target.classList.contains('market-price-input')) {
		const prices = JSON.parse(localStorage.getItem('crosscalc_prices')) || {};
		const resName = e.target.getAttribute('data-res');
		prices[resName] = parseFloat(e.target.value) || 0;
		localStorage.setItem('crosscalc_prices', JSON.stringify(prices));
		updateLiveCraftCost();
	}
	if (e.target.id === 'sellPriceInput') {
		const sellPrice = parseFloat(e.target.value) || 0;
		const tax = sellPrice * 0.10;
		const netProfit = sellPrice - tax;
		const profitDisplay = document.getElementById('netProfitDisplay');
		if (profitDisplay) {
			profitDisplay.textContent = netProfit.toFixed(2);
			profitDisplay.style.color = netProfit > 0 ? '#42c2b6' : '#ff5100';
		}
	}
});
function updateLiveCraftCost() {
	const prices = JSON.parse(localStorage.getItem('crosscalc_prices')) || {};
	let totalCost = 0;
	const craftSection = document.querySelector('.craft-section');
	if (!craftSection) return;
	craftSection.querySelectorAll('des[data-res]').forEach(el => {
		const resId = el.getAttribute('data-res');
		const price = prices[resId] || 0;
		const text = el.textContent;
		const parts = text.split(':');
		if (parts.length > 1) {
			const amount = parseFloat(parts[1].trim()) || 0;
			totalCost += (amount / 1000) * (price || 0);
		}
	});
	const costDisplay = document.getElementById('totalCostDisplay');
	if (costDisplay) costDisplay.textContent = totalCost.toFixed(2);
}
document.addEventListener('DOMContentLoaded', () => {
	if (document.getElementById('itemsContainer')) initIndexPage();
	else if (document.getElementById('itemDetails')) initItemPage();
});
