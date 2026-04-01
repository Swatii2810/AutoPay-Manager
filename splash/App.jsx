/**
 * App — root component
 * Manages splash → main app transition
 */
function App() {
  const [showSplash, setShowSplash] = React.useState(true);

  return (
    <div className="min-h-screen bg-white font-sans">
      {showSplash && (
        <SplashScreen onComplete={() => setShowSplash(false)} />
      )}

      {/* Main app content — visible beneath / after splash */}
      <main
        className="max-w-lg mx-auto px-5 py-8"
        style={{ opacity: showSplash ? 0 : 1, transition: 'opacity 0.4s ease-in' }}
      >
        {/* Hero CTA Card */}
        <div
          className="rounded-2xl p-8 text-center text-white mb-8"
          style={{
            background: 'linear-gradient(135deg, #3D5AFE, #6B8EFF)',
            boxShadow: '0 8px 24px rgba(61,90,254,0.3)',
          }}
        >
          <span
            className="inline-block px-4 py-1.5 rounded-full text-xs font-semibold mb-4"
            style={{ background: 'rgba(255,255,255,0.25)' }}
          >
            ⭐ PREMIUM
          </span>
          <h1 className="text-2xl font-bold mb-2">Start Your Free Trial</h1>
          <p className="text-sm font-light opacity-95 mb-6">
            Get full access to all premium features
          </p>
          <button className="bg-white text-brand font-bold px-8 py-3 rounded-full text-base hover:scale-105 transition-transform">
            1 Day <span className="font-light">Free Trial</span>
          </button>
        </div>

        {/* Features */}
        <div
          className="bg-white rounded-2xl p-6"
          style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}
        >
          <h2 className="text-lg font-semibold text-gray-900 mb-5">Premium Features</h2>
          {[
            { icon: '🔔', title: 'Instant Voice Alerts',      desc: 'Real-time voice notifications for every UPI transaction' },
            { icon: '🕐', title: 'Complete Payment History',  desc: 'Access detailed transaction records and customer info' },
            { icon: '🔄', title: 'Auto-Sync Payments',        desc: 'Automatic synchronization across all your UPI apps' },
            { icon: '🚫', title: 'Ad-Free Experience',        desc: 'Enjoy uninterrupted access to all premium tools' },
            { icon: '⚡', title: '21+ Apps Supported',        desc: 'Works with all major UPI payment platforms' },
          ].map(({ icon, title, desc }) => (
            <div key={title} className="flex gap-4 py-3 border-b border-gray-100 last:border-0">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-lg"
                style={{ background: '#EEF1FF' }}
              >
                {icon}
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Sticky CTA */}
        <div className="fixed bottom-5 left-0 right-0 px-5 max-w-lg mx-auto">
          <button
            className="w-full py-4 rounded-full text-white font-bold text-base flex items-center justify-center gap-2"
            style={{
              background: 'linear-gradient(135deg, #3D5AFE, #6B8EFF)',
              boxShadow: '0 4px 16px rgba(61,90,254,0.4)',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            START FREE TRIAL
          </button>
        </div>
      </main>
    </div>
  );
}
