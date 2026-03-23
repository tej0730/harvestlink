const cron = require('node-cron');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Runs every 5 minutes
cron.schedule('*/5 * * * *', async () => {
  try {
    // Find all expired active reservations
    const expired = await prisma.reservation.findMany({
      where: {
        status:    'active',
        expiresAt: { lt: new Date() }
      }
    });

    for (const reservation of expired) {
      // Release stock
      await prisma.listing.update({
        where: { id: reservation.listingId },
        data: {
          quantityReserved: { decrement: reservation.quantityReserved }
        }
      });

      // Mark reservation released
      await prisma.reservation.update({
        where: { id: reservation.id },
        data:  { status: 'released' }
      });

      // Cancel the pending order
      await prisma.order.update({
        where: { id: reservation.orderId },
        data:  { status: 'cancelled', cancellationReason: 'Grower did not respond in time' }
      });

      console.log(`Released reservation ${reservation.id}`);
    }
  } catch (err) {
    console.error('Reservation cleanup error:', err);
  }
});

console.log('✅ Reservation cleanup cron started');
