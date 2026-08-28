import React, { useState, useEffect } from 'react';
import { Task, AudioConfig, AmbientTrack, SoundscapeRecommendation } from '../types';
import { audioSynth } from '../utils/audioSynth';
import { ALL_AVAILABLE_AMBIENT_TRACKS } from '../data/availableAmbient';
import { PRESET_MUSIC_TRACKS } from '../data/presetAudio';
import {
  Sparkles,
  Wand2,
  Volume2,
  VolumeX,
  Play,
  Pause,
  Sliders,
  Check,
  RotateCcw,
  Headphones,
  Zap,
  Flame,
  CloudRain,
  Coffee,
  Trees,
  Waves,
  Moon,
  Radio,
  Bookmark,
  Trash2,
  X,
  Layers,
  Brain,
  Music,
  CheckSquare,
  FileText,
  Activity,
  ArrowRight,
  Info,
} from 'lucide-react';

interface AiSoundGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: Task[];
  notes: string;
  focusMethod?: string;
  audioConfig?: AudioConfig;
  onChangeAudioConfig: (newConfig: AudioConfig) => void;
  onShowToast?: (msg: string) => void;
}

const MOOD_PRESETS = [
  { id: 'auto', label: 'Auto-Detect', icon: Wand2, desc: 'Analyze current tasks & notes context' },
  { id: 'code-logic', label: 'Deep Code & Math', icon: Brain, desc: '40Hz Gamma frequency + noise isolation' },
  { id: 'reading-research', label: 'Reading & Research', icon: FileText, desc: '10Hz Alpha calm flow + rain sanctuary' },
  { id: 'creative-flow', label: 'Creative Writing', icon: Sparkles, desc: 'Forest breeze + warm fireplace crackle' },
  { id: 'cafe-vibe', label: 'Tokyo Cafe Lo-Fi', icon: Coffee, desc: 'Muffled cafe ambience + gentle beats' },
  { id: 'thunder-shield', label: 'Thunder Noise Shield', icon: Zap, desc: 'Heavy rain + thunder to block noise' },
  { id: 'night-owl', label: 'Late Night Study', icon: Moon, desc: 'Night crickets + tape hiss + mellow synth' },
];

const AMBIENT_ICONS: Record<string, React.ReactNode> = {
  rain: <CloudRain className="w-4 h-4 text-sky-400" />,
  thunder: <Zap className="w-4 h-4 text-amber-400" />,
  fireplace: <Flame className="w-4 h-4 text-orange-400" />,
  cafe: <Coffee className="w-4 h-4 text-amber-300" />,
  forest: <Trees className="w-4 h-4 text-emerald-400" />,
  waves: <Waves className="w-4 h-4 text-cyan-400" />,
  crickets: <Moon className="w-4 h-4 text-indigo-400" />,
  whitenoise: <Radio className="w-4 h-4 text-slate-400" />,
};

export const AiSoundGeneratorModal: React.FC<AiSoundGeneratorModalProps> = ({
  isOpen,
  onClose,
  tasks,
  notes,
  focusMethod = 'Pomodoro',
  audioConfig,
  onChangeAudioConfig,
  onShowToast,
}) => {
  const [selectedMood, setSelectedMood] = useState<string>('auto');
  const [customPrompt, setCustomPrompt] = useState<string>('');
  const [includeTasks, setIncludeTasks] = useState<boolean>(true);
  const [includeNotes, setIncludeNotes] = useState<boolean>(true);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'generator' | 'presets'>('generator');

  // Generated soundscape state
  const [currentSoundscape, setCurrentSoundscape] = useState<SoundscapeRecommendation | null>(null);
  const [isPreviewPlaying, setIsPreviewPlaying] = useState<boolean>(false);

  // Saved Soundscapes Presets in localStorage
  const [savedPresets, setSavedPresets] = useState<SoundscapeRecommendation[]>(() => {
    try {
      const saved = localStorage.getItem('airiser_saved_soundscapes');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  // Stop preview audio if modal closes
  useEffect(() => {
    if (!isOpen && isPreviewPlaying) {
      audioSynth.stopAll();
      audioSynth.stopBinaural();
      setIsPreviewPlaying(false);
    }
  }, [isOpen, isPreviewPlaying]);

  if (!isOpen) return null;

  const pendingTasksCount = tasks.filter((t) => !t.completed).length;
  const notesLength = notes.trim().length;

  const handleGenerate = async () => {
    setIsGenerating(true);
    audioSynth.playClick('switch');

    try {
      const moodLabel = selectedMood === 'auto'
        ? (customPrompt ? customPrompt : 'Auto-detect from tasks and notes')
        : MOOD_PRESETS.find((m) => m.id === selectedMood)?.label + (customPrompt ? ` (${customPrompt})` : '');

      const payload = {
        tasks: includeTasks ? tasks : [],
        notes: includeNotes ? notes : '',
        mood: moodLabel,
        focusMethod,
      };

      const res = await fetch('/api/gemini/soundscape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.soundscape) {
        const soundscapeWithId: SoundscapeRecommendation = {
          ...data.soundscape,
          id: `soundscape-${Date.now()}`,
          createdAt: new Date().toISOString(),
        };
        setCurrentSoundscape(soundscapeWithId);

        // Auto-audition the generated soundscape
        startSoundscapePreview(soundscapeWithId);
      }
    } catch (err) {
      console.error('Soundscape generation failed:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const startSoundscapePreview = (soundscape: SoundscapeRecommendation) => {
    audioSynth.stopAll();
    audioSynth.stopBinaural();

    // Play active procedural ambient tracks
    soundscape.ambientTracks.forEach((t) => {
      if (t.active) {
        audioSynth.playAmbient(`preview-${t.type}`, t.type, t.volume * soundscape.masterAmbientVolume);
      }
    });

    // Play binaural if enabled
    if (soundscape.binauralBeat?.enabled) {
      audioSynth.playBinaural(
        soundscape.binauralBeat.frequencyHz,
        soundscape.binauralBeat.volume * soundscape.masterAmbientVolume
      );
    }

    setIsPreviewPlaying(true);
  };

  const togglePreview = () => {
    if (!currentSoundscape) return;
    if (isPreviewPlaying) {
      audioSynth.stopAll();
      audioSynth.stopBinaural();
      setIsPreviewPlaying(false);
    } else {
      startSoundscapePreview(currentSoundscape);
    }
  };

  const handleApplyToWorkspace = (soundscapeToApply?: SoundscapeRecommendation) => {
    const sc = soundscapeToApply || currentSoundscape;
    if (!sc) return;

    audioSynth.playClick('high');
    audioSynth.playChime('modern');

    // Build matching AmbientTrack array for main AudioPlayer
    const baseTracks = ALL_AVAILABLE_AMBIENT_TRACKS.map((baseTrack) => {
      const matched = sc.ambientTracks.find((t) => t.type === baseTrack.type);
      if (matched) {
        return {
          ...baseTrack,
          volume: matched.volume,
          active: matched.active,
        };
      }
      return {
        ...baseTrack,
        active: false,
      };
    });

    // Pick music track if suggested
    const suggestedIndex = sc.suggestedMusicTrackIndex ?? 0;
    const selectedMusic = PRESET_MUSIC_TRACKS[suggestedIndex % PRESET_MUSIC_TRACKS.length];

    const updatedAudioConfig: AudioConfig = {
      ...(audioConfig || {}),
      ambientTracks: baseTracks,
      ambientVolume: sc.masterAmbientVolume,
      musicVolume: sc.musicVolume,
      musicTrack: selectedMusic,
    };

    // If binaural is enabled, start it in main engine
    if (sc.binauralBeat?.enabled) {
      audioSynth.playBinaural(sc.binauralBeat.frequencyHz, sc.binauralBeat.volume * sc.masterAmbientVolume);
    } else {
      audioSynth.stopBinaural();
    }

    onChangeAudioConfig(updatedAudioConfig);

    if (onShowToast) {
      onShowToast(`Applied AI Soundscape: "${sc.title}"`);
    }

    // Stop modal preview so workspace takes over cleanly
    audioSynth.stopAll();
    setIsPreviewPlaying(false);
    onClose();
  };

  const handleSavePreset = (soundscapeToSave: SoundscapeRecommendation) => {
    if (savedPresets.some((p) => p.id === soundscapeToSave.id || p.title === soundscapeToSave.title)) {
      return;
    }
    const updated = [soundscapeToSave, ...savedPresets];
    setSavedPresets(updated);
    localStorage.setItem('airiser_saved_soundscapes', JSON.stringify(updated));
    audioSynth.playClick('switch');
  };

  const handleDeletePreset = (id: string) => {
    const updated = savedPresets.filter((p) => p.id !== id);
    setSavedPresets(updated);
    localStorage.setItem('airiser_saved_soundscapes', JSON.stringify(updated));
    audioSynth.playClick('low');
  };

  const handleUpdateTrackVolume = (type: string, newVolume: number) => {
    if (!currentSoundscape) return;
    const updatedTracks = currentSoundscape.ambientTracks.map((t) =>
      t.type === type ? { ...t, volume: newVolume, active: newVolume > 0 } : t
    );
    const updated = { ...currentSoundscape, ambientTracks: updatedTracks };
    setCurrentSoundscape(updated);

    if (isPreviewPlaying) {
      audioSynth.setVolume(`preview-${type}`, newVolume * updated.masterAmbientVolume);
    }
  };

  const handleToggleTrack = (type: string) => {
    if (!currentSoundscape) return;
    const updatedTracks = currentSoundscape.ambientTracks.map((t) =>
      t.type === type ? { ...t, active: !t.active } : t
    );
    const updated = { ...currentSoundscape, ambientTracks: updatedTracks };
    setCurrentSoundscape(updated);

    if (isPreviewPlaying) {
      const target = updatedTracks.find((t) => t.type === type);
      if (target?.active) {
        audioSynth.playAmbient(`preview-${type}`, type, target.volume * updated.masterAmbientVolume);
      } else {
        audioSynth.stopAmbient(`preview-${type}`);
      }
    }
  };

  const handleUpdateBinaural = (changes: Partial<SoundscapeRecommendation['binauralBeat']>) => {
    if (!currentSoundscape) return;
    const updatedBinaural = { ...currentSoundscape.binauralBeat, ...changes };
    const updated = { ...currentSoundscape, binauralBeat: updatedBinaural };
    setCurrentSoundscape(updated);

    if (isPreviewPlaying) {
      if (updatedBinaural.enabled) {
        audioSynth.playBinaural(updatedBinaural.frequencyHz, updatedBinaural.volume * updated.masterAmbientVolume);
      } else {
        audioSynth.stopBinaural();
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-xl animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800/90 rounded-3xl p-6 shadow-2xl max-w-2xl w-full text-slate-100 relative max-h-[92vh] flex flex-col divide-y divide-slate-800/80 overflow-hidden">
        
        {/* Modal Header */}
        <div className="pb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-sky-500 p-0.5 shadow-lg shadow-indigo-950/50">
              <div className="w-full h-full bg-slate-900 rounded-[14px] flex items-center justify-center text-indigo-400">
                <Sparkles className="w-5 h-5 animate-pulse text-indigo-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight">AI Sound Generator</h2>
                <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] font-semibold border border-indigo-500/30">
                  Gemini Powered
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Acoustic atmospheres & binaural frequencies calibrated to your current tasks & notes
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Tabs */}
            <div className="flex bg-slate-950/80 p-1 rounded-2xl border border-slate-800/80 text-xs">
              <button
                onClick={() => setActiveTab('generator')}
                className={`px-3 py-1 rounded-xl font-medium transition ${
                  activeTab === 'generator'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Generator
              </button>
              <button
                onClick={() => setActiveTab('presets')}
                className={`px-3 py-1 rounded-xl font-medium transition flex items-center gap-1.5 ${
                  activeTab === 'presets'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>Presets</span>
                {savedPresets.length > 0 && (
                  <span className="w-4 h-4 rounded-full bg-indigo-500/30 text-[10px] flex items-center justify-center font-bold">
                    {savedPresets.length}
                  </span>
                )}
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Body Content */}
        <div className="py-4 space-y-5 overflow-y-auto flex-1 pr-1 custom-scrollbar">

          {activeTab === 'generator' ? (
            <>
              {/* Context Grounding Cards */}
              <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-3.5 space-y-2.5">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
                  <span className="flex items-center gap-1.5 text-indigo-400">
                    <Activity className="w-3.5 h-3.5" />
                    <span>Real-Time Context Grounding</span>
                  </span>
                  <span className="text-[11px] text-slate-500">Method: {focusMethod}</span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setIncludeTasks(!includeTasks)}
                    className={`p-2.5 rounded-xl border text-left transition flex items-center justify-between ${
                      includeTasks
                        ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200'
                        : 'bg-slate-900/40 border-slate-800/60 text-slate-400 opacity-60'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <CheckSquare className="w-4 h-4 shrink-0 text-emerald-400" />
                      <div className="truncate">
                        <div className="font-medium truncate">{pendingTasksCount} Active Tasks</div>
                        <div className="text-[10px] text-slate-400 truncate">
                          {includeTasks ? 'Fed to acoustic prompt' : 'Excluded'}
                        </div>
                      </div>
                    </div>
                    <div className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 ${
                      includeTasks ? 'bg-emerald-500 border-emerald-400 text-black' : 'border-slate-700'
                    }`}>
                      {includeTasks && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIncludeNotes(!includeNotes)}
                    className={`p-2.5 rounded-xl border text-left transition flex items-center justify-between ${
                      includeNotes
                        ? 'bg-sky-950/30 border-sky-500/40 text-sky-200'
                        : 'bg-slate-900/40 border-slate-800/60 text-slate-400 opacity-60'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="w-4 h-4 shrink-0 text-sky-400" />
                      <div className="truncate">
                        <div className="font-medium truncate">{notesLength > 0 ? `${notesLength} Chars Notepad` : 'Empty Notes'}</div>
                        <div className="text-[10px] text-slate-400 truncate">
                          {includeNotes ? 'Fed to acoustic prompt' : 'Excluded'}
                        </div>
                      </div>
                    </div>
                    <div className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 ${
                      includeNotes ? 'bg-sky-500 border-sky-400 text-black' : 'border-slate-700'
                    }`}>
                      {includeNotes && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                  </button>
                </div>
              </div>

              {/* Mood & Cognitive Focus Style Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">
                  Cognitive Mood & Target Sound Profile
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {MOOD_PRESETS.map((m) => {
                    const Icon = m.icon;
                    const isSelected = selectedMood === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setSelectedMood(m.id)}
                        className={`p-2.5 rounded-2xl border text-left transition flex flex-col justify-between ${
                          isSelected
                            ? 'bg-gradient-to-br from-indigo-950/80 to-purple-950/80 border-indigo-500 text-white shadow-md shadow-indigo-950/40'
                            : 'bg-slate-950/40 border-slate-800/80 text-slate-300 hover:bg-slate-800/60 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full mb-1">
                          <Icon className={`w-4 h-4 ${isSelected ? 'text-indigo-400' : 'text-slate-400'}`} />
                          {isSelected && <Check className="w-3 h-3 text-indigo-400" />}
                        </div>
                        <div className="text-xs font-bold truncate">{m.label}</div>
                        <div className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">{m.desc}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Optional Custom Soundscape Prompt */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Custom Atmosphere Request (Optional)
                </label>
                <input
                  type="text"
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  placeholder="e.g., Heavy rain against tall library windows, cozy fireplace, 40Hz gamma focus"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 placeholder-slate-500 outline-none focus:border-indigo-500 transition"
                />
              </div>

              {/* Generate Trigger Button */}
              <button
                type="button"
                onClick={handleGenerate}
                disabled={isGenerating}
                className="w-full py-3 px-4 bg-gradient-to-r from-indigo-600 via-purple-600 to-sky-600 hover:from-indigo-500 hover:to-sky-500 text-white rounded-2xl font-bold text-xs transition flex items-center justify-center gap-2 shadow-lg shadow-indigo-950/60 disabled:opacity-50 group"
              >
                <Wand2 className={`w-4 h-4 ${isGenerating ? 'animate-spin' : 'group-hover:rotate-12 transition'}`} />
                <span>{isGenerating ? 'Synthesizing Acoustic Landscape with Gemini...' : 'Generate & Harmonize Soundscape'}</span>
              </button>

              {/* Soundscape Result Showcase */}
              {currentSoundscape && (
                <div className="bg-slate-950/90 border border-indigo-500/30 rounded-3xl p-4.5 space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  
                  {/* Title & AI Reasoning */}
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white">{currentSoundscape.title}</span>
                        <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-[10px] font-semibold border border-purple-500/30">
                          {currentSoundscape.moodTag}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 mt-1 leading-relaxed italic">
                        "{currentSoundscape.reasoning}"
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={togglePreview}
                        className={`p-2.5 rounded-xl border transition flex items-center gap-1.5 text-xs font-semibold ${
                          isPreviewPlaying
                            ? 'bg-amber-500/20 border-amber-500/40 text-amber-300 shadow-md animate-pulse'
                            : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-white'
                        }`}
                        title={isPreviewPlaying ? 'Pause Preview' : 'Audition Soundscape'}
                      >
                        {isPreviewPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                        <span>{isPreviewPlaying ? 'Playing' : 'Audition'}</span>
                      </button>

                      <button
                        onClick={() => handleSavePreset(currentSoundscape)}
                        className="p-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-slate-300 hover:text-white transition"
                        title="Save to Presets"
                      >
                        <Bookmark className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Binaural Beat Channel */}
                  <div className="p-3 bg-indigo-950/30 border border-indigo-500/20 rounded-2xl space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <Headphones className="w-4 h-4 text-indigo-400" />
                        <span className="font-semibold text-white">Binaural Brainwave Beat</span>
                        <span className="text-[10px] text-indigo-300 bg-indigo-500/20 px-2 py-0.5 rounded-md">
                          {currentSoundscape.binauralBeat.frequencyHz}Hz ({currentSoundscape.binauralBeat.waveType.toUpperCase()})
                        </span>
                      </div>

                      <button
                        onClick={() => handleUpdateBinaural({ enabled: !currentSoundscape.binauralBeat.enabled })}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition ${
                          currentSoundscape.binauralBeat.enabled
                            ? 'bg-indigo-600 text-white'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {currentSoundscape.binauralBeat.enabled ? 'ACTIVE' : 'OFF'}
                      </button>
                    </div>

                    {currentSoundscape.binauralBeat.enabled && (
                      <div className="flex items-center gap-3 pt-1 text-xs text-slate-400">
                        <span className="text-[10px] w-12 shrink-0">Carrier Vol:</span>
                        <input
                          type="range"
                          min="0.05"
                          max="0.8"
                          step="0.05"
                          value={currentSoundscape.binauralBeat.volume}
                          onChange={(e) => handleUpdateBinaural({ volume: parseFloat(e.target.value) })}
                          className="flex-1 accent-indigo-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                        />
                        <span className="text-[10px] w-8 text-right font-mono">
                          {Math.round(currentSoundscape.binauralBeat.volume * 100)}%
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Ambient Stem Mixer Grid */}
                  <div>
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-300 mb-2">
                      <span className="flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-purple-400" />
                        <span>Acoustic Ambient Stems</span>
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {currentSoundscape.ambientTracks.filter((t) => t.active).length} Layers Mixed
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {currentSoundscape.ambientTracks.map((track) => (
                        <div
                          key={track.type}
                          className={`p-2.5 rounded-2xl border transition flex flex-col justify-between ${
                            track.active
                              ? 'bg-slate-900 border-slate-700'
                              : 'bg-slate-950/40 border-slate-800/60 opacity-50'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-2">
                              {AMBIENT_ICONS[track.type] || <Volume2 className="w-4 h-4 text-indigo-400" />}
                              <span className="text-xs font-medium text-slate-200">{track.name}</span>
                            </div>

                            <button
                              onClick={() => handleToggleTrack(track.type)}
                              className={`p-1 rounded-md text-[10px] font-bold transition ${
                                track.active ? 'text-indigo-300 hover:text-white' : 'text-slate-500 hover:text-slate-300'
                              }`}
                            >
                              {track.active ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                            </button>
                          </div>

                          <div className="flex items-center gap-2">
                            <input
                              type="range"
                              min="0"
                              max="1"
                              step="0.05"
                              value={track.active ? track.volume : 0}
                              onChange={(e) => handleUpdateTrackVolume(track.type, parseFloat(e.target.value))}
                              className="w-full accent-indigo-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                            />
                            <span className="text-[10px] font-mono text-slate-400 w-7 text-right">
                              {track.active ? `${Math.round(track.volume * 100)}%` : '0%'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Suggested Music Pairing */}
                  <div className="p-3 bg-slate-900/90 border border-slate-800 rounded-2xl flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0">
                        <Music className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <div className="font-semibold text-slate-200">
                          Recommended Vibe: {currentSoundscape.suggestedMusicGenre}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Lo-fi background melody synced at {Math.round(currentSoundscape.musicVolume * 100)}% volume
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Apply Now Primary Action */}
                  <button
                    type="button"
                    onClick={() => handleApplyToWorkspace(currentSoundscape)}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-bold text-xs transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/50"
                  >
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>Apply & Play in Workspace</span>
                  </button>

                </div>
              )}
            </>
          ) : (
            /* Saved Presets Tab */
            <div className="space-y-3">
              {savedPresets.length === 0 ? (
                <div className="text-center py-12 text-slate-400 space-y-2">
                  <Bookmark className="w-8 h-8 mx-auto text-slate-600" />
                  <div className="text-xs font-semibold text-slate-300">No Saved Soundscapes Yet</div>
                  <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
                    Generate an AI soundscape in the generator tab and bookmark it to save it here for future focus sessions.
                  </p>
                </div>
              ) : (
                savedPresets.map((preset) => (
                  <div
                    key={preset.id}
                    className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-2xl flex items-center justify-between gap-3 text-xs group hover:border-slate-700 transition"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white truncate">{preset.title}</span>
                        <span className="px-2 py-0.2 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] font-semibold">
                          {preset.moodTag}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 truncate mt-0.5">{preset.reasoning}</p>
                      <div className="flex items-center gap-3 mt-1 text-[10px] text-slate-500">
                        <span>{preset.ambientTracks.filter((t) => t.active).length} Ambient Stems</span>
                        {preset.binauralBeat?.enabled && (
                          <span className="text-indigo-400">{preset.binauralBeat.frequencyHz}Hz Binaural</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleApplyToWorkspace(preset)}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold text-xs transition flex items-center gap-1.5 shadow-sm"
                      >
                        <Play className="w-3 h-3 fill-current" />
                        <span>Play</span>
                      </button>

                      <button
                        onClick={() => handleDeletePreset(preset.id!)}
                        className="p-1.5 text-slate-500 hover:text-rose-400 rounded-xl hover:bg-slate-900 transition"
                        title="Delete Preset"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

        </div>

        {/* Modal Footer Info */}
        <div className="pt-3 flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-slate-500" />
            <span>Procedural audio synthesis runs 100% locally in your browser.</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
};
