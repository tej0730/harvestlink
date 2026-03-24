import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getNotifications, markAllRead } from '../api/orders.api';
import { formatDistanceToNow } from 'date-fns';
import useAuthStore from '../store/authStore';

const typeIcons = {
  order_placed:         '🛒',
  order_accepted:       '✅',
  order_declined:       '❌',
  order_ready:          '🎉',
  order_completed:      '🏁',
  order_cancelled:      '🚫',
  dispute_raised:       '⚠️',
  buyer_request_nearby: '📋',
  new_message:          '💬',
  vouch_received:       '🤝',
};

export default function NotificationBell() {
  const { user }        = useAuthStore();
  const [open, setOpen] = useState(false);
  const ref             = useRef(null);
  const queryClient     = useQueryClient();

  const { data } = useQuery({
    queryKey:        ['notifications'],
    queryFn:         () => getNotifications().then(r => r.data),
    refetchInterval: 30000,  // poll every 30 seconds
    enabled:         !!user
  });

  const markMutation = useMutation({
    mutationFn: markAllRead,
    onSuccess:  () => queryClient.invalidateQueries(['notifications'])
  });

  // Close on outside click
  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const notifications = data?.notifications || [];
  const unread        = data?.unreadCount   || 0;

  return (
    <div ref={ref} className="relative">
      {/* Bell button */}
      <button
        onClick={() => {
          setOpen(!open);
          if (!open && unread > 0) markMutation.mutate();
        }}
        className="relative p-2 rounded-full hover:bg-gray-100 transition-colors"
      >
        <span className="text-xl">🔔</span>
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white
                           text-xs rounded-full w-5 h-5 flex items-center
                           justify-center font-bold">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl
                        border border-gray-100 z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <h3 className="font-semibold text-gray-800">Notifications</h3>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-3xl mb-2">🔔</div>
                <p className="text-gray-400 text-sm">No notifications yet</p>
              </div>
            ) : (
              notifications.map(n => (
                <div
                  key={n.id}
                  className={`px-4 py-3 border-b border-gray-50 hover:bg-gray-50
                              transition-colors ${!n.isRead ? 'bg-green-50' : ''}`}
                >
                  <div className="flex gap-3">
                    <span className="text-xl flex-shrink-0">
                      {typeIcons[n.type] || '🔔'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-700 leading-snug">{n.message}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {formatDistanceToNow(new Date(n.createdAt))} ago
                      </p>
                    </div>
                    {!n.isRead && (
                      <div className="w-2 h-2 bg-green-500 rounded-full
                                      flex-shrink-0 mt-1.5" />
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
