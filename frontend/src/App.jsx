import { useState } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { LazyMotion, domAnimation, MotionConfig, motion } from 'framer-motion';
import { Toaster } from 'sonner';
import { AuthProvider } from './context/AuthContext';
import { AppRoutes } from './routes/AppRoutes';
import { useWarmup } from './hooks/useWarmup';
import CycleCarePreloader from './components/common/CycleCarePreloader';

export default function App() {
  const { ready } = useWarmup();
  const [preloaderExited, setPreloaderExited] = useState(false);

  return (
    <LazyMotion features={domAnimation}>
      <MotionConfig reducedMotion="user">
        <BrowserRouter>
          <AuthProvider>
            {/* The CycleCare Wheel Brand Preloader */}
            <CycleCarePreloader
              isLoading={!ready}
              minDuration={2400}
              onExited={() => setPreloaderExited(true)}
            />

            {/* Main App Content - reveals with a smooth entrance animation after preloader */}
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.99 }}
              animate={
                preloaderExited
                  ? { opacity: 1, y: 0, scale: 1 }
                  : { opacity: 0, y: 10, scale: 0.99 }
              }
              transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
              className="min-h-[100dvh]"
            >
              <AppRoutes />
            </motion.div>

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
