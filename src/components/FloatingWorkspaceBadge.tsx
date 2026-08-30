import React, { useState, useRef, useEffect } from 'react';
import type { User } from 'firebase/auth';
import {
  Sliders,
  Sparkles,
  Flame,
  Cloud,
  RefreshCw,
  LogOut,
  Maximize,
  Minimize,
  Eye,
  CheckSquare,
  FileText,
  BarChart2,
  Layout,
  Store,
  Users,
  Bot,
  Music,
  ShieldCheck,
  ChevronDown,
  X,
  Compass,
  Command,
  GripHorizontal,
  Move,
  RotateCcw,
  Search,
} from 'lucide-react';
import { ViewMode } from '../types';

interface FloatingWorkspaceBadgeProps {
  user: User | null;
  isLoading: boolean;
  isSyncing: boolean;
  lastSyncedAt: Date | null;
  currentStreak: number;
  viewMode: ViewMode;
  pendingTasksCount: number;
  searchBarElement?: React.ReactNode;
  onOpenSearch?: () => void;
  onSignIn: () => Promise<void>;
  onSignOut: () => Promise<void>;
  onSyncNow: () => Promise<void>;
  onToggleCustomizer: (initialTab?: 'background' | 'audio' | 'method' | 'appearance') => void;
  onToggleAudio: () => void;
  onToggleTasks: () => void;
  onToggleNotes: () => void;
  onToggleStats: () => void;
  onToggleTemplates: () => void;
  onToggleMarketplace: () => void;
  onToggleRooms: () => void;
  onToggleAiChat: () => void;
  onToggleZenMode: () => void;
  onToggleSoundGenerator?: () => void;
  canCustomize?: boolean;
}

export const FloatingWorkspaceBadge: React.FC<FloatingWorkspaceBadgeProps> = ({
  user,
  isLoading,
  isSyncing,
  lastSyncedAt,
  currentStreak,
  viewMode,
  pendingTasksCount,
  searchBarElement,
  onOpenSearch,
  onSignIn,
  onSignOut,
  onSyncNow,
  onToggleCustomizer,
  onToggleAudio,
  onToggleTasks,
  onToggleNotes,
  onToggleStats,
  onToggleTemplates,
  onToggleMarketplace,
  onToggleRooms,
  onToggleAiChat,
  onToggleZenMode,
  onToggleSoundGenerator,
  canCustomize = true,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Position state for draggable Top Header Badge
  const [headerPosition, setHeaderPosition] = useState<{ x: number; y: number } | null>(() => {
    const saved = localStorage.getItem('airiser_header_position');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (
          typeof parsed?.x === 'number' &&
          typeof parsed?.y === 'number' &&
          parsed.x >= 0 &&
          parsed.x < window.innerWidth - 100 &&
          parsed.y >= 0 &&
          parsed.y < window.innerHeight - 50
        ) {
          return parsed;
        }
      } catch (e) {}
    }
    return null;
  });
  const [isDraggingHeader, setIsDraggingHeader] = useState(false);
  const headerRef = useRef<HTMLDivElement>(null);

  // Drag tracking refs (60fps rAF)
  const headerDragRef = useRef<{
    startX: number;
    startY: number;
    initX: number;
    initY: number;
    width: number;
    height: number;
    rafId: number | null;
    pendingX: number;
    pendingY: number;
  }>({
    startX: 0,
    startY: 0,
    initX: 0,
    initY: 0,
    width: 320,
    height: 48,
    rafId: null,
    pendingX: 0,
    pendingY: 0,
  });

  // Validate positions on mount, window resize and reset events
  useEffect(() => {
    const validatePositions = () => {
      setHeaderPosition((prev) => {
        if (!prev) return null;
        if (
          prev.x < 5 ||
          prev.x > window.innerWidth - 100 ||
          prev.y < 5 ||
          prev.y > window.innerHeight - 50
        ) {
          return null;
        }
        return prev;
      });
    };

    const handleResetAll = () => {
      setHeaderPosition(null);
      localStorage.removeItem('airiser_header_position');
      localStorage.removeItem('airiser_dock_position');
    };

    const handleSyncRemotePosition = (e: any) => {
      if (e.detail?.widget === 'header' && e.detail.position) {
        setHeaderPosition(e.detail.position);
      }
    };

    window.addEventListener('resize', validatePositions);
    window.addEventListener('reset-header-position', handleResetAll);
    window.addEventListener('reset-all-positions', handleResetAll);
    window.addEventListener('sync-remote-widget-position' as any, handleSyncRemotePosition);
    return () => {
      window.removeEventListener('resize', validatePositions);
      window.removeEventListener('reset-header-position', handleResetAll);
      window.removeEventListener('reset-all-positions', handleResetAll);
      window.removeEventListener('sync-remote-widget-position' as any, handleSyncRemotePosition);
      if (headerDragRef.current.rafId !== null) cancelAnimationFrame(headerDragRef.current.rafId);
    };
  }, []);

  // Sync to localStorage
  useEffect(() => {
    if (headerPosition) {
      localStorage.setItem('airiser_header_position', JSON.stringify(headerPosition));
    } else {
      localStorage.removeItem('airiser_header_position');
    }
  }, [headerPosition]);

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

  // Track fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

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

  // --- HEADER DRAGGING HANDLERS ---
  const handleHeaderPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!canCustomize) return;
    if (
      (e.target as HTMLElement).tagName === 'BUTTON' ||
      (e.target as HTMLElement).closest('button') ||
      (e.target as HTMLElement).tagName === 'INPUT' ||
      (e.target as HTMLElement).closest('input')
    ) {
      return;
    }

    e.preventDefault();
    const elem = headerRef.current;
    const rect = elem
      ? elem.getBoundingClientRect()
      : { left: window.innerWidth - 340, top: 20, width: 320, height: 48 };

    const initX = headerPosition ? headerPosition.x : rect.left;
    const initY = headerPosition ? headerPosition.y : rect.top;

    headerDragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initX,
      initY,
      width: rect.width || 320,
      height: rect.height || 48,
      rafId: null,
      pendingX: initX,
      pendingY: initY,
    };

    setIsDraggingHeader(true);
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
  };

  const handleHeaderPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingHeader) return;

    const { startX, startY, initX, initY, width, height } = headerDragRef.current;
    const deltaX = e.clientX - startX;
    const deltaY = e.clientY - startY;

    const nextX = Math.max(0, Math.min(window.innerWidth - width, initX + deltaX));
    const nextY = Math.max(0, Math.min(window.innerHeight - height, initY + deltaY));

    headerDragRef.current.pendingX = nextX;
    headerDragRef.current.pendingY = nextY;

    if (headerDragRef.current.rafId === null) {
      headerDragRef.current.rafId = requestAnimationFrame(() => {
        setHeaderPosition({
          x: headerDragRef.current.pendingX,
          y: headerDragRef.current.pendingY,
        });
        headerDragRef.current.rafId = null;
      });
    }
  };

  const handleHeaderPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDraggingHeader) {
      if (headerDragRef.current.rafId !== null) {
        cancelAnimationFrame(headerDragRef.current.rafId);
        headerDragRef.current.rafId = null;
      }
      const finalPos = {
        x: headerDragRef.current.pendingX,
        y: headerDragRef.current.pendingY,
      };
      setHeaderPosition(finalPos);
      window.dispatchEvent(new CustomEvent('widget-position-changed', {
        detail: { widget: 'header', position: finalPos }
      }));
      setIsDraggingHeader(false);
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {}
    }
  };

  if (viewMode === 'zen') {
    return (
      <div className="fixed top-4 right-4 z-40">
        <button
          onClick={onToggleZenMode}
          className="p-2.5 rounded-2xl bg-slate-950/70 hover:bg-slate-900/90 text-slate-300 hover:text-white border border-slate-800/80 backdrop-blur-xl transition shadow-xl group flex items-center gap-2"
          title="Exit Zen Mode (Z)"
        >
          <Eye className="w-4 h-4 text-indigo-400 group-hover:scale-110 transition" />
          <span className="text-xs font-semibold pr-1">Exit Zen</span>
        </button>
      </div>
    );
  }

  // Calculate dropdown orientation based on header position
  const isDropdownAbove = headerPosition ? headerPosition.y > window.innerHeight - 380 : false;
  const isDropdownAlignLeft = headerPosition ? headerPosition.x < 360 : false;

  return (
    <>
      {/* Draggable Top Header Badge & Command Trigger */}
      <div
        ref={headerRef}
        onPointerDown={handleHeaderPointerDown}
        onPointerMove={handleHeaderPointerMove}
        onPointerUp={handleHeaderPointerUp}
        onPointerCancel={handleHeaderPointerUp}
        style={
          headerPosition
            ? {
                left: `${headerPosition.x}px`,
                top: `${headerPosition.y}px`,
                position: 'fixed',
                transform: 'none',
                touchAction: 'none',
                zIndex: isDraggingHeader ? 100 : 35,
              }
            : {
                top: '1.25rem',
                right: '1.25rem',
                position: 'fixed',
                touchAction: 'none',
                zIndex: isDraggingHeader ? 100 : 35,
              }
        }
        className={`flex items-center gap-2 select-none transition-[box-shadow,opacity] duration-150 ${
          isDraggingHeader ? 'cursor-grabbing opacity-90 scale-[1.02] shadow-2xl' : 'cursor-grab'
        }`}
      >
        <div ref={menuRef} className="relative flex items-center gap-2">
          
          {/* Header Drag Handle Pill */}
          <div
            className="p-1 px-1.5 rounded-xl bg-slate-950/60 hover:bg-slate-900/80 border border-slate-800/60 backdrop-blur-xl text-slate-400 hover:text-slate-200 transition shadow-lg flex items-center justify-center cursor-grab active:cursor-grabbing group shrink-0"
            title="Drag header anywhere on screen"
          >
            <GripHorizontal className="w-3.5 h-3.5 group-hover:text-indigo-400 transition" />
          </div>

          {/* Global Workspace Search Bar */}
          {searchBarElement}

          {/* Interactive User Avatar & System Command Orb */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="p-1 pl-1.5 pr-2.5 rounded-2xl bg-slate-950/80 hover:bg-slate-900 border border-slate-800/90 text-slate-200 backdrop-blur-xl transition shadow-2xl flex items-center gap-2 active:scale-95 group relative shrink-0"
            title="User Account & Workspace Command Hub"
          >
            {user?.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.displayName || 'User'}
                className="w-7 h-7 rounded-xl object-cover ring-2 ring-indigo-500/40"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white font-bold text-xs flex items-center justify-center shadow-inner">
                {user?.displayName?.charAt(0) || user?.email?.charAt(0) || <Sparkles className="w-3.5 h-3.5" />}
              </div>
            )}

            <div className="text-left hidden md:block">
              <div className="text-xs font-bold text-white tracking-tight leading-none max-w-[90px] truncate">
                {user?.displayName?.split(' ')[0] || user?.email?.split('@')[0] || 'Explorer'}
              </div>
              <div className="text-[9px] text-slate-400 flex items-center gap-1 mt-0.5 font-medium">
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isSyncing
                      ? 'bg-amber-400 animate-pulse'
                      : 'bg-emerald-400 shadow-[0_0_5px_rgba(52,211,153,0.8)]'
                  }`}
                />
                <span>{isSyncing ? 'Syncing...' : 'Cloud Safe'}</span>
              </div>
            </div>

            <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180 text-white' : ''}`} />
          </button>

          {/* If header was moved, show reset button */}
          {headerPosition && (
            <button
              onClick={() => {
                setHeaderPosition(null);
                localStorage.removeItem('airiser_header_position');
              }}
              className="p-1.5 rounded-xl bg-slate-950/60 hover:bg-slate-900/80 border border-slate-800/60 backdrop-blur-xl text-slate-400 hover:text-slate-200 transition shadow-lg shrink-0"
              title="Reset header to default top-right corner"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          )}

          {/* Floating Command Palette & Profile Hub Dropdown */}
          {isOpen && (
            <div
              className={`absolute w-80 bg-slate-950/95 border border-slate-800/90 rounded-3xl shadow-2xl p-4 z-50 text-slate-200 backdrop-blur-2xl animate-in fade-in zoom-in-95 duration-200 divide-y divide-slate-800/80 ${
                isDropdownAbove ? 'bottom-full mb-2.5' : 'top-full mt-2.5'
              } ${isDropdownAlignLeft ? 'left-0' : 'right-0'}`}
            >
              
              {/* User Profile Header */}
              <div className="pb-3.5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {user?.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt={user.displayName || 'User'}
                      className="w-10 h-10 rounded-2xl object-cover ring-2 ring-indigo-500/40 shadow-md"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white font-bold text-sm flex items-center justify-center shadow-lg">
                      {user?.displayName?.charAt(0) || 'U'}
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="font-bold text-sm text-white truncate">
                      {user?.displayName || 'Focus Workspace'}
                    </div>
                    <div className="text-[11px] text-slate-400 truncate">
                      {user?.email || 'Guest Explorer'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={toggleFullscreen}
                    className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-900 border border-transparent hover:border-slate-800 transition"
                    title="Toggle Fullscreen"
                  >
                    {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={onToggleZenMode}
                    className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-900 border border-transparent hover:border-slate-800 transition"
                    title="Zen Mode"
                  >
                    <Eye className="w-4 h-4 text-indigo-400" />
                  </button>
                </div>
              </div>

              {/* Animated Streak Focus Card */}
              <div className="py-2">
                <button
                  onClick={() => {
                    setIsOpen(false);
                    onToggleStats();
                  }}
                  className="w-full p-3 rounded-2xl bg-gradient-to-br from-amber-950/50 via-slate-900/90 to-orange-950/40 hover:from-amber-950/70 hover:to-orange-950/60 border border-amber-500/40 text-left transition-all duration-300 group shadow-lg animate-streak-glow flex items-center justify-between gap-3 active:scale-[0.98]"
                  title="View Daily Streak & Focus Analytics"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center text-slate-950 shrink-0 shadow-md shadow-amber-950/60 relative overflow-hidden group-hover:scale-105 transition-transform">
                      <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition" />
                      <Flame className="w-6 h-6 fill-slate-950 text-slate-950 animate-flame-flicker" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-orange-300 to-amber-400">
                          {currentStreak} Day Focus Streak
                        </span>
                      </div>
                      <p className="text-[10px] text-amber-300/80 mt-0.5 truncate font-medium">
                        {currentStreak > 0 ? 'Consistency is power • Tap for analytics' : 'Start a focus session today'}
                      </p>
                    </div>
                  </div>

                  <div className="p-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 group-hover:translate-x-0.5 group-hover:bg-amber-500/20 transition-all shrink-0">
                    <BarChart2 className="w-3.5 h-3.5" />
                  </div>
                </button>
              </div>

              {/* Cloud Sync Status */}
              <div className="py-3">
                <div className="p-2.5 bg-slate-900/90 rounded-2xl border border-slate-800/80 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                      <Cloud className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                        <span>Cloud Sync Active</span>
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {lastSyncedAt
                          ? `Last synced at ${lastSyncedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                          : 'Real-time cloud backups active'}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={onSyncNow}
                    disabled={isSyncing}
                    className="p-2 hover:bg-slate-800 text-slate-300 hover:text-white rounded-xl transition disabled:opacity-50 border border-slate-800/60"
                    title="Sync Now"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-indigo-400' : 'text-slate-300'}`} />
                  </button>
                </div>
              </div>

              {/* Workspace Command Hub Grid */}
              <div className="py-3 space-y-2">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1 flex items-center justify-between">
                  <span>Workspace Hub & Tools</span>
                  <span className="text-[9px] font-mono text-slate-500">⌘K / /</span>
                </div>

                {onOpenSearch && (
                  <button
                    onClick={() => {
                      setIsOpen(false);
                      onOpenSearch();
                    }}
                    className="w-full p-2.5 rounded-2xl bg-gradient-to-r from-indigo-950/80 via-slate-900/90 to-slate-900/90 hover:from-indigo-900/90 hover:to-slate-800/90 border border-indigo-500/40 text-left transition flex items-center gap-2.5 group shadow-sm"
                  >
                    <div className="w-6 h-6 rounded-lg bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-300 shrink-0">
                      <Search className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-white truncate flex items-center justify-between">
                        <span>Global Search & Switch</span>
                        <kbd className="px-1.5 py-0.2 bg-slate-900 text-indigo-300 border border-indigo-500/30 text-[9px] rounded font-mono font-bold">
                          ⌘K
                        </kbd>
                      </div>
                      <div className="text-[10px] text-slate-400 truncate">Find templates, notes, tasks & audio</div>
                    </div>
                  </button>
                )}

                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    onClick={() => {
                      setIsOpen(false);
                      onToggleTasks();
                    }}
                    className="p-2.5 rounded-2xl bg-slate-900/80 hover:bg-slate-800/90 border border-slate-800/80 text-left transition flex items-center gap-2.5 group"
                  >
                    <div className="w-6 h-6 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                      <CheckSquare className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-semibold text-white truncate flex items-center justify-between">
                        <span>Tasks</span>
                        {pendingTasksCount > 0 && (
                          <span className="px-1.5 py-0.2 bg-emerald-500/20 text-emerald-300 text-[10px] rounded-full font-bold">
                            {pendingTasksCount}
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate">Planner</div>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      setIsOpen(false);
                      onToggleNotes();
                    }}
                    className="p-2.5 rounded-2xl bg-slate-900/80 hover:bg-slate-800/90 border border-slate-800/80 text-left transition flex items-center gap-2.5 group"
                  >
                    <div className="w-6 h-6 rounded-lg bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400 shrink-0">
                      <FileText className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-semibold text-white truncate">Notepad</div>
                      <div className="text-[10px] text-slate-400 truncate">Quick notes</div>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      setIsOpen(false);
                      onToggleStats();
                    }}
                    className="p-2.5 rounded-2xl bg-slate-900/80 hover:bg-slate-800/90 border border-slate-800/80 text-left transition flex items-center gap-2.5 group"
                  >
                    <div className="w-6 h-6 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                      <BarChart2 className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-semibold text-white truncate">Analytics</div>
                      <div className="text-[10px] text-slate-400 truncate">Streak & stats</div>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      setIsOpen(false);
                      onToggleAudio();
                    }}
                    className="p-2.5 rounded-2xl bg-slate-900/80 hover:bg-slate-800/90 border border-slate-800/80 text-left transition flex items-center gap-2.5 group"
                  >
                    <div className="w-6 h-6 rounded-lg bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0">
                      <Music className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-semibold text-white truncate">Soundscape</div>
                      <div className="text-[10px] text-slate-400 truncate">Ambient mixer</div>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      setIsOpen(false);
                      onToggleTemplates();
                    }}
                    className="p-2.5 rounded-2xl bg-slate-900/80 hover:bg-slate-800/90 border border-slate-800/80 text-left transition flex items-center gap-2.5 group"
                  >
                    <div className="w-6 h-6 rounded-lg bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-300 shrink-0">
                      <Layout className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-semibold text-white truncate">Templates</div>
                      <div className="text-[10px] text-slate-400 truncate">Workspaces</div>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      setIsOpen(false);
                      onToggleMarketplace();
                    }}
                    className="p-2.5 rounded-2xl bg-slate-900/80 hover:bg-slate-800/90 border border-slate-800/80 text-left transition flex items-center gap-2.5 group"
                  >
                    <div className="w-6 h-6 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
                      <Store className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-semibold text-white truncate">Explore</div>
                      <div className="text-[10px] text-slate-400 truncate">Marketplace</div>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      setIsOpen(false);
                      onToggleRooms();
                    }}
                    className="p-2.5 rounded-2xl bg-slate-900/80 hover:bg-slate-800/90 border border-slate-800/80 text-left transition flex items-center gap-2.5 group"
                  >
                    <div className="w-6 h-6 rounded-lg bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400 shrink-0">
                      <Users className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-semibold text-white truncate">Rooms</div>
                      <div className="text-[10px] text-slate-400 truncate">Co-working</div>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      setIsOpen(false);
                      onToggleAiChat();
                    }}
                    className="p-2.5 rounded-2xl bg-gradient-to-r from-indigo-950/70 to-purple-950/70 hover:from-indigo-900/80 hover:to-purple-900/80 border border-indigo-500/30 text-left transition flex items-center gap-2.5 group shadow-sm"
                  >
                    <div className="w-6 h-6 rounded-lg bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-300 shrink-0">
                      <Bot className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-semibold text-indigo-200 truncate">AI Tutor</div>
                      <div className="text-[10px] text-indigo-400/80 truncate">Study assistant</div>
                    </div>
                  </button>

                  {onToggleSoundGenerator && (
                    <button
                      onClick={() => {
                        setIsOpen(false);
                        onToggleSoundGenerator();
                      }}
                      className="p-2.5 col-span-2 rounded-2xl bg-gradient-to-r from-indigo-950/80 via-purple-950/80 to-slate-900/90 hover:from-indigo-900/90 hover:to-purple-900/90 border border-indigo-500/40 text-left transition flex items-center gap-2.5 group shadow-md"
                    >
                      <div className="w-6 h-6 rounded-lg bg-indigo-500/20 border border-indigo-400/40 flex items-center justify-center text-indigo-300 shrink-0">
                        <Sparkles className="w-3.5 h-3.5 animate-pulse text-indigo-300" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-white truncate flex items-center gap-1.5">
                          <span>AI Sound Generator</span>
                          <span className="px-1.5 py-0.2 bg-indigo-500/20 text-indigo-300 text-[9px] rounded-full font-bold">
                            Gemini
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 truncate">Generate ambient soundscapes calibrated to tasks</div>
                      </div>
                    </button>
                  )}
                </div>
              </div>

              {/* Quick Customizer Shortcut & Sign Out */}
              <div className="pt-3 flex items-center justify-between gap-2">
                <button
                  onClick={() => {
                    setIsOpen(false);
                    onToggleCustomizer();
                  }}
                  className="flex-1 py-2 px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition flex items-center justify-center gap-2 shadow-lg shadow-indigo-950/40"
                >
                  <Sliders className="w-3.5 h-3.5" />
                  <span>Customizer Drawer</span>
                </button>

                <button
                  onClick={handleSignOutClick}
                  className="p-2 hover:bg-rose-500/15 text-rose-400 hover:text-rose-300 rounded-xl transition border border-transparent hover:border-rose-500/30"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>

            </div>
          )}
        </div>
      </div>
    </>
  );
};
