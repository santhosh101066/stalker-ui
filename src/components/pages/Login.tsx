import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/services/api';
import { toast } from 'react-toastify';
import { Loader2, RefreshCw, KeyRound, Mail, ShieldAlert, User } from 'lucide-react';
import { isTizenDevice } from '@/utils/helpers';

interface DeviceCodeResponse {
  deviceCode: string;
  userCode: string;
  verificationUrl: string;
  expiresIn: number;
}

export default function Login() {
  const { isLoggedIn, loginWithGoogle, loginWithCredentials } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectPath = searchParams.get('redirect') || '/';

  // State for credentials login / signup
  const [isSignUp, setIsSignUp] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [credsLoading, setCredsLoading] = useState(false);
  const [credsError, setCredsError] = useState<string | null>(null);
  const [signupSuccess, setSignupSuccess] = useState<string | null>(null);

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCredsError(null);
    setSignupSuccess(null);

    if (isSignUp) {
      if (!nameInput.trim() || !emailInput.trim() || !passwordInput) {
        toast.error('Full Name, email and password are required');
        return;
      }
      if (passwordInput.length < 6) {
        toast.error('Password must be at least 6 characters');
        return;
      }
      setCredsLoading(true);
      try {
        const response = await api.post<{ success: boolean; message: string }>('/auth/signup', {
          name: nameInput.trim(),
          email: emailInput.trim(),
          password: passwordInput,
        });
        toast.success(response.data.message || 'Signup successful!');
        setSignupSuccess(response.data.message || 'Signup successful! Please wait for administrator approval.');
        setNameInput('');
        setPasswordInput('');
      } catch (err) {
        const error = err as Error;
        let message = error.message;
        if (message.includes('Request failed:')) {
          message = 'Signup failed. Email might already be registered or inputs are invalid.';
        }
        setCredsError(message || 'Signup failed');
      } finally {
        setCredsLoading(false);
      }
    } else {
      if (!emailInput.trim() || !passwordInput) {
        toast.error('Email and password are required');
        return;
      }
      setCredsLoading(true);
      try {
        await loginWithCredentials(emailInput.trim(), passwordInput);
        toast.success('Successfully logged in!');
        navigate(redirectPath);
      } catch (err) {
        const error = err as Error;
        let message = error.message;
        if (message.includes('403')) {
          message = 'Your account is pending administrator approval.';
        } else if (message.includes('401')) {
          message = 'Invalid email or password.';
        } else if (message.includes('400')) {
          message = 'Please login using Google Sign-In or contact support.';
        }
        setCredsError(message || 'Invalid email or password');
      } finally {
        setCredsLoading(false);
      }
    }
  };

  const toggleMode = () => {
    setIsSignUp(!isSignUp);
    setCredsError(null);
    setSignupSuccess(null);
    setNameInput('');
    setPasswordInput('');
  };

  // Automatically forward if already logged in
  useEffect(() => {
    if (isLoggedIn) {
      navigate(redirectPath);
    }
  }, [isLoggedIn, navigate, redirectPath]);

  // Auto-detect TV or Web view
  const activeTab = isTizenDevice() ? 'tv' : 'web';

  // Google Sign-In button rendering
  const googleBtnRef = useRef<HTMLDivElement | null>(null);
  const [googleLoading, setGoogleLoading] = useState(false);

  // TV Device flow state
  const [deviceFlow, setDeviceFlow] = useState<DeviceCodeResponse | null>(null);
  const [deviceStatus, setDeviceStatus] = useState<'pending' | 'expired' | 'loading'>('loading');
  const pollIntervalRef = useRef<number | null>(null);

  interface GoogleCredentialResponse {
    credential: string;
  }

  // Handle Google Token Callback
  const handleCredentialResponse = useCallback(async (response: GoogleCredentialResponse) => {
    setGoogleLoading(true);
    try {
      await loginWithGoogle(response.credential);
      toast.success('Successfully logged in!');
      navigate(redirectPath);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      // Extract the exact error message sent from the backend response
      const backendMessage = err.response?.data?.error;
      const defaultMessage = err.message || 'Authentication failed. Make sure your email is pre-registered.';

      // Prioritize displaying the backend message if it exists
      if (backendMessage) {
        // You can change this to toast.info if you want it to look less like a critical error
        toast.error(backendMessage); 
      } else {
        toast.error(defaultMessage);
      }
    } finally {
      setGoogleLoading(false);
    }
  }, [loginWithGoogle, navigate, redirectPath]);

  // Setup Google Sign-in button
  useEffect(() => {
    if (activeTab !== 'web' || isLoggedIn || isSignUp) return;

    const win = window as typeof window & {
      google?: {
        accounts?: {
          id?: {
            initialize: (config: { client_id: string; callback: (res: GoogleCredentialResponse) => void }) => void;
            renderButton: (el: HTMLElement, opts: { theme: string; size: string; text: string; shape: string; width: string }) => void;
          };
        };
      };
    };

    const initGoogle = () => {
      if (win.google?.accounts?.id) {
        clearInterval(checkInterval);
        win.google.accounts.id.initialize({
          client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
          callback: handleCredentialResponse,
        });

        if (googleBtnRef.current) {
          win.google.accounts.id.renderButton(googleBtnRef.current, {
            theme: 'filled_blue',
            size: 'large',
            text: 'signin_with',
            shape: 'rectangular',
            width: '280',
          });
        }
      }
    };

    // Poll for the Google SDK script load
    const checkInterval = setInterval(initGoogle, 100);
    return () => clearInterval(checkInterval);
  }, [activeTab, isLoggedIn, isSignUp, handleCredentialResponse]);

  // Poll server for device authorization status
  const startPolling = useCallback((deviceCode: string) => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);

    pollIntervalRef.current = window.setInterval(async () => {
      try {
        const response = await api.post<{ status: 'pending' | 'authorized' | 'expired'; accessToken?: string; refreshToken?: string; user?: { id: number; email: string; name: string; role: string } }>('/auth/device/poll', {
          deviceCode,
        });

        if (response.data) {
          const { status, accessToken, refreshToken, user } = response.data;
          if (status === 'authorized' && accessToken && refreshToken && user) {
            clearInterval(pollIntervalRef.current!);
            
            // Set context auth state
            localStorage.setItem('auth_token', accessToken);
            localStorage.setItem('refresh_token', refreshToken);
            localStorage.setItem('auth_user', JSON.stringify(user));
            
            toast.success(`Logged in as ${user.name}`);
            window.location.reload(); // Reload triggers AuthProvider init
          } else if (status === 'expired') {
            clearInterval(pollIntervalRef.current!);
            setDeviceStatus('expired');
          }
        }
      } catch (err) {
        console.error('Device poll error:', err);
      }
    }, 4000);
  }, []);

  // TV Login Device Flow initialization
  const startTVDeviceFlow = useCallback(async () => {
    setDeviceStatus('loading');
    setDeviceFlow(null);
    try {
      const response = await api.post<DeviceCodeResponse>('/auth/device/code');
      if (response.data) {
        setDeviceFlow(response.data);
        setDeviceStatus('pending');
        startPolling(response.data.deviceCode);
      }
    } catch (error) {
      console.error('Failed to start TV device flow:', error);
      toast.error('Failed to generate TV login code.');
      setDeviceStatus('expired');
    }
  }, [startPolling]);

  useEffect(() => {
    if (activeTab === 'tv' && !isLoggedIn) {
      startTVDeviceFlow();
    } else {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    }

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [activeTab, isLoggedIn, startTVDeviceFlow]);

  const qrCodeUrl = deviceFlow
    ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&color=255-255-255&bgcolor=15-23-42&data=${encodeURIComponent(
        deviceFlow.verificationUrl
      )}`
    : '';

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-slate-950 to-indigo-950 flex flex-col justify-center items-center px-4 font-sans text-gray-200">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl flex flex-col items-center">
        
        {/* Logo */}
        <div className="flex items-center mb-6">
          <img
            src="stalker-logo.svg"
            className="w-28 sm:w-32 cursor-pointer"
            alt="Stalker Logo"
            onClick={() => navigate('/')}
          />
        </div>


        {/* Web Tab Content */}
        {activeTab === 'web' && (
          <div className="w-full flex flex-col py-2 text-left">
            <h2 className="text-xl font-bold text-center mb-2">
              {isSignUp ? 'Create Account' : 'Welcome Back'}
            </h2>
            <p className="text-gray-400 text-sm text-center mb-6">
              {isSignUp
                ? 'Sign up to request access to the streaming portal.'
                : 'Sign in with your email credentials or Google account.'}
            </p>

            <form onSubmit={handleCredentialsSubmit} className="space-y-4 w-full">
              {isSignUp && (
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                      type="text"
                      value={nameInput}
                      onChange={(e) => setNameInput(e.target.value)}
                      placeholder="John Doe"
                      className="w-full bg-slate-950 border border-slate-800 hover:border-slate-750 focus:border-indigo-500 rounded-2xl py-3 pl-11 pr-4 text-sm text-gray-200 focus:outline-none transition-all duration-300"
                      required
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="email"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full bg-slate-950 border border-slate-800 hover:border-slate-750 focus:border-indigo-500 rounded-2xl py-3 pl-11 pr-4 text-sm text-gray-200 focus:outline-none transition-all duration-300"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Password</label>
                <div className="relative">
                  <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-550" />
                  <input
                    type="password"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-950 border border-slate-800 hover:border-slate-750 focus:border-indigo-500 rounded-2xl py-3 pl-11 pr-4 text-sm text-gray-200 focus:outline-none transition-all duration-300"
                    required
                  />
                </div>
              </div>

              {credsError && (
                <div className="w-full bg-red-500/10 border border-red-500/20 rounded-2xl p-4 flex items-start space-x-3 text-left">
                  <ShieldAlert className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                  <span className="text-sm text-red-400 leading-snug">{credsError}</span>
                </div>
              )}

              {signupSuccess && (
                <div className="w-full bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 flex items-start space-x-3 text-left">
                  <span className="text-sm text-emerald-400 leading-snug">{signupSuccess}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={credsLoading}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-400 hover:to-violet-500 text-white font-semibold transition-all duration-300 shadow-xl shadow-indigo-600/10 hover:shadow-indigo-500/20 flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer"
              >
                {credsLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{isSignUp ? 'Signing Up...' : 'Signing In...'}</span>
                  </>
                ) : (
                  <span>{isSignUp ? 'Request Access' : 'Log In'}</span>
                )}
              </button>
            </form>

            <div className="mt-4 text-center text-sm">
              <span className="text-gray-400">
                {isSignUp ? 'Already have an account?' : "Don't have an account?"}
              </span>
              <button
                onClick={toggleMode}
                className="text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer underline ml-1 bg-transparent border-none p-0 inline focus:outline-none"
              >
                {isSignUp ? 'Log In' : 'Sign Up'}
              </button>
            </div>

            {!isSignUp && (
              <>
                <div className="relative flex py-5 items-center w-full">
                  <div className="flex-grow border-t border-slate-800/80"></div>
                  <span className="flex-shrink mx-4 text-gray-500 text-xs font-semibold uppercase tracking-wider">or sign in with</span>
                  <div className="flex-grow border-t border-slate-800/80"></div>
                </div>

                {googleLoading ? (
                  <div className="flex flex-col items-center space-y-3 py-2 w-full">
                    <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
                    <span className="text-xs text-gray-500">Verifying credentials...</span>
                  </div>
                ) : (
                  <div ref={googleBtnRef} id="google-signin-btn" className="w-full flex justify-center min-h-[44px]"></div>
                )}
              </>
            )}
          </div>
        )}

        {/* TV Tab Content */}
        {activeTab === 'tv' && (
          <div className="w-full flex flex-col items-center py-2">
            <h2 className="text-xl font-bold mb-2">Sign In on Your Smart TV</h2>
            <p className="text-gray-400 text-sm text-center mb-6">
              Scan the QR code or visit the link on your mobile phone or computer to authorize this TV.
            </p>

            {deviceStatus === 'loading' && (
              <div className="flex flex-col items-center py-10 space-y-4">
                <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
                <span className="text-sm text-gray-500">Generating authorization codes...</span>
              </div>
            )}

            {deviceStatus === 'pending' && deviceFlow && (
              <div className="flex flex-col items-center w-full space-y-6">
                {/* QR Code Container */}
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-2xl shadow-inner">
                  {qrCodeUrl && (
                    <img
                      src={qrCodeUrl}
                      alt="QR Code to scan"
                      className="w-[180px] h-[180px] rounded-lg"
                    />
                  )}
                </div>

                {/* User Authorization Code */}
                <div className="text-center w-full bg-slate-950 border border-slate-800/80 rounded-2xl py-4">
                  <div className="text-xs text-gray-500 tracking-wider uppercase mb-1">Authorization Code</div>
                  <div className="text-3xl font-mono font-extrabold tracking-widest text-indigo-400 select-all">
                    {deviceFlow.userCode}
                  </div>
                </div>

                <div className="text-xs text-gray-500 flex items-center space-x-1.5">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-500" />
                  <span>Waiting for mobile authorization...</span>
                </div>
              </div>
            )}

            {deviceStatus === 'expired' && (
              <div className="flex flex-col items-center py-8 space-y-4 text-center">
                <p className="text-red-400 text-sm">The authorization code has expired.</p>
                <button
                  onClick={startTVDeviceFlow}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm transition-all duration-300 flex items-center space-x-2 shadow-lg shadow-indigo-600/10"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Generate New Code</span>
                </button>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
