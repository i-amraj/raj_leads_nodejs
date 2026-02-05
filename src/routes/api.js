const express = require('express');
const router = express.Router();
const searchController = require('../controllers/searchController');
const geoController = require('../controllers/geoController');

router.post('/search', searchController.search);
router.get('/search/stream', searchController.searchStream);

// Geo Routes
router.get('/countries', geoController.getCountries); // Returns IN, NP
router.get('/countries/:countryCode/states', geoController.getStates);
router.get('/countries/:countryCode/states/:stateCode/cities', geoController.getCities);
router.get('/countries/:countryCode/states/:stateCode/cities/:city/areas', geoController.getAreas);

module.exports = router;
