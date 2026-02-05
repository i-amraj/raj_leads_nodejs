# Project Explanation

## Overview
This project is a **Google Maps lead scraper** built with **Node.js + Express + Playwright** and a modern UI. It lets you choose Category → Country → State → City → Area, run a live‑tracked scrape, and export results in a CRM‑ready CSV format.

## How It Works (Flow)
1. **User selects filters** in the UI (Category, Location, optional Area).
2. **Frontend calls API** and starts **live tracking** via SSE.
3. **Playwright opens Google Maps**, scrolls through results, opens each card, and extracts details.
4. **Duplicates are skipped** and results are shown in a table.
5. **CSV export** uses the provided template format.

## Project Tree
```
raj_leads_nodejs/
├── csvtemplate/
│   └── sample_leads_import.csv
├── location/
│   ├── india-locations.json
│   ├── nepal-locations.json
│   ├── location-data.json
│   └── locations.json
├── plan/
│   └── IMPLEMENTATION_PLAN.md
├── public/
│   ├── css/
│   │   └── style.css
│   ├── js/
│   │   └── app.js
│   └── index.html
├── requirement/
│   ├── COMMANDS.md
│   ├── PROJECT_EXPLANATION.md
│   ├── REQUIRED_FILES.md
│   └── VERSIONS.md
├── scripts/
│   └── geonames_build.js
├── src/
│   ├── config/
│   │   ├── constants.js
│   │   └── db.js
│   ├── controllers/
│   │   ├── geoController.js
│   │   └── searchController.js
│   ├── routes/
│   │   └── api.js
│   ├── scraper/
│   │   ├── browser.js
│   │   └── engine.js
│   └── server.js
├── schema.sql
├── setup_db.js
├── package.json
└── package-lock.json
```

## Key Modules

### 1) Backend (Express)
- `src/server.js` starts the server and serves the UI.
- `src/routes/api.js` defines API routes.
- `src/controllers/searchController.js` handles scraping + SSE streaming.
- `src/controllers/geoController.js` serves countries, states, cities, and areas.

### 2) Scraper (Playwright)
- `src/scraper/engine.js`
  - Opens Google Maps
  - Scrolls the list
  - Clicks cards to get details
  - Extracts name, phone, address, website
  - Skips duplicates

### 3) Frontend (UI)
- `public/index.html` contains the UI layout.
- `public/js/app.js` handles dropdowns, tracking, and CSV export.
- `public/css/style.css` defines the modern UI style.

### 4) Data Sources
- `location/india-locations.json` and `location/nepal-locations.json`
  - Used to populate **cities** and **areas**.
- `scripts/geonames_build.js`
  - Optional: builds `src/data/areas.json` from GeoNames.

## Notes
- **Live Tracking** uses SSE (`/api/search/stream`).
- **CSV Export** follows the template in `csvtemplate/sample_leads_import.csv`.
- **Areas** are loaded from location data (India/Nepal). If you want other countries, add data in `location/`.

