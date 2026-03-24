const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function getNotifications(req, res) {
  try {
    const notifications = await prisma.notification.findMany({
      where:   { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      take:    50
    });
    const unreadCount = await prisma.notification.count({
      where: { userId: req.user.id, isRead: false }
    });
    return res.json({ notifications, unreadCount });
  } catch (err) {
    return res.status(500).json({ message: 'Server error' });
  }
}

async function markAllRead(req, res) {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.user.id, isRead: false },
      data:  { isRead: true }
    });
    return res.json({ message: 'All marked as read' });
  } catch (err) {
    return res.status(500).json({ message: 'Server error' });
  }
}

async function markOneRead(req, res) {
  try {
    await prisma.notification.update({
      where: { id: req.params.id },
      data:  { isRead: true }
    });
    return res.json({ message: 'Marked as read' });
  } catch (err) {
    return res.status(500).json({ message: 'Server error' });
  }
}

module.exports = { getNotifications, markAllRead, markOneRead };
