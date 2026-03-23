const express = require('express');
const router  = express.Router();
const { authenticate } = require('../middleware/auth.middleware');
const { requireRole }  = require('../middleware/role.middleware');
const {
  createRequest, getNearbyRequests,
  getMyRequests, deleteRequest
} = require('../controllers/requests.controller');

router.get('/',      getNearbyRequests);
router.get('/mine',  authenticate, requireRole('buyer'), getMyRequests);
router.post('/',     authenticate, requireRole('buyer'), createRequest);
router.delete('/:id', authenticate, requireRole('buyer'), deleteRequest);

module.exports = router;
