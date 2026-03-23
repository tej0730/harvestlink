import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getNearbyListings, getCategories } from '../api/listings.api';
import ListingCard from '../components/ListingCard';
import ListingMap  from '../components/map/ListingMap';
import useUserLocation from '../hooks/useUserLocation';

export default function ExplorePage() {
  const { location, loading: locLoading } = useUserLocation();
  const [view,    setView]    = useState('map');
  const [radius,  setRadius]  = useState(10);
  const [filters, setFilters] = useState({ category: '', isOrganic: false });
  const [selected, setSelected] = useState(null);

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn:  () => getCategories().then(r => r.data)
  });

  const { data, isLoading } = useQuery({
    queryKey: ['nearby', location, radius, filters],
    queryFn:  () => getNearbyListings({
      lat:      location?.lat,
      lng:      location?.lng,
      radius,
      category: filters.category  || undefined,
      isOrganic: filters.isOrganic || undefined,
    }).then(r => r.data),
    enabled: !!location
  });

  const listings = data?.listings || [];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto flex items-center gap-4 flex-wrap">
          <h1 className="text-lg font-bold text-green-700">🌿 HarvestLink</h1>

          <select
            value={filters.category}
            onChange={e => setFilters({ ...filters, category: e.target.value })}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm
                       focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value="">All Categories</option>
            {categories?.map(c => (
              <option key={c.id} value={c.name}>{c.name}</option>
            ))}
          </select>

          <select
            value={radius}
            onChange={e => setRadius(parseInt(e.target.value))}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm
                       focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value={2}>Within 2 km</option>
            <option value={5}>Within 5 km</option>
            <option value={10}>Within 10 km</option>
            <option value={20}>Within 20 km</option>
          </select>

          <button
            onClick={() => setFilters({ ...filters, isOrganic: !filters.isOrganic })}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors
              ${filters.isOrganic
                ? 'bg-green-600 text-white border-green-600'
                : 'bg-white text-gray-600 border-gray-300'}`}
          >
            🌱 Organic
          </button>

          <div className="ml-auto flex rounded-lg border border-gray-300 overflow-hidden">
            <button
              onClick={() => setView('map')}
              className={`px-3 py-1.5 text-sm ${view === 'map'
                ? 'bg-green-600 text-white'
                : 'bg-white text-gray-600'}`}
            >
              🗺️ Map
            </button>
            <button
              onClick={() => setView('grid')}
              className={`px-3 py-1.5 text-sm ${view === 'grid'
                ? 'bg-green-600 text-white'
                : 'bg-white text-gray-600'}`}
            >
              ⊞ Grid
            </button>
          </div>
        </div>
      </div>

      {locLoading ? (
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="text-4xl mb-3 animate-pulse">📍</div>
            <p className="text-gray-500">Getting your location...</p>
          </div>
        </div>
      ) : view === 'map' ? (
        <div className="flex h-[calc(100vh-60px)]">
          <div className="flex-1 p-3">
            <ListingMap
              listings={listings}
              center={location}
              onListingClick={setSelected}
            />
          </div>

          <div className="w-80 bg-white border-l border-gray-200 overflow-y-auto p-4">
            {selected ? (
              <>
                <button
                  onClick={() => setSelected(null)}
                  className="text-sm text-gray-500 hover:text-gray-700 mb-4"
                >
                  ← Back to list
                </button>
                <ListingCard listing={selected} />
              </>
            ) : (
              <>
                <p className="text-sm font-medium text-gray-600 mb-3">
                  {isLoading ? 'Finding listings...' : `${listings.length} listings nearby`}
                </p>
                <div className="space-y-3">
                  {listings.map(l => (
                    <div key={l.id} onClick={() => setSelected(l)} className="cursor-pointer">
                      <ListingCard listing={l} />
                    </div>
                  ))}
                  {!isLoading && listings.length === 0 && (
                    <div className="text-center py-10">
                      <div className="text-4xl mb-2">🌱</div>
                      <p className="text-gray-400 text-sm">
                        No listings within {radius}km. Try increasing the radius.
                      </p>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="max-w-7xl mx-auto px-4 py-6">
          <p className="text-sm text-gray-500 mb-4">
            {isLoading ? 'Loading...' : `${listings.length} listings within ${radius}km`}
          </p>
          {isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="bg-white rounded-2xl h-64
                                        animate-pulse border border-gray-100" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {listings.map(l => <ListingCard key={l.id} listing={l} />)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
