const express  = require('express');
const router   = express.Router();
const { authenticate } = require('../middleware/auth.middleware');
const { requireRole }  = require('../middleware/role.middleware');
const { upload }       = require('../utils/cloudinary');
const {
  getListings, getListingById, getMyListings,
  createListing, updateListing, deactivateListing,
  getCategories, getNearbyListings, getHeatmapData
} = require('../controllers/listings.controller');

// Public
router.get('/',            getListings);
router.get('/categories',  getCategories);
router.get('/nearby',      getNearbyListings);
router.get('/heatmap',     getHeatmapData);
router.get('/mine',        authenticate, requireRole('grower'), getMyListings);
router.get('/:id',         getListingById);

// Grower only
router.post('/',
  authenticate,
  requireRole('grower'),
  upload.array('photos', 5),   // up to 5 photos
  createListing
);

router.put('/:id',
  authenticate,
  requireRole('grower'),
  updateListing
);

router.delete('/:id',
  authenticate,
  requireRole('grower'),
  deactivateListing
);

module.exports = router;
