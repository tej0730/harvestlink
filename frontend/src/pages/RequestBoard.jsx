import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getNearbyRequests, createRequest, deleteRequest } from '../api/requests.api';
import useAuthStore    from '../store/authStore';
import useUserLocation from '../hooks/useUserLocation';
import { getCategories } from '../api/listings.api';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';

export default function RequestBoard() {
  const { user }              = useAuthStore();
  const { location }          = useUserLocation();
  const queryClient           = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm]         = useState({
    cropName: '', description: '', radiusKm: 10
  });

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['requests', location],
    queryFn:  () => getNearbyRequests({
      lat: location?.lat, lng: location?.lng
    }).then(r => r.data),
    enabled: !!location
  });

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn:  () => getCategories().then(r => r.data)
  });

  const createMutation = useMutation({
    mutationFn: createRequest,
    onSuccess: () => {
      queryClient.invalidateQueries(['requests']);
      setShowForm(false);
      setForm({ cropName: '', description: '', radiusKm: 10 });
      toast.success('Request posted! Nearby growers notified.');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to post request')
  });

  const deleteMutation = useMutation({
    mutationFn: deleteRequest,
    onSuccess:  () => {
      queryClient.invalidateQueries(['requests']);
      toast.success('Request removed');
    }
  });

  function handleSubmit(e) {
    e.preventDefault();
    createMutation.mutate({
      ...form,
      lat: location?.lat,
      lng: location?.lng
    });
  }

  return (
    <div className="min-h-screen bg-gray-50 py-6 px-4">
      <div className="max-w-2xl mx-auto">

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">📋 Request Board</h1>
            <p className="text-gray-500 text-sm mt-1">
              Looking for something? Post a request — nearby growers will see it.
            </p>
          </div>
          {user?.role === 'buyer' && (
            <button
              onClick={() => setShowForm(!showForm)}
              className="bg-green-600 text-white px-4 py-2 rounded-xl
                         text-sm font-medium hover:bg-green-700"
            >
              + New Request
            </button>
          )}
        </div>

        {showForm && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-6">
            <h3 className="font-semibold text-gray-800 mb-4">Post a Request</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  What are you looking for? *
                </label>
                <input
                  value={form.cropName}
                  onChange={e => setForm({ ...form, cropName: e.target.value })}
                  required placeholder="e.g. Fresh coriander, cherry tomatoes"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5
                             focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Additional details
                </label>
                <textarea
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  rows={2} placeholder="Quantity needed, any specific requirements..."
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5
                             focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Search radius
                </label>
                <select
                  value={form.radiusKm}
                  onChange={e => setForm({ ...form, radiusKm: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5
                             focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value={5}>Within 5 km</option>
                  <option value={10}>Within 10 km</option>
                  <option value={20}>Within 20 km</option>
                </select>
              </div>

              <div className="flex gap-3">
                <button
                  type="submit" disabled={createMutation.isPending}
                  className="flex-1 bg-green-600 text-white py-2.5 rounded-xl
                             font-medium hover:bg-green-700 disabled:bg-green-300"
                >
                  {createMutation.isPending ? 'Posting...' : 'Post Request'}
                </button>
                <button
                  type="button" onClick={() => setShowForm(false)}
                  className="px-4 py-2.5 border border-gray-300 rounded-xl
                             text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {isLoading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl h-24 animate-pulse border" />
            ))}
          </div>
        ) : requests.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-3">🌱</div>
            <p className="text-gray-500">No requests nearby yet.</p>
            {user?.role === 'buyer' && (
              <p className="text-gray-400 text-sm mt-1">Be the first to post one!</p>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {requests.map(r => (
              <div key={r.id}
                   className="bg-white rounded-2xl border border-gray-100
                              shadow-sm p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-gray-800">{r.cropName}</span>
                      <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5
                                       rounded-full border border-green-100">
                        Open
                      </span>
                    </div>
                    {r.description && (
                      <p className="text-sm text-gray-500 mb-2">{r.description}</p>
                    )}
                    <div className="flex items-center gap-3 text-xs text-gray-400">
                      <span>👤 {r.buyerName || r.buyer?.name}</span>
                      {r.distance_km && (
                        <span>📍 {parseFloat(r.distance_km).toFixed(1)} km away</span>
                      )}
                      <span>🕐 {formatDistanceToNow(new Date(r.createdAt))} ago</span>
                    </div>
                  </div>

                  {user?.id === r.buyerId && (
                    <button
                      onClick={() => deleteMutation.mutate(r.id)}
                      className="text-gray-400 hover:text-red-500 text-sm ml-2"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
