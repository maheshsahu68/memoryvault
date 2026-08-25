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
      <dl className="mt-6 space-y-3 text-sm">
        <div>
          <dt className="font-medium text-slate-500">Email</dt>
          <dd className="mt-1 text-slate-900">{user.email}</dd>
        </div>
        <div>
          <dt className="font-medium text-slate-500">Account created</dt>
          <dd className="mt-1 text-slate-900">{user.createdAt ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(user.createdAt)) : 'Unavailable'}</dd>
        </div>
      </dl>
      <p className="mt-6 text-sm text-slate-500">Surprise and media features are not available yet.</p>
      <Button className="mt-6" variant="secondary" onClick={handleLogout}>Log out</Button>
    </Card>
  );
}
