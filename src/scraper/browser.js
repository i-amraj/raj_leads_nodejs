const { chromium } = require('playwright');

async function startBrowser() {
    const browser = await chromium.launch({
        headless: true, // Useful for debugging, set to true in production
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-blink-features=AutomationControlled'
        ]
    });

    const context = await browser.newContext({
        viewport: { width: 1280, height: 800 },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });

    return { browser, context };
}

module.exports = { startBrowser };
