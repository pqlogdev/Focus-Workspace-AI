import React, { useState, useEffect } from 'react';
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
  Pin,
  Flame,
  CloudRain,
  Coffee,
  Waves,
  Plus,
  Trash2,
  ArrowRight,
  Shield,
  Layers,
  Sparkles as SparklesIcon,
  CheckCircle2,
  Palette,
  Compass
} from 'lucide-react';
import { audioSynth } from '../../utils/audioSynth';

interface InteractivePlaygroundProps {
  onEnterWorkspace: () => void;
  onSignIn: () => Promise<void>;
  isLoading: boolean;
}

interface PlaygroundTheme {
  id: string;
  name: string;
  category: string;
  imageUrl: string;
  defaultAudio: 'rain' | 'fireplace' | 'cafe' | 'waves';
  accentColor: string;
}

const PLAYGROUND_THEMES: PlaygroundTheme[] = [
  {
    id: 'tokyo-rain',
    name: 'Tokyo Midnight Rain',
    category: 'Cyber Lofi',
    imageUrl: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=1600&q=80',
    defaultAudio: 'rain',
    accentColor: 'indigo',
  },
  {
    id: 'nordic-cabin',
    name: 'Nordic Hearth Cabin',
    category: 'Cozy Winter',
    imageUrl: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=1600&q=80',
    defaultAudio: 'fireplace',
    accentColor: 'amber',
  },
  {
    id: 'kyoto-bamboo',
    name: 'Kyoto Bamboo Sanctuary',
    category: 'Zen Nature',
    imageUrl: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=1600&q=80',
    defaultAudio: 'rain',
    accentColor: 'emerald',
  },
  {
    id: 'soho-cafe',
    name: 'SoHo Artisan Espresso Bar',
    category: 'Coffee & Flow',
    imageUrl: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=1600&q=80',
    defaultAudio: 'cafe',
    accentColor: 'orange',
  },
  {
    id: 'cyber-loft',
    name: 'Cyberpunk Skyline Studio',
    category: 'Deep Tech',
    imageUrl: 'https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&w=1600&q=80',
    defaultAudio: 'waves',
    accentColor: 'purple',
  },
];

export const InteractivePlayground: React.FC<InteractivePlaygroundProps> = ({
  onEnterWorkspace,
  onSignIn,
  isLoading,
}) => {
  const [selectedTheme, setSelectedTheme] = useState<PlaygroundTheme>(PLAYGROUND_THEMES[0]);
  
  // Live Audio State
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [activeSound, setActiveSound] = useState<'rain' | 'fireplace' | 'cafe' | 'waves'>('rain');
  const [audioVolume, setAudioVolume] = useState(0.65);

  // Live Timer State (5 minute demo sprint)
  const [timerSeconds, setTimerSeconds] = useState(300);
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  // Live Sticky Notes State
  const [stickyNotes, setStickyNotes] = useState([
    { id: '1', text: '🎯 Ship new marketing showcase\n⚡ Test procedural audio frequencies\n☕ Hydrate & stretch', color: 'amber' },
  ]);

  // Live Tasks
  const [tasks, setTasks] = useState([
    { id: '1', title: 'Try switching the 4K ambient background', done: true },
    { id: '2', title: 'Activate the live Web Audio soundscape', done: false },
    { id: '3', title: 'Start a 5-minute focus countdown', done: false },
    { id: '4', title: 'Enter the full cloud workspace', done: false },
  ]);
  const [newTaskInput, setNewTaskInput] = useState('');

  // Audio Sync
  useEffect(() => {
    if (isPlayingAudio) {
      audioSynth.playAmbient('playground-demo', activeSound, audioVolume);
    } else {
      audioSynth.stopAmbient('playground-demo');
    }
    return () => {
      audioSynth.stopAmbient('playground-demo');
    };
  }, [isPlayingAudio, activeSound, audioVolume]);

  // Timer Tick
  useEffect(() => {
    let interval: any;
    if (isTimerRunning) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => {
          if (prev <= 1) {
            audioSynth.playChime('zen-bell');
            setIsTimerRunning(false);
            return 300;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning]);

  const handleSelectTheme = (theme: PlaygroundTheme) => {
    audioSynth.playClick('switch');
    setSelectedTheme(theme);
    setActiveSound(theme.defaultAudio);
  };

  const handleToggleAudio = () => {
    audioSynth.playClick('switch');
    setIsPlayingAudio((prev) => !prev);
    // Auto complete task 2
    setTasks((prev) => prev.map((t) => (t.id === '2' ? { ...t, done: true } : t)));
  };

  const handleToggleTimer = () => {
    audioSynth.playClick('switch');
    setIsTimerRunning((prev) => !prev);
    // Auto complete task 3
    setTasks((prev) => prev.map((t) => (t.id === '3' ? { ...t, done: true } : t)));
  };

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskInput.trim()) return;
    audioSynth.playClick('high');
    setTasks((prev) => [
      ...prev,
      { id: Date.now().toString(), title: newTaskInput.trim(), done: false },
    ]);
    setNewTaskInput('');
  };

  const handleToggleTask = (id: string) => {
    audioSynth.playClick('high');
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t))
    );
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <section id="demo" className="relative z-20 w-full max-w-7xl mx-auto px-6 py-20">
      
      {/* Section Header */}
      <div className="text-center max-w-3xl mx-auto mb-12">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold mb-4">
          <Sparkles className="w-3.5 h-3.5" />
          <span>PLAYABLE MINI-WORKSPACE</span>
        </div>
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight mb-4">
          Experience the atmosphere{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-300 to-pink-400">
            before you enter.
          </span>
        </h2>
        <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
          Interact with live background environments, layered acoustic sound synthesis, countdown widgets, and sticky notes directly in your browser.
        </p>
      </div>

      {/* Mini Workspace Playground Card */}
      <div className="relative rounded-3xl bg-slate-950 border border-slate-800 shadow-[0_20px_80px_rgba(0,0,0,0.85)] overflow-hidden">
        
        {/* Top Control Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl flex-wrap gap-3">
          
          {/* Background Selector Chips */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 custom-scrollbar">
            <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5 shrink-0">
              <Palette className="w-3.5 h-3.5 text-indigo-400" /> Atmosphere:
            </span>
            {PLAYGROUND_THEMES.map((theme) => (
              <button
                key={theme.id}
                onClick={() => handleSelectTheme(theme)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition flex items-center gap-1.5 ${
                  selectedTheme.id === theme.id
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>{theme.name}</span>
              </button>
            ))}
          </div>

          {/* Enter Full Workspace CTA */}
          <button
            onClick={onEnterWorkspace}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold transition flex items-center gap-2 shadow-lg shadow-indigo-600/30 active:scale-95 ml-auto"
          >
            <span>Launch Full Workspace</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Live Canvas Area with Selected Background */}
        <div className="relative min-h-[500px] sm:min-h-[560px] w-full p-6 sm:p-8 flex flex-col justify-between overflow-hidden">
          
          {/* Background Image Layer */}
          <img
            src={selectedTheme.imageUrl}
            alt={selectedTheme.name}
            className="absolute inset-0 w-full h-full object-cover brightness-[0.55] contrast-[1.1] transition-all duration-700"
          />
          
          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-slate-950/60 pointer-events-none" />

          {/* Workspace Top Row */}
          <div className="relative z-10 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-slate-950/80 border border-slate-800 backdrop-blur-xl text-xs text-slate-200">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-semibold text-white">{selectedTheme.name}</span>
              <span className="text-slate-600">•</span>
              <span className="text-indigo-400 text-[11px] font-mono">{selectedTheme.category}</span>
            </div>

            {/* Live Audio Status Badge */}
            <button
              onClick={handleToggleAudio}
              className={`px-3 py-1.5 rounded-2xl border text-xs font-semibold transition flex items-center gap-2 backdrop-blur-xl ${
                isPlayingAudio
                  ? 'bg-indigo-600/90 border-indigo-400 text-white shadow-lg'
                  : 'bg-slate-950/80 border-slate-800 text-slate-300 hover:text-white'
              }`}
            >
              {isPlayingAudio ? (
                <>
                  <Volume2 className="w-3.5 h-3.5 animate-pulse text-indigo-300" />
                  <span>Synthesizer Playing ({activeSound.toUpperCase()})</span>
                </>
              ) : (
                <>
                  <VolumeX className="w-3.5 h-3.5 text-slate-400" />
                  <span>Click to Listen Live</span>
                </>
              )}
            </button>
          </div>

          {/* Workspace Center Content (Timer + Sticky Note + Task Planner Grid) */}
          <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-6 my-6 items-center">
            
            {/* 1. Spatial Sticky Note */}
            <div className="p-4 rounded-3xl bg-amber-500/10 border border-amber-500/30 backdrop-blur-2xl shadow-2xl text-amber-100 transform hover:-translate-y-1 transition duration-300">
              <div className="flex items-center justify-between border-b border-amber-500/20 pb-2 mb-2 text-amber-300 text-xs font-semibold">
                <span className="flex items-center gap-1.5">
                  <Pin className="w-3.5 h-3.5 fill-amber-400/30" /> Spatial Sticky Note
                </span>
                <span className="text-[10px] text-amber-400/80">Editable</span>
              </div>
              <textarea
                value={stickyNotes[0].text}
                onChange={(e) => setStickyNotes([{ ...stickyNotes[0], text: e.target.value }])}
                rows={4}
                className="w-full bg-transparent text-xs text-amber-100 placeholder-amber-400/50 outline-none resize-none font-mono leading-relaxed"
              />
              <div className="text-[10px] text-amber-400/60 mt-1 flex items-center justify-between">
                <span>Freeform 2D Canvas</span>
                <span>Auto-saved</span>
              </div>
            </div>

            {/* 2. Center Countdown Timer Widget */}
            <div className="p-6 rounded-3xl bg-slate-950/85 border border-indigo-500/30 backdrop-blur-2xl shadow-[0_20px_50px_rgba(0,0,0,0.85)] flex flex-col items-center text-center">
              <div className="text-[11px] font-bold text-indigo-400 uppercase tracking-widest mb-1">
                Demo Focus Sprint (5m)
              </div>
              
              <div className="text-5xl sm:text-6xl font-black font-mono tracking-tight text-white my-2 drop-shadow-md">
                {formatTime(timerSeconds)}
              </div>

              {/* Progress Line */}
              <div className="w-full bg-slate-900 rounded-full h-1.5 my-3 overflow-hidden border border-slate-800">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 to-pink-500 transition-all duration-300"
                  style={{ width: `${((300 - timerSeconds) / 300) * 100}%` }}
                />
              </div>

              {/* Controls */}
              <div className="flex items-center gap-3 mt-2">
                <button
                  onClick={handleToggleTimer}
                  className="px-6 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition transform active:scale-95"
                >
                  {isTimerRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-white" />}
                  <span>{isTimerRunning ? 'Pause Sprint' : 'Start Focus'}</span>
                </button>

                <button
                  onClick={() => {
                    audioSynth.playClick('switch');
                    setIsTimerRunning(false);
                    setTimerSeconds(300);
                  }}
                  className="p-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition"
                  title="Reset Demo Timer"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* 3. Interactive Task Planner */}
            <div className="p-4 rounded-3xl bg-slate-950/85 border border-slate-800 backdrop-blur-2xl shadow-2xl text-slate-100 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2 text-xs font-semibold text-slate-200">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" /> Interactive Tasks
                  </span>
                  <span className="text-[10px] text-indigo-400 font-mono">
                    {tasks.filter((t) => t.done).length}/{tasks.length} Completed
                  </span>
                </div>

                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1 custom-scrollbar">
                  {tasks.map((task) => (
                    <div
                      key={task.id}
                      onClick={() => handleToggleTask(task.id)}
                      className={`flex items-center gap-2 p-1.5 rounded-xl cursor-pointer transition text-xs ${
                        task.done
                          ? 'bg-indigo-500/10 text-slate-400 line-through'
                          : 'bg-slate-900/70 hover:bg-slate-800/80 text-slate-200'
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

              {/* Add Task Input Form */}
              <form onSubmit={handleAddTask} className="flex items-center gap-1.5 mt-3 pt-2 border-t border-slate-800">
                <input
                  type="text"
                  placeholder="Add custom task..."
                  value={newTaskInput}
                  onChange={(e) => setNewTaskInput(e.target.value)}
                  className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1 text-xs text-slate-200 outline-none focus:border-indigo-500"
                />
                <button
                  type="submit"
                  disabled={!newTaskInput.trim()}
                  className="p-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition disabled:opacity-40"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>

          </div>

          {/* Workspace Bottom Audio Mixing Deck */}
          <div className="relative z-10 flex items-center justify-between flex-wrap gap-3 bg-slate-950/80 border border-slate-800/90 rounded-2xl p-3 backdrop-blur-xl">
            
            {/* Audio Mode Selectors */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                <Music2 className="w-3.5 h-3.5 text-indigo-400" /> Synthesizer Soundstage:
              </span>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => {
                    setActiveSound('rain');
                    if (!isPlayingAudio) setIsPlayingAudio(true);
                  }}
                  className={`px-3 py-1 rounded-xl text-xs font-medium transition flex items-center gap-1.5 ${
                    activeSound === 'rain'
                      ? 'bg-blue-600/30 text-blue-300 border border-blue-500/40 shadow-sm'
                      : 'bg-slate-900 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <CloudRain className="w-3.5 h-3.5 text-blue-400" />
                  <span>Rainfall</span>
                </button>

                <button
                  onClick={() => {
                    setActiveSound('fireplace');
                    if (!isPlayingAudio) setIsPlayingAudio(true);
                  }}
                  className={`px-3 py-1 rounded-xl text-xs font-medium transition flex items-center gap-1.5 ${
                    activeSound === 'fireplace'
                      ? 'bg-amber-600/30 text-amber-300 border border-amber-500/40 shadow-sm'
                      : 'bg-slate-900 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Flame className="w-3.5 h-3.5 text-amber-400" />
                  <span>Hearth Fire</span>
                </button>

                <button
                  onClick={() => {
                    setActiveSound('cafe');
                    if (!isPlayingAudio) setIsPlayingAudio(true);
                  }}
                  className={`px-3 py-1 rounded-xl text-xs font-medium transition flex items-center gap-1.5 ${
                    activeSound === 'cafe'
                      ? 'bg-orange-600/30 text-orange-300 border border-orange-500/40 shadow-sm'
                      : 'bg-slate-900 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Coffee className="w-3.5 h-3.5 text-orange-400" />
                  <span>Espresso Bar</span>
                </button>

                <button
                  onClick={() => {
                    setActiveSound('waves');
                    if (!isPlayingAudio) setIsPlayingAudio(true);
                  }}
                  className={`px-3 py-1 rounded-xl text-xs font-medium transition flex items-center gap-1.5 ${
                    activeSound === 'waves'
                      ? 'bg-purple-600/30 text-purple-300 border border-purple-500/40 shadow-sm'
                      : 'bg-slate-900 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Waves className="w-3.5 h-3.5 text-purple-400" />
                  <span>432Hz Binaural</span>
                </button>
              </div>
            </div>

            {/* Volume Slider */}
            <div className="flex items-center gap-2 w-full sm:w-48">
              <Volume2 className="w-3.5 h-3.5 text-slate-400" />
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={audioVolume}
                onChange={(e) => setAudioVolume(parseFloat(e.target.value))}
                className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
              <span className="text-[10px] font-mono text-slate-400 w-8">
                {Math.round(audioVolume * 100)}%
              </span>
            </div>

          </div>

        </div>

      </div>

    </section>
  );
};
