import { useEffect, useRef } from 'react';
import L from 'leaflet';

// Fix default Leaflet icon issue with Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

export default function ListingMap({ listings = [], center, onListingClick }) {
  const mapRef       = useRef(null);
  const mapInstance  = useRef(null);
  const markersRef   = useRef(null);

  // Initialize map once
  useEffect(() => {
    if (mapInstance.current) return;

    mapInstance.current = L.map(mapRef.current, {
      center: center ? [center.lat, center.lng] : [23.0225, 72.5714],
      zoom:   13,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(mapInstance.current);

    return () => {
      mapInstance.current?.remove();
      mapInstance.current = null;
    };
  }, []);

  // Update markers when listings change
  useEffect(() => {
    if (!mapInstance.current) return;

    if (markersRef.current) {
      mapInstance.current.removeLayer(markersRef.current);
    }

    const group = L.featureGroup();

    listings.forEach((listing) => {
      if (!listing.farmLat && !listing.farm?.lat) return;

      const lat = listing.farmLat || listing.farm?.lat;
      const lng = listing.farmLng || listing.farm?.lng;

      const icon = L.divIcon({
        className: '',
        html: `
          <div style="
            background: #16a34a;
            color: white;
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            width: 32px; height: 32px;
            display: flex; align-items: center; justify-content: center;
            box-shadow: 0 2px 6px rgba(0,0,0,0.3);
            border: 2px solid white;
          ">
            <span style="transform: rotate(45deg); font-size: 14px;">🌿</span>
          </div>
        `,
        iconSize:   [32, 32],
        iconAnchor: [16, 32],
      });

      const photo = listing.photos?.[0] || listing.farm?.heroPhotoUrl;

      const popup = L.popup({ maxWidth: 260 }).setContent(`
        <div style="font-family: sans-serif; padding: 4px;">
          ${photo
            ? `<img src="${photo}" style="width:100%;height:100px;
                object-fit:cover;border-radius:8px;margin-bottom:8px;" />`
            : ''}
          <div style="font-weight:600;font-size:14px;margin-bottom:4px;">
            ${listing.title}
          </div>
          <div style="color:#16a34a;font-weight:700;font-size:16px;">
            ₹${listing.pricePerUnit} <span style="color:#6b7280;
            font-size:12px;font-weight:400;">${listing.unitLabel}</span>
          </div>
          <div style="color:#6b7280;font-size:12px;margin-top:4px;">
            ${listing.farmName || listing.farm?.farmName || ''}
          </div>
          ${listing.freshness
            ? `<div style="margin-top:6px;padding:3px 8px;
                background:${listing.freshness.color === 'green' ? '#dcfce7' : '#fef9c3'};
                border-radius:20px;font-size:11px;display:inline-block;">
                🌿 ${listing.freshness.score}% Fresh — ${listing.freshness.label}
               </div>`
            : ''}
          <br/>
          <a href="/listing/${listing.id}"
             style="display:inline-block;margin-top:8px;background:#16a34a;
             color:white;padding:5px 12px;border-radius:6px;font-size:12px;
             text-decoration:none;">
            View Listing →
          </a>
        </div>
      `);

      const marker = L.marker([lat, lng], { icon }).bindPopup(popup);

      marker.on('click', () => {
        if (onListingClick) onListingClick(listing);
      });

      group.addLayer(marker);
    });

    group.addTo(mapInstance.current);
    markersRef.current = group;

    if (listings.length > 0 && group.getBounds().isValid()) {
      mapInstance.current.fitBounds(group.getBounds(), { padding: [40, 40], maxZoom: 15 });
    }
  }, [listings]);

  return (
    <div ref={mapRef} style={{ width: '100%', height: '100%', minHeight: '400px',
                               borderRadius: '12px', zIndex: 0 }} />
  );
}
