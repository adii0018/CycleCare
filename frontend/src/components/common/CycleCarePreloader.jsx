/**
 * CycleCarePreloader
 * CycleCare by Rajput Auto Garage – "The CycleCare Wheel"
 *
 * Requires: react (>=18), framer-motion, tailwindcss
 *
 * Usage:
 *   <CycleCarePreloader isLoading={loading} />
 *
 * Props:
 *   isLoading   boolean   Show while true; fades out when it becomes false.
 *   minDuration number    Minimum ms the preloader stays visible so the brand
 *                         sequence always completes (default 2600). Use 0 to
 *                         disable.
 *   onExited    function  Called after the exit animation has finished.
 *   className   string    Extra classes for the overlay.
 */

import { useEffect, useId, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';

/* ------------------------------------------------------------------ */
/* Geometry (computed once, outside render)                            */
/* ------------------------------------------------------------------ */

const C = 140; // centre of the 280 x 280 viewBox
const fmt = (n) => n.toFixed(2);
const point = (r, a) => [C + r * Math.cos(a), C + r * Math.sin(a)];
const pt = (r, a) => {
  const [x, y] = point(r, a);
  return `${fmt(x)} ${fmt(y)}`;
};

/** Toothed outer ring (chainring-style gear) as a single closed path. */
const buildGear = (teeth = 28, rRoot = 118, rTip = 127) => {
  const step = (Math.PI * 2) / teeth;
  const start = -Math.PI / 2;
  let d = `M${pt(rRoot, start - step * 0.5)}`;
  for (let i = 0; i < teeth; i++) {
    const a = start + i * step;
    d +=
      `L${pt(rRoot, a - step * 0.28)}` +
      `L${pt(rTip, a - step * 0.17)}` +
      `L${pt(rTip, a + step * 0.17)}` +
      `L${pt(rRoot, a + step * 0.28)}` +
      `L${pt(rRoot, a + step * 0.5)}`;
  }
  return `${d}Z`;
};

/** Tangent-laced spokes: alternating lean creates the crossed-wire look. */
const buildSpokes = (count = 16, rHub = 11, rRim = 94) =>
  Array.from({ length: count }, (_, i) => {
    const a = (i / count) * Math.PI * 2 - Math.PI / 2;
    const lean = (i % 2 ? 1 : -1) * 0.42;
    const [x1, y1] = point(rHub, a);
    const [x2, y2] = point(rRim, a + lean);
    return { x1: fmt(x1), y1: fmt(y1), x2: fmt(x2), y2: fmt(y2) };
  });

const GEAR_PATH = buildGear();
const SPOKES = buildSpokes();

/* ------------------------------------------------------------------ */
/* Styles (scoped with the cc- prefix)                                 */
/* The un-animated state is the finished state, so reduced-motion      */
/* users simply see the completed wheel.                               */
/* ------------------------------------------------------------------ */

const CSS = `
.cc-draw{stroke-dasharray:1;animation:cc-draw var(--d,1s) var(--delay,0s) cubic-bezier(.65,0,.35,1) both}
@keyframes cc-draw{from{stroke-dashoffset:1;opacity:0}8%{opacity:1}to{stroke-dashoffset:0;opacity:1}}

.cc-gear{transform-origin:${C}px ${C}px;animation:cc-spin 26s linear infinite}
.cc-orbit{transform-origin:${C}px ${C}px;opacity:0;animation:cc-show .4s 1.15s ease-out forwards,cc-spin 1.9s 1.15s linear infinite}
@keyframes cc-spin{to{transform:rotate(360deg)}}
@keyframes cc-show{to{opacity:1}}

.cc-hub{transform-origin:${C}px ${C}px;animation:cc-pop .55s 1.35s cubic-bezier(.22,1,.36,1) both}
@keyframes cc-pop{from{opacity:0;transform:scale(.6)}to{opacity:1;transform:scale(1)}}

.cc-bar{position:relative;overflow:hidden}
.cc-bar-fill{transform-origin:left center;animation:cc-fill 2.4s cubic-bezier(.4,0,.2,1) both}
@keyframes cc-fill{from{transform:scaleX(0)}to{transform:scaleX(1)}}
.cc-bar::after{content:"";position:absolute;inset:0 auto 0 0;width:30%;
  background:linear-gradient(90deg,transparent,rgba(255,255,255,.75),transparent);
  transform:translateX(-100%);animation:cc-sheen 1.8s 1s ease-in-out infinite}
@keyframes cc-sheen{to{transform:translateX(420%)}}

@media (prefers-reduced-motion:reduce){
  .cc-draw,.cc-gear,.cc-hub,.cc-bar-fill,.cc-bar::after{animation:none!important}
  .cc-orbit{animation:none!important;opacity:0}
}
`;

const EASE = [0.22, 1, 0.36, 1];

/* ------------------------------------------------------------------ */
/* Wheel                                                               */
/* ------------------------------------------------------------------ */

function Wheel({ uid }) {
  return (
    <svg
      viewBox="0 0 280 280"
      className="h-full w-full"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id={`${uid}-rim`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#38BDF8" />
          <stop offset="1" stopColor="#22D3EE" />
        </linearGradient>
        <linearGradient id={`${uid}-gear`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#8FA8F0" />
          <stop offset="1" stopColor="#B7A9F5" />
        </linearGradient>
      </defs>

      {/* Outer gear – draws itself, then rotates slowly */}
      <g className="cc-gear">
        <path
          pathLength="1"
          d={GEAR_PATH}
          className="cc-draw"
          style={{ '--d': '1.1s', '--delay': '0.1s' }}
          stroke={`url(#${uid}-gear)`}
          strokeWidth="1.8"
          strokeLinejoin="round"
          fill="rgba(167,139,250,0.07)"
        />
      </g>

      {/* Tire */}
      <circle
        cx={C}
        cy={C}
        r="106"
        pathLength="1"
        transform={`rotate(-90 ${C} ${C})`}
        className="cc-draw"
        style={{ '--d': '1s', '--delay': '0.05s' }}
        stroke="#0B1F4B"
        strokeWidth="6"
      />

      {/* Rim */}
      <circle
        cx={C}
        cy={C}
        r="94"
        pathLength="1"
        transform={`rotate(-90 ${C} ${C})`}
        className="cc-draw"
        style={{ '--d': '0.9s', '--delay': '0.25s' }}
        stroke={`url(#${uid}-rim)`}
        strokeWidth="2.5"
      />

      {/* Spokes – assembled one by one */}
      {SPOKES.map((s, i) => (
        <line
          key={i}
          {...s}
          pathLength="1"
          className="cc-draw"
          style={{ '--d': '0.45s', '--delay': `${(0.45 + i * 0.045).toFixed(3)}s` }}
          stroke="#4F8EF7"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      ))}

      {/* Hub */}
      <g className="cc-hub">
        <circle cx={C} cy={C} r="10" fill="#0B1F4B" />
        <circle cx={C} cy={C} r="10" stroke="#38BDF8" strokeWidth="1.5" />
        <circle cx={C} cy={C} r="3.5" fill="#22D3EE" />
      </g>

      {/* Cyan highlight travelling the tire */}
      <g className="cc-orbit">
        <circle
          cx={C}
          cy={C}
          r="106"
          pathLength="1"
          transform={`rotate(-90 ${C} ${C})`}
          stroke="#22D3EE"
          strokeOpacity="0.28"
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray="0.1 0.9"
        />
        <circle
          cx={C}
          cy={C}
          r="106"
          pathLength="1"
          transform={`rotate(-90 ${C} ${C})`}
          stroke="#22D3EE"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray="0.1 0.9"
        />
      </g>
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Preloader                                                           */
/* ------------------------------------------------------------------ */

export default function CycleCarePreloader({
  isLoading = true,
  minDuration = 2600,
  onExited,
  className = '',
}) {
  const reduced = useReducedMotion();
  const uid = useId().replace(/:/g, '');
  const [show, setShow] = useState(isLoading);
  const startedAt = useRef(0);

  // Show / hide, honouring the minimum display time so the sequence finishes.
  useEffect(() => {
    if (startedAt.current === 0) {
      startedAt.current = Date.now();
    }
    if (isLoading) {
      startedAt.current = Date.now();
      setShow(true);
      return undefined;
    }
    const elapsed = Date.now() - startedAt.current;
    const wait = reduced ? 0 : Math.max(0, minDuration - elapsed);
    const t = setTimeout(() => setShow(false), wait);
    return () => clearTimeout(t);
  }, [isLoading, minDuration, reduced]);

  // Lock background scroll without shifting layout (compensate scrollbar).
  useEffect(() => {
    if (!show) return undefined;
    const { body, documentElement } = document;
    const prevOverflow = body.style.overflow;
    const prevPadding = body.style.paddingRight;
    const scrollbar = window.innerWidth - documentElement.clientWidth;
    body.style.overflow = 'hidden';
    if (scrollbar > 0) body.style.paddingRight = `${scrollbar}px`;
    return () => {
      body.style.overflow = prevOverflow;
      body.style.paddingRight = prevPadding;
    };
  }, [show]);

  const enter = (delay, duration = 0.7) =>
    reduced ? { duration: 0.2 } : { delay, duration, ease: EASE };

  return (
    <AnimatePresence onExitComplete={onExited}>
      {show && (
        <motion.div
          key="cyclecare-preloader"
          role="status"
          aria-live="polite"
          aria-busy="true"
          className={`fixed inset-0 z-[9999] flex min-h-[100dvh] flex-col items-center justify-center overflow-hidden px-6 select-none ${className}`}
          style={{
            background:
              'radial-gradient(60% 45% at 50% 42%, rgba(125,211,252,0.28), transparent 70%), linear-gradient(160deg, #F7FAFF 0%, #EDF5FF 55%, #F4F2FF 100%)',
            fontFamily:
              '"Plus Jakarta Sans", "Inter", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
          }}
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduced ? 0.2 : 0.6, ease: [0.4, 0, 0.2, 1] }}
        >
          <style>{CSS}</style>
          <span className="sr-only">Loading CycleCare</span>

          <motion.div
            className="flex flex-col items-center text-center max-w-sm w-full mx-auto"
            exit={{ opacity: 0, scale: reduced ? 1 : 1.03 }}
            transition={{ duration: reduced ? 0.2 : 0.5, ease: [0.4, 0, 0.2, 1] }}
          >
            {/* Wheel */}
            <motion.div
              className="aspect-square w-[clamp(160px,44vmin,240px)] mx-auto"
              initial={reduced ? false : { opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={reduced ? { duration: 0 } : { duration: 0.6, ease: EASE }}
            >
              <Wheel uid={uid} />
            </motion.div>

            {/* Wordmark */}
            <motion.h1
              className="mt-5 text-[clamp(1.85rem,7.5vw,3rem)] font-extrabold leading-none tracking-tight text-[#0B1F4B] sm:mt-7"
              initial={reduced ? false : { opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={enter(1.5)}
            >
              Cycle
              <span className="bg-gradient-to-r from-[#1E5FE0] to-[#0891B2] bg-clip-text text-transparent">
                Care
              </span>
            </motion.h1>

            {/* Attribution */}
            <motion.p
              className="mt-2 text-[clamp(0.75rem,2.4vw,0.875rem)] font-medium tracking-wide text-[#53688F]"
              initial={reduced ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={enter(1.75, 0.6)}
            >
              by Rajput Auto Garage
            </motion.p>

            {/* Tagline */}
            <motion.p
              className="mt-4 text-[clamp(0.85rem,2.6vw,1rem)] font-medium text-[#2F4A7D] sm:mt-5"
              initial={reduced ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={enter(2.05, 0.7)}
            >
              Your Cycle, Our Care.
            </motion.p>
          </motion.div>

          {/* Loading line */}
          <div
            className="cc-bar absolute inset-x-0 bottom-0 h-[3px] bg-[#DCE7F8]"
            aria-hidden="true"
          >
            <div className="cc-bar-fill h-full w-full bg-gradient-to-r from-[#22D3EE] via-[#38A9F8] to-[#2F6FEB]" />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
