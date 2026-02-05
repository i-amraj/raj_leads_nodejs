const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
    console.log('🔍 Starting Debug Scraper...');
    const browser = await chromium.launch({
        headless: true,
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
    const page = await context.newPage();

    try {
        const keyword = "Gym";
        const location = "Kanpur";
        console.log(`Searching for: ${keyword} in ${location}`);

        await page.goto(`https://www.google.com/maps/search/${keyword} in ${location}`);
        await page.waitForTimeout(3000);

        // Click the first card
        console.log('Clicking the first result card...');
        const card = await page.$('.Nv2PK');
        if (card) {
            await card.click();
            await page.waitForTimeout(3000); // Wait for panel

            console.log('📸 Dumping page HTML...');
            const content = await page.content();
            fs.writeFileSync('debug_page.html', content);
            console.log('✅ Saved to debug_page.html');

            // Quick probe for phone buttons
            const buttons = await page.$$eval('button', btns => btns.map(b => ({
                text: b.innerText,
                ariaLabel: b.getAttribute('aria-label'),
                dataItemId: b.getAttribute('data-item-id')
            })));

            console.log('🔎 Start Button Scan:');
            const potentialPhones = buttons.filter(b =>
                (b.ariaLabel && b.ariaLabel.toLowerCase().includes('phone')) ||
                (b.dataItemId && b.dataItemId.includes('phone')) ||
                (b.text && /[\d\-\(\)\+]{7,}/.test(b.text))
            );
            console.log(JSON.stringify(potentialPhones, null, 2));
            console.log('🔎 End Button Scan');

        } else {
            console.log('❌ No cards found!');
        }

    } catch (e) {
        console.error('Error:', e);
    } finally {
        await browser.close();
    }
})();
