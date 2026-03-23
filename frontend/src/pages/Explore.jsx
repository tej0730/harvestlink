import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getListings, getCategories } from '../api/listings.api';
import ListingCard from '../components/ListingCard';

export default function Explore() {
  const [filters, setFilters] = useState({
    category: '', isOrganic: false, sortBy: 'createdAt'
  });

  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn:  () => getCategories().then(r => r.data)
  });

  const { data, isLoading } = useQuery({
    queryKey: ['listings', filters],
    queryFn:  () => getListings({
      category:  filters.category   || undefined,
      isOrganic: filters.isOrganic  || undefined,
      sortBy:    filters.sortBy,
    }).then(r => r.data)
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-bold text-green-700">🌿 HarvestLink</h1>
          <a href="/listings/create"
             className="bg-green-600 text-white px-4 py-2 rounded-lg
                        text-sm font-medium hover:bg-green-700">
            + List Produce
          </a>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          {/* Category filter */}
          <select
            value={filters.category}
            onChange={e => setFilters({ ...filters, category: e.target.value })}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm
                       focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value="">All Categories</option>
            {categoriesData?.map(c => (
              <option key={c.id} value={c.name}>{c.name}</option>
            ))}
          </select>

          {/* Sort */}
          <select
            value={filters.sortBy}
            onChange={e => setFilters({ ...filters, sortBy: e.target.value })}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm
                       focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value="createdAt">Newest First</option>
            <option value="price">Price: Low to High</option>
          </select>

          {/* Organic toggle */}
          <button
            onClick={() => setFilters({ ...filters, isOrganic: !filters.isOrganic })}
            className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors
              ${filters.isOrganic
                ? 'bg-green-600 text-white border-green-600'
                : 'bg-white text-gray-600 border-gray-300 hover:border-green-400'
              }`}
          >
            🌱 Organic Only
          </button>
        </div>

        {/* Results count */}
        {data && (
          <p className="text-sm text-gray-500 mb-4">
            {data.pagination.total} listings found
          </p>
        )}

        {/* Listing grid */}
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl h-64
                                      animate-pulse border border-gray-100" />
            ))}
          </div>
        ) : data?.listings?.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-5xl mb-3">🌱</div>
            <p className="text-gray-500">No listings found. Try adjusting filters.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {data?.listings?.map(listing => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
