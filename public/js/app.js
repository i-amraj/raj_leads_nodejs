const scrapeBtn = document.getElementById('scrapeBtn');

const categoryToggle = document.getElementById('categoryToggle');
const categoryPanel = document.getElementById('categoryPanel');
const categorySearch = document.getElementById('categorySearch');
const categoryList = document.getElementById('categoryList');

const countryToggle = document.getElementById('countryToggle');
const countryPanel = document.getElementById('countryPanel');
const countrySearch = document.getElementById('countrySearch');
const countryList = document.getElementById('countryList');

const stateToggle = document.getElementById('stateToggle');
const statePanel = document.getElementById('statePanel');
const stateSearch = document.getElementById('stateSearch');
const stateList = document.getElementById('stateList');

const cityToggle = document.getElementById('cityToggle');
const cityPanel = document.getElementById('cityPanel');
const citySearch = document.getElementById('citySearch');
const cityList = document.getElementById('cityList');

const areaToggle = document.getElementById('areaToggle');
const areaPanel = document.getElementById('areaPanel');
const areaSearch = document.getElementById('areaSearch');
const areaList = document.getElementById('areaList');

const resultsContainer = document.getElementById('resultsContainer');
const resultsTableBody = document.querySelector('#resultsTable tbody');
const statusBar = document.getElementById('statusBar');
const statusText = document.getElementById('statusText');
const resultCount = document.getElementById('resultCount');
const getMoreBtn = document.getElementById('getMoreBtn');
const downloadBtn = document.getElementById('downloadBtn');

const trackingPanel = document.getElementById('trackingPanel');
const trackingPhase = document.getElementById('trackingPhase');
const trackingBar = document.getElementById('trackingBar');
const trackingLog = document.getElementById('trackingLog');

const categories = [
    'Gym',
    'Hotel',
    'Library',
    'Restaurant',
    'Hospital',
    'School'
];

let countries = [];
let states = [];
let cities = [];
let areas = [];

let selectedCategory = '';
let selectedCountry = '';
let selectedCountryCode = '';
let selectedCountryPhoneCode = '';
let selectedState = '';
let selectedStateCode = '';
let selectedCity = '';
let selectedArea = '';

let activeStream = null;
let processedIds = new Set();
let lastPayload = null;
let currentLeads = [];

const stagePercent = {
    init: 5,
    browser: 15,
    navigate: 30,
    scroll: 50,
    extract: 80,
    final: 100
};

function setDropdownDisabled(toggleEl, disabled) {
    toggleEl.disabled = disabled;
    if (disabled) {
        toggleEl.classList.add('is-disabled');
    } else {
        toggleEl.classList.remove('is-disabled');
    }
}

function setDropdownPlaceholder(toggleEl, text) {
    toggleEl.textContent = text;
    toggleEl.dataset.value = '';
}

function openPanel(panelEl, searchEl) {
    panelEl.classList.remove('hidden');
    searchEl.value = '';
    searchEl.focus();
}

function closePanel(panelEl) {
    panelEl.classList.add('hidden');
}

function buildList(listEl, options, onSelect, allowCustom, searchValue) {
    listEl.innerHTML = '';

    const normalizedSearch = searchValue.trim().toLowerCase();
    const filtered = options.filter(opt => opt.label.toLowerCase().includes(normalizedSearch));

    if (allowCustom && normalizedSearch) {
        const exact = options.some(opt => opt.label.toLowerCase() === normalizedSearch);
        if (!exact) {
            const customEl = document.createElement('div');
            customEl.className = 'dropdown-item';
            customEl.textContent = `Use: ${searchValue}`;
            customEl.addEventListener('click', () => onSelect({ label: searchValue, value: searchValue, custom: true }));
            listEl.appendChild(customEl);
        }
    }

    if (filtered.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'dropdown-item is-empty';
        empty.textContent = 'No results';
        listEl.appendChild(empty);
        return;
    }

    filtered.forEach(opt => {
        const item = document.createElement('div');
        item.className = 'dropdown-item';
        item.textContent = opt.label;
        item.addEventListener('click', () => onSelect(opt));
        listEl.appendChild(item);
    });
}

function wireDropdown({
    toggleEl,
    panelEl,
    searchEl,
    listEl,
    getOptions,
    onSelect,
    allowCustom = false
}) {
    toggleEl.addEventListener('click', () => {
        if (toggleEl.disabled) return;
        const isOpen = !panelEl.classList.contains('hidden');
        if (isOpen) {
            closePanel(panelEl);
        } else {
            openPanel(panelEl, searchEl);
            buildList(listEl, getOptions(), onSelect, allowCustom, '');
        }
    });

    searchEl.addEventListener('input', () => {
        buildList(listEl, getOptions(), onSelect, allowCustom, searchEl.value);
    });

    searchEl.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            const query = searchEl.value.trim();
            if (!query) return;
            if (allowCustom) {
                onSelect({ label: query, value: query, custom: true });
            }
        }
    });
}

function closeAllPanels() {
    [categoryPanel, countryPanel, statePanel, cityPanel, areaPanel].forEach(closePanel);
}

document.addEventListener('click', (event) => {
    const dropdown = event.target.closest('.dropdown');
    if (!dropdown) {
        closeAllPanels();
    }
});

function resetTracking() {
    trackingPanel.classList.remove('hidden');
    trackingPhase.textContent = 'Starting';
    trackingBar.style.width = '0%';
    trackingLog.innerHTML = '';
}

function updateGetMore(meta) {
    if (!meta) {
        getMoreBtn.classList.add('hidden');
        return;
    }
    if (meta.remaining && meta.remaining > 0) {
        getMoreBtn.classList.remove('hidden');
        getMoreBtn.textContent = `Get More (${meta.remaining} left)`;
    } else {
        getMoreBtn.classList.add('hidden');
    }
}

function appendLog(message) {
    const row = document.createElement('div');
    row.className = 'tracking-row';
    row.textContent = message;
    trackingLog.appendChild(row);
    trackingLog.scrollTop = trackingLog.scrollHeight;
}

function updateProgress(stage, percent, message) {
    const pct = percent || stagePercent[stage] || 0;
    trackingBar.style.width = `${Math.min(100, pct)}%`;
    if (message) {
        trackingPhase.textContent = message;
    }
}

function collectProcessedIds(data) {
    data.forEach(item => {
        if (item.id) processedIds.add(item.id);
    });
}

// Initialization
document.addEventListener('DOMContentLoaded', async () => {
    buildCategoryDropdown();
    loadCountries();
});

function buildCategoryDropdown() {
    const options = categories.map(c => ({ label: c, value: c }));

    wireDropdown({
        toggleEl: categoryToggle,
        panelEl: categoryPanel,
        searchEl: categorySearch,
        listEl: categoryList,
        getOptions: () => options,
        onSelect: (opt) => {
            selectedCategory = opt.value;
            categoryToggle.textContent = opt.label;
            categoryToggle.dataset.value = opt.value;
            closePanel(categoryPanel);
        },
        allowCustom: true
    });
}

async function loadCountries() {
    try {
        const res = await fetch('/api/countries');
        const list = await res.json();
        countries = list.map(c => ({ label: c.name, value: c.name, code: c.isoCode, phonecode: c.phonecode || '' }));

        wireDropdown({
            toggleEl: countryToggle,
            panelEl: countryPanel,
            searchEl: countrySearch,
            listEl: countryList,
            getOptions: () => countries,
            onSelect: (opt) => {
                selectedCountry = opt.value;
                selectedCountryCode = opt.code || '';
                selectedCountryPhoneCode = opt.phonecode ? String(opt.phonecode) : '';
                countryToggle.textContent = opt.label;
                countryToggle.dataset.value = opt.value;
                closePanel(countryPanel);
                resetAfterCountry();
                if (selectedCountryCode) {
                    loadStates(selectedCountryCode);
                }
            }
        });
    } catch (e) {
        console.error('Failed to load countries', e);
    }
}

async function loadStates(countryCode) {
    try {
        const res = await fetch(`/api/countries/${countryCode}/states`);
        const list = await res.json();
        states = list.map(s => ({ label: s.name, value: s.name, code: s.isoCode }));

        wireDropdown({
            toggleEl: stateToggle,
            panelEl: statePanel,
            searchEl: stateSearch,
            listEl: stateList,
            getOptions: () => states,
            onSelect: (opt) => {
                selectedState = opt.value;
                selectedStateCode = opt.code || '';
                stateToggle.textContent = opt.label;
                stateToggle.dataset.value = opt.value;
                closePanel(statePanel);
                resetAfterState();
                if (selectedCountryCode && selectedStateCode) {
                    loadCities(selectedCountryCode, selectedStateCode);
                }
            }
        });

        setDropdownDisabled(stateToggle, false);
        setDropdownPlaceholder(stateToggle, 'Select state...');
    } catch (e) {
        console.error('Failed to load states', e);
    }
}

async function loadCities(countryCode, stateCode) {
    try {
        const res = await fetch(`/api/countries/${countryCode}/states/${stateCode}/cities`);
        const list = await res.json();
        cities = list.map(c => ({ label: c.name, value: c.name }));

        wireDropdown({
            toggleEl: cityToggle,
            panelEl: cityPanel,
            searchEl: citySearch,
            listEl: cityList,
            getOptions: () => cities,
            onSelect: (opt) => {
                selectedCity = opt.value;
                cityToggle.textContent = opt.label;
                cityToggle.dataset.value = opt.value;
                closePanel(cityPanel);
                resetAfterCity();
                if (selectedCountryCode && selectedStateCode && selectedCity) {
                    loadAreas(selectedCountryCode, selectedStateCode, selectedCity);
                }
            }
        });

        setDropdownDisabled(cityToggle, false);
        setDropdownPlaceholder(cityToggle, 'Select city...');
    } catch (e) {
        console.error('Failed to load cities', e);
    }
}

async function loadAreas(countryCode, stateCode, cityName) {
    try {
        const res = await fetch(`/api/countries/${countryCode}/states/${stateCode}/cities/${encodeURIComponent(cityName)}/areas`);
        const list = await res.json();
        areas = (Array.isArray(list) ? list : []).map(a => ({ label: a.name, value: a.name }));

        wireDropdown({
            toggleEl: areaToggle,
            panelEl: areaPanel,
            searchEl: areaSearch,
            listEl: areaList,
            getOptions: () => areas,
            onSelect: (opt) => {
                selectedArea = opt.value;
                areaToggle.textContent = opt.label;
                areaToggle.dataset.value = opt.value;
                closePanel(areaPanel);
            },
            allowCustom: true
        });

        setDropdownDisabled(areaToggle, false);
        setDropdownPlaceholder(areaToggle, 'Select area...');
    } catch (e) {
        console.error('Failed to load areas', e);
    }
}

function resetAfterCountry() {
    selectedState = '';
    selectedStateCode = '';
    selectedCity = '';
    selectedArea = '';

    if (!selectedCountry) {
        selectedCountryPhoneCode = '';
    }

    setDropdownDisabled(stateToggle, true);
    setDropdownDisabled(cityToggle, true);
    setDropdownDisabled(areaToggle, true);
    setDropdownPlaceholder(stateToggle, 'Select state...');
    setDropdownPlaceholder(cityToggle, 'Select city...');
    setDropdownPlaceholder(areaToggle, 'Select area...');
}

function resetAfterState() {
    selectedCity = '';
    selectedArea = '';

    setDropdownDisabled(cityToggle, true);
    setDropdownDisabled(areaToggle, true);
    setDropdownPlaceholder(cityToggle, 'Select city...');
    setDropdownPlaceholder(areaToggle, 'Select area...');
}

function resetAfterCity() {
    selectedArea = '';

    setDropdownDisabled(areaToggle, true);
    setDropdownPlaceholder(areaToggle, 'Select area...');
}

function stopStream() {
    if (activeStream) {
        activeStream.close();
        activeStream = null;
    }
}

getMoreBtn.addEventListener('click', async () => {
    if (!lastPayload) return;
    if (processedIds.size === 0) return;

    getMoreBtn.disabled = true;
    statusText.innerText = 'Fetching remaining...';
    appendLog('Fetching remaining cards...');

    try {
        const response = await fetch('/api/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ...lastPayload,
                processedIds: Array.from(processedIds)
            })
        });

        const result = await response.json();
        if (result.success) {
            collectProcessedIds(result.data || []);
            displayResults(result.data || [], true);
            appendLog(`Fetched ${result.count} more leads.`);
            updateGetMore(result.meta);
        } else {
            appendLog('Error fetching more data.');
        }
    } catch (error) {
        console.error(error);
        appendLog('Error fetching more data.');
    } finally {
        getMoreBtn.disabled = false;
    }
});

// Search Logic
scrapeBtn.addEventListener('click', async () => {
    const category = selectedCategory || '';
    const country = selectedCountry || '';
    const state = selectedState || '';
    const city = selectedCity || '';
    const area = selectedArea || '';

    if (!category || !country) {
        alert('Category and Country are required!');
        return;
    }

    // UI Updates
    statusBar.classList.remove('hidden');
    resultsContainer.classList.add('hidden');
    scrapeBtn.disabled = true;
    scrapeBtn.style.opacity = '0.7';
    statusText.innerText = 'Scraping...';
    resetTracking();
    updateGetMore(null);
    processedIds = new Set();
    lastPayload = { category, country, state, city, area };

    stopStream();

    const params = new URLSearchParams({ category, country, state, city, area });
    activeStream = new EventSource(`/api/search/stream?${params.toString()}`);

    activeStream.addEventListener('progress', (event) => {
        const data = JSON.parse(event.data);
        if (data.message) {
            appendLog(data.message);
        }
        updateProgress(data.stage, data.percent, data.message || data.stage);
    });

    activeStream.addEventListener('done', (event) => {
        const data = JSON.parse(event.data);
        if (data.success) {
            collectProcessedIds(data.data || []);
            displayResults(data.data || [], false);
            statusText.innerText = 'Scraping complete!';
            appendLog(`Completed. ${data.count} leads.`);
            updateProgress('final', 100, 'Completed');
            updateGetMore(data.meta);
        } else {
            statusText.innerText = 'Error: ' + (data.error || 'Unknown');
        }
        scrapeBtn.disabled = false;
        scrapeBtn.style.opacity = '1';
        stopStream();
    });

    activeStream.addEventListener('error', () => {
        statusText.innerText = 'System Error. Check console.';
        appendLog('Connection error.');
        scrapeBtn.disabled = false;
        scrapeBtn.style.opacity = '1';
        stopStream();
    });
});

function displayResults(data, append = false) {
    resultsContainer.classList.remove('hidden');
    if (!append) {
        resultsTableBody.innerHTML = '';
        currentLeads = [];
    }

    data.forEach(lead => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${lead.name}</td>
            <td>${lead.address || '-'}</td>
            <td>${lead.phone || '-'}</td>
            <td>${lead.rating || '-'} (${lead.reviews || 0})</td>
            <td>${lead.website ? `<a href="${lead.website}" target="_blank">Link</a>` : '-'}</td>
        `;
        resultsTableBody.appendChild(tr);
        currentLeads.push(lead);
    });

    resultCount.innerText = resultsTableBody.children.length;
}

function toCsvValue(value) {
    if (value === null || value === undefined) return '';
    const str = String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
}

function downloadCsv(filename, rows) {
    const csv = rows.map(row => row.map(toCsvValue).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

downloadBtn.addEventListener('click', () => {
    if (!currentLeads.length) {
        alert('No data to export yet.');
        return;
    }

    const salesperson = prompt('Enter Salesperson for all rows:') || '';
    const salesTeam = prompt('Enter Sales Team for all rows:') || '';
    const category = prompt('Enter Category for all rows:', selectedCategory || '') || '';
    const dialCodeDigits = selectedCountryPhoneCode ? String(selectedCountryPhoneCode).replace(/\D/g, '') : '';

    const header = ['Name', 'Phone', 'Email', 'City', 'Country', 'Salesperson', 'Sales Team', 'Category'];
    const rows = [header];

    currentLeads.forEach(lead => {
        const rawPhone = lead.phone || '';
        const hasPlus = rawPhone.trim().startsWith('+');
        const digitsOnly = rawPhone.replace(/\D/g, '');
        let phoneValue = '';
        if (digitsOnly) {
            if (hasPlus) {
                phoneValue = `+${digitsOnly}`;
            } else if (dialCodeDigits && !digitsOnly.startsWith(dialCodeDigits)) {
                phoneValue = `+${dialCodeDigits}${digitsOnly}`;
            } else if (dialCodeDigits && digitsOnly.startsWith(dialCodeDigits)) {
                phoneValue = `+${digitsOnly}`;
            } else {
                phoneValue = digitsOnly;
            }
        }

        rows.push([
            lead.name || '',
            phoneValue,
            '',
            selectedCity || lead.city || '',
            selectedCountry || lead.country || '',
            salesperson,
            salesTeam,
            category
        ]);
    });

    downloadCsv('leads_export.csv', rows);
});
