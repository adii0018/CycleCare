import { NavLink, useNavigate, Outlet } from 'react-router-dom';
import {
  Wrench,
  LayoutDashboard,
  ClipboardList,
  PlusCircle,
  Archive,
  LogOut,
  PhoneCall,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { BottomNav } from './BottomNav';
import { toast } from 'sonner';

export function AdminLayout() {
  const { admin, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    toast.success('Logged out successfully');
    navigate('/admin/login');
  };

  const navLinks = [
    { to: '/admin', label: 'Overview', icon: LayoutDashboard, end: true },
    { to: '/admin/repairs', label: 'Repair Records', icon: ClipboardList },
    { to: '/admin/new', label: 'New Walk-in', icon: PlusCircle },
    { to: '/admin/archive', label: 'Archived Records', icon: Archive },
  ];

  return (
    <div className="min-h-[100dvh] bg-brand-bg flex flex-col lg:flex-row">
      {/* Desktop Left Sidebar (>=1024px) */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 bg-white border-r border-brand-border h-[100dvh] sticky top-0 p-5 justify-between flex-shrink-0 z-30">
        <div className="space-y-6">
          {/* Brand */}
          <div className="flex items-center gap-3 px-2">
            <div className="w-10 h-10 rounded-xl bg-brand-navy flex items-center justify-center text-brand-sky shadow-sm">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-brand-navy tracking-tight leading-none">
                CycleCare
              </h2>
              <span className="text-[11px] font-semibold text-brand-muted uppercase tracking-wider">
                Admin Panel
              </span>
            </div>
          </div>

          {/* Nav links */}
          <nav className="space-y-1.5" aria-label="Desktop Sidebar Navigation">
            {navLinks.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-colors duration-150 ${
                      isActive
                        ? 'bg-brand-bg-secondary text-brand-navy border border-brand-sky/40 font-bold'
                        : 'text-brand-muted hover:bg-gray-50 hover:text-brand-navy'
                    }`
                  }
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Admin info & Logout */}
        <div className="pt-4 border-t border-brand-border space-y-3">
          {admin?.mobile && (
            <div className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-brand-muted bg-gray-50 rounded-lg">
              <PhoneCall className="w-3.5 h-3.5" />
              <span>+91 {admin.mobile}</span>
            </div>
          )}
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-semibold text-brand-error hover:bg-red-50 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Mobile Top Header (<1024px) */}
      <header className="lg:hidden bg-white border-b border-brand-border sticky top-0 z-30 px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-brand-navy flex items-center justify-center text-brand-sky shadow-sm">
            <Wrench className="w-4 h-4" />
          </div>
          <span className="font-bold text-brand-navy text-base">CycleCare</span>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          aria-label="Logout"
          className="p-2 text-brand-muted hover:text-brand-error rounded-lg"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 pb-24 lg:pb-8 max-w-6xl w-full mx-auto overflow-x-hidden">
        <Outlet />
      </main>

      {/* Mobile Bottom Navigation (<1024px) */}
      <BottomNav />
    </div>
  );
}
