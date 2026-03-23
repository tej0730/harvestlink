// Haversine formula — distance between two lat/lng points in km
function haversineDistance(lat1, lng1, lat2, lng2) {
  const R    = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Returns score 0-100 + label + color
function calculateFreshnessScore(harvestDate, growerLat, growerLng, buyerLat, buyerLng) {
  const days = Math.floor(
    (Date.now() - new Date(harvestDate).getTime()) / 86400000
  );

  let distancePenalty = 0;
  if (buyerLat && buyerLng && growerLat && growerLng) {
    const km = haversineDistance(growerLat, growerLng, buyerLat, buyerLng);
    distancePenalty = km * 0.1;
  }

  const raw   = 100 - (days * 3) - distancePenalty;
  const score = Math.max(0, Math.min(100, Math.round(raw)));

  let label, color;
  if (score >= 90)      { label = 'Just Harvested'; color = 'green'; }
  else if (score >= 70) { label = 'Very Fresh';     color = 'teal'; }
  else if (score >= 50) { label = 'Fresh';          color = 'yellow'; }
  else                  { label = 'Ageing';         color = 'orange'; }

  return { score, label, color };
}

module.exports = { calculateFreshnessScore, haversineDistance };
