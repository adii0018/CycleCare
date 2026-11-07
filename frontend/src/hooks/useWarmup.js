import { useState, useEffect } from 'react';
import { pingHealth } from '../services/healthApi';
import { WARMUP_THRESHOLD_MS } from '../lib/constants';

let globalWarmupPromise = null;
let globalReady = false;

export function useWarmup() {
  const [ready, setReady] = useState(globalReady);

  useEffect(() => {
    if (globalReady) {
      setReady(true);
      return;
    }

    if (!globalWarmupPromise) {
      globalWarmupPromise = (async () => {
        // Fire silent ping
        const pingPromise = pingHealth(WARMUP_THRESHOLD_MS).catch(() => null);

        // Fallback cap: Never block after WARMUP_THRESHOLD_MS
        const timeoutPromise = new Promise((resolve) =>
          setTimeout(resolve, WARMUP_THRESHOLD_MS)
        );

        await Promise.race([pingPromise, timeoutPromise]);
        globalReady = true;
      })();
    }

    globalWarmupPromise.then(() => {
      setReady(true);
    });
  }, []);

  return { ready };
}
