import { Navigate, Outlet, useLocation } from 'react-router-dom';
import Spinner from '../components/ui/Spinner.jsx';
import Button from '../components/ui/Button.jsx';
import Card from '../components/ui/Card.jsx';
import useAuth from '../hooks/useAuth.js';

export default function ProtectedRoute() {
  const { error, isAuthenticated, isLoading, refreshUser } = useAuth();
  const location = useLocation();

  if (isLoading) return <main className="grid min-h-screen place-items-center"><Spinner /></main>;
  if (error) {
    return (
      <main className="grid min-h-screen place-items-center p-6">
        <Card className="max-w-md text-center">
          <h1 className="text-xl font-bold">Couldn’t load your dashboard</h1>
          <p className="mt-2 text-slate-600">{error}</p>
          <Button className="mt-5" onClick={refreshUser}>Try again</Button>
        </Card>
      </main>
    );
  }
  if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: location }} />;
  return <Outlet />;
}
