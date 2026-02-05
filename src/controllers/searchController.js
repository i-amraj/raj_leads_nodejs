const scrapeAll = require('../scraper/engine');

function buildLocation({ country, state, city, area }) {
    const locationParts = [];
    if (area) locationParts.push(area);
    if (city) locationParts.push(city);
    if (state) locationParts.push(state);
    if (country) locationParts.push(country);
    return locationParts.join(', ');
}

exports.search = async (req, res) => {
    try {
        const { category, country, state, city, area, processedIds } = req.body;
        const locationString = buildLocation({ country, state, city, area });
        const keyword = category;

        if (!keyword || !locationString) {
            return res.status(400).json({ error: 'Category and Location are required' });
        }

        console.log(`Received search request: ${keyword} in ${locationString}`);

        const result = await scrapeAll(keyword, locationString, {
            skipIds: Array.isArray(processedIds) ? processedIds : []
        });

        res.json({
            success: true,
            count: result.leads.length,
            data: result.leads,
            meta: result.meta
        });
    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

exports.searchStream = async (req, res) => {
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive'
    });

    const send = (event, data) => {
        res.write(`event: ${event}\n`);
        res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    try {
        const { category, country, state, city, area, processedIds } = req.query;
        const locationString = buildLocation({ country, state, city, area });
        const keyword = category;

        if (!keyword || !locationString) {
            send('error', { error: 'Category and Location are required' });
            res.end();
            return;
        }

        console.log(`Received streaming search: ${keyword} in ${locationString}`);

        let skipIds = [];
        if (processedIds) {
            try {
                const parsed = JSON.parse(processedIds);
                if (Array.isArray(parsed)) skipIds = parsed;
            } catch (e) {
                // ignore
            }
        }

        const result = await scrapeAll(keyword, locationString, {
            onProgress: (payload) => send('progress', payload),
            skipIds
        });

        send('done', {
            success: true,
            count: result.leads.length,
            data: result.leads,
            meta: result.meta
        });
    } catch (error) {
        console.error('Streaming search error:', error);
        send('error', { error: 'Internal Server Error' });
    } finally {
        res.end();
    }
};
