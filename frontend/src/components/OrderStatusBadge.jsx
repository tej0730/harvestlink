const config = {
  pending:   { label: 'Pending',    bg: 'bg-yellow-100', text: 'text-yellow-800', icon: '⏳' },
  accepted:  { label: 'Accepted',   bg: 'bg-blue-100',   text: 'text-blue-800',   icon: '✅' },
  ready:     { label: 'Ready',      bg: 'bg-green-100',  text: 'text-green-800',  icon: '🎉' },
  picked_up: { label: 'Picked Up',  bg: 'bg-teal-100',   text: 'text-teal-800',   icon: '📦' },
  completed: { label: 'Completed',  bg: 'bg-gray-100',   text: 'text-gray-700',   icon: '🏁' },
  cancelled: { label: 'Cancelled',  bg: 'bg-red-100',    text: 'text-red-700',    icon: '❌' },
  disputed:  { label: 'Disputed',   bg: 'bg-orange-100', text: 'text-orange-800', icon: '⚠️' },
};

export default function OrderStatusBadge({ status }) {
  const c = config[status] || config.pending;
  return (
    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full
                      text-sm font-medium ${c.bg} ${c.text}`}>
      {c.icon} {c.label}
    </span>
  );
}
