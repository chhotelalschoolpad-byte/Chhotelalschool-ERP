export default function Badge({ status, text }) {
  const styles = {
    paid: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
    pending: 'bg-amber-100 text-amber-700 border border-amber-200',
    due: 'bg-rose-100 text-rose-700 border border-rose-200',
    overdue: 'bg-rose-100 text-rose-700 border border-rose-200',
    late: 'bg-orange-100 text-orange-700 border border-orange-200',
    default: 'bg-slate-100 text-slate-700 border border-slate-200'
  };

  const className = styles[status?.toLowerCase()] || styles.default;
  const displayText = text || status;

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize w-fit ${className}`}>
      {displayText}
    </span>
  );
}
