import { Link } from 'react-router-dom';
import FreshnessScoreBadge from './FreshnessScoreBadge';

export default function ListingCard({ listing }) {
  const photo = listing.photos?.[0];

  const tierColors = {
    seedling:           'bg-gray-100  text-gray-600',
    grower:             'bg-green-100 text-green-700',
    community_verified: 'bg-blue-100  text-blue-700',
    admin_verified:     'bg-purple-100 text-purple-700',
  };

  const tierLabels = {
    seedling:           '🌱 Seedling',
    grower:             '🌿 Grower',
    community_verified: '✅ Verified',
    admin_verified:     '🏅 Admin Verified',
  };

  return (
    <Link to={`/listing/${listing.id}`}
          className="bg-white rounded-2xl shadow-sm border border-gray-100
                     overflow-hidden hover:shadow-md transition-shadow block">

      {/* Photo */}
      <div className="h-44 bg-green-50 overflow-hidden">
        {photo
          ? <img src={photo} alt={listing.title}
                 className="w-full h-full object-cover" />
          : <div className="w-full h-full flex items-center justify-center text-5xl">🌿</div>
        }
      </div>

      <div className="p-4">
        {/* Title + category */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-semibold text-gray-800 text-sm leading-tight line-clamp-2">
            {listing.title}
          </h3>
          <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5
                           rounded-full whitespace-nowrap border border-green-100">
            {listing.category?.name}
          </span>
        </div>

        {/* Freshness score */}
        <div className="mb-3">
          <FreshnessScoreBadge freshness={listing.freshness} />
        </div>

        {/* Farm info + trust */}
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs text-gray-500">{listing.farm?.farmName}</span>
          {listing.farm?.trustTier && (
            <span className={`text-xs px-1.5 py-0.5 rounded-full
                              ${tierColors[listing.farm.trustTier]}`}>
              {tierLabels[listing.farm.trustTier]}
            </span>
          )}
        </div>

        {/* Price + organic badge */}
        <div className="flex items-center justify-between">
          <div>
            <span className="text-lg font-bold text-green-700">
              ₹{listing.pricePerUnit}
            </span>
            <span className="text-xs text-gray-400 ml-1">{listing.unitLabel}</span>
          </div>
          <div className="flex items-center gap-1">
            {listing.isOrganic && (
              <span className="text-xs bg-green-600 text-white
                               px-2 py-0.5 rounded-full">Organic</span>
            )}
            {listing.isSurplus && (
              <span className="text-xs bg-orange-500 text-white
                               px-2 py-0.5 rounded-full">Surplus</span>
            )}
          </div>
        </div>

        {/* Quantity */}
        <p className="text-xs text-gray-400 mt-2">
          {listing.quantityAvailable - listing.quantityReserved} available
        </p>
      </div>
    </Link>
  );
}
