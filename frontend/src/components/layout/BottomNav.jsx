import { NavLink } from 'react-router-dom';
import { LayoutDashboard, ClipboardList, PlusCircle, Archive } from 'lucide-react';

export function BottomNav() {
  const navItems = [
    { to: '/admin', label: 'Overview', icon: LayoutDashboard, end: true },
    { to: '/admin/repairs', label: 'Records', icon: ClipboardList },
    { to: '/admin/new', label: 'New', icon: PlusCircle },
    { to: '/admin/archive', label: 'Archive', icon: Archive },
  ];

  return (
    <nav
      aria-label="Mobile Bottom Navigation"
      className="fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-md border-t border-brand-border z-40 lg:hidden pb-safe"
    >
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center flex-1 py-1 text-xs font-semibold select-none transition-colors duration-150 ${
                  isActive
                    ? 'text-brand-navy font-bold'
                    : 'text-brand-muted hover:text-brand-navy'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div
                    className={`p-1 rounded-xl transition-colors ${
                      isActive ? 'bg-brand-bg-secondary text-brand-navy' : ''
                    }`}
                  >
                    <Icon className="w-5 h-5" aria-hidden="true" />
                  </div>
                  <span className="mt-0.5">{item.label}</span>
                </>
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
