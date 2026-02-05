# 🚀 Raj Leader Generator: Pure Node.js Implementation Plan

This is the master plan for building the **Raj Leader Generator** as a brand new, high-performance project using **100% Node.js**.

**Goal:** Eliminate PHP/Python dependencies. Build a single, fast, and reliable application that extracts **ALL** available business leads (unlimited scrolling) using a unified JavaScript stack.

---

## 1. 🏗️ Information Architecture

We are moving to a **Monolithic Node.js Architecture**. One server handles everything: serving the website, running the API, and managing the scraper.

| Layer | Technology | Role |
|-------|------------|------|
| **Frontend** | HTML5, CSS3, Vanilla JS | Served directly by Express. No CORS issues. |
| **Backend API** | Node.js + Express | Handles requests, validation, and database operations. |
| **Scraper** | Playwright (Node.js) | Native browser automation. No external Python scripts. |
| **Database** | MySQL (via `mysql2`) | High-speed data storage with connection pooling. |

---

## 2. 📂 New Project Structure

This structure ensures code is modular, readable, and scalable.

```
raj_lead_gen_node/
├── src/
│   ├── config/
│   │   ├── db.js             # MySQL Connection Pool
│   │   └── constants.js      # Selectors & Config
│   ├── controllers/
│   │   ├── searchController.js  # orchestrates scraping -> db -> response
│   │   └── historyController.js # manages user history
│   ├── scraper/
│   │   ├── browser.js        # Browser management (Stealth, Contexts)
│   │   └── engine.js         # The Core Scraper (Infinite Scroll Logic)
│   ├── routes/
│   │   └── api.js            # API Endpoints
│   └── server.js             # Entry Point (Express App)
├── public/                   # Frontend Assets (Served Static)
│   ├── index.html
│   ├── css/
│   └── js/
├── .env                      # Database Credentials
├── package.json              # Dependencies
└── schema.sql                # Database Design
```

---

## 3. �️ The "Get ALL Data" Logic (Infinite Scraper)

The scraping logic will be rewritten to ensure we capture **every single result** available on Google Maps, not just the first 20.

**Core Algorithm in `src/scraper/engine.js`:**

```javascript
async function scrapeAll(keyword, location) {
    // 1. Setup
    const page = await browser.newPage();
    await page.goto(`https://www.google.com/maps/search/${keyword} in ${location}`);
    
    // 2. The "Infinite Scroll" Loop
    let previousCount = 0;
    let sameCountAttempts = 0;
    
    while (true) {
        // Scroll to the bottom of the feed
        await page.mouse.wheel(0, 5000);
        await page.waitForTimeout(2000); // Wait for lazy load
        
        // Count current cards
        const currentCards = await page.$$('.Nv2PK');
        const count = currentCards.length;
        
        if (count === previousCount) {
            sameCountAttempts++;
            // If count hasn't changed after 5 aggressive scrolls, we reached the end
            if (sameCountAttempts > 5) break; 
        } else {
            sameCountAttempts = 0; // Reset if we found new items
            previousCount = count;
            console.log(`📍 Found ${count} businesses so far...`);
        }
    }
    
    // 3. Extraction (Bulk)
    // Now that everything is loaded, we extract all data in one go
    // ... extraction logic ...
}
```

---

## 4. �️ Implementation Steps

### Step 1: Initialization
```bash
mkdir raj_lead_gen_node
cd raj_lead_gen_node
npm init -y
npm install express mysql2 playwright dotenv cors
```

### Step 2: Database Setup (`src/config/db.js`)
Use a connection pool for maximum performance. This allows concurrent scraping jobs without crashing the database.

### Step 3: Server Setup (`src/server.js`)
Create an Express server that serves the `public` folder and listens for API requests.

### Step 4: The Scraper Engine (`src/scraper/engine.js`)
This is the most critical part. We will implement:
-   **Stealth Mode:** To avoid Google blocking us.
-   **Auto-Scroll:** rigorous logic to ensure we hit the "End of List".
-   **Data Parser:** Extract Name, Rating, Address, Phone, Website.
-   **Address Filtering:** (The logic we just fixed) Ensure results match the requested City.

### Step 5: Integration
Connect the frontend `fetch()` requests directly to the Node.js API endpoints.

---

## 5. ✅ Advantages of this New Approach
1.  **Unbeatable Speed:** Node.js is non-blocking. It can scrape, save to DB, and serve the frontend simultaneously.
2.  **"All Data" Guarantee:** The new loop logic explicitly waits until Google stops sending results, ensuring maximum lead generation.
3.  **Simplicity:** No more `exec()` commands calling Python. No more PHP headers. Just pure JavaScript objects passing data.
4.  **Real-time Stability:** Since the server stays alive (unlike PHP scripts that die after execution), we can keep the browser open for faster repeated searches.
