import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Play, Shield, Tv, Sparkles, ChevronRight } from 'lucide-react';
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
            {/* Visual element representing TV portal screen mockup */}
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
      <section className="bg-gray-950/60 border-t border-gray-900 py-16 px-6">
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

      {/* Footer */}
      <footer className="py-6 border-t border-gray-900 text-center text-xs text-gray-500">
        <p>&copy; {new Date().getFullYear()} Stalker VOD Portal. All Rights Reserved.</p>
      </footer>
    </div>
  );
}
