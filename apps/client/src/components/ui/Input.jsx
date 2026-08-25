export default function Input({ className = '', ...props }) {
  return (
    <input
      className={`w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm outline-none transition placeholder:text-slate-400 focus:border-violet-500 focus:ring-2 focus:ring-violet-200 disabled:cursor-not-allowed disabled:bg-slate-100 ${className}`}
      {...props}
    />
  );
}
