const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { createNotification } = require('../services/notification.service');
const { sendEmail, orderConfirmedEmail,
        orderReadyEmail, newOrderEmail } = require('../utils/email.util');

// ── PLACE ORDER ───────────────────────────────────────────────────────────────
async function placeOrder(req, res) {
  try {
    const { listingId, quantity, paymentMethod, pickupSlotId } = req.body;

    const listing = await prisma.listing.findUnique({
      where:   { id: listingId },
      include: {
        farm: true,
        category: true
      }
    });

    if (!listing)                    return res.status(404).json({ message: 'Listing not found' });
    if (listing.status !== 'active') return res.status(400).json({ message: 'Listing is not available' });
    if (listing.growerId === req.user.id) return res.status(400).json({ message: 'Cannot order your own listing' });

    const qty = parseInt(quantity);
    const available = listing.quantityAvailable - listing.quantityReserved;

    if (available < qty) {
      return res.status(400).json({
        message: `Only ${available} available`,
        available
      });
    }

    // Create order + reservation in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Lock stock
      await tx.listing.update({
        where: { id: listingId },
        data:  { quantityReserved: { increment: qty } }
      });

      // Create order
      const order = await tx.order.create({
        data: {
          buyerId:       req.user.id,
          growerId:      listing.growerId,
          listingId,
          quantity:      qty,
          unitPrice:     listing.pricePerUnit,
          totalAmount:   listing.pricePerUnit * qty,
          paymentMethod: paymentMethod || 'cod',
          pickupSlotId:  pickupSlotId || null,
        },
        include: {
          listing: { include: { category: true } },
          buyer:   { select: { name: true, email: true } },
          grower:  { select: { name: true, email: true } }
        }
      });

      // Create reservation (expires in 30 min)
      await tx.reservation.create({
        data: {
          listingId,
          orderId:          order.id,
          quantityReserved: qty,
          expiresAt:        new Date(Date.now() + 30 * 60 * 1000)
        }
      });

      // Create payment record
      await tx.payment.create({
        data: {
          orderId: order.id,
          amount:  listing.pricePerUnit * qty,
          method:  paymentMethod || 'cod',
          status:  'pending'
        }
      });

      // Audit log
      await tx.auditLog.create({
        data: {
          entityType:  'order',
          entityId:    order.id,
          action:      'status_changed',
          oldValue:    null,
          newValue:    JSON.stringify({ status: 'pending' }),
          performedBy: req.user.id
        }
      });

      return order;
    });

    // Notify grower (outside transaction)
    await createNotification({
      userId:      result.growerId,
      type:        'order_placed',
      message:     `New order from ${result.buyer.name} for ${result.listing.title}`,
      referenceId: result.id
    });

    // Send email to grower
    await sendEmail({
      to:      result.grower.email,
      subject: '🌿 New order on HarvestLink!',
      html:    newOrderEmail(
        result.grower.name,
        result.buyer.name,
        result.listing.title,
        qty
      )
    });

    return res.status(201).json(result);
  } catch (err) {
    console.error('placeOrder error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
}

// ── GET ORDERS ────────────────────────────────────────────────────────────────
async function getOrders(req, res) {
  try {
    const { role } = req.user;
    const where = role === 'buyer'
      ? { buyerId:  req.user.id }
      : role === 'grower'
      ? { growerId: req.user.id }
      : {};   // admin sees all

    const orders = await prisma.order.findMany({
      where,
      include: {
        listing: { include: { category: true } },
        buyer:   { select: { id: true, name: true, profilePhotoUrl: true } },
        grower:  { select: { id: true, name: true, profilePhotoUrl: true } },
        payment: true
      },
      orderBy: { createdAt: 'desc' }
    });

    return res.json(orders);
  } catch (err) {
    return res.status(500).json({ message: 'Server error' });
  }
}

// ── GET ORDER BY ID ───────────────────────────────────────────────────────────
async function getOrderById(req, res) {
  try {
    const order = await prisma.order.findUnique({
      where:   { id: req.params.id },
      include: {
        listing: { include: { category: true, farm: true } },
        buyer:   { select: { id: true, name: true, email: true, profilePhotoUrl: true, area: true } },
        grower:  { select: { id: true, name: true, email: true, profilePhotoUrl: true } },
        payment: true,
        reservation: true,
        reviews: true
      }
    });

    if (!order) return res.status(404).json({ message: 'Order not found' });

    // Only buyer, grower, or admin can see
    if (order.buyerId !== req.user.id &&
        order.growerId !== req.user.id &&
        req.user.role  !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    return res.json(order);
  } catch (err) {
    return res.status(500).json({ message: 'Server error' });
  }
}

// ── ACCEPT ORDER ──────────────────────────────────────────────────────────────
async function acceptOrder(req, res) {
  try {
    const order = await prisma.order.findUnique({
      where:   { id: req.params.id },
      include: {
        listing: true,
        buyer:   { select: { name: true, email: true } },
        grower:  { select: { name: true } },
        reservation: true
      }
    });

    if (!order)                        return res.status(404).json({ message: 'Order not found' });
    if (order.growerId !== req.user.id) return res.status(403).json({ message: 'Not your order' });
    if (order.status   !== 'pending')  return res.status(400).json({ message: \`Cannot accept — order is \${order.status}\` });

    await prisma.$transaction(async (tx) => {
      // Update order status
      await tx.order.update({
        where: { id: order.id },
        data:  { status: 'accepted' }
      });

      // Confirm reservation — permanently reduce stock
      await tx.listing.update({
        where: { id: order.listingId },
        data:  {
          quantityAvailable: { decrement: order.quantity },
          quantityReserved:  { decrement: order.quantity }
        }
      });

      // Mark reservation confirmed
      if (order.reservation) {
        await tx.reservation.update({
          where: { id: order.reservation.id },
          data:  { status: 'confirmed' }
        });
      }

      // Audit log
      await tx.auditLog.create({
        data: {
          entityType:  'order',
          entityId:    order.id,
          action:      'status_changed',
          oldValue:    JSON.stringify({ status: 'pending' }),
          newValue:    JSON.stringify({ status: 'accepted' }),
          performedBy: req.user.id
        }
      });
    });

    // Notify buyer
    await createNotification({
      userId:      order.buyerId,
      type:        'order_accepted',
      message:     \`Your order for \${order.listing.title} was accepted! Get ready for pickup.\`,
      referenceId: order.id
    });

    // Email buyer
    await sendEmail({
      to:      order.buyer.email,
      subject: '✅ Your HarvestLink order is confirmed!',
      html:    orderConfirmedEmail(order.buyer.name, order.listing.title, order.totalAmount)
    });

    return res.json({ message: 'Order accepted' });
  } catch (err) {
    console.error('acceptOrder error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
}

// ── DECLINE ORDER ─────────────────────────────────────────────────────────────
async function declineOrder(req, res) {
  try {
    const { reason } = req.body;
    const order = await prisma.order.findUnique({
      where:   { id: req.params.id },
      include: { reservation: true }
    });

    if (!order)                        return res.status(404).json({ message: 'Order not found' });
    if (order.growerId !== req.user.id) return res.status(403).json({ message: 'Not your order' });
    if (order.status   !== 'pending')  return res.status(400).json({ message: 'Cannot decline now' });

    await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: order.id },
        data:  { status: 'cancelled', cancellationReason: reason || 'Declined by grower' }
      });

      // Release reserved stock
      await tx.listing.update({
        where: { id: order.listingId },
        data:  { quantityReserved: { decrement: order.quantity } }
      });

      if (order.reservation) {
        await tx.reservation.update({
          where: { id: order.reservation.id },
          data:  { status: 'released' }
        });
      }

      await tx.auditLog.create({
        data: {
          entityType:  'order',
          entityId:    order.id,
          action:      'status_changed',
          oldValue:    JSON.stringify({ status: 'pending' }),
          newValue:    JSON.stringify({ status: 'cancelled', reason }),
          performedBy: req.user.id
        }
      });
    });

    await createNotification({
      userId:      order.buyerId,
      type:        'order_declined',
      message:     \`Unfortunately your order was declined. \${reason ? \`Reason: \${reason}\` : ''}\`,
      referenceId: order.id
    });

    return res.json({ message: 'Order declined' });
  } catch (err) {
    return res.status(500).json({ message: 'Server error' });
  }
}

// ── MARK READY ────────────────────────────────────────────────────────────────
async function markReady(req, res) {
  try {
    const order = await prisma.order.findUnique({
      where:   { id: req.params.id },
      include: {
        listing: true,
        buyer:   { select: { name: true, email: true } }
      }
    });

    if (!order)                        return res.status(404).json({ message: 'Order not found' });
    if (order.growerId !== req.user.id) return res.status(403).json({ message: 'Not your order' });
    if (order.status   !== 'accepted') return res.status(400).json({ message: 'Order must be accepted first' });

    await prisma.order.update({
      where: { id: order.id },
      data:  { status: 'ready' }
    });

    await prisma.auditLog.create({
      data: {
        entityType:  'order',
        entityId:    order.id,
        action:      'status_changed',
        oldValue:    JSON.stringify({ status: 'accepted' }),
        newValue:    JSON.stringify({ status: 'ready' }),
        performedBy: req.user.id
      }
    });

    await createNotification({
      userId:      order.buyerId,
      type:        'order_ready',
      message:     \`Your \${order.listing.title} is ready for pickup! 🎉\`,
      referenceId: order.id
    });

    await sendEmail({
      to:      order.buyer.email,
      subject: '🎉 Ready for pickup — HarvestLink',
      html:    orderReadyEmail(order.buyer.name, order.listing.title, null)
    });

    return res.json({ message: 'Order marked as ready' });
  } catch (err) {
    return res.status(500).json({ message: 'Server error' });
  }
}

// ── COMPLETE ORDER (buyer confirms pickup) ────────────────────────────────────
async function completeOrder(req, res) {
  try {
    const order = await prisma.order.findUnique({
      where: { id: req.params.id }
    });

    if (!order)                       return res.status(404).json({ message: 'Order not found' });
    if (order.buyerId !== req.user.id) return res.status(403).json({ message: 'Not your order' });
    if (order.status  !== 'ready')    return res.status(400).json({ message: 'Order is not ready yet' });

    await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: order.id },
        data:  { status: 'completed' }
      });

      // If COD — mark payment as paid
      if (order.paymentMethod === 'cod') {
        await tx.payment.update({
          where: { orderId: order.id },
          data:  { status: 'paid', confirmedBy: req.user.id }
        });
      }

      // Update reliability scores
      await tx.user.update({
        where: { id: order.buyerId },
        data:  { reliabilityScore: { increment: 0 } } // recalculate in service
      });

      await tx.auditLog.create({
        data: {
          entityType:  'order',
          entityId:    order.id,
          action:      'status_changed',
          oldValue:    JSON.stringify({ status: 'ready' }),
          newValue:    JSON.stringify({ status: 'completed' }),
          performedBy: req.user.id
        }
      });
    });

    await createNotification({
      userId:      order.growerId,
      type:        'order_completed',
      message:     'Order completed! Don\\'t forget to ask the buyer for a review.',
      referenceId: order.id
    });

    return res.json({ message: 'Order completed! You can now leave a review.' });
  } catch (err) {
    return res.status(500).json({ message: 'Server error' });
  }
}

// ── CANCEL ORDER ──────────────────────────────────────────────────────────────
async function cancelOrder(req, res) {
  try {
    const { reason } = req.body;
    const order = await prisma.order.findUnique({
      where:   { id: req.params.id },
      include: { reservation: true }
    });

    if (!order) return res.status(404).json({ message: 'Order not found' });

    const isParticipant = order.buyerId  === req.user.id ||
                          order.growerId === req.user.id;
    if (!isParticipant) return res.status(403).json({ message: 'Access denied' });

    // Can only cancel before READY
    const cancellable = ['pending', 'accepted'];
    if (!cancellable.includes(order.status)) {
      return res.status(400).json({ message: 'Cannot cancel — order is already ready or beyond' });
    }

    await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: order.id },
        data:  { status: 'cancelled', cancellationReason: reason || 'Cancelled by user' }
      });

      // Release stock if reservation still active
      if (order.reservation?.status !== 'released') {
        await tx.listing.update({
          where: { id: order.listingId },
          data:  {
            quantityAvailable: order.status === 'accepted'
              ? { increment: order.quantity }
              : undefined,
            quantityReserved: { decrement: order.quantity }
          }
        });

        if (order.reservation) {
          await tx.reservation.update({
            where: { id: order.reservation.id },
            data:  { status: 'released' }
          });
        }
      }

      await tx.auditLog.create({
        data: {
          entityType:  'order',
          entityId:    order.id,
          action:      'status_changed',
          oldValue:    JSON.stringify({ status: order.status }),
          newValue:    JSON.stringify({ status: 'cancelled', reason }),
          performedBy: req.user.id
        }
      });
    });

    // Notify the other party
    const notifyId = req.user.id === order.buyerId ? order.growerId : order.buyerId;
    await createNotification({
      userId:      notifyId,
      type:        'order_cancelled',
      message:     \`An order was cancelled. \${reason ? \`Reason: \${reason}\` : ''}\`,
      referenceId: order.id
    });

    return res.json({ message: 'Order cancelled' });
  } catch (err) {
    console.error('cancelOrder error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
}

// ── DISPUTE ORDER ─────────────────────────────────────────────────────────────
async function disputeOrder(req, res) {
  try {
    const { reason } = req.body;
    const order = await prisma.order.findUnique({ where: { id: req.params.id } });

    if (!order) return res.status(404).json({ message: 'Order not found' });

    const isParticipant = order.buyerId  === req.user.id ||
                          order.growerId === req.user.id;
    if (!isParticipant) return res.status(403).json({ message: 'Access denied' });

    if (!['accepted', 'ready', 'picked_up'].includes(order.status)) {
      return res.status(400).json({ message: 'Cannot dispute at this stage' });
    }

    await prisma.order.update({
      where: { id: order.id },
      data:  { status: 'disputed', disputeReason: reason }
    });

    // Notify admin (find admin user)
    const admin = await prisma.user.findFirst({ where: { role: 'admin' } });
    if (admin) {
      await createNotification({
        userId:      admin.id,
        type:        'dispute_raised',
        message:     \`A dispute was raised on order \${order.id}. Reason: \${reason}\`,
        referenceId: order.id
      });
    }

    await prisma.auditLog.create({
      data: {
        entityType:  'order',
        entityId:    order.id,
        action:      'status_changed',
        oldValue:    JSON.stringify({ status: order.status }),
        newValue:    JSON.stringify({ status: 'disputed', reason }),
        performedBy: req.user.id
      }
    });

    return res.json({ message: 'Dispute raised. Admin will review shortly.' });
  } catch (err) {
    return res.status(500).json({ message: 'Server error' });
  }
}

// ── CONFIRM PAYMENT (grower confirms COD received) ────────────────────────────
async function confirmPayment(req, res) {
  try {
    const order = await prisma.order.findUnique({ where: { id: req.params.id } });

    if (!order)                        return res.status(404).json({ message: 'Order not found' });
    if (order.growerId !== req.user.id) return res.status(403).json({ message: 'Not your order' });

    await prisma.payment.update({
      where: { orderId: order.id },
      data:  { status: 'paid', confirmedBy: req.user.id }
    });

    return res.json({ message: 'Payment confirmed' });
  } catch (err) {
    return res.status(500).json({ message: 'Server error' });
  }
}

module.exports = {
  placeOrder, getOrders, getOrderById,
  acceptOrder, declineOrder, markReady,
  completeOrder, cancelOrder, disputeOrder,
  confirmPayment
};
