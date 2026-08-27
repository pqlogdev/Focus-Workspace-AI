import React, { useState, useRef, useEffect } from 'react';
import type { User } from 'firebase/auth';
import {
  LogIn,
  LogOut,
  Cloud,
  CloudCheck,
  RefreshCw,
  User as UserIcon,
  Sparkles,
  ShieldCheck,
  ChevronDown,
  X
} from 'lucide-react';

interface UserAccountButtonProps {
  user: User | null;
  isLoading: boolean;
  isSyncing: boolean;
  lastSyncedAt: Date | null;
  onSignIn: () => Promise<void>;
  onSignOut: () => Promise<void>;
  onSyncNow: () => Promise<void>;
}

export const UserAccountButton: React.FC<UserAccountButtonProps> = ({
  user,
  isLoading,
  isSyncing,
  lastSyncedAt,
  onSignIn,
  onSignOut,
  onSyncNow,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleGoogleSignIn = async () => {
    setIsSigningIn(true);
    setAuthError(null);
    try {
      await onSignIn();
      setShowAuthModal(false);
      setIsOpen(false);
    } catch (err: any) {
      console.error('Sign in failed:', err);
      if (err.code === 'auth/popup-closed-by-user') {
        setAuthError('Sign-in cancelled. Please try again.');
      } else if (err.code === 'auth/popup-blocked') {
        setAuthError('Sign-in popup was blocked by browser. Please allow popups.');
      } else {
        setAuthError(err.message || 'Failed to sign in with Google. Please check connection.');
      }
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSignOutClick = async () => {
    try {
      await onSignOut();
      setIsOpen(false);
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="h-8 px-3 rounded-xl bg-slate-900/60 border border-slate-800/80 flex items-center gap-2 text-xs text-slate-400">
        <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-400" />
      </div>
    );
  }

  // Not signed in state
  if (!user) {
    return (
      <>
        <button
          onClick={() => setShowAuthModal(true)}
          className="h-8 px-3 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-200 hover:text-white transition flex items-center gap-2 text-xs font-semibold shadow-sm active:scale-95"
          title="Sign in with Google"
        >
          {/* Google G Logo SVG */}
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
            />
            <path
              fill="#34A853"
              d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.27 21.44 7.35 24 12 24z"
            />
            <path
              fill="#FBBC05"
              d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.04 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
            />
            <path
              fill="#EA4335"
              d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.35 0 3.27 2.56 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
            />
          </svg>
          <span className="hidden sm:inline">Sign In</span>
        </button>

        {/* Sign In Dialog Modal */}
        {showAuthModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-7 max-w-sm w-full shadow-2xl relative text-center">
              <button
                onClick={() => setShowAuthModal(false)}
                className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mx-auto mb-4">
                <Sparkles className="w-6 h-6" />
              </div>

              <h3 className="text-lg font-bold text-white mb-1.5 tracking-tight">
                Sign in to Focus Atmosphere
              </h3>
              <p className="text-xs text-slate-400 mb-6 leading-relaxed">
                Save your custom workspace presets, audio mixes, sticky notes, and streaks safely in the cloud across all your devices.
              </p>

              {authError && (
                <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs text-left">
                  {authError}
                </div>
              )}

              <button
                onClick={handleGoogleSignIn}
                disabled={isSigningIn}
                className="w-full py-3 px-4 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-semibold text-sm flex items-center justify-center gap-3 transition shadow-lg active:scale-[0.98] disabled:opacity-50"
              >
                {isSigningIn ? (
                  <RefreshCw className="w-4 h-4 animate-spin text-indigo-600" />
                ) : (
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.27 21.44 7.35 24 12 24z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.04 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.35 0 3.27 2.56 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                    />
                  </svg>
                )}
                <span>Continue with Google</span>
              </button>

              <div className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-slate-500">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                <span>Protected by Firebase Auth & Cloud Firestore</span>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  // Signed in state
  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 p-1 pl-1.5 pr-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800/90 border border-slate-800 text-slate-200 transition shadow-sm"
        title="Account & Cloud Sync"
      >
        {user.photoURL ? (
          <img
            src={user.photoURL}
            alt={user.displayName || 'User'}
            className="w-6 h-6 rounded-lg object-cover ring-1 ring-indigo-500/40"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-6 h-6 rounded-lg bg-indigo-600 text-white font-bold text-[11px] flex items-center justify-center">
            {user.displayName?.charAt(0) || user.email?.charAt(0) || 'U'}
          </div>
        )}

        <span className="text-xs font-medium max-w-[90px] truncate hidden md:inline">
          {user.displayName?.split(' ')[0] || user.email?.split('@')[0]}
        </span>

        {/* Sync Status Dot */}
        <span
          className={`w-2 h-2 rounded-full ${
            isSyncing ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.5)]'
          }`}
          title={isSyncing ? 'Syncing to Cloud...' : 'Cloud Synced'}
        />

        <ChevronDown className="w-3 h-3 text-slate-400" />
      </button>

      {/* Account Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-72 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-3.5 z-50 text-slate-200 animate-in fade-in zoom-in-95">
          {/* User Info Header */}
          <div className="flex items-center gap-3 pb-3 border-b border-slate-800/80">
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.displayName || 'User'}
                className="w-10 h-10 rounded-xl object-cover ring-2 ring-indigo-500/30"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white font-bold text-sm flex items-center justify-center">
                {user.displayName?.charAt(0) || 'U'}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="font-semibold text-xs text-white truncate">
                {user.displayName || 'Focus Explorer'}
              </div>
              <div className="text-[11px] text-slate-400 truncate">
                {user.email}
              </div>
            </div>
          </div>

          {/* Sync Status Section */}
          <div className="py-2.5 px-2 my-2 bg-slate-950/60 rounded-xl border border-slate-800/60 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <Cloud className="w-4 h-4 text-emerald-400" />
              <div>
                <div className="text-[11px] font-medium text-slate-200">
                  {isSyncing ? 'Syncing...' : 'Cloud Sync Active'}
                </div>
                <div className="text-[10px] text-slate-500">
                  {lastSyncedAt ? `Synced ${lastSyncedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Auto-saving enabled'}
                </div>
              </div>
            </div>

            <button
              onClick={onSyncNow}
              disabled={isSyncing}
              className="p-1.5 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg transition disabled:opacity-50"
              title="Manual Sync"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-indigo-400' : ''}`} />
            </button>
          </div>

          {/* Action List */}
          <div className="space-y-1 pt-1">
            <button
              onClick={handleSignOutClick}
              className="w-full py-2 px-2.5 rounded-xl hover:bg-rose-500/10 text-rose-300 hover:text-rose-200 text-xs font-medium flex items-center gap-2.5 transition"
            >
              <LogOut className="w-3.5 h-3.5 text-rose-400" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
