import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Volume2,
  VolumeX,
  ShieldCheck,
  Zap,
  ArrowRight,
  Headphones,
  Sliders,
  Clock,
  Layout,
  Bot,
  Users,
  Cloud,
  ChevronRight,
  Flame,
  CloudRain,
  Coffee,
  Waves,
  Music2,
  Compass,
  Star,
  CheckCircle2,
  Lock,
  Layers,
  Eye
} from 'lucide-react';
import { audioSynth } from '../utils/audioSynth';
import { ThreeDCanvasBackground } from './landing/ThreeDCanvasBackground';
import { Workspace3DMockup } from './landing/Workspace3DMockup';
import { ScrollFeatureMatrix } from './landing/ScrollFeatureMatrix';

interface LandingPageProps {
  onSignIn: () => Promise<void>;
  isLoading: boolean;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onSignIn, isLoading }) => {
  // Audio Engine State
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [activeSoundType, setActiveSoundType] = useState<'rain' | 'fireplace' | 'cafe' | 'waves'>('rain');
  const [soundVolume, setSoundVolume] = useState(0.65);

  // Auth Error State
  const [authError, setAuthError] = useState<string | null>(null);

  // Live Sound Sync
  useEffect(() => {
    if (isPlayingAudio) {
      audioSynth.playAmbient('landing-preview', activeSoundType, soundVolume);
    } else {
      audioSynth.stopAmbient('landing-preview');
    }

    return () => {
      audioSynth.stopAmbient('landing-preview');
    };
  }, [isPlayingAudio, activeSoundType, soundVolume]);

  const handleToggleAudio = () => {
    audioSynth.playClick('switch');
    setIsPlayingAudio((prev) => !prev);
  };

  const handleChangeSoundType = (type: 'rain' | 'fireplace' | 'cafe' | 'waves') => {
    setActiveSoundType(type);
    if (!isPlayingAudio) {
      setIsPlayingAudio(true);
    }
  };

  const handleGoogleSignIn = async () => {
    audioSynth.playClick('switch');
    setAuthError(null);
    try {
      await onSignIn();
    } catch (err: any) {
      console.warn('Sign-in error:', err);
      if (err.code === 'auth/popup-closed-by-user') {
        setAuthError('Sign-in popup closed. Click below to try again.');
      } else if (err.code === 'auth/popup-blocked') {
        setAuthError('Sign-in popup was blocked. Please enable popups for this site.');
      } else {
        setAuthError(err.message || 'Unable to complete sign-in. Please try again.');
      }
    }
  };

  return (
    <div className="min-h-screen w-full relative bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500 selection:text-white overflow-x-hidden">
      
      {/* 1. Interactive 3D Particle Constellation / Celestial Orb Canvas */}
      <ThreeDCanvasBackground isPlayingAudio={isPlayingAudio} intensity={1.2} />

      {/* 2. Deep Gradient Light Cones & Ambient Backdrop */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-gradient-to-b from-indigo-600/15 via-purple-600/10 to-transparent rounded-full blur-3xl opacity-80" />
        <div className="absolute top-1/3 -left-40 w-[600px] h-[600px] bg-indigo-500/10 rounded-full blur-3xl" />
        <div className="absolute top-2/3 -right-40 w-[600px] h-[600px] bg-purple-500/10 rounded-full blur-3xl" />
      </div>

      {/* 3. Top Precision Header */}
      <header className="sticky top-0 z-50 w-full border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-2xl transition-all">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          
          {/* Logo & Product Brand */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-500 p-[1px] shadow-lg shadow-indigo-500/20">
              <div className="w-full h-full bg-slate-950 rounded-[11px] flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-indigo-400" />
              </div>
            </div>
            <div>
              <span className="text-sm font-bold tracking-tight text-white flex items-center gap-2">
                Focus Atmosphere
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                  WORKSPACE
                </span>
              </span>
            </div>
          </div>

          {/* Quick Sound Toggle & Sign In CTA */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleToggleAudio}
              className={`hidden sm:inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-medium transition ${
                isPlayingAudio
                  ? 'bg-indigo-600/20 border-indigo-500/50 text-indigo-300 shadow-sm'
                  : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 text-slate-300'
              }`}
            >
              {isPlayingAudio ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
                  <span>
                    {activeSoundType === 'rain' && 'Rainfall'}
                    {activeSoundType === 'fireplace' && 'Hearth Fire'}
                    {activeSoundType === 'cafe' && 'Espresso Bar'}
                    {activeSoundType === 'waves' && '432Hz Drone'}
                  </span>
                  <Volume2 className="w-3.5 h-3.5 text-indigo-400" />
                </>
              ) : (
                <>
                  <VolumeX className="w-3.5 h-3.5 text-slate-400" />
                  <span>Audio Preview</span>
                </>
              )}
            </button>

            <button
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              className="inline-flex items-center gap-2.5 px-4 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-950 font-semibold text-xs transition shadow-md active:scale-95 disabled:opacity-50"
            >
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
              <span>{isLoading ? 'Connecting...' : 'Sign In with Google'}</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
            </button>
          </div>

        </div>
      </header>

      {/* 4. Hero Section with 3D Depth Visuals */}
      <section className="relative z-20 w-full max-w-7xl mx-auto px-6 pt-12 pb-10 sm:pt-16 sm:pb-16 text-center">
        
        {/* Auth Error Banner */}
        {authError && (
          <div className="max-w-md mx-auto mb-6 p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between shadow-lg backdrop-blur-md">
            <span>{authError}</span>
            <button onClick={() => setAuthError(null)} className="text-rose-400 hover:text-white px-2 font-bold">×</button>
          </div>
        )}

        {/* Feature Eyebrow Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/90 border border-slate-800 text-slate-300 text-xs font-medium mb-6 shadow-inner backdrop-blur-md">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Interactive 3D Spatial Canvas</span>
          <span className="text-slate-600">•</span>
          <span className="text-indigo-400 font-semibold">Web Audio Synthesizer</span>
        </div>

        {/* Main Headline */}
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white max-w-4xl mx-auto leading-[1.12] mb-6">
          The all-in-one atmosphere for{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-300 to-pink-400">
            deep, uninterrupted concentration.
          </span>
        </h1>

        {/* Subtitle */}
        <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto mb-8 leading-relaxed">
          Blend 4K ambient environments, procedural acoustic soundscapes, spatial sticky notes, fluid focus timers, and AI goal breakdown in a single unified workspace.
        </p>

        {/* Call-to-Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 mb-14">
          <button
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm flex items-center justify-center gap-3 shadow-xl shadow-indigo-600/30 transition-all transform hover:-translate-y-0.5 active:scale-98 disabled:opacity-50"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#ffffff"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
              />
              <path
                fill="#ffffff"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.27 21.44 7.35 24 12 24z"
              />
              <path
                fill="#ffffff"
                d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.04 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
              />
              <path
                fill="#ffffff"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.35 0 3.27 2.56 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
              />
            </svg>
            <span>{isLoading ? 'Opening Workspace...' : 'Enter Workspace with Google'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            onClick={handleToggleAudio}
            className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-800 text-slate-200 font-semibold text-sm flex items-center justify-center gap-2.5 backdrop-blur-md transition-all active:scale-98"
          >
            {isPlayingAudio ? (
              <>
                <VolumeX className="w-4 h-4 text-amber-400" />
                <span>Pause Ambient Audio</span>
              </>
            ) : (
              <>
                <Volume2 className="w-4 h-4 text-emerald-400" />
                <span>Listen to Live Audio Engine</span>
              </>
            )}
          </button>
        </div>

        {/* 5. Centerpiece 3D Interactive Mockup Stage */}
        <Workspace3DMockup
          isPlayingAudio={isPlayingAudio}
          onToggleAudio={handleToggleAudio}
          activeSoundType={activeSoundType}
          onChangeSoundType={handleChangeSoundType}
        />

      </section>

      {/* 6. Deep Scroll Feature Matrix & 3D Atmosphere Showcase */}
      <ScrollFeatureMatrix onSignIn={handleGoogleSignIn} />

      {/* 7. High-Conversion Bottom CTA Banner */}
      <section className="relative z-20 w-full max-w-5xl mx-auto px-6 py-16">
        <div className="relative rounded-3xl bg-gradient-to-br from-indigo-900/50 via-slate-900 to-purple-900/40 border border-indigo-500/30 p-8 sm:p-12 text-center overflow-hidden shadow-2xl backdrop-blur-xl">
          
          <div className="relative z-10 max-w-xl mx-auto">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mx-auto mb-4">
              <Sparkles className="w-6 h-6" />
            </div>

            <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-3">
              Unlock your personal sanctuary today.
            </h2>
            
            <p className="text-xs sm:text-sm text-slate-300 mb-8 leading-relaxed">
              Authenticate with your Google account to unlock cloud persistence, customizable 4K atmospheres, and procedural audio synthesis.
            </p>

            <button
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              className="w-full sm:w-auto px-8 py-4 rounded-xl bg-white hover:bg-slate-100 text-slate-950 font-bold text-sm inline-flex items-center justify-center gap-3 shadow-xl transition-all transform hover:-translate-y-0.5 active:scale-98 disabled:opacity-50"
            >
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
              <span>{isLoading ? 'Connecting...' : 'Sign in with Google'}</span>
              <ChevronRight className="w-4 h-4 text-slate-500" />
            </button>
          </div>
        </div>
      </section>

      {/* 8. Footer */}
      <footer className="relative z-20 border-t border-slate-900 bg-slate-950 py-8 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-300">Focus Atmosphere</span>
            <span>•</span>
            <span>All rights reserved</span>
          </div>
          <div className="flex items-center gap-4 text-[11px]">
            <span className="flex items-center gap-1 text-emerald-400">
              <ShieldCheck className="w-3.5 h-3.5" /> Firebase Auth Protected
            </span>
            <span>•</span>
            <span>Cloud Firestore Sync</span>
          </div>
        </div>
      </footer>

    </div>
  );
};
