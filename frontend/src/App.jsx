import { BrowserRouter } from 'react-router-dom';
import { LazyMotion, domAnimation, MotionConfig } from 'framer-motion';
import { Toaster } from 'sonner';
import { AuthProvider } from './context/AuthContext';
import { AppRoutes } from './routes/AppRoutes';
import { useWarmup } from './hooks/useWarmup';

export default function App() {
  // Silent health check warming up free-tier backend; exposes ready boolean for future preloader
  const { ready: _ready } = useWarmup();

  return (
    <LazyMotion features={domAnimation}>
      <MotionConfig reducedMotion="user">
        <BrowserRouter>
          <AuthProvider>
            {/*
              =============================================================
              PRELOADER MOUNT POINT (to be added by the owner)
              Example future usage:
              <CycleCarePreloader ready={ready}>
                <AppRoutes />
              </CycleCarePreloader>
              =============================================================
            */}
            <AppRoutes />
            <Toaster
              position="top-center"
              richColors
              closeButton
              toastOptions={{
                duration: 4000,
                style: {
                  borderRadius: '16px',
                  fontFamily: 'inherit',
                },
              }}
            />
          </AuthProvider>
        </BrowserRouter>
      </MotionConfig>
    </LazyMotion>
  );
}
