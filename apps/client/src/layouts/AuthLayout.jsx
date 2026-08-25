import { Outlet } from 'react-router-dom';

export default function AuthLayout() {
  return (
    <main className="grid min-h-screen place-items-center bg-violet-50 p-6">
      <Outlet />
    </main>
  );
}
