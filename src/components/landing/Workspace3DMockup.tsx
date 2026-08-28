import React, { useState, useRef, useEffect } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  Volume2,
  VolumeX,
  Check,
  Layout,
  Clock,
  Music2,
  Bot,
  Sliders,
  Maximize2,
  GripHorizontal,
  Pin,
  Layers,
  Flame,
  CloudRain,
  Coffee,
  Waves,
  Eye
} from 'lucide-react';
import { audioSynth } from '../../utils/audioSynth';

interface Workspace3DMockupProps {
  isPlayingAudio: boolean;
  onToggleAudio: () => void;
  activeSoundType: 'rain' | 'fireplace' | 'cafe' | 'waves';
  onChangeSoundType: (type: 'rain' | 'fireplace' | 'cafe' | 'waves') => void;
}

export const Workspace3DMockup: React.FC<Workspace3DMockupProps> = ({
  isPlayingAudio,
  onToggleAudio,
  activeSoundType,
  onChangeSoundType,
}) => {
  // 3D Perspective Mouse Tracking
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [rotateX, setRotateX] = useState(8);
  const [rotateY, setRotateY] = useState(-12);
  const [glarePos, setGlarePos] = useState({ x: 50, y: 50 });
  const [isHovered, setIsHovered] = useState(false);
  const [viewAngle, setViewAngle] = useState<'perspective' | 'isometric' | 'flat'>('perspective');

  // Interactive Live State inside the 3D Mock
  const [timerSeconds, setTimerSeconds] = useState(1500);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timerMode, setTimerMode] = useState<'focus' | 'shortBreak' | 'longBreak'>('focus');
  const [stickyText, setStickyText] = useState('✨ Ship high-impact UX\n🎯 4 uninterrupted focus blocks\n☕ Japanese matcha break');
  const [tasks, setTasks] = useState([
    { id: '1', title: 'Complete system architecture spec', done: true },
    { id: '2', title: 'Procedural Web Audio frequency synthesis', done: true },
    { id: '3', title: 'Interactive 3D viewport spatial rendering', done: false },
  ]);
  const [activeTab, setActiveTab] = useState<'all' | 'timer' | 'audio' | 'tasks'>('all');

  // Live Timer Loop
  useEffect(() => {
    let interval: any;
    if (isTimerRunning) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => {
          if (prev <= 1) {
            audioSynth.playChime('zen-bell');
            setIsTimerRunning(false);
            return 1500;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning]);

  // Mouse Move on 3D Container
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current || viewAngle === 'flat') return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const normX = (x / rect.width) * 2 - 1;
    const normY = (y / rect.height) * 2 - 1;

    if (viewAngle === 'perspective') {
      setRotateY(normX * 14);
      setRotateX(-normY * 12);
    } else if (viewAngle === 'isometric') {
      setRotateY(-20 + normX * 8);
      setRotateX(22 - normY * 8);
    }

    setGlarePos({
      x: (x / rect.width) * 100,
      y: (y / rect.height) * 100,
    });
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    if (viewAngle === 'perspective') {
      setRotateX(6);
      setRotateY(-8);
    } else if (viewAngle === 'isometric') {
      setRotateX(20);
      setRotateY(-22);
    } else {
      setRotateX(0);
      setRotateY(0);
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const toggleTask = (id: string) => {
    audioSynth.playClick('high');
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t))
    );
  };

  const progressPercent = ((1500 - timerSeconds) / 1500) * 100;

  return (
    <div className="w-full flex flex-col items-center select-none">
      
      {/* 3D Mode Selector Header */}
      <div className="flex items-center justify-between w-full max-w-5xl mb-4 px-2">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Interactive 3D Workspace Stage</span>
          <span className="text-slate-600">•</span>
          <span className="text-[11px] text-slate-400">Hover & Tilt to Explore Layers</span>
        </div>

        <div className="flex items-center gap-1.5 bg-slate-900/90 border border-slate-800 p-1 rounded-xl backdrop-blur-md">
          <button
            onClick={() => {
              audioSynth.playClick('switch');
              setViewAngle('perspective');
              setRotateX(8);
              setRotateY(-10);
            }}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition flex items-center gap-1.5 ${
              viewAngle === 'perspective'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>3D Perspective</span>
          </button>
          
          <button
            onClick={() => {
              audioSynth.playClick('switch');
              setViewAngle('isometric');
              setRotateX(22);
              setRotateY(-24);
            }}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition flex items-center gap-1.5 ${
              viewAngle === 'isometric'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span>Exploded 3D</span>
          </button>

          <button
            onClick={() => {
              audioSynth.playClick('switch');
              setViewAngle('flat');
              setRotateX(0);
              setRotateY(0);
            }}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition flex items-center gap-1.5 ${
              viewAngle === 'flat'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Flat Canvas</span>
          </button>
        </div>
      </div>

      {/* 3D Perspective Viewport Container */}
      <div
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={handleMouseLeave}
        className="w-full max-w-5xl relative [perspective:1400px] cursor-grab active:cursor-grabbing"
      >
        <div
          style={{
            transform: `rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1, 1, 1)`,
            transition: isHovered ? 'transform 0.1s ease-out' : 'transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
            transformStyle: 'preserve-3d',
          }}
          className="relative w-full rounded-3xl border border-slate-700/60 bg-slate-950/90 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8),0_0_50px_rgba(99,102,241,0.15)] overflow-hidden min-h-[540px] p-5 sm:p-7 flex flex-col justify-between"
        >
          {/* Glass Glare Highlight */}
          <div
            style={{
              background: `radial-gradient(circle at ${glarePos.x}% ${glarePos.y}%, rgba(255,255,255,0.12) 0%, transparent 65%)`,
            }}
            className="absolute inset-0 pointer-events-none z-50 rounded-3xl transition-opacity duration-300"
          />

          {/* Background Atmospheric Layer (Deep Plane in 3D) */}
          <div
            style={{ transform: viewAngle === 'isometric' ? 'translateZ(-40px)' : 'translateZ(0px)' }}
            className="absolute inset-0 z-0 overflow-hidden rounded-3xl transition-transform duration-500"
          >
            <img
              src="https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=1800&q=80"
              alt="Atmosphere"
              className="w-full h-full object-cover opacity-25 filter blur-[2px] scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/80 to-slate-950/60" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(99,102,241,0.1),transparent_75%)]" />
          </div>

          {/* Top Glass Navigation Bar (Elevated Plane in 3D) */}
          <div
            style={{
              transform: viewAngle === 'isometric' ? 'translateZ(45px)' : 'translateZ(20px)',
              transformStyle: 'preserve-3d',
            }}
            className="relative z-20 w-full flex items-center justify-between border-b border-slate-800/80 bg-slate-950/70 backdrop-blur-xl px-4 py-2.5 rounded-2xl shadow-lg transition-transform duration-500"
          >
            {/* Left Window Dots & Workspace Badge */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80 shadow-sm shadow-rose-500/40" />
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80 shadow-sm shadow-amber-500/40" />
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 shadow-sm shadow-emerald-500/40" />
              </div>
              <div className="hidden sm:flex items-center gap-2 border-l border-slate-800 pl-3">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                <span className="text-xs font-bold text-white tracking-wide">Focus Atmosphere</span>
                <span className="text-[10px] font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded-full">
                  LIVE SIMULATOR
                </span>
              </div>
            </div>

            {/* Live Presence Avatars in Mock */}
            <div className="flex items-center gap-3">
              <div className="flex items-center -space-x-1.5">
                {[
                  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=80&q=80',
                  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=80&q=80',
                  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=80&q=80',
                ].map((avatar, idx) => (
                  <img
                    key={idx}
                    src={avatar}
                    alt="Co-worker"
                    className="w-6 h-6 rounded-full border border-slate-900 object-cover"
                  />
                ))}
                <span className="w-6 h-6 rounded-full bg-indigo-600/60 border border-indigo-400/40 text-[9px] font-bold text-white flex items-center justify-center">
                  +14
                </span>
              </div>

              <div className="text-[11px] text-emerald-400 flex items-center gap-1 font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                <span>18 Focusing</span>
              </div>
            </div>
          </div>

          {/* Central Layer: Multi-Widget Floating Stage */}
          <div
            style={{
              transform: viewAngle === 'isometric' ? 'translateZ(65px)' : 'translateZ(30px)',
              transformStyle: 'preserve-3d',
            }}
            className="relative z-30 my-6 grid grid-cols-1 md:grid-cols-12 gap-5 items-stretch transition-transform duration-500"
          >
            {/* WIDGET 1: Centerpiece Flow Timer (Left/Center Column) */}
            <div
              style={{
                transform: viewAngle === 'isometric' ? 'translateZ(35px)' : 'translateZ(15px)',
              }}
              className="md:col-span-6 bg-slate-950/85 backdrop-blur-2xl border border-indigo-500/30 rounded-3xl p-6 shadow-2xl flex flex-col justify-between relative overflow-hidden group hover:border-indigo-500/50 transition-all"
            >
              {/* Top Widget Bar */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
                <div className="flex items-center gap-2">
                  <GripHorizontal className="w-3.5 h-3.5 text-slate-500" />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                    Pomodoro Interval
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  {(['focus', 'shortBreak'] as const).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => {
                        audioSynth.playClick('switch');
                        setTimerMode(mode);
                        setTimerSeconds(mode === 'focus' ? 1500 : 300);
                        setIsTimerRunning(false);
                      }}
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-lg transition ${
                        timerMode === mode
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-900 text-slate-400 hover:text-white'
                      }`}
                    >
                      {mode === 'focus' ? 'Focus (25m)' : 'Break (5m)'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Radial Countdown Clock Display */}
              <div className="my-5 flex flex-col items-center justify-center relative">
                <div className="relative w-44 h-44 flex items-center justify-center">
                  {/* SVG Radial Ring */}
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 160 160">
                    <circle
                      cx="80"
                      cy="80"
                      r="68"
                      stroke="currentColor"
                      strokeWidth="6"
                      className="text-slate-800/80"
                      fill="transparent"
                    />
                    <circle
                      cx="80"
                      cy="80"
                      r="68"
                      stroke="url(#gradientTimer3D)"
                      strokeWidth="7"
                      strokeDasharray={2 * Math.PI * 68}
                      strokeDashoffset={2 * Math.PI * 68 * (1 - progressPercent / 100)}
                      strokeLinecap="round"
                      className="transition-all duration-1000 ease-linear"
                      fill="transparent"
                    />
                    <defs>
                      <linearGradient id="gradientTimer3D" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#6366f1" />
                        <stop offset="50%" stopColor="#a855f7" />
                        <stop offset="100%" stopColor="#ec4899" />
                      </linearGradient>
                    </defs>
                  </svg>

                  {/* Digital Digits inside Ring */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className="text-4xl font-extrabold font-mono tracking-tight text-white drop-shadow-md">
                      {formatTime(timerSeconds)}
                    </span>
                    <span className="text-[10px] font-semibold text-indigo-400 tracking-wider uppercase mt-0.5">
                      {isTimerRunning ? 'Session Active' : 'Ready to Start'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Timer Controls */}
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  onClick={() => {
                    audioSynth.playClick('switch');
                    setIsTimerRunning(!isTimerRunning);
                  }}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition active:scale-95"
                >
                  {isTimerRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  <span>{isTimerRunning ? 'Pause' : 'Start Focus'}</span>
                </button>
                <button
                  onClick={() => {
                    audioSynth.playClick('high');
                    setIsTimerRunning(false);
                    setTimerSeconds(timerMode === 'focus' ? 1500 : 300);
                  }}
                  className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 transition"
                  title="Reset Timer"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* RIGHT COLUMN: Audio Equalizer + Sticky Notes + Tasks */}
            <div className="md:col-span-6 flex flex-col gap-4">
              
              {/* WIDGET 2: Multi-Track Procedural Synthesizer */}
              <div
                style={{
                  transform: viewAngle === 'isometric' ? 'translateZ(45px)' : 'translateZ(20px)',
                }}
                className="bg-slate-950/85 backdrop-blur-2xl border border-slate-800 rounded-3xl p-4 shadow-xl hover:border-slate-700 transition-all"
              >
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800/80">
                  <div className="flex items-center gap-2 text-indigo-400">
                    <Music2 className="w-4 h-4" />
                    <span className="text-xs font-bold text-white">Procedural Web Audio Engine</span>
                  </div>
                  <button
                    onClick={onToggleAudio}
                    className={`px-3 py-1 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition ${
                      isPlayingAudio
                        ? 'bg-indigo-600/30 border border-indigo-500/50 text-indigo-300'
                        : 'bg-slate-900 border border-slate-800 text-slate-300 hover:text-white'
                    }`}
                  >
                    {isPlayingAudio ? (
                      <>
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-ping" />
                        <Volume2 className="w-3.5 h-3.5" />
                        <span>Playing</span>
                      </>
                    ) : (
                      <>
                        <VolumeX className="w-3.5 h-3.5 text-slate-500" />
                        <span>Muted (Click)</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Sound Type Selector & Animated Frequency Visualizer */}
                <div className="grid grid-cols-4 gap-2 mb-3">
                  {[
                    { id: 'rain', label: 'Rain', icon: CloudRain },
                    { id: 'fireplace', label: 'Hearth', icon: Flame },
                    { id: 'cafe', label: 'Espresso', icon: Coffee },
                    { id: 'waves', label: '432Hz', icon: Waves },
                  ].map((s) => {
                    const Icon = s.icon;
                    const isCur = activeSoundType === s.id;
                    return (
                      <button
                        key={s.id}
                        onClick={() => {
                          audioSynth.playClick('high');
                          onChangeSoundType(s.id as any);
                        }}
                        className={`p-2 rounded-xl border text-center flex flex-col items-center gap-1 transition ${
                          isCur
                            ? 'bg-indigo-600/25 border-indigo-500 text-white shadow-md'
                            : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        <Icon className={`w-3.5 h-3.5 ${isCur ? 'text-indigo-400 animate-bounce' : 'text-slate-500'}`} />
                        <span className="text-[10px] font-semibold">{s.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Animated Equalizer Waveform Bars */}
                <div className="h-8 bg-slate-900/90 rounded-xl border border-slate-800/80 px-3 flex items-center justify-between gap-1 overflow-hidden">
                  {Array.from({ length: 28 }).map((_, i) => {
                    const height = isPlayingAudio
                      ? Math.max(15, Math.sin(i * 0.4 + Date.now() * 0.005) * 80 + 20)
                      : 15;
                    return (
                      <div
                        key={i}
                        style={{ height: `${height}%` }}
                        className={`w-1 rounded-full transition-all duration-150 ${
                          isPlayingAudio
                            ? 'bg-gradient-to-t from-indigo-600 via-indigo-400 to-purple-400'
                            : 'bg-slate-800'
                        }`}
                      />
                    );
                  })}
                </div>
              </div>

              {/* WIDGET 3 & 4: Dual Sub-Panels (Sticky Note + Sprint Tasks) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Sticky Note */}
                <div
                  style={{
                    transform: viewAngle === 'isometric' ? 'translateZ(55px)' : 'translateZ(25px)',
                  }}
                  className="bg-amber-400/10 border border-amber-400/30 rounded-2xl p-3.5 shadow-lg flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-amber-400/20 text-amber-300 text-[11px] font-bold">
                    <div className="flex items-center gap-1">
                      <Pin className="w-3 h-3 text-amber-400" />
                      <span>Spatial Note</span>
                    </div>
                    <span className="text-[9px] text-amber-400/70 font-mono">Synced</span>
                  </div>
                  <textarea
                    value={stickyText}
                    onChange={(e) => setStickyText(e.target.value)}
                    className="w-full bg-transparent text-amber-100 placeholder-amber-200/50 text-xs resize-none focus:outline-none leading-relaxed h-20 font-sans"
                  />
                </div>

                {/* Sprint Checklist */}
                <div
                  style={{
                    transform: viewAngle === 'isometric' ? 'translateZ(55px)' : 'translateZ(25px)',
                  }}
                  className="bg-slate-950/85 backdrop-blur-2xl border border-slate-800 rounded-2xl p-3.5 shadow-lg flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-slate-800 text-slate-300 text-[11px] font-bold">
                    <span>Sprint Milestones</span>
                    <span className="text-[9px] text-emerald-400 font-mono">
                      {tasks.filter((t) => t.done).length}/{tasks.length} Done
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {tasks.map((task) => (
                      <div
                        key={task.id}
                        onClick={() => toggleTask(task.id)}
                        className={`p-1.5 rounded-lg border text-[11px] flex items-center gap-2 cursor-pointer transition select-none ${
                          task.done
                            ? 'bg-slate-900/40 border-slate-800/50 text-slate-500 line-through'
                            : 'bg-slate-900/80 border-slate-700/80 text-slate-200 hover:border-slate-600'
                        }`}
                      >
                        <div
                          className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${
                            task.done
                              ? 'bg-indigo-600 border-indigo-600 text-white'
                              : 'border-slate-600'
                          }`}
                        >
                          {task.done && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                        </div>
                        <span className="truncate">{task.title}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* Bottom Floating Status Bar */}
          <div
            style={{
              transform: viewAngle === 'isometric' ? 'translateZ(30px)' : 'translateZ(10px)',
            }}
            className="relative z-20 w-full flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800/80 text-xs text-slate-400"
          >
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5 text-slate-300 font-medium">
                <Bot className="w-3.5 h-3.5 text-purple-400" /> AI Study Tutor:
              </span>
              <span className="text-[11px] bg-purple-500/10 text-purple-300 px-2 py-0.5 rounded-full border border-purple-500/20">
                Active &bull; Ready to deconstruct goals
              </span>
            </div>

            <div className="flex items-center gap-2 font-mono text-[11px] text-slate-500">
              <span>Cloud Firestore Connected</span>
              <span>&bull;</span>
              <span>4K Tokyo Shinjuku Lo-Fi</span>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
};
