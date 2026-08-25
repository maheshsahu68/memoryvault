import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import Button from '../components/ui/Button.jsx';
import Card from '../components/ui/Card.jsx';
import useAuth from '../hooks/useAuth.js';

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    try {
      await logout();
      navigate('/login', { replace: true });
    } catch (error) {
      toast.error(error.response?.data?.error?.message || 'Unable to log out.');
    }
  }

  return (
    <Card>
      <h1 className="text-2xl font-bold">Welcome, {user.name}</h1>
      <p className="mt-2 text-slate-600">{user.email}</p>
      <p className="mt-6 text-sm text-slate-500">Dashboard features are intentionally deferred to Phase 1D.</p>
      <Button className="mt-6" variant="secondary" onClick={handleLogout}>Log out</Button>
    </Card>
  );
}
