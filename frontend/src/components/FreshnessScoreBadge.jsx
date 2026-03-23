export default function FreshnessScoreBadge({ freshness }) {
  if (!freshness) return null;

  const styles = {
    green:  'bg-green-100  text-green-800  border-green-200',
    teal:   'bg-teal-100   text-teal-800   border-teal-200',
    yellow: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    orange: 'bg-orange-100 text-orange-800 border-orange-200',
  };

  const icons = {
    green: '🟢', teal: '🔵', yellow: '🟡', orange: '🟠'
  };

  const cls = styles[freshness.color] || styles.green;

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full
                      border text-xs font-medium ${cls}`}>
      {icons[freshness.color]} {freshness.score}% — {freshness.label}
    </span>
  );
}
