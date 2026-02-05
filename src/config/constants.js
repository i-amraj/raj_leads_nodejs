module.exports = {
    SELECTORS: {
        RESULT_CARD: '.Nv2PK', // Main container for each result
        NAME: '.qBF1Pd', // Business name
        RATING: '.MW4etd', // Rating (e.g. "4.5")
        REVIEWS: '.UY7F9', // Number of reviews
        ADDRESS: '.W4Evvd > span:nth-child(2)', // Fallback for list view
        WEBSITE: 'a.lcr4fd',
        // Detail View Selectors
        DETAIL: {
            ADDRESS: 'button[data-item-id="address"]',
            PHONE: 'button[data-item-id^="phone"]',
            WEBSITE: 'a[data-item-id="authority"]',
            PLUS_CODE: 'button[data-item-id="oloc"]'
        }
    },
    SCROLL: {
        Step: 5000,
        Delay: 2000,
        MaxIdleAttempts: 5
    }
};
