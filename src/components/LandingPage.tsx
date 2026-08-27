import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  ShieldCheck,
  Zap,
  Check,
  CheckCircle2,
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
  ExternalLink,
  Layers,
  Compass,
  Palette,
  Terminal,
  Maximize2,
  BellRing,
  Cpu,
  Star
} from 'lucide-react';
import { audioSynth } from '../utils/audioSynth';

interface LandingPageProps {
  onSignIn: () => Promise<void>;
  isLoading: boolean;
}

interface AtmosphereScene {
  id: string;
  name: string;
  category: string;
  location: string;
  soundType: 'rain' | 'fireplace' | 'cafe' | 'waves';
  soundLabel: string;
  bgUrl: string;
  badge: string;
}

const ATMOSPHERE_SCENES: AtmosphereScene[] = [
  {
    id: 'shibuya-rain',
    name: 'Shibuya Midnight Lo-Fi',
    category: 'City & Rain',
    location: 'Tokyo, Japan',
    soundType: 'rain',
    soundLabel: 'Gentle Rain on Glass',
    bgUrl: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=2000&q=80',
    badge: 'Popular',
  },
  {
    id: 'nordic-cabin',
    name: 'Nordic Hearth Cabin',
    category: 'Warm & Cozy',
    location: 'Tromsø, Norway',
    soundType: 'fireplace',
    soundLabel: 'Crackling Pine Fire',
    bgUrl: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=2000&q=80',
    badge: 'Relaxing',
  },
  {
    id: 'kyoto-zen',
    name: 'Kyoto Rain Veranda',
    category: 'Zen & Nature',
    location: 'Kyoto, Japan',
    soundType: 'rain',
    soundLabel: 'Bamboo Water Droplets',
    bgUrl: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=2000&q=80',
    badge: 'Serene',
  },
  {
    id: 'espresso-noir',
    name: 'Midnight Espresso Bar',
    category: 'Coffee & Ambience',
    location: 'SoHo, New York',
    soundType: 'cafe',
    soundLabel: 'Barista Espresso Murmur',
    bgUrl: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=2000&q=80',
    badge: 'Flow',
  },
  {
    id: 'starry-summit',
    name: 'Celestial Observatory',
    category: 'Night & Focus',
    location: 'Atacama Desert',
    soundType: 'waves',
    soundLabel: 'Cosmic 432Hz Binaural',
    bgUrl: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?auto=format&fit=crop&w=2000&q=80',
    badge: 'Deep Work',
  },
];

type FeatureTab = 'synthesizer' | 'canvas' | 'timer' | 'copilot' | 'coworking';

export const LandingPage: React.FC<LandingPageProps> = ({ onSignIn, isLoading }) => {
  // 1. Live Atmosphere Preview
  const [selectedScene, setSelectedScene] = useState<AtmosphereScene>(ATMOSPHERE_SCENES[0]);
  const [activeTab, setActiveTab] = useState<FeatureTab>('synthesizer');
  
  // 2. Audio Engine State
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [soundVolume, setSoundVolume] = useState(0.6);
  const [activeSoundType, setActiveSoundType] = useState<'rain' | 'fireplace' | 'cafe' | 'waves'>('rain');

  // 3. Interactive Sticky Note Demo
  const [demoNoteText, setDemoNoteText] = useState('✨ Finish product roadmap draft\n🎯 4 uninterrupted focus blocks\n☕ Afternoon tea break');
  const [demoTasks, setDemoTasks] = useState([
    { id: '1', text: 'Structure system architecture', done: true },
    { id: '2', text: 'Refine procedural audio synthesizers', done: true },
    { id: '3', text: 'Deploy Cloud Firestore sync rules', done: false },
  ]);

  // 4. Interactive Live Pomodoro Simulator
  const [timerSeconds, setTimerSeconds] = useState(1500); // 25:00
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const timerIntervalRef = useRef<any>(null);

  // 5. AI Copilot Demo State
  const [aiGoalInput, setAiGoalInput] = useState('Prepare Q3 Product Launch');
  const [aiSteps, setAiSteps] = useState<string[]>([
    'Audit core feature readiness & test builds',
    'Draft changelog notes & announcement copy',
    'Schedule synchronized team launch review',
  ]);
  const [isAiGenerating, setIsAiGenerating] = useState(false);

  // 6. Auth Error State
  const [authError, setAuthError] = useState<string | null>(null);

  // Audio Synth Sync
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

  // Mini Timer Ticking Logic
  useEffect(() => {
    if (isTimerRunning) {
      timerIntervalRef.current = setInterval(() => {
        setTimerSeconds((prev) => {
          if (prev <= 1) {
            audioSynth.playChime('zen-bell');
            setIsTimerRunning(false);
            return 1500;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      clearInterval(timerIntervalRef.current);
    }

    return () => clearInterval(timerIntervalRef.current);
  }, [isTimerRunning]);

  const handleSceneSelect = (scene: AtmosphereScene) => {
    audioSynth.playClick('high');
    setSelectedScene(scene);
    setActiveSoundType(scene.soundType);
  };

  const handleToggleTask = (id: string) => {
    audioSynth.playClick('high');
    setDemoTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t))
    );
  };

  const handleAiGenerate = () => {
    audioSynth.playClick('high');
    setIsAiGenerating(true);
    setTimeout(() => {
      if (aiGoalInput.toLowerCase().includes('exam') || aiGoalInput.toLowerCase().includes('study')) {
        setAiSteps([
          'Review Chapter 4-6 key concepts & definitions',
          'Solve 5 practice problems under timed conditions',
          'Create a 1-page condensed active-recall cheat sheet',
        ]);
      } else {
        setAiSteps([
          `Deconstruct "${aiGoalInput}" into initial scope`,
          `Execute first 25-minute deep focus sprint block`,
          `Audit deliverables & log completion milestone`,
        ]);
      }
      setIsAiGenerating(false);
    }, 600);
  };

  const handleGoogleSignIn = async () => {
    audioSynth.playClick('switch');
    setAuthError(null);
    try {
      await onSignIn();
    } catch (err: any) {
      console.warn('Sign-in error:', err);
      if (err.code === 'auth/popup-closed-by-user') {
        setAuthError('Sign-in cancelled. Click below to try again.');
      } else if (err.code === 'auth/popup-blocked') {
        setAuthError('Sign-in popup blocked. Please allow popups for this domain.');
      } else {
        setAuthError(err.message || 'Authentication encountered an error. Please try again.');
      }
    }
  };

  const formatTimer = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainder = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remainder.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen w-full relative bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500 selection:text-white overflow-x-hidden">
      
      {/* 1. Dynamic Background Backdrop */}
      <div className="fixed inset-0 z-0 pointer-events-none transition-all duration-1000 ease-out">
        <img
          src={selectedScene.bgUrl}
          alt={selectedScene.name}
          className="w-full h-full object-cover opacity-20 filter blur-[3px] scale-105 transition-all duration-1000"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/85 via-slate-950/80 to-slate-950" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(99,102,241,0.12),transparent_70%)]" />
      </div>

      {/* 2. Top Precision Header */}
      <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl">
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
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                  WORKSPACE
                </span>
              </span>
            </div>
          </div>

          {/* Quick Sound Toggle & Sign In CTA */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                audioSynth.playClick('high');
                setIsPlayingAudio(!isPlayingAudio);
              }}
              className={`hidden sm:inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-medium transition ${
                isPlayingAudio
                  ? 'bg-indigo-600/20 border-indigo-500/50 text-indigo-300 shadow-sm'
                  : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 text-slate-300'
              }`}
            >
              {isPlayingAudio ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
                  <span>{selectedScene.soundLabel}</span>
                  <Volume2 className="w-3.5 h-3.5 text-indigo-400" />
                </>
              ) : (
                <>
                  <VolumeX className="w-3.5 h-3.5 text-slate-400" />
                  <span>Sound Demo</span>
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

      {/* 3. Hero Section */}
      <section className="relative z-20 w-full max-w-7xl mx-auto px-6 pt-12 pb-8 sm:pt-16 sm:pb-12 text-center">
        
        {/* Error notification banner */}
        {authError && (
          <div className="max-w-md mx-auto mb-6 p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between shadow-lg backdrop-blur-md">
            <span>{authError}</span>
            <button onClick={() => setAuthError(null)} className="text-rose-400 hover:text-white px-2 font-bold">×</button>
          </div>
        )}

        {/* Feature Eyebrow Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/90 border border-slate-800 text-slate-300 text-xs font-medium mb-6 shadow-inner backdrop-blur-md">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Real-Time Cloud Synchronized Workspace</span>
          <span className="text-slate-500">•</span>
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

        {/* Call-to-action buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 mb-12">
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
            onClick={() => {
              audioSynth.playClick('high');
              setIsPlayingAudio(!isPlayingAudio);
            }}
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

        {/* Live Atmosphere Quick Picker */}
        <div className="max-w-4xl mx-auto mb-10">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-3 px-1">
            <span className="flex items-center gap-1.5 font-semibold text-slate-300">
              <Compass className="w-3.5 h-3.5 text-indigo-400" /> Choose Your Live Atmosphere:
            </span>
            <span className="text-[11px] text-slate-500">Instant Real-Time Preview</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
            {ATMOSPHERE_SCENES.map((scene) => {
              const isSelected = selectedScene.id === scene.id;
              return (
                <button
                  key={scene.id}
                  onClick={() => handleSceneSelect(scene)}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    isSelected
                      ? 'bg-indigo-600/20 border-indigo-500 shadow-md shadow-indigo-500/20 ring-1 ring-indigo-500/50'
                      : 'bg-slate-900/60 border-slate-800/90 hover:border-slate-700 hover:bg-slate-900/90'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] uppercase font-bold text-indigo-300">{scene.badge}</span>
                    {isSelected && <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping" />}
                  </div>
                  <div className="font-semibold text-xs text-white truncate">{scene.name}</div>
                  <div className="text-[10px] text-slate-400 truncate">{scene.soundLabel}</div>
                </button>
              );
            })}
          </div>
        </div>

      </section>

      {/* 4. Interactive Live Showcase Stage */}
      <section className="relative z-20 w-full max-w-6xl mx-auto px-6 pb-20">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/90 shadow-2xl overflow-hidden backdrop-blur-2xl">
          
          {/* Stage Top Navigation Bar (Interactive Tab Controls) */}
          <div className="border-b border-slate-800/80 bg-slate-950/90 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
            
            {/* macOS Window Indicator Dots */}
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-rose-500/80" />
              <span className="w-3 h-3 rounded-full bg-amber-500/80" />
              <span className="w-3 h-3 rounded-full bg-emerald-500/80" />
              <span className="text-xs font-mono text-slate-400 ml-2 hidden sm:inline">
                Focus Atmosphere • {selectedScene.name}
              </span>
            </div>

            {/* Feature Tabs */}
            <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => {
                  audioSynth.playClick('high');
                  setActiveTab('synthesizer');
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                  activeTab === 'synthesizer'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Headphones className="w-3.5 h-3.5" />
                <span>Audio Mixer</span>
              </button>

              <button
                onClick={() => {
                  audioSynth.playClick('high');
                  setActiveTab('canvas');
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                  activeTab === 'canvas'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Layout className="w-3.5 h-3.5" />
                <span>Spatial Canvas</span>
              </button>

              <button
                onClick={() => {
                  audioSynth.playClick('high');
                  setActiveTab('timer');
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                  activeTab === 'timer'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Flow Timer</span>
              </button>

              <button
                onClick={() => {
                  audioSynth.playClick('high');
                  setActiveTab('copilot');
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                  activeTab === 'copilot'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Bot className="w-3.5 h-3.5" />
                <span>AI Copilot</span>
              </button>
            </div>

          </div>

          {/* Stage Body Content */}
          <div className="p-6 sm:p-8 min-h-[380px] flex flex-col justify-center">
            
            {/* TAB 1: AUDIO SYNTHESIZER */}
            {activeTab === 'synthesizer' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                <div className="md:col-span-2 space-y-4">
                  <div className="inline-flex items-center gap-2 text-indigo-400 text-xs font-bold uppercase tracking-wider">
                    <Music2 className="w-4 h-4" /> Procedural Web Audio Engine
                  </div>
                  <h3 className="text-2xl font-bold text-white">
                    Multi-Track Soundstage Synthesizer
                  </h3>
                  <p className="text-sm text-slate-300 leading-relaxed">
                    Unlike static looped MP3 files that fatigue your ears, our Web Audio synthesizer generates continuous, organic frequencies (rainfall, fireplace crackles, cafe murmurs, and alpha 432Hz sine waves).
                  </p>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                    {[
                      { id: 'rain', label: 'Rainfall', icon: CloudRain },
                      { id: 'fireplace', label: 'Hearth Fire', icon: Flame },
                      { id: 'cafe', label: 'Espresso Bar', icon: Coffee },
                      { id: 'waves', label: '432Hz Drone', icon: Waves },
                    ].map((item) => {
                      const Icon = item.icon;
                      const isSoundActive = isPlayingAudio && activeSoundType === item.id;
                      return (
                        <button
                          key={item.id}
                          onClick={() => {
                            audioSynth.playClick('high');
                            setActiveSoundType(item.id as any);
                            if (!isPlayingAudio) setIsPlayingAudio(true);
                          }}
                          className={`p-3 rounded-xl border flex flex-col items-center gap-2 text-center transition ${
                            isSoundActive
                              ? 'bg-indigo-600/30 border-indigo-500 shadow-md shadow-indigo-500/20'
                              : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          <Icon className={`w-5 h-5 ${isSoundActive ? 'text-indigo-300 animate-bounce' : 'text-slate-400'}`} />
                          <span className="text-xs font-semibold text-white">{item.label}</span>
                          <span className="text-[10px] text-slate-400">
                            {isSoundActive ? 'Active' : 'Click to Play'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between space-y-4">
                  <div className="flex items-center justify-between text-xs text-slate-300">
                    <span className="font-semibold flex items-center gap-1.5">
                      <Sliders className="w-3.5 h-3.5 text-indigo-400" /> Master Volume
                    </span>
                    <span className="font-mono text-indigo-300">{Math.round(soundVolume * 100)}%</span>
                  </div>

                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={soundVolume}
                    onChange={(e) => setSoundVolume(parseFloat(e.target.value))}
                    className="w-full accent-indigo-500 h-2 bg-slate-800 rounded-lg cursor-pointer"
                  />

                  <button
                    onClick={() => {
                      audioSynth.playChime('zen-bell');
                    }}
                    className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-200 flex items-center justify-center gap-2 transition"
                  >
                    <BellRing className="w-3.5 h-3.5 text-amber-400" />
                    <span>Test Tibetan Zen Bell Chime</span>
                  </button>
                </div>
              </div>
            )}

            {/* TAB 2: SPATIAL CANVAS & NOTES */}
            {activeTab === 'canvas' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                <div className="md:col-span-1 space-y-3">
                  <div className="inline-flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-wider">
                    <Layout className="w-4 h-4" /> Spatial Workspace
                  </div>
                  <h3 className="text-2xl font-bold text-white">
                    Draggable Notes & Scratchpad
                  </h3>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Keep your goals visible without switching browser tabs. Position sticky notes, format with markdown, and check off milestones.
                  </p>
                </div>

                <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Interactive Note */}
                  <div className="bg-amber-400/10 border border-amber-400/30 rounded-2xl p-4 flex flex-col justify-between shadow-inner">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-bold text-amber-300">Sticky Note #1</span>
                      <span className="text-[10px] text-amber-400/70 font-mono">Editable</span>
                    </div>
                    <textarea
                      value={demoNoteText}
                      onChange={(e) => setDemoNoteText(e.target.value)}
                      className="w-full bg-transparent text-amber-100 placeholder-amber-200/50 text-xs resize-none focus:outline-none leading-relaxed h-28"
                    />
                  </div>

                  {/* Interactive Checklist */}
                  <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-bold text-indigo-300">Sprint Focus Tasks</span>
                      <span className="text-[10px] text-slate-500 font-mono">Click to toggle</span>
                    </div>
                    <div className="space-y-2">
                      {demoTasks.map((task) => (
                        <div
                          key={task.id}
                          onClick={() => handleToggleTask(task.id)}
                          className={`p-2 rounded-xl border text-xs flex items-center gap-2.5 cursor-pointer transition select-none ${
                            task.done
                              ? 'bg-slate-900/60 border-slate-800/80 text-slate-500 line-through'
                              : 'bg-slate-900 border-slate-700/80 text-slate-200 hover:border-slate-600'
                          }`}
                        >
                          <div
                            className={`w-4 h-4 rounded-md border flex items-center justify-center ${
                              task.done
                                ? 'bg-indigo-600 border-indigo-600 text-white'
                                : 'border-slate-600'
                            }`}
                          >
                            {task.done && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>
                          <span className="truncate">{task.text}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: FLOW TIMER */}
            {activeTab === 'timer' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                <div className="space-y-4">
                  <div className="inline-flex items-center gap-2 text-indigo-400 text-xs font-bold uppercase tracking-wider">
                    <Clock className="w-4 h-4" /> Interval Focus Engine
                  </div>
                  <h3 className="text-2xl font-bold text-white">
                    Pomodoro, 52/17 & Flowtime
                  </h3>
                  <p className="text-sm text-slate-300 leading-relaxed">
                    Customizable intervals tailored to your circadian rhythm. Complete with acoustic Tibetan bowl bell chimes and automated break prompts.
                  </p>
                  <div className="flex items-center gap-3 text-xs text-slate-400">
                    <span className="flex items-center gap-1 text-emerald-400">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Fullscreen Mode
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1 text-indigo-400">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Auto Break Prompts
                    </span>
                  </div>
                </div>

                <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-6 text-center flex flex-col items-center">
                  <div className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider mb-2">
                    Active Sprint Timer
                  </div>
                  <div className="text-5xl sm:text-6xl font-extrabold text-white tracking-tight my-4 font-mono">
                    {formatTimer(timerSeconds)}
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => {
                        audioSynth.playClick('switch');
                        setIsTimerRunning(!isTimerRunning);
                      }}
                      className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition"
                    >
                      {isTimerRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                      <span>{isTimerRunning ? 'Pause Timer' : 'Start Focus Block'}</span>
                    </button>
                    <button
                      onClick={() => {
                        audioSynth.playClick('high');
                        setIsTimerRunning(false);
                        setTimerSeconds(1500);
                      }}
                      className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 transition"
                      title="Reset Timer"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: AI COPILOT */}
            {activeTab === 'copilot' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                <div className="space-y-4">
                  <div className="inline-flex items-center gap-2 text-purple-400 text-xs font-bold uppercase tracking-wider">
                    <Bot className="w-4 h-4" /> AI Study & Sprint Copilot
                  </div>
                  <h3 className="text-2xl font-bold text-white">
                    Break Big Goals into Actionable Milestones
                  </h3>
                  <p className="text-sm text-slate-300 leading-relaxed">
                    Stuck on a massive project? Enter your objective and let the AI study copilot deconstruct it into structured 25-minute sprints.
                  </p>
                </div>

                <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-5 space-y-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={aiGoalInput}
                      onChange={(e) => setAiGoalInput(e.target.value)}
                      placeholder="e.g. Master Organic Chemistry or Launch MVP"
                      className="flex-1 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                    <button
                      onClick={handleAiGenerate}
                      disabled={isAiGenerating}
                      className="px-3 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-50"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{isAiGenerating ? 'Deconstructing...' : 'Plan Sprints'}</span>
                    </button>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-slate-800">
                    <span className="text-[10px] font-bold uppercase text-slate-400">Generated Sprint Milestones:</span>
                    {aiSteps.map((step, idx) => (
                      <div key={idx} className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/20 text-xs text-purple-200 flex items-center gap-2">
                        <span className="w-4 h-4 rounded-full bg-purple-500/30 text-purple-300 flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                          {idx + 1}
                        </span>
                        <span className="truncate">{step}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

          </div>

        </div>
      </section>

      {/* 5. Feature Deep-Dive Grid */}
      <section className="relative z-20 w-full max-w-7xl mx-auto px-6 py-12 border-t border-slate-900">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-3">
            Crafted for Unbroken Flow State
          </h2>
          <p className="text-xs sm:text-sm text-slate-400">
            Every element is engineered with acoustic science, spatial ergonomics, and zero distractions.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          
          {/* Card 1 */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 hover:border-slate-700 transition">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mb-4">
              <Headphones className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white mb-2">Procedural Audio Synthesizer</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Synthesized pink noise, hearth logs, rain drops, and alpha 432Hz waves that adapt seamlessly without audio looping artifacts.
            </p>
          </div>

          {/* Card 2 */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 hover:border-slate-700 transition">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mb-4">
              <Layout className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white mb-2">Infinite Spatial Canvas</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Place sticky notes anywhere on the screen, attach clipboard screenshots, write in markdown, and pin critical reminders.
            </p>
          </div>

          {/* Card 3 */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 hover:border-slate-700 transition">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mb-4">
              <Cloud className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white mb-2">Google Cloud Sync</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Your audio presets, daily streaks, task lists, and notes are securely synced across all your desktop and tablet devices.
            </p>
          </div>

          {/* Card 4 */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 hover:border-slate-700 transition">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center mb-4">
              <Clock className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white mb-2">Circadian Focus Intervals</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Switch effortlessly between Pomodoro, Ultradian 52/17, and stopwatch Flowtime with Tibetan bell audio notifications.
            </p>
          </div>

          {/* Card 5 */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 hover:border-slate-700 transition">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center mb-4">
              <Users className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white mb-2">Virtual Coworking Presence</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Study alongside peers with synchronized timers and shared session milestones without intrusive chat disruptions.
            </p>
          </div>

          {/* Card 6 */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 hover:border-slate-700 transition">
            <div className="w-10 h-10 rounded-xl bg-pink-500/10 border border-pink-500/20 text-pink-400 flex items-center justify-center mb-4">
              <Bot className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white mb-2">AI Sprint Breakdown</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Instantly turn ambiguous projects into structured 25-minute sprint goals with one-click milestone extraction.
            </p>
          </div>

        </div>
      </section>

      {/* 6. High-Conversion Bottom CTA Banner */}
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

      {/* 7. Footer */}
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
