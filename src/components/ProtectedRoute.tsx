import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Loader2 } from 'lucide-react';

export default function ProtectedRoute() {
  const { user, loading } = useAuth();

  console.log(`[ProtectedRoute] ${new Date().toISOString()} Check - Loading: ${loading}, User: ${!!user}`);

  if (loading) {
    console.log(`[ProtectedRoute] ${new Date().toISOString()} Rendering spinner...`);
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
