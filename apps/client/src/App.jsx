import { Navigate, Route, Routes } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import AuthLayout from './layouts/AuthLayout.jsx';
import DashboardLayout from './layouts/DashboardLayout.jsx';
import ReceiverLayout from './layouts/ReceiverLayout.jsx';
import PlaceholderPage from './pages/PlaceholderPage.jsx';
import AuthFormPage from './pages/AuthFormPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import ForgotPasswordPage from './pages/ForgotPasswordPage.jsx';
import ResetPasswordPage from './pages/ResetPasswordPage.jsx';
import ProtectedRoute from './routes/ProtectedRoute.jsx';

export default function App() {
  return (
    <>
      <Routes>
        <Route element={<AuthLayout />}>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<AuthFormPage mode="login" />} />
          <Route path="/register" element={<AuthFormPage mode="register" />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
        </Route>
        <Route element={<ProtectedRoute />}>
          <Route element={<DashboardLayout />}>
            <Route path="/dashboard" element={<DashboardPage />} />
          </Route>
        </Route>
        <Route element={<ReceiverLayout />}>
          <Route path="/receiver" element={<PlaceholderPage title="A memory is waiting" description="Receiver functionality arrives in Phase 6." />} />
        </Route>
      </Routes>
      <Toaster position="top-right" />
    </>
  );
}
