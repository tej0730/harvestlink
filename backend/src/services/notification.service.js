const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createNotification({ userId, type, message, referenceId }) {
  try {
    const notification = await prisma.notification.create({
      data: { userId, type, message, referenceId }
    });

    // Emit real-time notification via Socket.IO if user is online
    const io = global.io;
    if (io) {
      io.to(`user:${userId}`).emit('notification:new', notification);
    }

    return notification;
  } catch (err) {
    console.error('Notification error:', err);
  }
}

module.exports = { createNotification };
