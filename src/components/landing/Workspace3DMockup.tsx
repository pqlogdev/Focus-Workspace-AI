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
  Eye,
  CheckCircle2,
  Sparkles as SparklesIcon,
  Compass,
  ArrowRight,
  Shield,
  Palette
} from 'lucide-react';
import { audioSynth } from '../../utils/audioSynth';

interface Workspace3DMockupProps {
  isPlayingAudio: boolean;
  onToggleAudio: () => void;
  activeSoundType: 'rain' | 'fireplace' | 'cafe' | 'waves';
  onChangeSoundType: (type: 'rain' | 'fireplace' | 'cafe' | 'waves') => void;
  onEnterWorkspace?: () => void;
}

export const Workspace3DMockup: React.FC<Workspace3DMockupProps> = ({
  isPlayingAudio,
  onToggleAudio,
  activeSoundType,
  onChangeSoundType,
  onEnterWorkspace,
}) => {
  // 3D Perspective Mouse Tracking
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [rotateX, setRotateX] = useState(8);
  const [rotateY, setRotateY] = useState(-10);
  const [glarePos, setGlarePos] = useState({ x: 50, y: 50 });
  const [isHovered, setIsHovered] = useState(false);
  const [viewMode, setViewMode] = useState<'perspective' | 'exploded' | 'flat'>('perspective');

  // Interactive Live State inside the 3D Mock
  const [timerSeconds, setTimerSeconds] = useState(1500);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timerMode, setTimerMode] = useState<'focus' | 'shortBreak' | 'longBreak'>('focus');
  const [stickyText, setStickyText] = useState('✨ Deep Focus Sprint\n🎯 Ship high-impact UX feature\n☕ 5m Japanese matcha break');
  const [tasks, setTasks] = useState([
    { id: '1', title: 'Synthesize 432Hz binaural focus wave', done: true },
    { id: '2', title: 'Fine-tune 4K rainy Tokyo ambient loop', done: true },
    { id: '3', title: 'Assemble spatial sticky notes layer', done: false },
    { id: '4', title: 'Sync real-time co-working timer', done: false },
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
    if (!containerRef.current || viewMode === 'flat') return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const normX = (x / rect.width) * 2 - 1;
    const normY = (y / rect.height) * 2 - 1;

    if (viewMode === 'perspective') {
      setRotateY(normX * 14);
      setRotateX(-normY * 12);
    } else if (viewMode === 'exploded') {
      setRotateY(-18 + normX * 10);
      setRotateX(16 - normY * 8);
    }

    setGlarePos({
      x: (x / rect.width) * 100,
      y: (y / rect.height) * 100,
    });
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    if (viewMode === 'perspective') {
      setRotateX(6);
      setRotateY(-8);
    } else if (viewMode === 'exploded') {
      setRotateX(14);
      setRotateY(-16);
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
      <div className="flex items-center justify-between w-full max-w-5xl mb-4 px-2 flex-wrap gap-2">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Interactive 3D Workspace Stage</span>
          <span className="text-slate-600 hidden sm:inline">•</span>
          <span className="text-[11px] text-slate-400 hidden sm:inline">Tilt & Hover to Inspect Layers</span>
        </div>

        <div className="flex items-center gap-1.5 bg-slate-900/90 border border-slate-800 p-1 rounded-xl backdrop-blur-md shadow-lg">
          <button
            onClick={() => {
              audioSynth.playClick('switch');
              setViewMode('perspective');
              setRotateX(6);
              setRotateY(-8);
            }}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition flex items-center gap-1.5 ${
              viewMode === 'perspective'
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
              setViewMode('exploded');
              setRotateX(16);
              setRotateY(-18);
            }}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition flex items-center gap-1.5 ${
              viewMode === 'exploded'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Exploded 3D Layers</span>
          </button>

          <button
            onClick={() => {
              audioSynth.playClick('switch');
              setViewMode('flat');
              setRotateX(0);
              setRotateY(0);
            }}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition flex items-center gap-1.5 ${
              viewMode === 'flat'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span>Flat Canvas</span>
          </button>
        </div>
      </div>

      {/* 3D Perspective Stage Container */}
      <div
        className="w-full max-w-5xl relative"
        style={{ perspective: viewMode === 'flat' ? 'none' : '1400px' }}
      >
        <div
          ref={containerRef}
          onMouseMove={handleMouseMove}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={handleMouseLeave}
          style={{
            transform: `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`,
            transformStyle: 'preserve-3d',
            transition: isHovered ? 'none' : 'transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
          className="relative w-full rounded-3xl bg-slate-950 border border-slate-800/80 shadow-[0_25px_70px_rgba(0,0,0,0.85)] overflow-visible group"
        >
          
          {/* Glass Glare Overlay */}
          <div
            className="absolute inset-0 rounded-3xl pointer-events-none z-50 transition-opacity duration-300"
            style={{
              background: `radial-gradient(circle 400px at ${glarePos.x}% ${glarePos.y}%, rgba(255,255,255,0.06), transparent 70%)`,
              opacity: isHovered ? 1 : 0.4,
            }}
          />

          {/* ========================================================= */}
          {/* LAYER 1: 4K Ambient Background Layer (Z: 0 or Z: -40 in Exploded) */}
          {/* ========================================================= */}
          <div
            style={{
              transform: viewMode === 'exploded' ? 'translateZ(-50px) scale(0.96)' : 'translateZ(0px)',
              transition: 'transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
              transformStyle: 'preserve-3d',
            }}
            className="relative h-[480px] sm:h-[540px] w-full rounded-3xl overflow-hidden border border-slate-800"
          >
            {/* Background 4K Wallpaper / City Atmosphere */}
            <img
              src="https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=1600&q=80"
              alt="Tokyo Midnight Rain Atmosphere"
              className="w-full h-full object-cover brightness-[0.6] contrast-[1.1] scale-105 transition duration-700"
            />

            {/* Dark Vignette & Color Grading */}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-slate-950/60" />
            <div className="absolute inset-0 bg-indigo-950/20 mix-blend-color" />

            {/* Exploded View Layer Tag */}
            {viewMode === 'exploded' && (
              <div className="absolute top-4 left-4 bg-indigo-600/90 text-white text-[10px] font-bold px-2.5 py-1 rounded-lg border border-indigo-400/40 shadow-lg backdrop-blur-md z-30">
                LAYER 1 • 4K Ambient Atmosphere & Optics
              </div>
            )}

            {/* Window Rain Streak Particle Effect Overlay */}
            <div className="absolute inset-0 opacity-40 pointer-events-none bg-[radial-gradient(#6366f1_1px,transparent_1px)] [background-size:24px_24px]" />
          </div>

          {/* ========================================================= */}
          {/* LAYER 2: Floating Sticky Notes & Session Tasks (Z: +40 or Z: +60 in Exploded) */}
          {/* ========================================================= */}
          <div
            style={{
              transform: viewMode === 'exploded' ? 'translateZ(40px)' : 'translateZ(20px)',
              transition: 'transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
              transformStyle: 'preserve-3d',
            }}
            className="absolute inset-0 pointer-events-none p-4 sm:p-6 flex flex-col justify-between"
          >
            
            {/* Top Bar of Workspace */}
            <div className="flex items-center justify-between pointer-events-auto z-30">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-slate-950/80 border border-slate-800/90 backdrop-blur-xl shadow-xl text-xs text-slate-200">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="font-semibold text-white">Focus Workspace</span>
                <span className="text-slate-600">•</span>
                <span className="text-indigo-400 font-mono text-[11px]">Tokyo Rain 4K</span>
              </div>

              {/* View Mode Tag if Exploded */}
              {viewMode === 'exploded' && (
                <div className="bg-purple-600/90 text-white text-[10px] font-bold px-2.5 py-1 rounded-lg border border-purple-400/40 shadow-lg backdrop-blur-md">
                  LAYER 2 • Spatial Sticky Notes & Task Matrix
                </div>
              )}

              {/* Active Room Badge */}
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-slate-950/80 border border-indigo-500/30 backdrop-blur-xl text-xs text-slate-300">
                <span className="text-indigo-400 font-bold">ROOM #729A</span>
                <span className="px-1.5 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 font-mono text-[10px]">
                  3 FOCUSERS
                </span>
              </div>
            </div>

            {/* Left Spatial Sticky Note (Interactive) */}
            <div className="absolute top-20 left-6 sm:left-8 w-64 p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 backdrop-blur-2xl shadow-2xl pointer-events-auto transition hover:scale-105">
              <div className="flex items-center justify-between border-b border-amber-500/20 pb-2 mb-2 text-amber-300 text-xs font-semibold">
                <span className="flex items-center gap-1.5">
                  <Pin className="w-3.5 h-3.5 fill-amber-400/30" /> Sprint Notes
                </span>
                <span className="text-[10px] text-amber-400/70">Spatial 2D</span>
              </div>
              <textarea
                value={stickyText}
                onChange={(e) => setStickyText(e.target.value)}
                rows={3}
                className="w-full bg-transparent text-xs text-amber-100 placeholder-amber-400/50 outline-none resize-none font-mono leading-relaxed"
              />
            </div>

            {/* Right Interactive Task Planner (Interactive) */}
            <div className="hidden md:block absolute top-20 right-8 w-64 p-3.5 rounded-2xl bg-slate-950/85 border border-slate-800/90 backdrop-blur-2xl shadow-2xl pointer-events-auto">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2 text-xs font-semibold text-slate-200">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" /> Active Tasks
                </span>
                <span className="text-[10px] text-indigo-400 font-mono">
                  {tasks.filter((t) => t.done).length}/{tasks.length}
                </span>
              </div>
              <div className="space-y-1.5">
                {tasks.map((task) => (
                  <div
                    key={task.id}
                    onClick={() => toggleTask(task.id)}
                    className={`flex items-center gap-2 p-1.5 rounded-xl cursor-pointer transition text-xs ${
                      task.done
                        ? 'bg-indigo-500/10 text-slate-400 line-through'
                        : 'bg-slate-900/60 hover:bg-slate-800/80 text-slate-200'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-md flex items-center justify-center transition border ${
                        task.done
                          ? 'bg-indigo-600 border-indigo-500 text-white'
                          : 'border-slate-700 bg-slate-900'
                      }`}
                    >
                      {task.done && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                    </div>
                    <span className="truncate text-[11px]">{task.title}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* ========================================================= */}
          {/* LAYER 3: Main Glassmorphism Focus Timer Core (Z: +70 or Z: +100 in Exploded) */}
          {/* ========================================================= */}
          <div
            style={{
              transform: viewMode === 'exploded' ? 'translateZ(90px)' : 'translateZ(40px)',
              transition: 'transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
              transformStyle: 'preserve-3d',
            }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none z-40"
          >
            <div className="relative p-6 sm:p-8 rounded-3xl bg-slate-950/80 border border-indigo-500/30 backdrop-blur-2xl shadow-[0_20px_60px_rgba(0,0,0,0.9)] pointer-events-auto flex flex-col items-center max-w-sm w-full mx-4">
              
              {/* Exploded View Layer Tag */}
              {viewMode === 'exploded' && (
                <div className="absolute -top-3.5 bg-emerald-600 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-emerald-400 shadow-md">
                  LAYER 3 • Fluid Focus Interval Engine
                </div>
              )}

              {/* Mode Selector Tabs */}
              <div className="flex items-center gap-1 p-1 bg-slate-900/90 border border-slate-800 rounded-2xl mb-4 w-full justify-between">
                <button
                  onClick={() => {
                    audioSynth.playClick('switch');
                    setTimerMode('focus');
                    setTimerSeconds(1500);
                  }}
                  className={`flex-1 py-1 px-2 rounded-xl text-xs font-semibold transition ${
                    timerMode === 'focus'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Pomodoro
                </button>
                <button
                  onClick={() => {
                    audioSynth.playClick('switch');
                    setTimerMode('shortBreak');
                    setTimerSeconds(300);
                  }}
                  className={`flex-1 py-1 px-2 rounded-xl text-xs font-semibold transition ${
                    timerMode === 'shortBreak'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Short (5m)
                </button>
                <button
                  onClick={() => {
                    audioSynth.playClick('switch');
                    setTimerMode('longBreak');
                    setTimerSeconds(900);
                  }}
                  className={`flex-1 py-1 px-2 rounded-xl text-xs font-semibold transition ${
                    timerMode === 'longBreak'
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Long (15m)
                </button>
              </div>

              {/* Countdown Numbers Display with Radial Progress */}
              <div className="relative my-2 flex items-center justify-center">
                <div className="text-5xl sm:text-6xl font-black font-mono tracking-tight text-white drop-shadow-lg">
                  {formatTime(timerSeconds)}
                </div>
              </div>

              {/* Progress Bar Line */}
              <div className="w-full bg-slate-900 rounded-full h-1.5 my-3 overflow-hidden border border-slate-800">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              {/* Controls (Play / Pause / Reset) */}
              <div className="flex items-center gap-3 mt-1">
                <button
                  onClick={() => {
                    audioSynth.playClick('switch');
                    setIsTimerRunning(!isTimerRunning);
                  }}
                  className="px-6 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition transform active:scale-95"
                >
                  {isTimerRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-white" />}
                  <span>{isTimerRunning ? 'Pause Sprint' : 'Start Focus'}</span>
                </button>

                <button
                  onClick={() => {
                    audioSynth.playClick('switch');
                    setIsTimerRunning(false);
                    setTimerSeconds(timerMode === 'focus' ? 1500 : timerMode === 'shortBreak' ? 300 : 900);
                  }}
                  className="p-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition"
                  title="Reset Timer"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>

            </div>
          </div>

          {/* ========================================================= */}
          {/* LAYER 4: Bottom Floating Audio Deck (Z: +100 or Z: +140 in Exploded) */}
          {/* ========================================================= */}
          <div
            style={{
              transform: viewMode === 'exploded' ? 'translateZ(130px)' : 'translateZ(60px)',
              transition: 'transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
              transformStyle: 'preserve-3d',
            }}
            className="absolute bottom-4 left-1/2 -translate-x-1/2 pointer-events-auto z-50 w-[90%] sm:w-auto"
          >
            <div className="flex items-center gap-2 sm:gap-3 p-2 px-3 rounded-2xl bg-slate-950/90 border border-indigo-500/30 backdrop-blur-2xl shadow-2xl text-xs text-slate-200">
              
              {/* Play/Pause Synthesizer */}
              <button
                onClick={onToggleAudio}
                className={`p-2 rounded-xl border transition flex items-center gap-1.5 ${
                  isPlayingAudio
                    ? 'bg-indigo-600 border-indigo-400 text-white shadow-md'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                }`}
                title="Toggle Web Audio Synthesizer"
              >
                {isPlayingAudio ? <Volume2 className="w-4 h-4 animate-pulse" /> : <VolumeX className="w-4 h-4" />}
                <span className="hidden sm:inline font-semibold">
                  {isPlayingAudio ? 'Live Audio ON' : 'Audio Muted'}
                </span>
              </button>

              {/* Sound Channel Presets */}
              <div className="flex items-center gap-1 bg-slate-900/80 p-1 rounded-xl border border-slate-800">
                <button
                  onClick={() => onChangeSoundType('rain')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition flex items-center gap-1 ${
                    activeSoundType === 'rain'
                      ? 'bg-blue-600/30 text-blue-300 border border-blue-500/40'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <CloudRain className="w-3 h-3 text-blue-400" />
                  <span className="hidden sm:inline">Rainfall</span>
                </button>

                <button
                  onClick={() => onChangeSoundType('fireplace')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition flex items-center gap-1 ${
                    activeSoundType === 'fireplace'
                      ? 'bg-amber-600/30 text-amber-300 border border-amber-500/40'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Flame className="w-3 h-3 text-amber-400" />
                  <span className="hidden sm:inline">Hearth</span>
                </button>

                <button
                  onClick={() => onChangeSoundType('cafe')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition flex items-center gap-1 ${
                    activeSoundType === 'cafe'
                      ? 'bg-orange-600/30 text-orange-300 border border-orange-500/40'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Coffee className="w-3 h-3 text-orange-400" />
                  <span className="hidden sm:inline">Cafe</span>
                </button>

                <button
                  onClick={() => onChangeSoundType('waves')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition flex items-center gap-1 ${
                    activeSoundType === 'waves'
                      ? 'bg-purple-600/30 text-purple-300 border border-purple-500/40'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Waves className="w-3 h-3 text-purple-400" />
                  <span className="hidden sm:inline">432Hz</span>
                </button>
              </div>

              {/* Exploded View Tag */}
              {viewMode === 'exploded' && (
                <div className="bg-indigo-600 text-white text-[9px] font-bold px-2 py-1 rounded-lg shadow-sm">
                  LAYER 4 • Audio Synth
                </div>
              )}

            </div>
          </div>

        </div>
      </div>

    </div>
  );
};
