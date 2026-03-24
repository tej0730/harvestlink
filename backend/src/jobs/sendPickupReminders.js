const cron   = require('node-cron');
const { PrismaClient } = require('@prisma/client');
const { sendEmail } = require('../utils/email.util');
const prisma = new PrismaClient();

// Runs every hour
cron.schedule('0 * * * *', async () => {
  try {
    const now       = new Date();
    const in24h     = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const in1h      = new Date(now.getTime() +      60 * 60 * 1000);
    const window    = new Date(now.getTime() +  5 * 60 * 1000); // 5 min buffer

    // Find orders with upcoming pickups (status = ready)
    const readyOrders = await prisma.order.findMany({
      where: {
        status:      'ready',
        pickupSlotId: { not: null }
      },
      include: {
        buyer:   { select: { name: true, email: true } },
        listing: { select: { title: true } }
      }
    });

    for (const order of readyOrders) {
      await sendEmail({
        to:      order.buyer.email,
        subject: '⏰ Pickup reminder — HarvestLink',
        html: `
          <div style="font-family:sans-serif;">
            <h2 style="color:#16a34a;">🌿 HarvestLink</h2>
            <p>Hi ${order.buyer.name},</p>
            <p>Don't forget to pick up your <strong>${order.listing.title}</strong>!</p>
            <p>Open the app to confirm pickup once you've collected it.</p>
          </div>
        `
      });
    }
  } catch (err) {
    console.error('Pickup reminder error:', err);
  }
});

console.log('✅ Pickup reminder cron started');
