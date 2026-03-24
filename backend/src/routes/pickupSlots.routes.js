const express = require('express');
const router  = express.Router();
const { authenticate } = require('../middleware/auth.middleware');
const { requireRole }  = require('../middleware/role.middleware');
const {
  getMySlots, getGrowerSlots,
  createSlot, toggleSlot, deleteSlot
} = require('../controllers/pickupSlots.controller');

router.get('/mine',           authenticate, requireRole('grower'), getMySlots);
router.get('/grower/:growerId',                                     getGrowerSlots);
router.post('/',              authenticate, requireRole('grower'), createSlot);
router.patch('/:id/toggle',   authenticate, requireRole('grower'), toggleSlot);
router.delete('/:id',         authenticate, requireRole('grower'), deleteSlot);

module.exports = router;
