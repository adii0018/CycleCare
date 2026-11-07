import { useEffect } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Skeleton } from '../components/ui/Skeleton';

export function ProtectedRoute() {
  const { status } = useAuth();

  useEffect(() => {
    // Add noindex meta tag on protected admin pages
    let metaTag = document.querySelector('meta[name="robots"]');
    if (!metaTag) {
      metaTag = document.createElement('meta');
      metaTag.name = 'robots';
      document.head.appendChild(metaTag);
    }
    metaTag.content = 'noindex, nofollow';

    return () => {
      if (metaTag) {
        metaTag.content = 'index, follow';
      }
    };
  }, []);

  if (status === 'loading') {
    return (
      <div className="min-h-[100dvh] bg-brand-bg p-6 flex flex-col items-center justify-center space-y-4">
        <Skeleton className="h-12 w-48 rounded-xl" />
        <Skeleton className="h-64 w-full max-w-lg rounded-2xl" />
      </div>
    );
  }

  if (status !== 'authenticated') {
    return <Navigate to="/admin/login" replace />;
  }

  return <Outlet />;
}
