const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

async function getMySlots(req, res) {
  try {
    const slots = await prisma.pickupSlot.findMany({
      where:   { growerId: req.user.id },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }]
    });
    return res.json(slots);
  } catch (err) {
    return res.status(500).json({ message: 'Server error' });
  }
}

async function getGrowerSlots(req, res) {
  try {
    const slots = await prisma.pickupSlot.findMany({
      where:   { growerId: req.params.growerId, isActive: true },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }]
    });
    return res.json(slots);
  } catch (err) {
    return res.status(500).json({ message: 'Server error' });
  }
}

async function createSlot(req, res) {
  try {
    const { dayOfWeek, startTime, endTime, maxOrdersPerSlot } = req.body;
    const slot = await prisma.pickupSlot.create({
      data: {
        growerId:        req.user.id,
        dayOfWeek:       parseInt(dayOfWeek),
        startTime,
        endTime,
        maxOrdersPerSlot: maxOrdersPerSlot ? parseInt(maxOrdersPerSlot) : 5
      }
    });
    return res.status(201).json(slot);
  } catch (err) {
    return res.status(500).json({ message: 'Server error' });
  }
}

async function toggleSlot(req, res) {
  try {
    const slot = await prisma.pickupSlot.findUnique({ where: { id: req.params.id } });
    if (!slot)                        return res.status(404).json({ message: 'Slot not found' });
    if (slot.growerId !== req.user.id) return res.status(403).json({ message: 'Not your slot' });

    const updated = await prisma.pickupSlot.update({
      where: { id: slot.id },
      data:  { isActive: !slot.isActive }
    });
    return res.json(updated);
  } catch (err) {
    return res.status(500).json({ message: 'Server error' });
  }
}

async function deleteSlot(req, res) {
  try {
    const slot = await prisma.pickupSlot.findUnique({ where: { id: req.params.id } });
    if (!slot)                        return res.status(404).json({ message: 'Slot not found' });
    if (slot.growerId !== req.user.id) return res.status(403).json({ message: 'Not your slot' });

    await prisma.pickupSlot.delete({ where: { id: slot.id } });
    return res.json({ message: 'Slot deleted' });
  } catch (err) {
    return res.status(500).json({ message: 'Server error' });
  }
}

module.exports = { getMySlots, getGrowerSlots, createSlot, toggleSlot, deleteSlot };
