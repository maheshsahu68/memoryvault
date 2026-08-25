import { Outlet } from 'react-router-dom';

export default function DashboardLayout() {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white px-6 py-4 font-semibold text-violet-700">MemoryVault</header>
      <main className="mx-auto max-w-6xl p-6"><Outlet /></main>
    </div>
  );
}
