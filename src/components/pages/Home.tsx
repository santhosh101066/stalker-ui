import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Play, Shield, Tv, Sparkles, ChevronRight, Bug, Rocket, AlertCircle } from 'lucide-react';
import { isTizenDevice } from '@/utils/helpers';

export default function Home() {
  const { isLoggedIn } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isTizenDevice()) {
      navigate('/login');
    }
  }, [navigate]);

  const handleLaunch = () => {
    if (isLoggedIn) {
      navigate('/');
    } else {
      navigate('/login');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-slate-950 to-indigo-950 text-gray-100 flex flex-col justify-between selection:bg-indigo-500 selection:text-white">
      {/* Top Navbar */}
      <header className="px-6 py-5 border-b border-gray-800/40 backdrop-blur-md sticky top-0 z-50 flex items-center justify-between">
        <div className="flex items-center">
          <img
            src="stalker-logo.svg"
            className="w-24 sm:w-28 md:w-36 cursor-pointer"
            alt="Stalker Logo"
            onClick={() => navigate('/')}
          />
        </div>
        
        <div>
          {isLoggedIn ? (
            <button
              onClick={() => navigate('/')}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm transition-all duration-300 shadow-md shadow-indigo-600/10 hover:shadow-indigo-500/20 hover:scale-[1.02] flex items-center space-x-2"
            >
              <span>TV Portal</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={() => navigate('/login')}
              className="px-5 py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700/80 text-gray-200 font-medium text-sm transition-all duration-300 border border-gray-700/50 hover:scale-[1.02]"
            >
              Sign In
            </button>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-grow flex items-center py-16 px-6 max-w-6xl mx-auto w-full">
        <div className="grid md:grid-cols-12 gap-12 items-center w-full">
          <div className="md:col-span-7 space-y-8 text-left">
            <div className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-xs font-semibold text-indigo-400">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Next-Gen IPTV Client</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight">
              A Premium Hub for{' '}
              <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
                Stalker Streams
              </span>
            </h1>

            <p className="text-gray-400 text-lg leading-relaxed max-w-xl">
              Connect your Stalker middleware or Xtream codes provider and enjoy seamless live television, high-definition movies, and serials in a responsive, gorgeous, and dynamic interface optimized for both Web and Smart TVs.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 pt-2">
              <button
                onClick={handleLaunch}
                className="px-8 py-4 rounded-2xl bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-400 hover:to-violet-500 text-white font-semibold text-base transition-all duration-300 shadow-xl shadow-indigo-500/20 hover:shadow-indigo-500/30 hover:scale-[1.03] flex items-center justify-center space-x-3 cursor-pointer"
              >
                <Play className="w-5 h-5 fill-current" />
                <span>{isLoggedIn ? 'Launch TV Portal' : 'Start Watching Now'}</span>
              </button>
              
              {!isLoggedIn && (
                <button
                  onClick={() => navigate('/verify')}
                  className="px-8 py-4 rounded-2xl bg-gray-900/60 hover:bg-gray-800/80 text-gray-200 font-semibold text-base transition-all duration-300 border border-gray-850 hover:scale-[1.02] flex items-center justify-center space-x-2 cursor-pointer"
                >
                  <span>Authorize TV Device</span>
                </button>
              )}
            </div>
          </div>

          <div className="md:col-span-5 relative hidden md:block">
            <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-indigo-500 to-violet-600 opacity-20 blur-2xl"></div>
            <div className="relative border border-gray-800 bg-gray-900/60 backdrop-blur-md rounded-3xl p-6 shadow-2xl overflow-hidden aspect-[4/3] flex flex-col justify-between">
              <div className="flex items-center justify-between border-b border-gray-850 pb-4">
                <div className="flex space-x-2">
                  <div className="w-3.5 h-3.5 rounded-full bg-red-500/80"></div>
                  <div className="w-3.5 h-3.5 rounded-full bg-yellow-500/80"></div>
                  <div className="w-3.5 h-3.5 rounded-full bg-green-500/80"></div>
                </div>
                <div className="w-16 h-3 rounded-full bg-gray-800"></div>
              </div>

              <div className="flex-grow flex items-center justify-center">
                <div className="text-center space-y-3">
                  <div className="w-16 h-16 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mx-auto text-indigo-400">
                    <Tv className="w-8 h-8" />
                  </div>
                  <div className="text-sm font-semibold tracking-wide text-gray-300">Smart TV Ready</div>
                  <div className="text-xs text-gray-500 max-w-[200px]">Optimized keyboard and remote controller navigation.</div>
                </div>
              </div>

              <div className="border-t border-gray-850 pt-4 flex justify-between items-center text-xs text-gray-500">
                <span>Cloud Sync Enabled</span>
                <span>Active Profile</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Features List */}
      <section className="bg-gray-950/40 border-t border-gray-900/80 py-16 px-6">
        <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-8">
          <div className="bg-gray-900/40 border border-gray-850 rounded-2xl p-6 text-left space-y-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Sparkles className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-lg">Cloud Synchronization</h3>
            <p className="text-gray-400 text-sm leading-relaxed">
              Your favorites list, channel recents, and watch progress are synced on the fly to your personal user account.
            </p>
          </div>

          <div className="bg-gray-900/40 border border-gray-850 rounded-2xl p-6 text-left space-y-4">
            <div className="w-12 h-12 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400">
              <Tv className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-lg">QR Device Authorization</h3>
            <p className="text-gray-400 text-sm leading-relaxed">
              No tedious passwords typing on TV screens. Simply scan the generated QR code with your mobile device and log in instantly.
            </p>
          </div>

          <div className="bg-gray-900/40 border border-gray-850 rounded-2xl p-6 text-left space-y-4">
            <div className="w-12 h-12 rounded-xl bg-fuchsia-500/10 border border-fuchsia-500/20 flex items-center justify-center text-fuchsia-400">
              <Shield className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-lg">Unified Media Center</h3>
            <p className="text-gray-400 text-sm leading-relaxed">
              Consolidate your Stalker middleware and Xtream Codes TV streams and VOD libraries in one single, high-performance platform.
            </p>
          </div>
        </div>
      </section>

      {/* Tracker: Known Bugs & Upcoming Features */}
      <section className="bg-gray-950/80 border-t border-gray-900 py-16 px-6">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12">
          
          {/* Known Bugs Column */}
          <div className="space-y-6 text-left">
            <div className="flex items-center space-x-3 border-b border-gray-850 pb-3">
              <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20">
                <Bug className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-bold tracking-wide">Known System Bugs</h2>
            </div>
            
            <div className="space-y-3.5">
              <div className="flex items-start space-x-3 bg-slate-900/30 border border-gray-850/60 p-4 rounded-xl">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <p className="text-sm text-gray-400 leading-normal">
                  <strong className="text-gray-200">Continue Watching Delay:</strong> Progress tiles may occasionally ghost or cache incorrectly under edge network loops.
                </p>
              </div>

              <div className="flex items-start space-x-3 bg-slate-900/30 border border-gray-850/60 p-4 rounded-xl">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <p className="text-sm text-gray-400 leading-normal">
                  <strong className="text-gray-200">History Reset Flow:</strong> Clear Data trigger does not completely scrub the interactive Continue Watching active cache files.
                </p>
              </div>

              <div className="flex items-start space-x-3 bg-slate-900/30 border border-gray-850/60 p-4 rounded-xl">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <p className="text-sm text-gray-400 leading-normal">
                  <strong className="text-gray-200">Category Sorting & Desync:</strong> Last viewed category configurations are pulled from local storage and may not accurately match state changes across multi-device logins.
                </p>
              </div>

              <div className="flex items-start space-x-3 bg-slate-900/30 border border-gray-850/60 p-4 rounded-xl">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <p className="text-sm text-gray-400 leading-normal">
                  <strong className="text-gray-200">Google Registration Warning:</strong> New non-pre-registered email log-ins show up with generic error styling rather than an explicit access submission confirmation state.
                </p>
              </div>

              <div className="flex items-start space-x-3 bg-slate-900/30 border border-gray-850/60 p-4 rounded-xl">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <p className="text-sm text-gray-400 leading-normal">
                  <strong className="text-gray-200">Autoplay Hook initialization:</strong> Next episode auto-progression loop fails on content launched from Continue Watching unless the first chapter is selected manually.
                </p>
              </div>
            </div>
          </div>

          {/* Upcoming Features Column */}
          <div className="space-y-6 text-left">
            <div className="flex items-center space-x-3 border-b border-gray-850 pb-3">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Rocket className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-bold tracking-wide">Upcoming Features</h2>
            </div>

            <div className="space-y-4">
              <div className="relative pl-6 border-l-2 border-indigo-500/30 space-y-1">
                <div className="absolute -left-[5px] top-1 w-2 h-2 rounded-full bg-indigo-400 shadow-[0_0_8px_rgba(129,140,248,0.8)]"></div>
                <h4 className="text-sm font-semibold text-gray-200">Advanced Multi-Device Sync</h4>
                <p className="text-xs text-gray-400 leading-relaxed">Migrating local storage arrays into cloud configurations for instantaneous state replication.</p>
              </div>

              <div className="relative pl-6 border-l-2 border-indigo-500/30 space-y-1">
                <div className="absolute -left-[5px] top-1 w-2 h-2 rounded-full bg-indigo-400"></div>
                <h4 className="text-sm font-semibold text-gray-200">Expanded TV Browser Support</h4>
                <p className="text-xs text-gray-400 leading-relaxed">Optimizing responsive controls and layouts for generic internal web applications on smart televisions.</p>
              </div>

              <div className="relative pl-6 border-l-2 border-indigo-500/30 space-y-1">
                <div className="absolute -left-[5px] top-1 w-2 h-2 rounded-full bg-indigo-400"></div>
                <h4 className="text-sm font-semibold text-gray-200">User Feature Request Pipeline</h4>
                <p className="text-xs text-gray-400 leading-relaxed">Direct community implementation board allowing viewers to submit and upvote client modifications.</p>
              </div>

              <div className="relative pl-6 border-l-2 border-indigo-500/30 space-y-1">
                <div className="absolute -left-[5px] top-1 w-2 h-2 rounded-full bg-indigo-400"></div>
                <h4 className="text-sm font-semibold text-gray-200">Centralized Bug Report Collection</h4>
                <p className="text-xs text-gray-400 leading-relaxed">Automated exception logging to capture interface issues and improve application stability.</p>
              </div>

              <div className="relative pl-6 border-l-2 border-indigo-500/30 space-y-1">
                <div className="absolute -left-[5px] top-1 w-2 h-2 rounded-full bg-indigo-400"></div>
                <h4 className="text-sm font-semibold text-gray-200">Push Notification Engine</h4>
                <p className="text-xs text-gray-400 leading-relaxed">Real-time inside-app banners and notifications regarding admin approvals, maintenance logs, or fresh updates.</p>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* Footer */}
      <footer className="py-6 border-t border-gray-900 text-center text-xs text-gray-500 bg-gray-950">
        <p>&copy; {new Date().getFullYear()} Stalker VOD Portal. All Rights Reserved.</p>
      </footer>
    </div>
  );
}