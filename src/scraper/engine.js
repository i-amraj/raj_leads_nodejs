const { startBrowser } = require('./browser');
const { SELECTORS, SCROLL } = require('../config/constants');

async function scrapeAll(keyword, location, options = {}) {
    const { onProgress = () => {}, skipIds = [] } = options;

    let { browser, context } = await startBrowser();
    const page = await context.newPage();
    const leads = [];
    const seenKey = new Set();
    const seenIds = new Set();
    const skipSet = new Set((skipIds || []).filter(Boolean));

    let totalCards = 0;
    let processedCount = 0;
    let skippedCount = 0;

    const report = (payload) => {
        try {
            onProgress(payload);
        } catch (e) {
            // Ignore progress errors to avoid breaking scraping
        }
    };

    const normalizeKey = (value) => {
        if (!value) return '';
        return String(value).toLowerCase().replace(/\s+/g, ' ').trim();
    };

    const normalizePhone = (value) => {
        if (!value) return '';
        return String(value).replace(/\D/g, '');
    };

    const normalizeCardId = (raw) => {
        if (!raw) return '';
        if (raw.startsWith('href:')) {
            const href = raw.slice(5);
            try {
                const url = new URL(href);
                const cid = url.searchParams.get('cid');
                if (cid) return `cid:${cid}`;
                const placeId = url.searchParams.get('place_id');
                if (placeId) return `place:${placeId}`;
            } catch (e) {
                // ignore
            }
            return `href:${href}`;
        }
        return raw;
    };

    const cleanPhone = (raw) => {
        if (!raw) return '';
        const digits = normalizePhone(raw);
        if (digits.length < 10 || digits.length > 13) return '';
        return digits;
    };

    const extractCardId = async (card) => {
        try {
            const raw = await card.evaluate((el) => {
                const attrs = ['data-result-id', 'data-entity-id', 'data-cid', 'data-place-id'];
                for (const attr of attrs) {
                    const val = el.getAttribute(attr);
                    if (val) return `${attr}:${val}`;
                }
                const link =
                    el.querySelector('a[href*="/maps/place/"]') ||
                    el.querySelector('a[href*="maps/place"]') ||
                    el.querySelector('a[href*="maps?"]') ||
                    el.querySelector('a[href]');
                if (link && link.href) return `href:${link.href}`;
                return '';
            });
            return normalizeCardId(raw || '');
        } catch (e) {
            return '';
        }
    };

    const extractPhoneFromPanel = async () => {
        const selectors = [
            'button[data-item-id^="phone"]',
            'button[data-item-id="phone"]',
            'button[aria-label^="Phone"]',
            'a[href^="tel:"]',
            'div[data-item-id^="phone"]'
        ];

        for (const sel of selectors) {
            const el = await page.$(sel);
            if (!el) continue;
            const val = await el.evaluate((node) => {
                if (node.tagName === 'A' && node.href) return node.href.replace('tel:', '');
                return node.getAttribute('aria-label') || node.innerText || '';
            }).catch(() => '');
            const cleaned = cleanPhone(val);
            if (cleaned) return val.trim();
        }

        // Fallback: text-only scan of the detail panel
        const panelText = await page.evaluate(() => {
            const panel = document.querySelector('div[role="main"]');
            return panel ? panel.innerText : '';
        });

        const lines = panelText.split('\n');
        const strictPhoneRegex = /(?:Phone:?\s*)?((\+?\d{1,3}|0)?\s?\d{3,5}[-.\s]?\d{3,5}[-.\s]?\d{0,5})/;

        for (const line of lines) {
            const cleanLine = line.trim();
            if (cleanLine.length < 6) continue;
            if (cleanLine.includes('Review') || cleanLine.includes('Ocjena')) continue;

            const digitCount = cleanLine.replace(/\D/g, '').length;
            if (digitCount >= 10 && digitCount <= 13) {
                if (strictPhoneRegex.test(cleanLine)) {
                    if (cleanLine.includes('AM') || cleanLine.includes('PM') || cleanLine.includes(',') || cleanLine.includes('hours')) {
                        continue;
                    }
                    if (cleanLine.includes(':') && !cleanLine.toLowerCase().startsWith('phone')) {
                        continue;
                    }
                    if (!/^\(\d+\)$/.test(cleanLine)) {
                        const match = cleanLine.match(strictPhoneRegex);
                        if (match && match[1]) return match[1].trim();
                    }
                }
            }
        }

        return '';
    };

    const getDetailName = async () => {
        const selectors = [
            'h1.DUwDvf',
            'h1[class*="DUwDvf"]',
            'div[role="main"] h1'
        ];

        for (const sel of selectors) {
            const val = await page.$eval(sel, el => el.textContent || el.innerText || '').catch(() => '');
            const cleaned = val.trim();
            if (cleaned) return cleaned;
        }
        return '';
    };

    const waitForDetailMatch = async (expectedName, timeoutMs = 4000) => {
        const start = Date.now();
        const expected = normalizeKey(expectedName);
        while (Date.now() - start < timeoutMs) {
            const detailName = await getDetailName();
            if (detailName) {
                const candidate = normalizeKey(detailName);
                if (candidate === expected || candidate.includes(expected) || expected.includes(candidate)) {
                    return true;
                }
            }
            await page.waitForTimeout(300);
        }
        return false;
    };

    try {
        report({ stage: 'init', message: `Starting search for ${keyword} in ${location}`, percent: 5 });
        console.log(`🔍 Starting search for: ${keyword} in ${location}`);
        report({ stage: 'browser', message: 'Browser launched', percent: 15 });
        await page.goto(`https://www.google.com/maps/search/${keyword} in ${location}`);

        // Wait for connection/loading
        await page.waitForTimeout(3000);
        report({ stage: 'navigate', message: 'Opened Google Maps', percent: 30 });

        // Infinite Scroll Loop
        let previousCount = 0;
        let sameCountAttempts = 0;

        while (true) {
            const feed = await page.$('div[role="feed"]');
            if (feed) {
                await feed.evaluate(node => node.scrollTo(0, node.scrollHeight));
            } else {
                await page.mouse.wheel(0, SCROLL.Step);
            }

            await page.waitForTimeout(SCROLL.Delay);

            const currentCards = await page.$$(SELECTORS.RESULT_CARD);
            const count = currentCards.length;

            console.log(`📍 Found ${count} businesses so far...`);
            report({ stage: 'scroll', message: `Found ${count} businesses so far...`, count, percent: 50 });

            if (count === previousCount) {
                sameCountAttempts++;
                if (sameCountAttempts > SCROLL.MaxIdleAttempts) {
                    console.log('✅ Reached end of list.');
                    break;
                }
            } else {
                sameCountAttempts = 0;
                previousCount = count;
            }
        }

        // Extraction
        console.log('🛠 Starting extraction...');
        report({ stage: 'extract', message: 'Starting detailed extraction...', percent: 70 });

        const cards = await page.$$(SELECTORS.RESULT_CARD);
        const phoneCounts = new Map();
        totalCards = cards.length;
        console.log(`Found ${cards.length} cards to process.`);
        report({ stage: 'extract', message: `Processing ${cards.length} businesses...`, total: cards.length, percent: 75 });

        for (let i = 0; i < cards.length; i++) {
            try {
                const card = (await page.$$(SELECTORS.RESULT_CARD))[i];
                if (!card) continue;

                const cardId = await extractCardId(card);
                if (cardId && (skipSet.has(cardId) || seenIds.has(cardId))) {
                    skippedCount++;
                    continue;
                }

                if (cardId) {
                    seenIds.add(cardId);
                }

                await card.scrollIntoViewIfNeeded();

                const name = await card.$eval(SELECTORS.NAME, el => el.innerText).catch(() => null);
                if (!name) continue;

                const rating = await card.$eval(SELECTORS.RATING, el => el.innerText).catch(() => null);
                const reviews = await card.$eval(SELECTORS.REVIEWS, el => el.innerText.replace(/[()]/g, '')).catch(() => '0');

                processedCount++;

                await card.click();

                // Ensure detail panel has switched to this card
                const matched = await waitForDetailMatch(name, 3500);
                if (!matched) {
                    await card.click();
                    await waitForDetailMatch(name, 3500);
                }

                try {
                    await page.waitForSelector(SELECTORS.DETAIL.ADDRESS, { timeout: 2500 });
                } catch (timeout) {
                    // Proceed even if missing
                }

                let address = await page.$eval(SELECTORS.DETAIL.ADDRESS, el => el.getAttribute('aria-label') || el.innerText)
                    .then(txt => txt.replace('Address: ', ''))
                    .catch(() => null);

                let phone = await extractPhoneFromPanel();

                if (!phone) {
                    await page.waitForTimeout(800);
                    phone = await extractPhoneFromPanel();
                }

                let website = await page.$eval(SELECTORS.DETAIL.WEBSITE, el => el.href).catch(() => null);

                if (!address) {
                    const text = await card.innerText();
                    const lines = text.split('\n');
                    if (lines.length > 2) address = lines[2];
                }

                const key = [
                    normalizeKey(name),
                    normalizeKey(address),
                    normalizePhone(phone)
                ].join('|');

                if (seenKey.has(key)) {
                    console.log(`   -> Skipped duplicate: ${name} | ${phone || 'No Phone'}`);
                    continue;
                }

                seenKey.add(key);

                const phoneDigits = normalizePhone(phone);
                if (phoneDigits) {
                    const currentCount = (phoneCounts.get(phoneDigits) || 0) + 1;
                    phoneCounts.set(phoneDigits, currentCount);
                    if (currentCount >= 5) {
                        phone = '';
                    }
                }

                console.log(`   -> Extracted: ${name} | ${phone || 'No Phone'}`);
                report({ stage: 'extract', message: `Extracted ${name}`, current: i + 1, total: cards.length });

                leads.push({
                    id: cardId || '',
                    name,
                    rating,
                    reviews,
                    phone: phone || '',
                    address: address || '',
                    website: website || '',
                    keyword,
                    location
                });

            } catch (e) {
                console.log(`Error processing card ${i}:`, e.message);
            }
        }

    } catch (error) {
        console.error('Scraping failed:', error);
    } finally {
        report({ stage: 'final', message: `Completed. ${leads.length} leads collected.`, total: leads.length, percent: 100 });
        await browser.close();
    }

    const remaining = Math.max(0, totalCards - (processedCount + skippedCount));

    return {
        leads,
        meta: {
            totalCards,
            processedCount,
            skippedCount,
            remaining
        }
    };
}

module.exports = scrapeAll;
