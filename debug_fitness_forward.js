const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
    console.log('🔍 Starting Debug Scraper for "Fitness Forward"...');
    const browser = await chromium.launch({
        headless: true, // Must be true in this env
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-blink-features=AutomationControlled',
            '--window-size=1920,1080',
            '--start-maximized'
        ]
    });
    const context = await browser.newContext({
        viewport: null, // Let window size control it
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
    });
    const page = await context.newPage();

    try {
        const keyword = "Fitness Forward";
        const location = "Kanpur";
        console.log(`Searching for: ${keyword} in ${location}`);

        await page.goto(`https://www.google.com/maps/search/${keyword} in ${location}`);
        await page.waitForTimeout(5000); // Generous wait

        // Click the first card
        console.log('Clicking the first result card...');
        const card = await page.$('.Nv2PK');
        if (card) {
            await card.click();
            await page.waitForTimeout(5000); // Wait for panel

            console.log('📸 Taking screenshot...');
            await page.screenshot({ path: 'debug_fitness.png' });

            console.log('📝 Dumping text content...');
            // Dump multiple sources to be sure
            const bodyText = await page.evaluate(() => document.body.innerText);
            const mainText = await page.evaluate(() => {
                const main = document.querySelector('div[role="main"]');
                return main ? main.innerText : "MAIN_NOT_FOUND";
            });
            const buttonsText = await page.$$eval('button, a', els => els.map(e => ({
                text: e.innerText,
                aria: e.getAttribute('aria-label')
            })));

            const dump = `
=== BODY TEXT ===
${bodyText}

=== MAIN PANEL TEXT ===
${mainText}

=== BUTTONS ===
${JSON.stringify(buttonsText, null, 2)}
            `;

            fs.writeFileSync('debug_fitness_dump.txt', dump);
            console.log('✅ Saved to debug_fitness_dump.txt');

        } else {
            console.log('❌ No cards found!');
        }

    } catch (e) {
        console.error('Error:', e);
    } finally {
        await browser.close();
    }
})();
