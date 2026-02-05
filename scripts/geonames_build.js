const fs = require('fs');
const path = require('path');
const https = require('https');

const BASE_URL = process.env.GEONAMES_BASE_URL || 'https://symerio.github.io/postal-codes-data/data/geonames';
const COUNTRIES = (process.env.GEONAMES_COUNTRIES || 'IN,NP').split(',').map(c => c.trim().toUpperCase()).filter(Boolean);

function fetchText(url) {
    return new Promise((resolve, reject) => {
        https.get(url, res => {
            if (res.statusCode !== 200) {
                reject(new Error(`Failed to download ${url} (status ${res.statusCode})`));
                res.resume();
                return;
            }
            let data = '';
            res.setEncoding('utf8');
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(data));
        }).on('error', reject);
    });
}

function parsePostalText(text) {
    const lines = text.split('\n');
    const records = [];
    for (const line of lines) {
        if (!line || line.startsWith('#')) continue;
        const parts = line.split('\t');
        if (parts.length < 9) continue;

        const record = {
            countryCode: parts[0] || '',
            postalCode: parts[1] || '',
            placeName: parts[2] || '',
            admin1: parts[3] || '',
            admin2: parts[5] || '',
            admin3: parts[7] || ''
        };

        if (!record.postalCode && !record.placeName) continue;
        records.push(record);
    }
    return records;
}

async function build() {
    const output = {};

    for (const country of COUNTRIES) {
        const url = `${BASE_URL}/${country}.txt`;
        console.log(`Downloading ${url}...`);
        const text = await fetchText(url);
        const records = parsePostalText(text);

        const unique = new Set();
        const cleaned = [];

        for (const r of records) {
            const key = `${r.postalCode}|${r.placeName}|${r.admin1}|${r.admin2}|${r.admin3}`.toLowerCase();
            if (unique.has(key)) continue;
            unique.add(key);
            cleaned.push({
                postalCode: r.postalCode,
                placeName: r.placeName,
                admin1: r.admin1,
                admin2: r.admin2,
                admin3: r.admin3
            });
        }

        output[country] = cleaned;
        console.log(`Loaded ${cleaned.length} rows for ${country}`);
    }

    const outPath = path.join(__dirname, '..', 'src', 'data', 'areas.json');
    fs.writeFileSync(outPath, JSON.stringify(output, null, 2));
    console.log(`Wrote ${outPath}`);
}

build().catch(err => {
    console.error('Build failed:', err);
    process.exit(1);
});
