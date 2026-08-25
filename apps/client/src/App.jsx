import { Route, Routes } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import AuthLayout from './layouts/AuthLayout.jsx';
import DashboardLayout from './layouts/DashboardLayout.jsx';
import ReceiverLayout from './layouts/ReceiverLayout.jsx';
import PlaceholderPage from './pages/PlaceholderPage.jsx';

export default function App() {
  return (
    <>
      <Routes>
        <Route element={<AuthLayout />}>
          <Route path="/" element={<PlaceholderPage title="MemoryVault" description="Authentication screens arrive in Phase 1B." />} />
        </Route>
        <Route element={<DashboardLayout />}>
          <Route path="/dashboard" element={<PlaceholderPage title="Dashboard" description="The dashboard shell arrives in Phase 1D." />} />
        </Route>
        <Route element={<ReceiverLayout />}>
          <Route path="/receiver" element={<PlaceholderPage title="A memory is waiting" description="Receiver functionality arrives in Phase 6." />} />
        </Route>
      </Routes>
      <Toaster position="top-right" />
    </>
  );
}
