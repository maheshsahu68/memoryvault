import { Navigate, Outlet } from 'react-router-dom';
import Spinner from '../components/ui/Spinner.jsx';
import useAuth from '../hooks/useAuth.js';

export default function PublicOnlyRoute() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return <main className="grid min-h-screen place-items-center"><Spinner /></main>;
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : <Outlet />;
}
