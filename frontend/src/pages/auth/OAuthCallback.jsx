import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getMe } from '../../api/auth.api';
import useAuthStore from '../../store/authStore';

export default function OAuthCallback() {
  const navigate       = useNavigate();
  const [params]       = useSearchParams();
  const setAuth        = useAuthStore((s) => s.setAuth);

  useEffect(() => {
    const token = params.get('token');
    if (!token) { navigate('/auth/login'); return; }

    // Store token temporarily and fetch user
    useAuthStore.setState({ accessToken: token });
    getMe()
      .then((res) => {
        setAuth(res.data.user, token);
        navigate('/dashboard');
      })
      .catch(() => navigate('/auth/login'));
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-green-50">
      <div className="text-center">
        <div className="text-4xl mb-3">🌿</div>
        <p className="text-gray-600">Signing you in...</p>
      </div>
    </div>
  );
}
