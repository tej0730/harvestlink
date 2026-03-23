const { PrismaClient } = require('@prisma/client');
const { calculateFreshnessScore } = require('../utils/freshnessScore');
const { cloudinary } = require('../utils/cloudinary');

const prisma = new PrismaClient();

// ── attach freshness to listing ───────────────────────────────────────────────
function withFreshness(listing, buyerLat, buyerLng) {
  const farm = listing.farm;
  const freshness = calculateFreshnessScore(
    listing.harvestDate,
    farm?.lat, farm?.lng,
    buyerLat,  buyerLng
  );
  return { ...listing, freshness };
}

// ── GET ALL LISTINGS ──────────────────────────────────────────────────────────
async function getListings(req, res) {
  try {
    const {
      category, isOrganic, minPrice, maxPrice,
      sortBy = 'createdAt', page = 1, limit = 20,
      buyerLat, buyerLng
    } = req.query;

    const where = { status: 'active' };
    if (category)  where.category  = { name: category };
    if (isOrganic) where.isOrganic = true;
    if (minPrice || maxPrice) {
      where.pricePerUnit = {};
      if (minPrice) where.pricePerUnit.gte = parseFloat(minPrice);
      if (maxPrice) where.pricePerUnit.lte = parseFloat(maxPrice);
    }

    const orderBy = sortBy === 'price'
      ? { pricePerUnit: 'asc' }
      : { createdAt: 'desc' };

    const listings = await prisma.listing.findMany({
      where,
      include: {
        category: true,
        farm: { select: { farmName: true, lat: true, lng: true, trustScore: true, trustTier: true } }
      },
      orderBy,
      skip:  (parseInt(page) - 1) * parseInt(limit),
      take:  parseInt(limit),
    });

    const total = await prisma.listing.count({ where });

    const enriched = listings.map(l =>
      withFreshness(l, buyerLat ? parseFloat(buyerLat) : null, buyerLng ? parseFloat(buyerLng) : null)
    );

    return res.json({
      listings: enriched,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (err) {
    console.error('getListings error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
}

// ── GET SINGLE LISTING ────────────────────────────────────────────────────────
async function getListingById(req, res) {
  try {
    const listing = await prisma.listing.findUnique({
      where: { id: req.params.id },
      include: {
        category: true,
        farm: {
          select: {
            id: true, farmName: true, lat: true, lng: true,
            trustScore: true, trustTier: true, heroPhotoUrl: true,
            grower: { select: { id: true, name: true, profilePhotoUrl: true } }
          }
        }
      }
    });

    if (!listing) return res.status(404).json({ message: 'Listing not found' });

    const { buyerLat, buyerLng } = req.query;
    const enriched = withFreshness(
      listing,
      buyerLat ? parseFloat(buyerLat) : null,
      buyerLng ? parseFloat(buyerLng) : null
    );

    return res.json(enriched);
  } catch (err) {
    console.error('getListingById error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
}

// ── GET MY LISTINGS (grower) ──────────────────────────────────────────────────
async function getMyListings(req, res) {
  try {
    const listings = await prisma.listing.findMany({
      where: { growerId: req.user.id },
      include: { category: true },
      orderBy: { createdAt: 'desc' }
    });
    return res.json(listings);
  } catch (err) {
    return res.status(500).json({ message: 'Server error' });
  }
}

// ── CREATE LISTING ────────────────────────────────────────────────────────────
async function createListing(req, res) {
  try {
    const {
      title, description, categoryId,
      pricePerUnit, unitLabel, quantityAvailable,
      harvestDate, availableFrom, availableUntil,
      isOrganic, listingType
    } = req.body;

    // Get grower's farm
    const farm = await prisma.farm.findUnique({ where: { growerId: req.user.id } });
    if (!farm) return res.status(404).json({ message: 'Farm not found' });

    // Collect uploaded photo URLs from Cloudinary
    const photos = req.files ? req.files.map(f => f.path) : [];

    const listing = await prisma.listing.create({
      data: {
        farmId:            farm.id,
        growerId:          req.user.id,
        title,
        description,
        categoryId,
        pricePerUnit:      parseFloat(pricePerUnit),
        unitLabel,
        quantityAvailable: parseInt(quantityAvailable),
        harvestDate:       new Date(harvestDate),
        availableFrom:     availableFrom ? new Date(availableFrom) : null,
        availableUntil:    availableUntil ? new Date(availableUntil) : null,
        isOrganic:         isOrganic === 'true' || isOrganic === true,
        isSurplus:         listingType === 'surplus',
        listingType:       listingType || 'standard',
        photos,
      },
      include: { category: true }
    });

    // Log to audit
    await prisma.auditLog.create({
      data: {
        entityType:  'listing',
        entityId:    listing.id,
        action:      'created',
        newValue:    JSON.stringify({ title, pricePerUnit, quantityAvailable }),
        performedBy: req.user.id
      }
    });

    return res.status(201).json(listing);
  } catch (err) {
    console.error('createListing error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
}

// ── UPDATE LISTING ────────────────────────────────────────────────────────────
async function updateListing(req, res) {
  try {
    const existing = await prisma.listing.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ message: 'Listing not found' });
    if (existing.growerId !== req.user.id) return res.status(403).json({ message: 'Not your listing' });

    const {
      title, description, pricePerUnit, unitLabel,
      quantityAvailable, harvestDate, isOrganic, listingType, status
    } = req.body;

    // Capture old values for audit log
    const oldValue = JSON.stringify({
      title: existing.title,
      pricePerUnit: existing.pricePerUnit,
      quantityAvailable: existing.quantityAvailable
    });

    const updated = await prisma.listing.update({
      where: { id: req.params.id },
      data: {
        title,
        description,
        pricePerUnit:      pricePerUnit ? parseFloat(pricePerUnit) : undefined,
        unitLabel,
        quantityAvailable: quantityAvailable ? parseInt(quantityAvailable) : undefined,
        harvestDate:       harvestDate ? new Date(harvestDate) : undefined,
        isOrganic:         isOrganic !== undefined ? (isOrganic === 'true' || isOrganic === true) : undefined,
        listingType,
        status
      },
      include: { category: true }
    });

    await prisma.auditLog.create({
      data: {
        entityType:  'listing',
        entityId:    updated.id,
        action:      'updated',
        oldValue,
        newValue:    JSON.stringify({ title, pricePerUnit, quantityAvailable }),
        performedBy: req.user.id
      }
    });

    return res.json(updated);
  } catch (err) {
    console.error('updateListing error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
}

// ── DELETE / DEACTIVATE LISTING ───────────────────────────────────────────────
async function deactivateListing(req, res) {
  try {
    const existing = await prisma.listing.findUnique({ where: { id: req.params.id } });
    if (!existing)                        return res.status(404).json({ message: 'Listing not found' });
    if (existing.growerId !== req.user.id) return res.status(403).json({ message: 'Not your listing' });

    await prisma.listing.update({
      where: { id: req.params.id },
      data: { status: 'inactive' }
    });

    return res.json({ message: 'Listing deactivated' });
  } catch (err) {
    return res.status(500).json({ message: 'Server error' });
  }
}

// ── GET CATEGORIES ────────────────────────────────────────────────────────────
async function getCategories(req, res) {
  try {
    const categories = await prisma.listingCategory.findMany();
    return res.json(categories);
  } catch (err) {
    return res.status(500).json({ message: 'Server error' });
  }
}

// ── GET NEARBY LISTINGS (geospatial) ─────────────────────────────────────────
async function getNearbyListings(req, res) {
  try {
    const {
      lat, lng,
      radius = 10,
      category,
      isOrganic,
      sortBy = 'distance'
    } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({ message: 'lat and lng are required' });
    }

    const buyerLat = parseFloat(lat);
    const buyerLng = parseFloat(lng);
    const radiusKm = parseFloat(radius);

    const listings = await prisma.$queryRaw`
      SELECT
        l.*,
        f.id          AS "farmId_",
        f."farmName",
        f.lat         AS "farmLat",
        f.lng         AS "farmLng",
        f."trustScore",
        f."trustTier",
        f."heroPhotoUrl",
        lc.name       AS "categoryName",
        (
          6371 * acos(
            LEAST(1.0, cos(radians(${buyerLat})) * cos(radians(f.lat))
            * cos(radians(f.lng) - radians(${buyerLng}))
            + sin(radians(${buyerLat})) * sin(radians(f.lat)))
          )
        ) AS distance_km
      FROM "Listing" l
      JOIN "Farm" f    ON l."farmId" = f.id
      JOIN "ListingCategory" lc ON l."categoryId" = lc.id
      WHERE l.status = 'active'
        AND f.lat IS NOT NULL
        AND f.lng IS NOT NULL
        AND (
          6371 * acos(
            LEAST(1.0, cos(radians(${buyerLat})) * cos(radians(f.lat))
            * cos(radians(f.lng) - radians(${buyerLng}))
            + sin(radians(${buyerLat})) * sin(radians(f.lat)))
          )
        ) <= ${radiusKm}
      ORDER BY distance_km ASC
      LIMIT 100
    `;

    let filtered = listings;
    if (category)  filtered = filtered.filter(l => l.categoryName === category);
    if (isOrganic) filtered = filtered.filter(l => l.isOrganic === true);

    const enriched = filtered.map(l => {
      const freshness = calculateFreshnessScore(
        l.harvestDate, l.farmLat, l.farmLng, buyerLat, buyerLng
      );
      return { ...l, freshness };
    });

    return res.json({ listings: enriched, total: enriched.length });
  } catch (err) {
    console.error('getNearbyListings error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
}

// ── GET HEATMAP DATA ──────────────────────────────────────────────────────────
async function getHeatmapData(req, res) {
  try {
    const stats = await prisma.demandStat.findMany({
      orderBy: [
        { searchCount:  'desc' },
        { requestCount: 'desc' }
      ],
      take: 200
    });

    const farms = await prisma.farm.findMany({
      where: {
        lat: { not: null },
        lng: { not: null }
      },
      select: { lat: true, lng: true, farmName: true, trustScore: true }
    });

    return res.json({ demandStats: stats, farms });
  } catch (err) {
    return res.status(500).json({ message: 'Server error' });
  }
}

module.exports = {
  getListings, getListingById, getMyListings,
  createListing, updateListing, deactivateListing,
  getCategories, getNearbyListings, getHeatmapData
};
