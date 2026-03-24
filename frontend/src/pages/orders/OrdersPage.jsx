import { useQuery } from '@tanstack/react-query';
import { getOrders } from '../../api/orders.api';
import { Link } from 'react-router-dom';
import OrderStatusBadge from '../../components/OrderStatusBadge';
import { formatDistanceToNow } from 'date-fns';
import useAuthStore from '../../store/authStore';

export default function OrdersPage() {
  const { user } = useAuthStore();

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['orders'],
    queryFn:  () => getOrders().then(r => r.data)
  });

  const isGrower = user?.role === 'grower';

  return (
    <div className="min-h-screen bg-gray-50 py-6 px-4">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">
          {isGrower ? '📦 Incoming Orders' : '🛒 My Orders'}
        </h1>

        {isLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl h-28 animate-pulse border" />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-5xl mb-3">📭</div>
            <p className="text-gray-500">No orders yet.</p>
            {!isGrower && (
              <Link to="/explore"
                    className="mt-4 inline-block bg-green-600 text-white
                               px-6 py-2.5 rounded-xl font-medium hover:bg-green-700">
                Browse Listings
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map(order => (
              <Link
                key={order.id}
                to={`/orders/${order.id}`}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm
                           p-4 block hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-800 truncate">
                      {order.listing?.title}
                    </p>
                    <p className="text-sm text-gray-500 mt-0.5">
                      {isGrower
                        ? `From: ${order.buyer?.name}`
                        : `From: ${order.grower?.name}`}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {formatDistanceToNow(new Date(order.createdAt))} ago
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <OrderStatusBadge status={order.status} />
                    <span className="text-green-700 font-bold text-sm">
                      ₹{order.totalAmount}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
