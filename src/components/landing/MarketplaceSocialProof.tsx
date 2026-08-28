import React, { useState } from 'react';
import {
  Sparkles,
  Star,
  Users,
  Store,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  TrendingUp,
  Clock,
  Flame,
  Award,
  Layers,
  ExternalLink
} from 'lucide-react';
import { audioSynth } from '../../utils/audioSynth';

interface TemplateCard {
  id: string;
  title: string;
  creator: string;
  creatorAvatar: string;
  downloads: string;
  rating: number;
  tags: string[];
  imageUrl: string;
  audioLabel: string;
  type: 'Personal' | 'Team (5 Max)';
}

const TEMPLATE_CARDS: TemplateCard[] = [
  {
    id: 't1',
    title: 'Tokyo Midnight Cyber Lofi',
    creator: 'Kenji Sato',
    creatorAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80',
    downloads: '4.2k',
    rating: 4.9,
    tags: ['Rain', '432Hz Drone', 'Tokyo 4K'],
    imageUrl: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=800&q=80',
    audioLabel: 'Acoustic Rain + Binaural Beats',
    type: 'Personal',
  },
  {
    id: 't2',
    title: 'Nordic Hearth Deep Focus',
    creator: 'Astrid Lind',
    creatorAvatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=120&q=80',
    downloads: '3.8k',
    rating: 5.0,
    tags: ['Pine Hearth', '52/17 Interval', 'Cabin'],
    imageUrl: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=800&q=80',
    audioLabel: 'Wood Fire Crackle + Pink Noise',
    type: 'Team (5 Max)',
  },
  {
    id: 't3',
    title: 'Kyoto Bamboo Rain Zen Garden',
    creator: 'Hana Tanaka',
    creatorAvatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=120&q=80',
    downloads: '2.9k',
    rating: 4.8,
    tags: ['Zen Bell', 'Bamboo Rain', 'Flowtime'],
    imageUrl: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=800&q=80',
    audioLabel: 'Gentle Droplets & Wind Chimes',
    type: 'Personal',
  },
  {
    id: 't4',
    title: 'SoHo Artisan Espresso Bar',
    creator: 'Marcus Vance',
    creatorAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&q=80',
    downloads: '3.1k',
    rating: 4.9,
    tags: ['Cafe Murmur', 'Pomodoro 25m', 'Brown Noise'],
    imageUrl: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=800&q=80',
    audioLabel: 'Espresso Bar Murmurs & Rain',
    type: 'Team (5 Max)',
  },
];

interface Testimonial {
  name: string;
  role: string;
  company: string;
  quote: string;
  avatar: string;
  streak: string;
}

const TESTIMONIALS: Testimonial[] = [
  {
    name: 'Sarah Chen',
    role: 'Principal Software Engineer',
    company: 'Distributed Systems',
    quote:
      'Focus Workspace completely changed my coding sessions. The procedural audio synthesis eliminates the ear fatigue I used to get with Spotify loops, and having spatial sticky notes right over the 4K Tokyo background keeps me locked in flow.',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=120&q=80',
    streak: '42-Day Streak 🔥',
  },
  {
    name: 'Dr. Julian Thorne',
    role: 'Theoretical Physics Researcher',
    company: 'Oxford University',
    quote:
      'The 90-minute Deep Work mode paired with 432Hz binaural drone synthesis is the most mathematically serene writing environment I have ever experienced. I drafted my entire paper here.',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=120&q=80',
    streak: '30-Day Streak 🔥',
  },
  {
    name: 'Maya Lin',
    role: 'Product Designer & Author',
    company: 'Design Studio',
    quote:
      'Being able to create real-time co-working rooms with 4 of my fellow writers where our timers count down together keeps us accountable without noisy zoom calls. It feels like an upscale boutique study lounge.',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80',
    streak: '19-Day Streak 🔥',
  },
];

interface MarketplaceSocialProofProps {
  onEnterWorkspace: () => void;
}

export const MarketplaceSocialProof: React.FC<MarketplaceSocialProofProps> = ({
  onEnterWorkspace,
}) => {
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateCard | null>(null);

  return (
    <section id="community" className="relative z-20 w-full max-w-7xl mx-auto px-6 py-20">
      
      {/* 1. Global Metrics & Stats Bar */}
      <div className="rounded-3xl bg-slate-950/90 border border-slate-800/80 p-8 mb-20 shadow-2xl backdrop-blur-xl">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center divide-y md:divide-y-0 md:divide-x divide-slate-800">
          
          <div className="p-2">
            <div className="flex items-center justify-center gap-1.5 text-indigo-400 mb-1">
              <Clock className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-wider">Focus Time</span>
            </div>
            <div className="text-3xl sm:text-4xl font-extrabold text-white font-mono">1.8M+</div>
            <div className="text-xs text-slate-400 mt-1">Deep work minutes logged</div>
          </div>

          <div className="p-2 pt-6 md:pt-2">
            <div className="flex items-center justify-center gap-1.5 text-emerald-400 mb-1">
              <Flame className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-wider">Streak Retention</span>
            </div>
            <div className="text-3xl sm:text-4xl font-extrabold text-emerald-400 font-mono">99.4%</div>
            <div className="text-xs text-slate-400 mt-1">Daily habit milestone rate</div>
          </div>

          <div className="p-2 pt-6 md:pt-2">
            <div className="flex items-center justify-center gap-1.5 text-amber-400 mb-1">
              <Star className="w-4 h-4 fill-amber-400" />
              <span className="text-xs font-bold uppercase tracking-wider">Community Rating</span>
            </div>
            <div className="text-3xl sm:text-4xl font-extrabold text-white font-mono">4.9 / 5.0</div>
            <div className="text-xs text-slate-400 mt-1">From 10,000+ deep workers</div>
          </div>

          <div className="p-2 pt-6 md:pt-2">
            <div className="flex items-center justify-center gap-1.5 text-purple-400 mb-1">
              <Users className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-wider">Co-Working</span>
            </div>
            <div className="text-3xl sm:text-4xl font-extrabold text-purple-300 font-mono">Live Rooms</div>
            <div className="text-xs text-slate-400 mt-1">Shared timers & reactions</div>
          </div>

        </div>
      </div>

      {/* 2. Templates Marketplace Showcase */}
      <div className="mb-20">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold mb-3">
              <Store className="w-3.5 h-3.5" />
              <span>COMMUNITY TEMPLATES MARKETPLACE</span>
            </div>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Curated atmospheres built by deep workers.
            </h3>
            <p className="text-sm text-slate-300 mt-1">
              Adopt complete workspaces with 1-click — including background optics, acoustic mixes, and sticky templates.
            </p>
          </div>

          <button
            onClick={onEnterWorkspace}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 text-xs font-semibold transition shrink-0 self-start md:self-auto"
          >
            <span>Explore All Templates</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Template Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {TEMPLATE_CARDS.map((card) => (
            <div
              key={card.id}
              onClick={() => {
                audioSynth.playClick('high');
                setSelectedTemplate(card);
              }}
              className="group relative rounded-2xl bg-slate-950 border border-slate-800 hover:border-indigo-500/50 transition-all duration-300 overflow-hidden shadow-xl hover:-translate-y-1.5 cursor-pointer flex flex-col justify-between"
            >
              {/* Card Image Thumbnail */}
              <div className="relative h-44 w-full overflow-hidden">
                <img
                  src={card.imageUrl}
                  alt={card.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />
                
                {/* Type Badge */}
                <div className="absolute top-3 left-3 bg-slate-950/80 backdrop-blur-md px-2.5 py-1 rounded-lg border border-slate-800 text-[10px] font-bold text-indigo-300 flex items-center gap-1">
                  <Layers className="w-3 h-3" />
                  <span>{card.type}</span>
                </div>

                {/* Rating Badge */}
                <div className="absolute top-3 right-3 bg-slate-950/80 backdrop-blur-md px-2 py-0.5 rounded-lg border border-slate-800 text-[10px] font-bold text-amber-400 flex items-center gap-1">
                  <Star className="w-3 h-3 fill-amber-400" />
                  <span>{card.rating}</span>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                <div>
                  <h4 className="text-sm font-bold text-white group-hover:text-indigo-300 transition">
                    {card.title}
                  </h4>
                  <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                    <span>by {card.creator}</span>
                    <span>•</span>
                    <span className="text-emerald-400">{card.downloads} installs</span>
                  </div>
                </div>

                {/* Tags */}
                <div className="flex flex-wrap gap-1.5">
                  {card.tags.map((t, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-[10px] text-slate-300"
                    >
                      {t}
                    </span>
                  ))}
                </div>

                {/* Apply Button */}
                <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs text-indigo-400 font-semibold">
                  <span>1-Click Apply</span>
                  <ArrowRight className="w-3.5 h-3.5 transform group-hover:translate-x-1 transition" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Authentic User Testimonials */}
      <div>
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold mb-3">
            <Award className="w-3.5 h-3.5" />
            <span>LOVED BY DEEP WORKERS</span>
          </div>
          <h3 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Designed for engineers, writers, and researchers.
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {TESTIMONIALS.map((testi, i) => (
            <div
              key={i}
              className="p-6 rounded-3xl bg-slate-950 border border-slate-800/90 shadow-xl flex flex-col justify-between space-y-4 hover:border-slate-700 transition"
            >
              <div className="space-y-3">
                <div className="flex items-center gap-1 text-amber-400">
                  {[...Array(5)].map((_, idx) => (
                    <Star key={idx} className="w-3.5 h-3.5 fill-amber-400" />
                  ))}
                </div>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed italic">
                  "{testi.quote}"
                </p>
              </div>

              <div className="pt-4 border-t border-slate-900 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img
                    src={testi.avatar}
                    alt={testi.name}
                    className="w-9 h-9 rounded-full object-cover border border-slate-700"
                  />
                  <div>
                    <div className="text-xs font-bold text-white">{testi.name}</div>
                    <div className="text-[10px] text-slate-400">{testi.role}</div>
                  </div>
                </div>
                <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                  {testi.streak}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

    </section>
  );
};
