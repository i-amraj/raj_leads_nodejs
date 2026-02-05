const { Country, State, City } = require('country-state-city');
const fs = require('fs');
const path = require('path');

function safeLoadJson(filePath) {
    try {
        if (!fs.existsSync(filePath)) return null;
        return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (err) {
        console.error(`Failed to load ${filePath}:`, err);
        return null;
    }
}

function normalizeKey(value) {
    return String(value || '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');
}

const locationsBase = path.join(__dirname, '..', '..', 'location');
const indiaLocations = safeLoadJson(path.join(locationsBase, 'india-locations.json'));
const nepalLocations = safeLoadJson(path.join(locationsBase, 'nepal-locations.json'));

function buildAreaIndex(data) {
    if (!data || !data.areas) return null;
    const index = new Map();
    Object.entries(data.areas).forEach(([key, value]) => {
        index.set(normalizeKey(key), value);
    });
    return index;
}

const indiaAreaIndex = buildAreaIndex(indiaLocations);
const nepalAreaIndex = buildAreaIndex(nepalLocations);

exports.getCountries = (req, res) => {
    // Filter to only include India (IN) and Nepal (NP)
    const countries = Country.getAllCountries().filter(c => ['IN', 'NP'].includes(c.isoCode));
    res.json(countries);
};

exports.getStates = (req, res) => {
    const { countryCode } = req.params;
    const states = State.getStatesOfCountry(countryCode);
    res.json(states);
};

exports.getCities = (req, res) => {
    const { countryCode, stateCode } = req.params;
    if (countryCode === 'IN' && indiaLocations) {
        const districts = indiaLocations.districts?.[stateCode] || [];
        const cities = districts.map(d => ({ name: d.name }));
        return res.json(cities);
    }

    if (countryCode === 'NP' && nepalLocations) {
        const districts = nepalLocations.districts?.[stateCode] || [];
        const cities = districts.map(d => ({ name: d.name }));
        return res.json(cities);
    }

    const cities = City.getCitiesOfState(countryCode, stateCode);
    res.json(cities);
};

exports.getAreas = (req, res) => {
    const { countryCode, stateCode, city } = req.params;

    try {
        const cityName = decodeURIComponent(city || '');

        if (countryCode === 'IN' && indiaLocations) {
            const districts = indiaLocations.districts?.[stateCode] || [];
            const matched = districts.find(d => normalizeKey(d.name) === normalizeKey(cityName));
            const districtName = matched ? matched.name : cityName;
            const key = `${stateCode}__${districtName}`;
            const list = indiaAreaIndex?.get(normalizeKey(key)) || [];
            const areas = list.map(a => ({ name: a.name }));
            return res.json(areas);
        }

        if (countryCode === 'NP' && nepalLocations) {
            const districts = nepalLocations.districts?.[stateCode] || [];
            const matched = districts.find(d => normalizeKey(d.name) === normalizeKey(cityName));
            const districtName = matched ? matched.name : cityName;
            const key = `${stateCode}__${districtName}`;
            const list = nepalAreaIndex?.get(normalizeKey(key)) || [];
            const areas = list.map(a => ({ name: a.name }));
            return res.json(areas);
        }

        // Fallback to GeoNames-style areas.json if present
        const areasPath = path.join(__dirname, '..', 'data', 'areas.json');
        if (!fs.existsSync(areasPath)) {
            return res.json([]);
        }

        const raw = fs.readFileSync(areasPath, 'utf8');
        const data = JSON.parse(raw);

        const state = State.getStateByCodeAndCountry(stateCode, countryCode);
        const stateName = state ? state.name : '';

        const records = Array.isArray(data?.[countryCode]) ? data[countryCode] : [];

        const normalized = (value) => String(value || '').trim().toLowerCase();
        const stateKey = normalized(stateName);
        const cityKey = normalized(cityName);

        const areas = records.filter(r => {
            const admin1 = normalized(r.admin1);
            const admin2 = normalized(r.admin2);
            const place = normalized(r.placeName);

            if (stateKey && admin1 && admin1 !== stateKey) return false;
            if (cityKey && !(admin2 === cityKey || place === cityKey)) return false;
            return true;
        }).map(r => ({
            name: r.postalCode ? `${r.placeName} (${r.postalCode})` : r.placeName,
            postalCode: r.postalCode || ''
        }));

        res.json(areas);
    } catch (err) {
        console.error('Area lookup failed:', err);
        res.json([]);
    }
};
