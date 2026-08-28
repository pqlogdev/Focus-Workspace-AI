import React, { useState } from 'react';
import {
  Headphones,
  Layout,
  Clock,
  Bot,
  Users,
  Cloud,
  Sparkles,
  Zap,
  CheckCircle2,
  Sliders,
  Shield,
  Layers,
  Flame,
  Volume2,
  Compass,
  ArrowRight,
  Maximize2,
  Pin,
  FileText,
  Share2,
  Store,
  Palette,
  Sparkles as SparklesIcon,
  Check,
  Coffee,
  CloudRain,
  Waves,
  Play,
  Pause,
  RotateCcw
} from 'lucide-react';
import { audioSynth } from '../../utils/audioSynth';

interface FeatureChapter {
  id: string;
  badge: string;
  badgeColor: string;
  title: string;
  subtitle: string;
  description: string;
  highlights: string[];
  mockType: 'environments' | 'audio' | 'timer' | 'notes' | 'rooms' | 'templates' | 'personalization';
}

const FEATURE_CHAPTERS: FeatureChapter[] = [
  {
    id: 'env-4k',
    badge: 'CHAPTER 01 • 4K ATMOSPHERES',
    badgeColor: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
    title: 'Cinematic 4K Ambient Environments',
    subtitle: 'Transform your screen into an immersive sanctuary with customizable optics and optics control.',
    description:
      'Immerse your senses in ultra-high-definition living backdrops. Seamlessly switch between rainy Tokyo alleyways, Nordic pine hearths, Kyoto bamboo gardens, or upload your own custom MP4 loops, Lottie animations, and photography.',
    highlights: [
      'Extensive curated gallery of 4K looping wallpapers & living videos',
      'Instant drag-and-drop custom video, GIF, and photo upload',
      'Real-time optical filters: brightness, vignette depth, blur, and opacity sliders',
      'Dynamic day/night color grading responsive to your local timezone',
    ],
    mockType: 'environments',
  },
  {
    id: 'procedural-audio',
    badge: 'CHAPTER 02 • ACOUSTIC SYNTHESIS',
    badgeColor: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
    title: 'Procedural Multi-Track Soundstage',
    subtitle: 'Zero audio fatigue. Mathematically synthesized organic frequencies generated live in real time.',
    description:
      'Standard looped audio files trigger subconscious auditory fatigue after 20 minutes. Our built-in Web Audio synthesis engine generates continuously evolving acoustic soundscapes without repetitive seams.',
    highlights: [
      'Layered multi-channel mixing: Rainfall, Crackling Pine Hearth, Espresso Bar, 432Hz Drone',
      'Continuous pink/brown noise frequency filters for deep focus state induction',
      'Tibetan singing bowl start & completion bell chimes',
      'AI Mood Soundscape Generator: automatically recommends acoustic mixes for your tasks',
    ],
    mockType: 'audio',
  },
  {
    id: 'fluid-timer',
    badge: 'CHAPTER 03 • CIRCADIAN INTERVALS',
    badgeColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    title: 'Fluid Focus Interval Engine',
    subtitle: 'Tailor your work blocks to your mental stamina with 5 precision interval methods.',
    description:
      'Match your workflow to your natural flow state. Whether you prefer the classic 25/5 Pomodoro, the ultradian 52/17 rhythm, 90-minute Deep Work blocks, or unconstrained Flowtime tracking.',
    highlights: [
      '5 distinct focus methods: Pomodoro, 52/17, Flowtime, Deep Work (90m), Custom',
      'Multiple clock aesthetics: Radial Glass Ring, Minimalist Flip, Zen Digital, OLED Dark',
      'Immersive Zen Fullscreen & Picture-in-Picture (PiP) desktop overlay modes',
      'Micro-break reflection prompts to review progress and maintain sustained endurance',
    ],
    mockType: 'timer',
  },
  {
    id: 'spatial-canvas',
    badge: 'CHAPTER 04 • SPATIAL ERGONOMICS',
    badgeColor: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    title: 'Spatial Sticky Notes & Markdown Notepad',
    subtitle: 'Eliminate cognitive context-switching. Pin sprint priorities directly onto your canvas.',
    description:
      'No more juggling between third-party note apps and your timer. Arrange pastel sticky notes freely anywhere on the screen, paste clipboard screenshots instantly, and keep sprint checklists within peripheral view.',
    highlights: [
      'Freeform 2D spatial positioning with drag, resize, and pin capabilities',
      'Instant clipboard image attachment (Ctrl+V) directly onto sticky notes',
      'Integrated markdown scratchpad for deep thought dumps and code snippets',
      'Color-coded priority tags and session goal decomposition',
    ],
    mockType: 'notes',
  },
  {
    id: 'coworking-rooms',
    badge: 'CHAPTER 05 • SOCIAL ACCOUNTABILITY',
    badgeColor: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
    title: 'Real-Time Co-Working Study Rooms',
    subtitle: 'Focus alongside teammates, study partners, and global deep workers with synchronized presence.',
    description:
      'Generate a 6-character room code to invite peers to a shared focus sprint. Sync your countdown timers, share task checklists, send non-intrusive floating emoji balloons, and view real-time participant activity.',
    highlights: [
      'Zero-friction 1-click room creation with shareable invite codes',
      'Synchronized group timer countdowns and synchronized break intervals',
      'Floating real-time emoji reaction balloons (🔥 ☕ 🚀 ✨ 👏)',
      'Shared group scratchpad and live collaborative participant roster',
    ],
    mockType: 'rooms',
  },
  {
    id: 'templates-ai',
    badge: 'CHAPTER 06 • COMMUNITY & INTELLIGENCE',
    badgeColor: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
    title: 'Templates Marketplace & Gemini AI Coach',
    subtitle: 'Remix battle-tested focus setups or let AI break down daunting objectives into actionable sprints.',
    description:
      'Browse community-crafted atmosphere templates, publish your own custom setups, or ask the integrated Gemini AI assistant to decompose complex study goals into structured 25-minute sprints.',
    highlights: [
      'Community template discovery: 1-click preview and instant workspace adoption',
      'Personal (isGroup: 0) and Team (isGroup: 1, up to 5 members) template ownership',
      'Gemini AI Goal Breakdown: turn massive projects into sequenced sprint steps',
      'Smart audio recommendations based on your current focus challenge',
    ],
    mockType: 'templates',
  },
  {
    id: 'cloud-sync',
    badge: 'CHAPTER 07 • DURABLE PERSISTENCE',
    badgeColor: 'text-teal-400 bg-teal-500/10 border-teal-500/20',
    title: 'Cloud Firestore Sync & Habit Streaks',
    subtitle: 'Seamless device hopping with automatic cloud synchronization and streak milestone tracking.',
    description:
      'Never lose your layout, notes, or focus momentum. Your preferences, active tasks, sticky note coordinates, and focus analytics synchronize seamlessly to Firebase Cloud Firestore across all your devices.',
    highlights: [
      'Automatic real-time cloud synchronization backed by Google Cloud Firestore',
      'Daily focus streak counter with milestone badges (3, 7, 14, 30, 60, 100 days)',
      'Streak freeze protection to preserve your streak during rest days',
      'Comprehensive focus analytics: total minutes, hourly heatmaps, and session history',
    ],
    mockType: 'personalization',
  },
];

interface FeatureShowcaseSectionProps {
  onEnterWorkspace: () => void;
  onSignIn: () => Promise<void>;
}

export const FeatureShowcaseSection: React.FC<FeatureShowcaseSectionProps> = ({
  onEnterWorkspace,
  onSignIn,
}) => {
  const [activeChapterIndex, setActiveChapterIndex] = useState(0);
  const activeChapter = FEATURE_CHAPTERS[activeChapterIndex];

  // Interactive state for Mock Chapter B (Audio)
  const [mockAudioPlaying, setMockAudioPlaying] = useState(false);
  const [mockAudioSound, setMockAudioSound] = useState<'rain' | 'fireplace' | 'cafe' | 'waves'>('rain');

  // Interactive state for Mock Chapter C (Timer)
  const [mockTimerSecs, setMockTimerSecs] = useState(1500);
  const [mockTimerRunning, setMockTimerRunning] = useState(false);

  const handleToggleMockAudio = () => {
    audioSynth.playClick('switch');
    if (!mockAudioPlaying) {
      audioSynth.playAmbient('feature-mock', mockAudioSound, 0.7);
      setMockAudioPlaying(true);
    } else {
      audioSynth.stopAmbient('feature-mock');
      setMockAudioPlaying(false);
    }
  };

  const handleChangeMockSound = (s: 'rain' | 'fireplace' | 'cafe' | 'waves') => {
    audioSynth.playClick('switch');
    setMockAudioSound(s);
    if (mockAudioPlaying) {
      audioSynth.playAmbient('feature-mock', s, 0.7);
    }
  };

  return (
    <section id="features" className="relative z-20 w-full max-w-7xl mx-auto px-6 py-20">
      
      {/* Section Headline */}
      <div className="text-center max-w-3xl mx-auto mb-16">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/90 border border-slate-800 text-indigo-400 text-xs font-semibold mb-4">
          <Sparkles className="w-3.5 h-3.5" />
          <span>FEATURE CAPABILITIES</span>
        </div>
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight mb-4">
          Engineered for the deepest{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-300 to-pink-400">
            cognitive flow.
          </span>
        </h2>
        <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
          Every tool, slider, and sound layer is meticulously crafted to protect your mental energy from friction and distractions.
        </p>
      </div>

      {/* Interactive Chapter Navigation Matrix (Sticky Tabs) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-8 custom-scrollbar justify-start lg:justify-center">
        {FEATURE_CHAPTERS.map((ch, idx) => (
          <button
            key={ch.id}
            onClick={() => {
              audioSynth.playClick('switch');
              setActiveChapterIndex(idx);
            }}
            className={`px-4 py-2.5 rounded-2xl text-xs font-semibold shrink-0 transition flex items-center gap-2 border ${
              activeChapterIndex === idx
                ? 'bg-indigo-600 border-indigo-400 text-white shadow-lg shadow-indigo-600/30'
                : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
            }`}
          >
            <span className="font-mono text-[10px] opacity-75">0{idx + 1}</span>
            <span>{ch.title.split(' ')[0]} {ch.title.split(' ')[1]}</span>
          </button>
        ))}
      </div>

      {/* Main Chapter Showcase Card */}
      <div className="relative rounded-3xl bg-slate-950 border border-slate-800 p-6 sm:p-10 shadow-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        
        {/* Left Column: Narrative Copy & Bullet List (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold border ${activeChapter.badgeColor}`}>
            <span>{activeChapter.badge}</span>
          </div>

          <h3 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-tight">
            {activeChapter.title}
          </h3>

          <p className="text-sm text-slate-300 leading-relaxed">
            {activeChapter.description}
          </p>

          <div className="space-y-3 pt-2">
            {activeChapter.highlights.map((highlight, idx) => (
              <div key={idx} className="flex items-start gap-3 text-xs text-slate-300">
                <div className="w-5 h-5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0 mt-0.5">
                  <Check className="w-3 h-3 stroke-[2.5]" />
                </div>
                <span className="leading-relaxed">{highlight}</span>
              </div>
            ))}
          </div>

          <div className="pt-4 flex items-center gap-3">
            <button
              onClick={onEnterWorkspace}
              className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition transform hover:-translate-y-0.5 active:scale-95"
            >
              <span>Try in Workspace</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => {
                audioSynth.playClick('switch');
                setActiveChapterIndex((prev) => (prev + 1) % FEATURE_CHAPTERS.length);
              }}
              className="px-4 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs font-semibold transition"
            >
              <span>Next Feature →</span>
            </button>
          </div>
        </div>

        {/* Right Column: High-Fidelity Interactive Visual Simulation (7 Cols) */}
        <div className="lg:col-span-7 relative h-[420px] sm:h-[480px] rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-inner flex items-center justify-center p-4">
          
          {/* SIMULATION 1: 4K Ambient Environments */}
          {activeChapter.mockType === 'environments' && (
            <div className="relative w-full h-full rounded-xl overflow-hidden border border-slate-800 group">
              <img
                src="https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=1200&q=80"
                alt="Tokyo Midnight Rain"
                className="w-full h-full object-cover brightness-75 group-hover:scale-105 transition duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/30 to-slate-950/40" />

              {/* Optics Controls HUD Simulation */}
              <div className="absolute bottom-4 left-4 right-4 p-3 rounded-xl bg-slate-950/85 border border-slate-800 backdrop-blur-xl flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <Palette className="w-4 h-4 text-indigo-400" />
                  <span className="text-xs font-bold text-white">Tokyo Midnight 4K</span>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-slate-400">
                  <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800">Vignette 60%</span>
                  <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800">Contrast 1.1x</span>
                  <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-semibold">60 FPS Loop</span>
                </div>
              </div>
            </div>
          )}

          {/* SIMULATION 2: Procedural Audio Synthesizer */}
          {activeChapter.mockType === 'audio' && (
            <div className="w-full max-w-md p-6 rounded-2xl bg-slate-950 border border-indigo-500/30 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs">
                  <Headphones className="w-4 h-4" />
                  <span>Web Audio Frequency Generator</span>
                </div>
                <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> 0% Audio Fatigue
                </span>
              </div>

              {/* Multi-Track Channel Sliders */}
              <div className="space-y-3">
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-slate-300">
                    <span className="flex items-center gap-1.5">
                      <CloudRain className="w-3.5 h-3.5 text-blue-400" /> Acoustic Raindrops
                    </span>
                    <span className="font-mono text-slate-400 text-[11px]">75%</span>
                  </div>
                  <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden border border-slate-800">
                    <div className="bg-blue-500 h-full w-3/4 animate-pulse" />
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-slate-300">
                    <span className="flex items-center gap-1.5">
                      <Flame className="w-3.5 h-3.5 text-amber-400" /> Pine Wood Hearth
                    </span>
                    <span className="font-mono text-slate-400 text-[11px]">60%</span>
                  </div>
                  <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden border border-slate-800">
                    <div className="bg-amber-500 h-full w-3/5" />
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-slate-300">
                    <span className="flex items-center gap-1.5">
                      <Waves className="w-3.5 h-3.5 text-purple-400" /> 432Hz Binaural Carrier
                    </span>
                    <span className="font-mono text-slate-400 text-[11px]">85%</span>
                  </div>
                  <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden border border-slate-800">
                    <div className="bg-purple-500 h-full w-[85%]" />
                  </div>
                </div>
              </div>

              {/* Interactive Sound Trigger */}
              <div className="pt-2">
                <button
                  onClick={handleToggleMockAudio}
                  className={`w-full py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
                    mockAudioPlaying
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                      : 'bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800'
                  }`}
                >
                  <Volume2 className="w-4 h-4" />
                  <span>{mockAudioPlaying ? 'Playing Live Soundstage (Click to Stop)' : 'Test Live Audio Frequencies'}</span>
                </button>
              </div>
            </div>
          )}

          {/* SIMULATION 3: Fluid Focus Timer */}
          {activeChapter.mockType === 'timer' && (
            <div className="w-full max-w-sm p-6 rounded-2xl bg-slate-950 border border-emerald-500/30 shadow-2xl flex flex-col items-center text-center space-y-4">
              <div className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">
                Ultradian Rhythm Engine (52/17)
              </div>
              <div className="text-6xl font-black font-mono tracking-tight text-white drop-shadow-lg">
                24:58
              </div>
              <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden border border-slate-800">
                <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 w-2/3" />
              </div>
              <div className="grid grid-cols-3 gap-2 w-full pt-1">
                <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-[10px] text-slate-400">
                  Sprint #3
                </div>
                <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-[10px] text-slate-400">
                  Target: 4h
                </div>
                <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-[10px] text-emerald-400 font-semibold">
                  Zen OLED
                </div>
              </div>
            </div>
          )}

          {/* SIMULATION 4: Spatial Sticky Notes & Markdown Notepad */}
          {activeChapter.mockType === 'notes' && (
            <div className="w-full max-w-md space-y-3">
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 shadow-xl backdrop-blur-md">
                <div className="flex items-center justify-between text-xs font-semibold text-amber-300 mb-2">
                  <span className="flex items-center gap-1.5">
                    <Pin className="w-3.5 h-3.5 fill-amber-400/40" /> Sprint Goals
                  </span>
                  <span className="text-[10px] text-amber-400/80">Spatial 2D</span>
                </div>
                <div className="text-xs text-amber-100 font-mono space-y-1">
                  <div>- [x] Ship spatial canvas drag and drop</div>
                  <div>- [x] Integrate binaural drone audio synthesis</div>
                  <div>- [ ] 4K Video background performance profiling</div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 shadow-xl flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-indigo-400" />
                  <span className="text-xs font-bold text-slate-200">Markdown Notepad Sync</span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">12,480 characters logged</span>
              </div>
            </div>
          )}

          {/* SIMULATION 5: Real-Time Co-Working Study Rooms */}
          {activeChapter.mockType === 'rooms' && (
            <div className="w-full max-w-md p-6 rounded-2xl bg-slate-950 border border-cyan-500/30 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <div className="text-xs font-bold text-cyan-400 flex items-center gap-1.5">
                    <Users className="w-4 h-4" /> Live Study Room #482B
                  </div>
                  <div className="text-[10px] text-slate-400">Synchronized countdown in progress</div>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 text-[10px] font-mono font-bold">
                  4 FOCUSERS
                </span>
              </div>

              {/* Roster list */}
              <div className="space-y-2">
                {[
                  { name: 'Alex M.', role: 'Sprint Host', status: 'Focusing (21m left)', icon: '🚀' },
                  { name: 'Elena R.', role: 'Member', status: 'Reading Research Paper', icon: '✨' },
                  { name: 'David K.', role: 'Member', status: 'Deep Code Refactoring', icon: '🔥' },
                ].map((member, i) => (
                  <div key={i} className="flex items-center justify-between p-2 rounded-xl bg-slate-900/80 border border-slate-800 text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-cyan-600/20 text-cyan-300 flex items-center justify-center font-bold text-[10px]">
                        {member.name[0]}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-200">{member.name}</div>
                        <div className="text-[10px] text-slate-400">{member.status}</div>
                      </div>
                    </div>
                    <span className="text-sm">{member.icon}</span>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                <span>Reaction Emojis Enabled</span>
                <span className="text-cyan-400 font-semibold">Synced Timers</span>
              </div>
            </div>
          )}

          {/* SIMULATION 6: Templates Marketplace & AI */}
          {activeChapter.mockType === 'templates' && (
            <div className="w-full max-w-md p-5 rounded-2xl bg-slate-950 border border-rose-500/30 shadow-2xl space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div className="flex items-center gap-2 text-rose-400 font-bold text-xs">
                  <Store className="w-4 h-4" />
                  <span>Atmosphere Templates Marketplace</span>
                </div>
                <span className="text-[10px] text-slate-400">1-Click Apply</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-100">Kyoto Zen Study Garden</span>
                  <span className="text-[10px] text-emerald-400 font-mono">1.4k Copies</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Bamboo rain audio + 25m Pomodoro + 3 markdown sprint templates.
                </p>
                <div className="flex items-center gap-1.5 text-[9px] text-indigo-400 pt-1">
                  <span className="px-1.5 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20">Nature</span>
                  <span className="px-1.5 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20">Lofi</span>
                  <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Group Ready</span>
                </div>
              </div>

              {/* Gemini AI Widget */}
              <div className="p-3 rounded-xl bg-purple-950/30 border border-purple-500/30 flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-purple-600/30 text-purple-300 shrink-0">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="text-xs">
                  <div className="font-bold text-purple-200">Gemini Goal Decomposer</div>
                  <div className="text-[10px] text-purple-300/80">Turned 1 large task into 4 sprint blocks</div>
                </div>
              </div>
            </div>
          )}

          {/* SIMULATION 7: Cloud Sync & Personalization */}
          {activeChapter.mockType === 'personalization' && (
            <div className="w-full max-w-md p-6 rounded-2xl bg-slate-950 border border-teal-500/30 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2 text-teal-400 font-bold text-xs">
                  <Cloud className="w-4 h-4" />
                  <span>Google Cloud Firestore Persistence</span>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 text-[10px] font-mono">
                  AUTO-SYNC
                </span>
              </div>

              {/* Daily Streak Card */}
              <div className="p-3.5 rounded-xl bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-rose-500/10 border border-amber-500/30 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center font-black text-sm">
                    🔥 7
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-100">7-Day Focus Streak</div>
                    <div className="text-[10px] text-amber-300">Milestone Unlocked! 1 Freeze Shield</div>
                  </div>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">100% Retained</span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300">
                  <div className="text-[10px] text-slate-500">Total Focus Time</div>
                  <div className="font-bold text-sm text-white mt-0.5">38h 40m</div>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300">
                  <div className="text-[10px] text-slate-500">Session Accuracy</div>
                  <div className="font-bold text-sm text-emerald-400 mt-0.5">99.4%</div>
                </div>
              </div>
            </div>
          )}

        </div>

      </div>

    </section>
  );
};
