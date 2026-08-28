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
  Maximize2
} from 'lucide-react';
import { audioSynth } from '../../utils/audioSynth';

interface AtmospherePreview {
  id: string;
  title: string;
  subtitle: string;
  tag: string;
  imgUrl: string;
  soundLabel: string;
  color: string;
}

const ATMOSPHERE_GALLERY: AtmospherePreview[] = [
  {
    id: 'tokyo-shinjuku',
    title: 'Tokyo Midnight Lo-Fi',
    subtitle: 'Gentle raindrops falling on neon-lit street glass',
    tag: 'Rain & City',
    imgUrl: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=1200&q=80',
    soundLabel: 'Acoustic Raindrops & Distant Metro',
    color: 'from-blue-600/30 to-indigo-600/30',
  },
  {
    id: 'tromso-aurora',
    title: 'Nordic Hearth Cabin',
    subtitle: 'Warm pine wood embers crackling under the polar aurora',
    tag: 'Warmth & Winter',
    imgUrl: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=1200&q=80',
    soundLabel: 'Continuous Pine Fire Crackle',
    color: 'from-amber-600/30 to-rose-600/30',
  },
  {
    id: 'kyoto-bamboo',
    title: 'Kyoto Rain Veranda',
    subtitle: 'Bamboo water droplets tapping soothing rhythms in Zen gardens',
    tag: 'Zen & Nature',
    imgUrl: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=1200&q=80',
    soundLabel: 'Organic Water Drops & Wind Shimes',
    color: 'from-emerald-600/30 to-teal-600/30',
  },
  {
    id: 'soho-espresso',
    title: 'SoHo Artisan Espresso Bar',
    subtitle: 'Rich coffee grinder aroma and ambient cafe acoustic murmurs',
    tag: 'Flow & Coffee',
    imgUrl: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=1200&q=80',
    soundLabel: 'Gentle Barista Espresso Acoustics',
    color: 'from-orange-600/30 to-amber-600/30',
  },
];

interface FeatureDetail {
  id: string;
  icon: React.ElementType;
  tag: string;
  tagColor: string;
  title: string;
  description: string;
  highlights: string[];
  mockType: 'audio' | 'canvas' | 'timer' | 'ai' | 'presence';
}

const FEATURES: FeatureDetail[] = [
  {
    id: 'f1',
    icon: Headphones,
    tag: 'ACOUSTIC SCIENCE',
    tagColor: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
    title: 'Procedural Multi-Track Soundstage',
    description:
      'Standard looped audio files cause subconscious auditory fatigue after 20 minutes. Our Web Audio synthesizer generates mathematically unique, organic frequencies in real time.',
    highlights: [
      'Continuous pink noise & rain frequency oscillators',
      'Harmonic 432Hz deep binaural focus drone',
      'Realistic crackling hearth logs & cafe chatter filters',
      'Tibetan singing bowl chime notifications',
    ],
    mockType: 'audio',
  },
  {
    id: 'f2',
    icon: Layout,
    tag: 'SPATIAL ERGONOMICS',
    tagColor: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    title: 'Spatial Canvas & Draggable Notes',
    description:
      'Eliminate the cognitive load of switching between browser windows. Pin markdown notes, attach clipboard images, and organize sprint goals directly on your visual canvas.',
    highlights: [
      'Full freeform 2D positioning anywhere on screen',
      'Markdown text styling, checkboxes & code snippets',
      'Instant clipboard screenshot image attachment (Ctrl+V)',
      'Custom pastel palettes and neon border accents',
    ],
    mockType: 'canvas',
  },
  {
    id: 'f3',
    icon: Clock,
    tag: 'CIRCADIAN TIMING',
    tagColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    title: 'Adaptive Focus Interval Engine',
    description:
      'Tailor your sprints to your mental stamina. Choose between classic Pomodoro, ultradian 52/17 rhythm, or open-ended Flowtime with unobtrusive desktop notifications.',
    highlights: [
      'Configurable work/break duration and interval cycles',
      'Immersive Zen fullscreen mode with OLED dark backdrop',
      'Daily sprint streak tracking with goal milestones',
      'Tibetan singing bowl start & completion audio chimes',
    ],
    mockType: 'timer',
  },
  {
    id: 'f4',
    icon: Bot,
    tag: 'GEMINI AI',
    tagColor: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
    title: 'AI Sprint Breakdown & Study Tutor',
    description:
      'Break daunting objectives into bite-sized 25-minute sprints. Ask the AI tutor for active-recall quizzes, concept breakdowns, or quick code debug sessions.',
    highlights: [
      'One-click goal-to-sprint deconstruction',
      'Interactive Socratic study dialog & flashcard generator',
      'Context-aware assistance with markdown & code syntax',
      'Zero interruption floating docked interface',
    ],
    mockType: 'ai',
  },
];

export const ScrollFeatureMatrix: React.FC<{ onSignIn: () => void }> = ({ onSignIn }) => {
  const [hoveredAtmosphere, setHoveredAtmosphere] = useState<string | null>(null);
  const [activeFeatureTab, setActiveFeatureTab] = useState<string>('f1');

  return (
    <div className="w-full relative z-20 max-w-7xl mx-auto px-6 py-20">
      
      {/* SECTION 1: 3D Atmosphere Showcase Deck */}
      <div className="mb-24">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold mb-3">
            <Compass className="w-3.5 h-3.5" /> 4K Living Atmospheres
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-3">
            Transport your mind to high-focus sanctuaries.
          </h2>
          <p className="text-sm text-slate-400 leading-relaxed">
            High-definition 4K dynamic backdrops paired with procedural acoustics designed to stimulate alpha-wave flow states.
          </p>
        </div>

        {/* 3D Perspective Card Deck */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {ATMOSPHERE_GALLERY.map((scene) => {
            const isHovered = hoveredAtmosphere === scene.id;
            return (
              <div
                key={scene.id}
                onMouseEnter={() => {
                  audioSynth.playClick('high');
                  setHoveredAtmosphere(scene.id);
                }}
                onMouseLeave={() => setHoveredAtmosphere(null)}
                className="group relative rounded-3xl overflow-hidden border border-slate-800/80 bg-slate-900/60 p-4 transition-all duration-500 hover:border-indigo-500/50 hover:shadow-2xl hover:shadow-indigo-500/10 flex flex-col justify-between min-h-[340px] transform hover:-translate-y-1.5"
              >
                {/* Background Image with Zoom on Hover */}
                <div className="absolute inset-0 z-0 overflow-hidden">
                  <img
                    src={scene.imgUrl}
                    alt={scene.title}
                    className="w-full h-full object-cover opacity-35 group-hover:opacity-50 group-hover:scale-110 transition-all duration-700 filter brightness-90"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/70 to-transparent" />
                </div>

                {/* Top Badge */}
                <div className="relative z-10 flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-slate-950/80 border border-slate-800 text-indigo-300 backdrop-blur-md">
                    {scene.tag}
                  </span>
                  <div className="w-7 h-7 rounded-full bg-slate-950/80 border border-slate-800 flex items-center justify-center text-slate-400 group-hover:text-indigo-400 transition-colors">
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                </div>

                {/* Bottom Content */}
                <div className="relative z-10 pt-16">
                  <h3 className="text-lg font-bold text-white mb-1 group-hover:text-indigo-200 transition-colors">
                    {scene.title}
                  </h3>
                  <p className="text-xs text-slate-300 mb-3 line-clamp-2 leading-relaxed">
                    {scene.subtitle}
                  </p>
                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                    <span className="flex items-center gap-1.5 text-indigo-300">
                      <Volume2 className="w-3.5 h-3.5" />
                      <span className="truncate max-w-[140px]">{scene.soundLabel}</span>
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">4K ULTRA</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION 2: Deep Feature Matrix with Live Interactive Tabs */}
      <div className="mb-24 rounded-3xl border border-slate-800/80 bg-slate-950/70 p-6 sm:p-10 backdrop-blur-xl shadow-2xl">
        <div className="max-w-3xl mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-semibold mb-3">
            <Zap className="w-3.5 h-3.5" /> Feature Architecture
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-2">
            Engineered for relentless productivity.
          </h2>
          <p className="text-sm text-slate-400">
            A harmonious integration of spatial workspace utilities with zero context switching.
          </p>
        </div>

        {/* Feature Grid Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {FEATURES.map((feat) => {
            const Icon = feat.icon;
            const isSelected = activeFeatureTab === feat.id;
            return (
              <div
                key={feat.id}
                onClick={() => {
                  audioSynth.playClick('switch');
                  setActiveFeatureTab(feat.id);
                }}
                className={`p-6 rounded-2xl border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-slate-900/90 border-indigo-500/60 shadow-xl shadow-indigo-500/10 ring-1 ring-indigo-500/30'
                    : 'bg-slate-900/40 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900/70'
                }`}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-800/90 border border-slate-700 flex items-center justify-center text-indigo-400">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${feat.tagColor}`}>
                        {feat.tag}
                      </span>
                      <h3 className="text-base font-bold text-white mt-1">{feat.title}</h3>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-slate-300 mb-4 leading-relaxed">{feat.description}</p>

                <div className="space-y-2 pt-3 border-t border-slate-800/80">
                  {feat.highlights.map((h, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-slate-300">
                      <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
                      <span>{h}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION 3: Live Community & Flow State Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
        {[
          { stat: '432 Hz', label: 'Harmonic Frequency Engine', sub: 'Procedural Web Audio' },
          { stat: '0 ms', label: 'Audio Looping Glitches', sub: 'Real-time Oscillators' },
          { stat: '100%', label: 'Cloud Synchronized', sub: 'Multi-device Persistence' },
          { stat: '25 min', label: 'Circadian Sprint Blocks', sub: 'Pomodoro & Flowtime' },
        ].map((item, idx) => (
          <div
            key={idx}
            className="p-6 rounded-2xl border border-slate-800/80 bg-slate-900/40 backdrop-blur-md"
          >
            <div className="text-2xl sm:text-3xl font-extrabold text-white font-mono mb-1 bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-300">
              {item.stat}
            </div>
            <div className="text-xs font-bold text-slate-200 mb-0.5">{item.label}</div>
            <div className="text-[10px] text-slate-500">{item.sub}</div>
          </div>
        ))}
      </div>

    </div>
  );
};
