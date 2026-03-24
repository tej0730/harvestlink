const express = require('express');
const router  = express.Router();
const { authenticate } = require('../middleware/auth.middleware');
const { requireRole }  = require('../middleware/role.middleware');
const {
  placeOrder, getOrders, getOrderById,
  acceptOrder, declineOrder, markReady,
  completeOrder, cancelOrder, disputeOrder,
  confirmPayment
} = require('../controllers/orders.controller');

router.post('/',              authenticate, requireRole('buyer'),  placeOrder);
router.get('/',               authenticate,                        getOrders);
router.get('/:id',            authenticate,                        getOrderById);
router.patch('/:id/accept',   authenticate, requireRole('grower'), acceptOrder);
router.patch('/:id/decline',  authenticate, requireRole('grower'), declineOrder);
router.patch('/:id/ready',    authenticate, requireRole('grower'), markReady);
router.patch('/:id/complete', authenticate, requireRole('buyer'),  completeOrder);
router.patch('/:id/cancel',   authenticate,                        cancelOrder);
router.patch('/:id/dispute',  authenticate,                        disputeOrder);
router.patch('/:id/payment',  authenticate, requireRole('grower'), confirmPayment);

module.exports = router;
