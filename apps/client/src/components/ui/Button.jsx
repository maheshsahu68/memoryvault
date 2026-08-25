const variants = {
  primary: 'bg-violet-600 text-white hover:bg-violet-700 focus-visible:outline-violet-600',
  secondary: 'bg-slate-200 text-slate-900 hover:bg-slate-300 focus-visible:outline-slate-500',
};

export default function Button({ className = '', type = 'button', variant = 'primary', ...props }) {
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${className}`}
      {...props}
    />
  );
}
