export default function Spinner({ label = 'Loading', className = '' }) {
  return (
    <span className={`inline-flex items-center gap-2 text-sm text-slate-600 ${className}`} role="status">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-violet-200 border-t-violet-600" aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </span>
  );
}
