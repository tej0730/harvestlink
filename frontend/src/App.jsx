import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useEffect } from 'react';
import { refreshToken } from './api/auth.api';
import useAuthStore from './store/authStore';

import Login        from './pages/auth/Login';
import Register     from './pages/auth/Register';
import OAuthCallback from './pages/auth/OAuthCallback';
import Dashboard    from './pages/Dashboard';
import ExplorePage   from './pages/ExplorePage';
import RequestBoard  from './pages/RequestBoard';
import CreateListing from './pages/listings/CreateListing';

// Protected route wrapper
function ProtectedRoute({ children }) {
  const { user, isLoading } = useAuthStore();
  if (isLoading) return <div className="min-h-screen flex items-center
    justify-center text-green-600 text-xl">Loading...</div>;
  return user ? children : <Navigate to="/auth/login" replace />;
}

export default function App() {
  const { setAuth, clearAuth, setLoading } = useAuthStore();

  // On app load — try to restore session via refresh token cookie
  useEffect(() => {
    refreshToken()
      .then((res) => setAuth(res.data.user, res.data.accessToken))
      .catch(() => { clearAuth(); })
      .finally(() => setLoading(false));
  }, []);

  return (
    <BrowserRouter>
      <Toaster position="top-right" />
      <Routes>
        <Route path="/auth/login"    element={<Login />} />
        <Route path="/auth/register" element={<Register />} />
        <Route path="/auth/callback" element={<OAuthCallback />} />
        <Route path="/dashboard" element={
          <ProtectedRoute><Dashboard /></ProtectedRoute>
        } />
        <Route path="/explore"  element={<ExplorePage />} />
        <Route path="/requests" element={<RequestBoard />} />
        <Route path="/listings/create" element={
          <ProtectedRoute><CreateListing /></ProtectedRoute>
        } />
        <Route path="*" element={<Navigate to="/auth/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
