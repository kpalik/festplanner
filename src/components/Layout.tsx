import React, { useEffect, useState } from 'react';
import { Outlet, useNavigate, Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { LogOut, Calendar, Users, Tent, Music, ChevronLeft, ChevronRight } from 'lucide-react';
import PwaInstaller from './PwaInstaller';
import LanguageSwitcher from './LanguageSwitcher';
import clsx from 'clsx';
import { supabase } from '../lib/supabase';
import AuthorModal from './AuthorModal';
import { Heart } from 'lucide-react';

export default function Layout() {
  const { t } = useTranslation();
  const { signOut, user, isSuperAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [userTrips, setUserTrips] = useState<{ id: string }[]>([]);
  const [isAuthorModalOpen, setIsAuthorModalOpen] = useState(false);
  const [isTimetableFullscreen, setIsTimetableFullscreen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Observe body class changes set by TimetableView
  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsTimetableFullscreen(document.body.classList.contains('timetable-fullscreen'));
    });
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (user) {
      fetchUserTrips();
    }
  }, [user]);

  const fetchUserTrips = async () => {
    try {
      const { data } = await supabase.from('trips').select('id');
      setUserTrips(data || []);
    } catch (error) {
      console.error('Error fetching user trips for nav:', error);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const isActive = (path: string) => {
    return location.pathname.startsWith(path);
  };

  const tripNav = userTrips.length === 1
    ? { to: `/trips/${userTrips[0].id}`, label: t('navigation.my_trip') }
    : { to: '/trips', label: t('navigation.my_trips') };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row">
      {/* Mobile Header */}
      <div className={clsx(
        "md:hidden flex items-center justify-between p-4 bg-slate-900 border-b border-slate-800 sticky top-0 z-40 transition-all duration-300",
        isTimetableFullscreen && "hidden"
      )}>
        <div className="flex items-center gap-2">
          <img src="/logo.png" className="w-8 h-8 rounded-lg" alt="Logo" />
          <span className="font-bold text-lg bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">FestPlanner</span>
        </div>
        <div className="flex items-center gap-1">
          <LanguageSwitcher />
          <button onClick={handleSignOut} className="p-2 text-slate-400 hover:text-white">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Desktop Sidebar */}
      <aside className={clsx(
        "hidden md:flex flex-col bg-slate-900 border-r border-slate-800 transition-all duration-300 fixed top-0 left-0 h-screen z-30 flex-shrink-0",
        sidebarCollapsed ? "w-16 p-3" : "w-64 p-6"
      )}>
        {/* Logo */}
        <div className={clsx(
          "flex items-center mb-10 overflow-hidden",
          sidebarCollapsed ? "justify-center" : "gap-3"
        )}>
          <img src="/logo.png" className="w-10 h-10 rounded-xl flex-shrink-0" alt="Logo" />
          {!sidebarCollapsed && (
            <span className="font-bold text-xl bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent whitespace-nowrap">
              FestPlanner
            </span>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-2">
          {!sidebarCollapsed && (
            <div className="pt-0 pb-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              {t('navigation.discover')}
            </div>
          )}
          <NavItem to="/" icon={<Calendar />} label={t('navigation.dashboard')} active={location.pathname === '/'} collapsed={sidebarCollapsed} />
          <NavItem to="/events" icon={<Tent />} label={t('navigation.events')} active={isActive('/events')} collapsed={sidebarCollapsed} />
          {isSuperAdmin && <NavItem to="/bands" icon={<Music />} label={t('navigation.bands')} active={isActive('/bands')} collapsed={sidebarCollapsed} />}
          <NavItem to={tripNav.to} icon={<Users />} label={tripNav.label} active={isActive(tripNav.to) || (tripNav.label === t('navigation.my_trips') && isActive('/trips'))} collapsed={sidebarCollapsed} />
        </nav>

        {/* Bottom actions */}
        <div className={clsx("mb-4 space-y-2", sidebarCollapsed && "flex flex-col items-center space-y-2")}>
          <button
            onClick={() => setIsAuthorModalOpen(true)}
            className={clsx(
              "flex items-center text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors",
              sidebarCollapsed ? "p-2 justify-center w-full" : "gap-3 px-3 py-2 w-full"
            )}
            title={sidebarCollapsed ? t('navigation.author') : undefined}
          >
            <Heart size={20} className="flex-shrink-0" />
            {!sidebarCollapsed && <span>{t('navigation.author')}</span>}
          </button>
          {!sidebarCollapsed && <LanguageSwitcher />}
        </div>

        {/* User + logout */}
        <div className={clsx("pt-4 border-t border-slate-800", sidebarCollapsed ? "flex flex-col items-center gap-3" : "")}>
          {!sidebarCollapsed && (
            <div className="flex items-center gap-3 mb-4 px-2">
              <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400 text-sm font-bold flex-shrink-0">
                {user?.email?.charAt(0).toUpperCase()}
              </div>
              <div className="overflow-hidden">
                <p className="text-sm font-medium truncate">{user?.email}</p>
              </div>
            </div>
          )}
          {sidebarCollapsed && (
            <div
              className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400 text-sm font-bold"
              title={user?.email}
            >
              {user?.email?.charAt(0).toUpperCase()}
            </div>
          )}
          <button
            onClick={handleSignOut}
            className={clsx(
              "flex items-center text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors",
              sidebarCollapsed ? "p-2 justify-center w-full" : "gap-3 px-3 py-2 w-full"
            )}
            title={sidebarCollapsed ? t('navigation.sign_out') : undefined}
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            {!sidebarCollapsed && <span>{t('navigation.sign_out')}</span>}
          </button>
        </div>

        {/* Collapse toggle — fixed to viewport center-left, aligned to sidebar edge */}
        <button
          onClick={() => setSidebarCollapsed(p => !p)}
          style={{ left: sidebarCollapsed ? '52px' : '252px' }}
          className="fixed top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-slate-800 border border-slate-600 text-slate-400 hover:text-white hover:bg-slate-700 flex items-center justify-center shadow-md transition-all duration-300 z-40"
          title={sidebarCollapsed ? 'Rozwiń sidebar' : 'Zwiń sidebar'}
        >
          {sidebarCollapsed
            ? <ChevronRight className="w-3.5 h-3.5" />
            : <ChevronLeft className="w-3.5 h-3.5" />
          }
        </button>
      </aside>

      {/* Main Content */}
      <main className={clsx(
        "flex-1 overflow-auto bg-slate-950 p-4 pb-24 md:p-8 md:pb-8 transition-all duration-300",
        sidebarCollapsed ? "md:ml-16" : "md:ml-64"
      )}>
        <Outlet />
        <PwaInstaller />
        <AuthorModal isOpen={isAuthorModalOpen} onClose={() => setIsAuthorModalOpen(false)} />
      </main>

      {/* Mobile Bottom Nav */}
      <div className={clsx(
        "md:hidden fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-800 flex justify-around p-3 z-50 safe-area-bottom transition-all duration-300",
        isTimetableFullscreen && "hidden"
      )}>
        <MobileNavItem to="/" icon={<Calendar />} label={t('navigation.home')} active={location.pathname === '/'} />
        <MobileNavItem to="/events" icon={<Tent />} label={t('navigation.events')} active={isActive('/events')} />
        {isSuperAdmin && <MobileNavItem to="/bands" icon={<Music />} label={t('navigation.bands')} active={isActive('/bands')} />}
        <MobileNavItem to={tripNav.to} icon={<Users />} label={t('navigation.trips')} active={isActive(tripNav.to) || (tripNav.label === t('navigation.my_trips') && isActive('/trips'))} />
        <button
          onClick={() => setIsAuthorModalOpen(true)}
          className="flex flex-col items-center gap-1 min-w-[4rem] text-slate-500 hover:text-slate-300"
        >
          <Heart size={24} />
          <span className="text-xs font-medium">{t('navigation.author')}</span>
        </button>
      </div>
    </div>
  );
}

function NavItem({ to, icon, label, active = false, collapsed = false }: {
  to: string;
  icon: React.ReactElement;
  label: string;
  active?: boolean;
  collapsed?: boolean;
}) {
  return (
    <Link
      to={to}
      title={collapsed ? label : undefined}
      className={clsx(
        "flex items-center rounded-lg transition-colors",
        collapsed ? "justify-center p-2" : "gap-3 px-3 py-2",
        active ? "bg-purple-500/10 text-purple-400" : "text-slate-400 hover:text-white hover:bg-slate-800"
      )}
    >
      {/* @ts-ignore */}
      {React.cloneElement(icon, { size: 20 })}
      {!collapsed && <span>{label}</span>}
    </Link>
  );
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
  );
}
