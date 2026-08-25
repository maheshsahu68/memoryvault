import { Outlet } from 'react-router-dom';

export default function ReceiverLayout() {
  return (
    <main className="grid min-h-screen place-items-center bg-gradient-to-br from-violet-100 via-white to-rose-100 p-6">
      <Outlet />
    </main>
  );
}
