const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// ── CREATE REQUEST ────────────────────────────────────────────────────────────
async function createRequest(req, res) {
  try {
    const { cropName, categoryId, description, lat, lng, radiusKm = 10 } = req.body;

    const request = await prisma.buyerRequest.create({
      data: {
        buyerId:     req.user.id,
        cropName,
        categoryId:  categoryId || undefined,
        description,
        lat:         lat  ? parseFloat(lat)  : null,
        lng:         lng  ? parseFloat(lng)  : null,
        radiusKm:    parseInt(radiusKm),
        expiresAt:   new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
      include: { buyer: { select: { name: true } } }
    });

    // Notify nearby growers whose farm is within radius
    if (lat && lng) {
      const nearbyFarms = await prisma.$queryRaw`
        SELECT f.id, f."growerId"
        FROM farms f
        WHERE f.lat IS NOT NULL AND f.lng IS NOT NULL
          AND (
            6371 * acos(
              LEAST(1.0,
                cos(radians(${parseFloat(lat)})) * cos(radians(f.lat))
                * cos(radians(f.lng) - radians(${parseFloat(lng)}))
                + sin(radians(${parseFloat(lat)})) * sin(radians(f.lat))
              )
            )
          ) <= ${parseInt(radiusKm)}
      `;

      for (const farm of nearbyFarms) {
        await prisma.notification.create({
          data: {
            userId:      farm.growerId,
            type:        'buyer_request_nearby',
            message:     `A buyer near you is looking for "${cropName}". Check the request board!`,
            referenceId: request.id
          }
        });
      }
    }

    return res.status(201).json(request);
  } catch (err) {
    console.error('createRequest error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
}

// ── GET NEARBY REQUESTS ───────────────────────────────────────────────────────
async function getNearbyRequests(req, res) {
  try {
    const { lat, lng, radius = 15 } = req.query;

    if (!lat || !lng) {
      const requests = await prisma.buyerRequest.findMany({
        where:   { status: 'open', expiresAt: { gt: new Date() } },
        include: { buyer: { select: { name: true, area: true } } },
        orderBy: { createdAt: 'desc' },
        take:    50
      });
      return res.json(requests);
    }

    const requests = await prisma.$queryRaw`
      SELECT
        br.*,
        u.name  AS "buyerName",
        u.area  AS "buyerArea",
        (
          6371 * acos(
            LEAST(1.0,
              cos(radians(${parseFloat(lat)})) * cos(radians(br.lat))
              * cos(radians(br.lng) - radians(${parseFloat(lng)}))
              + sin(radians(${parseFloat(lat)})) * sin(radians(br.lat))
            )
          )
        ) AS distance_km
      FROM buyer_requests br
      JOIN users u ON br."buyerId" = u.id
      WHERE br.status = 'open'
        AND br."expiresAt" > NOW()
        AND br.lat IS NOT NULL
      ORDER BY distance_km ASC
      LIMIT 50
    `;

    return res.json(requests);
  } catch (err) {
    console.error('getNearbyRequests error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
}

// ── GET MY REQUESTS ───────────────────────────────────────────────────────────
async function getMyRequests(req, res) {
  try {
    const requests = await prisma.buyerRequest.findMany({
      where:   { buyerId: req.user.id },
      orderBy: { createdAt: 'desc' }
    });
    return res.json(requests);
  } catch (err) {
    return res.status(500).json({ message: 'Server error' });
  }
}

// ── DELETE REQUEST ────────────────────────────────────────────────────────────
async function deleteRequest(req, res) {
  try {
    const req_ = await prisma.buyerRequest.findUnique({ where: { id: req.params.id } });
    if (!req_)                      return res.status(404).json({ message: 'Request not found' });
    if (req_.buyerId !== req.user.id) return res.status(403).json({ message: 'Not your request' });

    await prisma.buyerRequest.update({
      where: { id: req.params.id },
      data:  { status: 'expired' }
    });

    return res.json({ message: 'Request removed' });
  } catch (err) {
    return res.status(500).json({ message: 'Server error' });
  }
}

module.exports = { createRequest, getNearbyRequests, getMyRequests, deleteRequest };
