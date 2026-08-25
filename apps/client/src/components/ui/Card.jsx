export default function Card({ className = '', children, ...props }) {
  return (
    <section className={`rounded-xl border border-slate-200 bg-white p-6 shadow-sm ${className}`} {...props}>
      {children}
    </section>
  );
}
