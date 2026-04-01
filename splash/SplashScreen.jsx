/**
 * SplashScreen Component
 * - Full-screen branded loader
 * - Follows splash-screen.md timing spec and ui-theme.md design system
 * - Props: onComplete() — called after fade-out finishes
 */
function SplashScreen({ onComplete }) {
  const [phase, setPhase] = React.useState('visible'); // 'visible' | 'fading'

  React.useEffect(() => {
    // After 2500ms total, start fade-out
    const fadeTimer = setTimeout(() => setPhase('fading'), 2500);
    // After fade-out (400ms), notify parent
    const doneTimer = setTimeout(() => onComplete?.(), 2900);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(doneTimer);
    };
  }, [onComplete]);

  return (
    <div
      className={[
        'fixed inset-0 z-50 flex flex-col items-center justify-center',
        'transition-opacity duration-400',
        phase === 'fading' ? 'animate-fade-out pointer-events-none' : 'animate-fade-in',
      ].join(' ')}
      style={{
        background: 'linear-gradient(135deg, #3D5AFE, #6B8EFF)',
      }}
      role="status"
      aria-label="Loading AutoPay Manager"
    >
      {/* Logo icon — scale-in animation */}
      <div className="animate-scale-in mb-6">
        <div
          className="w-24 h-24 rounded-2xl flex items-center justify-center"
          style={{
            background: 'rgba(255,255,255,0.2)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
          }}
        >
          {/* Payment / lightning bolt icon */}
          <svg
            width="48" height="48" viewBox="0 0 24 24"
            fill="none" stroke="white" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round"
          >
            <rect x="2" y="5" width="20" height="14" rx="3" />
            <path d="M2 10h20" />
            <path d="M6 15h4" />
            <path d="M14 15h2" />
          </svg>
        </div>
      </div>

      {/* App name — fade-in */}
      <h1
        className="animate-fade-in text-white text-3xl font-bold tracking-tight mb-2"
        style={{ textShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
      >
        AutoPay Manager
      </h1>

      {/* Tagline — delayed fade-in */}
      <p
        className="opacity-0-init text-white text-base font-light tracking-wide"
        style={{ animation: 'fade-in 0.4s ease-in 0.5s forwards' }}
      >
        Smart Payments. Zero Hassle.
      </p>

      {/* Progress bar */}
      <div className="absolute bottom-12 w-48 h-1.5 rounded-full bg-white/30 overflow-hidden">
        <div
          className="h-full rounded-full bg-white animate-progress"
          style={{ width: '0%' }}
        />
      </div>
    </div>
  );
}
