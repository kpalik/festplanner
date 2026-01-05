import React from 'react';
import { Outlet, useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogOut, Calendar, Users, Tent, Music } from 'lucide-react';
import clsx from 'clsx';

export default function Layout() {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const isActive = (path: string) => {
    if (path === '/' && location.pathname !== '/') return false;
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 bg-slate-900 border-b border-slate-800 sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <img src="/logo.png" className="w-8 h-8 rounded-lg" alt="Logo" />
          <span className="font-bold text-lg bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">FestPlaner</span>
        </div>
        <button onClick={handleSignOut} className="p-2 text-slate-400 hover:text-white">
          <LogOut className="w-5 h-5" />
        </button>
      </div>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-slate-900 border-r border-slate-800 p-6">
        <div className="flex items-center gap-3 mb-10">
          <img src="/logo.png" className="w-10 h-10 rounded-xl" alt="Logo" />
          <span className="font-bold text-xl bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">FestPlaner</span>
        </div>

        <nav className="flex-1 space-y-2">
          <NavItem to="/" icon={<Calendar />} label="Dashboard" active={location.pathname === '/'} />
          <div className="pt-4 pb-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Discover</div>
          <NavItem to="/festivals" icon={<Tent />} label="Festivals" active={isActive('/festivals')} />
          <NavItem to="/bands" icon={<Music />} label="Bands" active={isActive('/bands')} />
          <NavItem to="/trips" icon={<Users />} label="My Trips" active={isActive('/trips')} />
          {/* Admin Links would go here based on role */}
        </nav>

        <div className="pt-6 border-t border-slate-800">
          <div className="flex items-center gap-3 mb-4 px-2">
            <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400 text-sm font-bold">
              {user?.email?.charAt(0).toUpperCase()}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-medium truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-3 px-3 py-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors w-full"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto bg-slate-950 p-4 pb-24 md:p-8 md:pb-8">
        <Outlet />
      </main>

      {/* Mobile Bottom Nav */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-800 flex justify-around p-3 z-50 safe-area-bottom">
        <MobileNavItem to="/" icon={<Calendar />} label="Home" active={location.pathname === '/'} />
        <MobileNavItem to="/festivals" icon={<Tent />} label="Festivals" active={isActive('/festivals')} />
        <MobileNavItem to="/trips" icon={<Users />} label="Trips" active={isActive('/trips')} />
      </div>
    </div>
  );
}

function NavItem({ to, icon, label, active = false }: { to: string; icon: React.ReactElement; label: string; active?: boolean }) {
  return (
    <Link to={to} className={clsx(
      "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors",
      active ? "bg-purple-500/10 text-purple-400" : "text-slate-400 hover:text-white hover:bg-slate-800"
    )}>
      {/* @ts-ignore */}
      {React.cloneElement(icon, { size: 20 })}
      <span>{label}</span>
    </Link>
  )
}

function MobileNavItem({ to, icon, label, active = false }: { to: string; icon: React.ReactElement; label: string; active?: boolean }) {
  return (
    <Link to={to} className={clsx(
      "flex flex-col items-center gap-1 min-w-[4rem]",
      active ? "text-purple-400" : "text-slate-500"
    )}>
      {/* @ts-ignore */}
      {React.cloneElement(icon, { size: 24 })}
      <span className="text-xs font-medium">{label}</span>
    </Link>
  )
}
