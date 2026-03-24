const express = require('express');
const router  = express.Router();
const { authenticate } = require('../middleware/auth.middleware');
const {
  getNotifications, markAllRead, markOneRead
} = require('../controllers/notifications.controller');

router.get('/',           authenticate, getNotifications);
router.patch('/read-all', authenticate, markAllRead);
router.patch('/:id/read', authenticate, markOneRead);

module.exports = router;
