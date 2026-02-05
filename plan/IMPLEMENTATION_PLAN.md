# Phone Extraction Improvement Plan

## Problem Summary
Many listings return `No Phone` and several different businesses show the same phone number. This indicates:
- Phone selector is often missing or not loaded when we read it.
- Fallback parsing is too weak or is capturing a single repeated number from a banner/ads.
- The detail panel sometimes hasn’t fully loaded before extraction.

## Goals
1. Increase phone capture rate.
2. Reduce false positives (same phone number for many businesses).
3. Make extraction resilient to Google Maps UI changes.
4. Track unique cards to avoid reprocessing and allow fetch-more for remaining cards.

## Diagnosis (Current Behavior)
- Uses `button[data-item-id^="phone"]` then fallback on `panel.innerText` with regex.
- The text fallback likely picks numbers from a global banner or shared section.
- The detail panel may not be fully loaded for every card.

## Implementation Plan

### Phase 1 — Stronger Phone Selectors
1. **Add multiple selectors** for phone:
   - `button[data-item-id^="phone"]`
   - `button[data-item-id="phone"]`
   - `button[aria-label^="Phone:"]`
   - `div[data-item-id^="phone"]`
   - Links with `href^="tel:"`
2. **Normalize and validate** numbers:
   - Strip non-digits, allow 10–13 digits.
   - Reject if same number repeats too often in a session.

### Phase 2 — Panel Load & Retry
1. Wait for panel elements more reliably:
   - Wait for the name in the detail panel to match the card name.
2. Add 1–2 retries if phone missing:
   - Re-click card.
   - Wait an extra 1–2 seconds.

### Phase 3 — Safer Fallback Parsing
1. Limit fallback text parsing to the **detail panel only**, not the full document.
2. Extract phone from lines that include "Phone" or match a local pattern.
3. Exclude numbers that appear in:
   - review counts
   - hours
   - coordinates

### Phase 4 — Logging & Metrics
1. Log how phone was extracted:
   - `selector`, `tel-link`, `regex-fallback`, `failed`.
2. Track duplicate phone rate:
   - if same phone appears in >5 listings, mark as suspicious.

### Phase 5 — Unique Card ID & Incremental Fetch
1. **Extract a unique card id**:
   - Prefer Maps place URL or data attributes like `data-result-id`, `data-entity-id`, or `href` from the name link.
   - If URL is found, normalize to a stable ID string.
2. **Track processed IDs** in memory during a run:
   - Skip cards already processed to avoid re-checking.
3. **Track total vs processed**:
   - Maintain `processedCount` and `totalCards` from the list.
4. **Expose “fetch more” capability**:
   - If processed < total, show “Get More” button.
   - Clicking triggers another extraction pass only for remaining IDs.
5. **UI Feedback**:
   - Display remaining count in tracking panel.

### Phase 6 — Optional: Separate Contact Page Fetch
If still low capture, consider:
- Open website if present and scan for phone on homepage.
- Only if website exists to avoid extra costs.

## Expected Result
- Phone capture rate improves substantially.
- Repeated phone values reduced.
- More accurate results for your lead list.

## Files to Change
- `src/scraper/engine.js`
- `src/controllers/searchController.js`
- `public/js/app.js`
- `public/index.html`

## Next Step
If you want, I can start implementing Phase 1 + Phase 2 + Phase 5 immediately.
