import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Volume2,
  VolumeX,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Layers,
  Flame,
  Star,
  Users,
  Compass,
  Play,
  Pause,
  ChevronRight,
  Sparkles as SparklesIcon,
  CloudRain,
  Coffee,
  Waves,
  Layout,
  ExternalLink,
  Laptop
} from 'lucide-react';
import { ThreeDCanvasBackground } from './landing/ThreeDCanvasBackground';
import { Workspace3DMockup } from './landing/Workspace3DMockup';
import { FeatureShowcaseSection } from './landing/FeatureShowcaseSection';
import { InteractivePlayground } from './landing/InteractivePlayground';
import { MarketplaceSocialProof } from './landing/MarketplaceSocialProof';
import { audioSynth } from '../utils/audioSynth';

interface LandingPageProps {
  onSignIn: () => Promise<void>;
  onExploreGuest?: () => void;
  isLoading?: boolean;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onSignIn,
  onExploreGuest,
  isLoading = false,
}) => {
  // Live Audio Preview State
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [activeSoundType, setActiveSoundType] = useState<'rain' | 'fireplace' | 'cafe' | 'waves'>('rain');
  const [authError, setAuthError] = useState<string | null>(null);

  // Toggle Web Audio Synth
  const handleToggleAudio = () => {
    audioSynth.playClick('switch');
    if (!isPlayingAudio) {
      audioSynth.playAmbient('landing-hero', activeSoundType, 0.65);
      setIsPlayingAudio(true);
    } else {
      audioSynth.stopAmbient('landing-hero');
      setIsPlayingAudio(false);
    }
  };

  const handleChangeSoundType = (type: 'rain' | 'fireplace' | 'cafe' | 'waves') => {
    audioSynth.playClick('switch');
    setActiveSoundType(type);
    if (isPlayingAudio) {
      audioSynth.playAmbient('landing-hero', type, 0.65);
    }
  };

  // Safe Google Sign-In with Error Capture
  const handleGoogleSignIn = async () => {
    try {
      setAuthError(null);
      await onSignIn();
    } catch (err: any) {
      console.error('Google Sign-in failed on Landing Page:', err);
      setAuthError(err.message || 'Authentication timed out. Please try again.');
    }
  };

  const handleEnterWorkspace = () => {
    if (onExploreGuest) {
      onExploreGuest();
    } else {
      handleGoogleSignIn();
    }
  };

  // Clean up audio on unmount
  useEffect(() => {
    return () => {
      audioSynth.stopAmbient('landing-hero');
    };
  }, []);

  return (
    <div className="relative min-h-screen w-full bg-[#07070d] text-[#e2e8f0] font-sans overflow-x-hidden selection:bg-indigo-500 selection:text-white">
      
      {/* 1. Background 3D Celestial Particle Canvas */}
      <ThreeDCanvasBackground isPlayingAudio={isPlayingAudio} />

      {/* 2. Top Glassmorphism Navigation Bar */}
      <header className="sticky top-0 z-50 w-full backdrop-blur-xl bg-slate-950/70 border-b border-slate-800/80 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          
          {/* Logo & Brand Name */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-500 flex items-center justify-center text-white shadow-lg shadow-indigo-600/30">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="font-extrabold text-sm sm:text-base tracking-tight text-white flex items-center gap-1.5">
                <span>Focus Workspace</span>
                <span className="px-1.5 py-0.2 rounded-md bg-indigo-500/20 text-indigo-300 text-[10px] font-mono border border-indigo-500/30">
                  v2.4
                </span>
              </div>
              <div className="text-[10px] text-slate-400 -mt-0.5 hidden sm:block">
                Atmospheric Deep Work Sanctuary
              </div>
            </div>
          </div>

          {/* Quick Nav Anchor Links */}
          <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-slate-300">
            <a href="#hero" className="hover:text-white transition">3D Stage</a>
            <a href="#features" className="hover:text-white transition">Features</a>
            <a href="#demo" className="hover:text-white transition">Live Demo</a>
            <a href="#community" className="hover:text-white transition">Marketplace</a>
          </nav>

          {/* Quick Sound Toggle & Primary Action */}
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
                  <span className="capitalize">{activeSoundType} Engine</span>
                  <Volume2 className="w-3.5 h-3.5 text-indigo-400" />
                </>
              ) : (
                <>
                  <VolumeX className="w-3.5 h-3.5 text-slate-400" />
                  <span>Audio Preview</span>
                </>
              )}
            </button>

            {/* Enter Workspace Primary Button */}
            <button
              onClick={handleEnterWorkspace}
              disabled={isLoading}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-950 font-bold text-xs transition shadow-md active:scale-95 disabled:opacity-50"
            >
              <span>{isLoading ? 'Connecting...' : 'Enter Workspace'}</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-600" />
            </button>
          </div>

        </div>
      </header>

      {/* 3. Hero Section with 3D Depth Visuals */}
      <section id="hero" className="relative z-20 w-full max-w-7xl mx-auto px-6 pt-12 pb-10 sm:pt-16 sm:pb-16 text-center">
        
        {/* Auth Error Banner */}
        {authError && (
          <div className="max-w-md mx-auto mb-6 p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between shadow-lg backdrop-blur-md">
            <span>{authError}</span>
            <button onClick={() => setAuthError(null)} className="text-rose-400 hover:text-white px-2 font-bold">×</button>
          </div>
        )}

        {/* Brand Promise Eyebrow Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-900/90 border border-indigo-500/30 text-indigo-300 text-xs font-semibold mb-6 shadow-inner backdrop-blur-md">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>The Next-Gen Deep Work Atmosphere</span>
          <span className="text-slate-600">•</span>
          <span className="text-slate-300 font-mono text-[11px]">42 Live Rooms Active</span>
        </div>

        {/* Main Headline */}
        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white max-w-4xl mx-auto leading-[1.08] mb-6">
          Your vibe. Your focus.{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-300 to-pink-400">
            Your atmosphere.
          </span>
        </h1>

        {/* Subtitle */}
        <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto mb-8 leading-relaxed">
          The most customizable deep-work workspace ever built. Blend 4K ambient environments, procedural acoustic soundscapes, spatial sticky notes, fluid focus timers, and real-time co-working rooms.
        </p>

        {/* Call-to-Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 mb-14">
          <button
            onClick={handleEnterWorkspace}
            disabled={isLoading}
            className="w-full sm:w-auto px-8 py-4 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-sm flex items-center justify-center gap-3 shadow-xl shadow-indigo-600/30 transition-all transform hover:-translate-y-0.5 active:scale-98 disabled:opacity-50"
          >
            <span>{isLoading ? 'Opening Sanctuary...' : 'Enter Workspace Now'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className="w-full sm:w-auto px-6 py-4 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-800 text-slate-200 font-semibold text-sm flex items-center justify-center gap-2.5 backdrop-blur-md transition-all active:scale-98"
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
            <span>Sign In with Google</span>
          </button>
        </div>

        {/* 4. Centerpiece 3D Interactive Mockup Stage */}
        <Workspace3DMockup
          isPlayingAudio={isPlayingAudio}
          onToggleAudio={handleToggleAudio}
          activeSoundType={activeSoundType}
          onChangeSoundType={handleChangeSoundType}
          onEnterWorkspace={handleEnterWorkspace}
        />

      </section>

      {/* 5. 7-Chapter Cinematic Feature Showcase */}
      <FeatureShowcaseSection
        onEnterWorkspace={handleEnterWorkspace}
        onSignIn={handleGoogleSignIn}
      />

      {/* 6. Live Interactive Playable Mini-Workspace Demo */}
      <InteractivePlayground
        onEnterWorkspace={handleEnterWorkspace}
        onSignIn={handleGoogleSignIn}
        isLoading={isLoading}
      />

      {/* 7. Marketplace & Social Proof Section */}
      <MarketplaceSocialProof
        onEnterWorkspace={handleEnterWorkspace}
      />

      {/* 8. High-Conversion Grand Closing CTA Banner */}
      <section className="relative z-20 w-full max-w-5xl mx-auto px-6 py-20">
        <div className="relative rounded-3xl bg-gradient-to-br from-indigo-950/80 via-slate-950 to-purple-950/60 border border-indigo-500/30 p-8 sm:p-14 text-center overflow-hidden shadow-[0_25px_80px_rgba(0,0,0,0.85)] backdrop-blur-2xl">
          
          <div className="relative z-10 max-w-2xl mx-auto space-y-6">
            <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mx-auto shadow-inner">
              <Sparkles className="w-7 h-7" />
            </div>

            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Ready to experience your personal deep-work sanctuary?
            </h2>
            
            <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
              Step into an uncompromised focus experience with 4K ambient environments, procedural audio synthesis, and real-time cloud sync.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                onClick={handleEnterWorkspace}
                disabled={isLoading}
                className="w-full sm:w-auto px-8 py-4 rounded-xl bg-white hover:bg-slate-100 text-slate-950 font-bold text-sm inline-flex items-center justify-center gap-3 shadow-xl transition-all transform hover:-translate-y-0.5 active:scale-98 disabled:opacity-50"
              >
                <span>{isLoading ? 'Connecting...' : 'Enter Focus Workspace'}</span>
                <ArrowRight className="w-4 h-4 text-slate-950" />
              </button>

              <button
                onClick={handleGoogleSignIn}
                disabled={isLoading}
                className="w-full sm:w-auto px-6 py-4 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-800 text-slate-200 font-semibold text-sm inline-flex items-center justify-center gap-2.5 backdrop-blur-md transition-all active:scale-98"
              >
                <span>Sign In with Google</span>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            <div className="flex items-center justify-center gap-6 text-[11px] text-slate-400 pt-4">
              <span className="flex items-center gap-1.5 text-emerald-400">
                <ShieldCheck className="w-4 h-4" /> Google Firebase Auth
              </span>
              <span>•</span>
              <span>Zero Installation Required</span>
              <span>•</span>
              <span>Free to Use</span>
            </div>
          </div>
        </div>
      </section>

      {/* 9. Luxury Modern Footer */}
      <footer className="relative z-20 border-t border-slate-900 bg-slate-950 py-12 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-xs">
              FW
            </div>
            <div>
              <span className="font-semibold text-slate-300">Focus Workspace</span>
              <span className="text-slate-600 mx-2">•</span>
              <span>Your vibe. Your focus. Your atmosphere.</span>
            </div>
          </div>

          <div className="flex items-center gap-6 text-[11px]">
            <a href="#hero" className="hover:text-slate-300 transition">Stage</a>
            <a href="#features" className="hover:text-slate-300 transition">Features</a>
            <a href="#demo" className="hover:text-slate-300 transition">Demo</a>
            <a href="#community" className="hover:text-slate-300 transition">Marketplace</a>
            <span className="text-slate-700">|</span>
            <span className="text-emerald-400 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> Cloud Firestore Sync Active
            </span>
          </div>
        </div>
      </footer>

    </div>
  );
};
