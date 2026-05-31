import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/services/api';
import { toast } from 'react-toastify';
import { KeyRound, Loader2, CheckCircle2, ShieldAlert } from 'lucide-react';

export default function Verify() {
  const { isLoggedIn, user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const codeParam = searchParams.get('code') || '';

  const [userCode, setUserCode] = useState(codeParam);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If not logged in, redirect to login page with this page as redirect target
  useEffect(() => {
    if (!authLoading && !isLoggedIn) {
      const redirectUrl = encodeURIComponent(`/verify?code=${userCode}`);
      toast.info('Please sign in first to authorize devices.');
      navigate(`/login?redirect=${redirectUrl}`);
    }
  }, [isLoggedIn, authLoading, navigate, userCode]);

  const handleAuthorize = useCallback(async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!userCode.trim()) {
      toast.error('Please enter a valid authorization code');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await api.post<{ success: boolean; message?: string }>('/auth/device/authorize', {
        userCode: userCode.trim(),
      });

      if (response.data?.success) {
        setSuccess(true);
        toast.success('Device authorized successfully!');
      } else {
        setError('Failed to authorize device. Please check the code.');
      }
    } catch (err) {
      console.error(err);
      const errorVal = err as Error;
      setError(errorVal.message || 'Verification failed. The code may be invalid or expired.');
    } finally {
      setLoading(false);
    }
  }, [userCode]);

  // Automatically submit if code is in query parameter and logged in
  useEffect(() => {
    if (isLoggedIn && codeParam && !success && !loading && !error) {
      handleAuthorize();
    }
  }, [isLoggedIn, codeParam, success, loading, error, handleAuthorize]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-slate-950 to-indigo-950 flex justify-center items-center font-sans text-gray-200">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-slate-950 to-indigo-950 flex flex-col justify-center items-center px-4 font-sans text-gray-200">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl flex flex-col items-center">
        
        {/* Logo */}
        <div className="flex items-center mb-8">
          <img
            src="stalker-logo.svg"
            className="w-28 sm:w-32 cursor-pointer"
            alt="Stalker Logo"
            onClick={() => navigate('/')}
          />
        </div>

        {success ? (
          /* Success Screen */
          <div className="w-full flex flex-col items-center text-center py-6 space-y-6">
            <div className="w-20 h-20 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center text-green-400">
              <CheckCircle2 className="w-12 h-12" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-white">TV Authorized!</h2>
              <p className="text-gray-400 text-sm max-w-xs">
                Your Smart TV is now logged in as <span className="text-indigo-400 font-semibold">{user?.name}</span>.
              </p>
            </div>
            <p className="text-xs text-gray-500">
              You can close this tab now. The TV screen will update automatically.
            </p>
            <button
              onClick={() => navigate('/')}
              className="w-full mt-4 py-3.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-gray-300 font-bold transition-all duration-300 border border-slate-750"
            >
              Go to Web Portal
            </button>
          </div>
        ) : (
          /* Entry Screen */
          <div className="w-full flex flex-col items-center">
            <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-6">
              <KeyRound className="w-8 h-8" />
            </div>

            <h2 className="text-xl font-bold text-center mb-2">Authorize Smart TV</h2>
            <p className="text-gray-400 text-sm text-center mb-6">
              Logged in as <span className="text-indigo-400 font-semibold">{user?.email}</span>. Confirm the 6-character code on your TV screen to pair the device.
            </p>

            <form onSubmit={handleAuthorize} className="w-full space-y-5">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-400 tracking-wide uppercase">
                  TV Authorization Code
                </label>
                <input
                  type="text"
                  value={userCode}
                  onChange={(e) => setUserCode(e.target.value)}
                  placeholder="e.g. AB-CDE"
                  maxLength={10}
                  className="w-full bg-slate-950 border border-slate-800 hover:border-indigo-500/30 focus:border-indigo-500 rounded-2xl py-4 text-center text-2xl font-mono font-extrabold tracking-widest text-indigo-400 focus:outline-none transition-all duration-300"
                />
              </div>

              {error && (
                <div className="w-full bg-red-500/10 border border-red-500/20 rounded-2xl p-4 flex items-start space-x-3 text-left">
                  <ShieldAlert className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                  <span className="text-sm text-red-400 leading-snug">{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-400 hover:to-violet-500 text-white font-semibold transition-all duration-300 shadow-xl shadow-indigo-600/10 hover:shadow-indigo-500/20 flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Authorizing Device...</span>
                  </>
                ) : (
                  <span>Authorize TV Device</span>
                )}
              </button>
            </form>
          </div>
        )}

      </div>
    </div>
  );
}
