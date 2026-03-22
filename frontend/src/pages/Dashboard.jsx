import useAuthStore from '../store/authStore';
import { useNavigate } from 'react-router-dom';
import { logoutUser } from '../api/auth.api';
import toast from 'react-hot-toast';

export default function Dashboard() {
  const { user, clearAuth } = useAuthStore();
  const navigate = useNavigate();

  async function handleLogout() {
    await logoutUser();
    clearAuth();
    toast.success('Logged out');
    navigate('/auth/login');
  }

  return (
    <div className="min-h-screen bg-green-50 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow p-8 text-center max-w-sm w-full">
        <div className="text-5xl mb-4">🌿</div>
        <h2 className="text-2xl font-bold text-gray-800">Welcome, {user?.name}!</h2>
        <p className="text-gray-500 mt-1 capitalize">Role: {user?.role}</p>
        <p className="text-gray-400 text-sm mt-1">{user?.email}</p>
        <button
          onClick={handleLogout}
          className="mt-6 w-full bg-red-500 hover:bg-red-600 text-white
                     font-semibold py-2.5 rounded-xl transition-colors"
        >
          Log Out
        </button>
      </div>
    </div>
  );
}
