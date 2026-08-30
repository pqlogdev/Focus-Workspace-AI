import React, { useState, useEffect, useRef } from 'react';
import {
  AudioConfig,
  AudioTrack,
  AmbientTrack,
  TimerStatus,
  WorkspaceAppearanceConfig,
  MusicLayout,
  MusicVisualizer,
  WidgetSize,
  WidgetBorder,
  WidgetRadius,
  AccentColor,
  SoundscapePreset,
} from '../types';
import { audioSynth } from '../utils/audioSynth';
import { getFirstColor, isGradient } from '../utils/colorUtils';
import { PRESET_MUSIC_TRACKS, PRESET_BREAK_MUSIC_TRACKS, PRESET_AMBIENT_TRACKS } from '../data/presetAudio';
import { ALL_AVAILABLE_AMBIENT_TRACKS } from '../data/availableAmbient';
import {
  AMBIENT_SOUNDSCAPE_PRESETS,
  applySoundscapePreset,
  detectActiveSoundscapePreset,
} from '../data/ambientSoundscapePresets';
import { AudioUploadModal } from './AudioUploadModal';
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Volume2,
  VolumeX,
  Music,
  CloudRain,
  Flame,
  Coffee,
  Trees,
  Waves,
  Moon,
  Radio,
  Zap,
  Shuffle,
  ListMusic,
  Plus,
  GripHorizontal,
  GripVertical,
  Upload,
  Move,
  Layers,
  Trash2,
  Sliders,
  Sparkles,
  Palette,
  Disc,
  Activity,
  Check,
  CheckCircle2,
  Wind,
  Bell,
  FileAudio,
  Minimize2,
  Maximize2,
  Droplets,
  Headphones,
} from 'lucide-react';

interface AudioPlayerProps {
  audioConfig?: AudioConfig;
  config?: AudioConfig;
  onChangeAudioConfig?: (newConfig: AudioConfig) => void;
  onChangeConfig?: (newConfig: AudioConfig) => void;
  timerStatus?: TimerStatus;
  appearance?: WorkspaceAppearanceConfig;
  onUpdateAppearance?: (changes: Partial<WorkspaceAppearanceConfig>) => void;
  isHighlighted?: boolean;
  onOpenSoundGenerator?: () => void;
  canCustomize?: boolean;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({
  audioConfig,
  config,
  onChangeAudioConfig,
  onChangeConfig,
  timerStatus = 'PENDING',
  appearance,
  onUpdateAppearance,
  isHighlighted = false,
  onOpenSoundGenerator,
  canCustomize = true,
}) => {
  const audioCfg = audioConfig || config || {};

  const isBreak = timerStatus === 'BREAK' || timerStatus === 'LONG_BREAK';

  const breakTracks = audioCfg.breakMusicPlaylist || PRESET_BREAK_MUSIC_TRACKS;
  const musicTracks = audioCfg.musicPlaylist?.tracks || (audioCfg.musicTrack ? [audioCfg.musicTrack] : PRESET_MUSIC_TRACKS);
  const activeMusicPlaylist = (isBreak && breakTracks.length > 0 ? breakTracks : musicTracks) || PRESET_MUSIC_TRACKS;

  const ambientTracks: AmbientTrack[] = audioCfg.ambientPlaylist?.tracks || audioCfg.ambientTracks || PRESET_AMBIENT_TRACKS;
  const musicVolume = audioCfg.musicVolume ?? 0.7;
  const ambientVolume = audioCfg.ambientVolume ?? 0.5;
  const shuffleEnabled = audioCfg.musicPlaylist?.shuffleEnabled ?? false;

  const updateAudio = (updated: AudioConfig) => {
    if (onChangeAudioConfig) {
      onChangeAudioConfig(updated);
    } else if (onChangeConfig) {
      onChangeConfig(updated);
    }
  };

  const [isPlayingMusic, setIsPlayingMusic] = useState(false);
  const [currentTrackIndex, setCurrentTrackIndex] = useState<number>(() => {
    const saved = localStorage.getItem('airiser_audio_track_index');
    if (saved !== null) {
      const val = parseInt(saved, 10);
      if (!isNaN(val) && val >= 0) return val;
    }
    return 0;
  });
  const [activeDrawerTab, setActiveDrawerTab] = useState<'music' | 'ambient' | null>(null);
  const [soundscapeTagFilter, setSoundscapeTagFilter] = useState<string>('All');
  const [audioToast, setAudioToast] = useState<{ message: string; icon?: string } | null>(null);
  const [showStyleMenu, setShowStyleMenu] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadModalCategory, setUploadModalCategory] = useState<'music' | 'ambient'>('music');

  useEffect(() => {
    if (audioToast) {
      const timer = setTimeout(() => setAudioToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [audioToast]);

  // Drag and drop state for track reordering
  const [draggedMusicIndex, setDraggedMusicIndex] = useState<number | null>(null);
  const [dragOverMusicIndex, setDragOverMusicIndex] = useState<number | null>(null);
  const [draggedAmbientIndex, setDraggedAmbientIndex] = useState<number | null>(null);
  const [dragOverAmbientIndex, setDragOverAmbientIndex] = useState<number | null>(null);

  // Position state for draggable music toolbar with safety clamping
  const [position, setPosition] = useState<{ x: number; y: number } | null>(() => {
    const saved = localStorage.getItem('airiser_audio_position');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (
          typeof parsed?.x === 'number' &&
          typeof parsed?.y === 'number' &&
          parsed.x >= 0 &&
          parsed.x < window.innerWidth - 100 &&
          parsed.y >= 0 &&
          parsed.y < window.innerHeight - 50
        ) {
          return parsed;
        }
      } catch (e) {}
    }
    return null;
  });
  const [isDragging, setIsDragging] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    startX: number;
    startY: number;
    initX: number;
    initY: number;
    width: number;
    height: number;
    rafId: number | null;
    pendingX: number;
    pendingY: number;
  }>({
    startX: 0,
    startY: 0,
    initX: 0,
    initY: 0,
    width: 400,
    height: 50,
    rafId: null,
    pendingX: 0,
    pendingY: 0,
  });

  // Validate position on mount and resize, and listen for reset triggers
  useEffect(() => {
    const validatePosition = () => {
      setPosition((prev) => {
        if (!prev) return null;
        if (
          prev.x < 0 ||
          prev.x > window.innerWidth - 100 ||
          prev.y < 0 ||
          prev.y > window.innerHeight - 50
        ) {
          return null; // Reset to bottom-center default
        }
        return prev;
      });
    };

    const handleReset = () => {
      setPosition(null);
      localStorage.removeItem('airiser_audio_position');
    };

    const handleSyncRemotePosition = (e: any) => {
      if (e.detail?.widget === 'audio' && e.detail.position) {
        setPosition(e.detail.position);
      }
    };

    validatePosition();
    window.addEventListener('resize', validatePosition);
    window.addEventListener('reset-audio-position', handleReset);
    window.addEventListener('sync-remote-widget-position' as any, handleSyncRemotePosition);
    return () => {
      window.removeEventListener('resize', validatePosition);
      window.removeEventListener('reset-audio-position', handleReset);
      window.removeEventListener('sync-remote-widget-position' as any, handleSyncRemotePosition);
      if (dragRef.current.rafId !== null) {
        cancelAnimationFrame(dragRef.current.rafId);
      }
    };
  }, []);

  useEffect(() => {
    if (position) {
      localStorage.setItem('airiser_audio_position', JSON.stringify(position));
    } else {
      localStorage.removeItem('airiser_audio_position');
    }
  }, [position]);

  useEffect(() => {
    localStorage.setItem('airiser_audio_track_index', currentTrackIndex.toString());
  }, [currentTrackIndex]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!canCustomize) return;
    if (
      (e.target as HTMLElement).tagName === 'BUTTON' ||
      (e.target as HTMLElement).closest('button') ||
      (e.target as HTMLElement).tagName === 'INPUT' ||
      (e.target as HTMLElement).closest('input')
    ) {
      return;
    }

    e.preventDefault();
    const player = playerRef.current;
    const rect = player
      ? player.getBoundingClientRect()
      : { left: window.innerWidth / 2 - 200, top: window.innerHeight - 80, width: 400, height: 50 };

    const initX = position ? position.x : rect.left;
    const initY = position ? position.y : rect.top;

    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initX,
      initY,
      width: rect.width || 400,
      height: rect.height || 50,
      rafId: null,
      pendingX: initX,
      pendingY: initY,
    };

    setIsDragging(true);
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;

    const { startX, startY, initX, initY, width } = dragRef.current;
    const deltaX = e.clientX - startX;
    const deltaY = e.clientY - startY;

    // Allow dragging freely anywhere, right up into the header area (min top 0px)
    const nextX = Math.max(0, Math.min(window.innerWidth - width, initX + deltaX));
    const nextY = Math.max(0, Math.min(window.innerHeight - 50, initY + deltaY));

    dragRef.current.pendingX = nextX;
    dragRef.current.pendingY = nextY;

    if (dragRef.current.rafId === null) {
      dragRef.current.rafId = requestAnimationFrame(() => {
        setPosition({
          x: dragRef.current.pendingX,
          y: dragRef.current.pendingY,
        });
        dragRef.current.rafId = null;
      });
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDragging) {
      if (dragRef.current.rafId !== null) {
        cancelAnimationFrame(dragRef.current.rafId);
        dragRef.current.rafId = null;
      }
      // If dropped near header top zone (y < 45), snap flush into header row at y=12
      const finalY = dragRef.current.pendingY < 45 ? 12 : dragRef.current.pendingY;
      const finalPos = {
        x: dragRef.current.pendingX,
        y: finalY,
      };
      setPosition(finalPos);
      window.dispatchEvent(new CustomEvent('widget-position-changed', {
        detail: { widget: 'audio', position: finalPos }
      }));
      setIsDragging(false);
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {}
    }
  };

  const currentTrack: AudioTrack | undefined = activeMusicPlaylist[currentTrackIndex];

  // Sync ambient sound states with audioSynth
  useEffect(() => {
    ambientTracks.forEach((track) => {
      if (track.active) {
        audioSynth.playAmbient(track.id, track.type, track.volume * ambientVolume, track.url);
      } else {
        audioSynth.stopAmbient(track.id);
      }
    });
  }, [ambientTracks, ambientVolume]);

  // Handle native audio playback
  useEffect(() => {
    if (!audioRef.current) return;

    if (isPlayingMusic && currentTrack && currentTrack.source !== 'youtube') {
      audioRef.current.src = currentTrack.url;
      audioRef.current.volume = musicVolume;
      audioRef.current
        .play()
        .catch((e) => console.log('Audio autoplay prevented or error:', e));
    } else {
      audioRef.current.pause();
    }
  }, [isPlayingMusic, currentTrackIndex, currentTrack, musicVolume]);

  const toggleMusicPlay = () => {
    setIsPlayingMusic((prev) => !prev);
  };

  const handleNextTrack = () => {
    if (shuffleEnabled && activeMusicPlaylist.length > 1) {
      let nextIdx = Math.floor(Math.random() * activeMusicPlaylist.length);
      while (nextIdx === currentTrackIndex) {
        nextIdx = Math.floor(Math.random() * activeMusicPlaylist.length);
      }
      setCurrentTrackIndex(nextIdx);
    } else {
      setCurrentTrackIndex((prev) => (prev + 1) % activeMusicPlaylist.length);
    }
    setIsPlayingMusic(true);
  };

  const handlePrevTrack = () => {
    setCurrentTrackIndex((prev) => (prev - 1 + activeMusicPlaylist.length) % activeMusicPlaylist.length);
    setIsPlayingMusic(true);
  };

  // Reorder Music items (drag and drop or arrow buttons)
  const moveMusicTrack = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= activeMusicPlaylist.length || fromIndex === toIndex) return;
    const reordered = [...activeMusicPlaylist];
    const [removed] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, removed);

    // Keep active track synchronized
    if (currentTrackIndex === fromIndex) {
      setCurrentTrackIndex(toIndex);
    } else if (fromIndex < currentTrackIndex && toIndex >= currentTrackIndex) {
      setCurrentTrackIndex((prev) => prev - 1);
    } else if (fromIndex > currentTrackIndex && toIndex <= currentTrackIndex) {
      setCurrentTrackIndex((prev) => prev + 1);
    }

    if (isBreak) {
      updateAudio({
        ...audioCfg,
        breakMusicPlaylist: reordered,
      });
    } else {
      updateAudio({
        ...audioCfg,
        musicPlaylist: {
          tracks: reordered,
          shuffleEnabled,
        },
      });
    }
  };

  // Reorder Ambient items
  const moveAmbientTrack = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= ambientTracks.length || fromIndex === toIndex) return;
    const reordered = [...ambientTracks];
    const [removed] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, removed);

    updateAudio({
      ...audioCfg,
      ambientTracks: reordered,
      ambientPlaylist: {
        tracks: reordered,
        shuffleEnabled: false,
      },
    });
  };

  // Add Music Track
  const handleAddMusicTrack = (newTrack: AudioTrack) => {
    const updated = [newTrack, ...activeMusicPlaylist];
    if (isBreak) {
      updateAudio({ ...audioCfg, breakMusicPlaylist: updated });
    } else {
      updateAudio({
        ...audioCfg,
        musicPlaylist: { tracks: updated, shuffleEnabled },
      });
    }
    setCurrentTrackIndex(0);
    setIsPlayingMusic(true);
  };

  // Add Ambient Track
  const handleAddAmbientTrack = (newTrack: AmbientTrack) => {
    const updated = [newTrack, ...ambientTracks];
    updateAudio({
      ...audioCfg,
      ambientTracks: updated,
      ambientPlaylist: { tracks: updated, shuffleEnabled: false },
    });
  };

  // Remove Music Track
  const handleRemoveMusicTrack = (trackId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = activeMusicPlaylist.filter((t) => t.id !== trackId);
    if (isBreak) {
      updateAudio({ ...audioCfg, breakMusicPlaylist: updated });
    } else {
      updateAudio({
        ...audioCfg,
        musicPlaylist: { tracks: updated, shuffleEnabled },
      });
    }
    if (currentTrackIndex >= updated.length) {
      setCurrentTrackIndex(Math.max(0, updated.length - 1));
    }
  };

  // Remove Ambient Track
  const handleRemoveAmbientTrack = (trackId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    audioSynth.stopAmbient(trackId);
    const updated = ambientTracks.filter((t) => t.id !== trackId);
    updateAudio({
      ...audioCfg,
      ambientTracks: updated,
      ambientPlaylist: { tracks: updated, shuffleEnabled: false },
    });
  };

  const toggleAmbientTrack = (trackId: string) => {
    const updated = ambientTracks.map((t) => (t.id === trackId ? { ...t, active: !t.active } : t));
    updateAudio({
      ...audioCfg,
      ambientTracks: updated,
      ambientPlaylist: { tracks: updated, shuffleEnabled: false },
    });
  };

  const updateAmbientTrackVolume = (trackId: string, vol: number) => {
    const updated = ambientTracks.map((t) => (t.id === trackId ? { ...t, volume: vol } : t));
    updateAudio({
      ...audioCfg,
      ambientTracks: updated,
      ambientPlaylist: { tracks: updated, shuffleEnabled: false },
    });
  };

  const activeAmbientCount = ambientTracks.filter((t) => t.active).length;
  const activeSoundscape = detectActiveSoundscapePreset(AMBIENT_SOUNDSCAPE_PRESETS, ambientTracks);

  const toggleSoundscapePreset = (preset: SoundscapePreset) => {
    if (activeSoundscape?.id === preset.id) {
      // Toggle off all layers in this soundscape
      const allMuted = ambientTracks.map((t) => ({ ...t, active: false }));
      updateAudio({
        ...audioCfg,
        ambientTracks: allMuted,
        ambientPlaylist: { tracks: allMuted, shuffleEnabled: false },
      });
      setAudioToast({ message: `Muted ${preset.name} soundscape` });
    } else {
      // Apply and activate soundscape preset layers
      const updated = applySoundscapePreset(preset, ambientTracks);
      updateAudio({
        ...audioCfg,
        ambientTracks: updated,
        ambientPlaylist: { tracks: updated, shuffleEnabled: false },
      });
      setAudioToast({
        message: `Activated ${preset.name} soundscape (${preset.tag})`,
        icon: preset.icon,
      });
    }
  };

  const muteAllAmbientTracks = () => {
    const allMuted = ambientTracks.map((t) => ({ ...t, active: false }));
    updateAudio({
      ...audioCfg,
      ambientTracks: allMuted,
      ambientPlaylist: { tracks: allMuted, shuffleEnabled: false },
    });
    setAudioToast({ message: 'Muted all ambient soundscape layers' });
  };

  const renderAmbientIcon = (type: string, iconName?: string, className = 'w-4 h-4') => {
    const key = iconName || type;
    switch (key) {
      case 'rain':
      case 'CloudRain': return <CloudRain className={className} />;
      case 'fireplace':
      case 'Flame': return <Flame className={className} />;
      case 'cafe':
      case 'Coffee': return <Coffee className={className} />;
      case 'forest':
      case 'Trees': return <Trees className={className} />;
      case 'waves':
      case 'Waves': return <Waves className={className} />;
      case 'stream':
      case 'Droplets': return <Droplets className={className} />;
      case 'whitenoise':
      case 'Radio': return <Radio className={className} />;
      case 'crickets':
      case 'Moon': return <Moon className={className} />;
      case 'thunder':
      case 'Zap': return <Zap className={className} />;
      case 'wind':
      case 'Wind': return <Wind className={className} />;
      case 'Bell': return <Bell className={className} />;
      case 'Disc': return <Disc className={className} />;
      case 'Sparkles': return <Sparkles className={className} />;
      case 'Headphones': return <Headphones className={className} />;
      default: return <Volume2 className={className} />;
    }
  };

  // Appearance Configurations
  const musicLayout: MusicLayout = appearance?.musicLayout || 'standard';
  const musicVisualizer: MusicVisualizer = appearance?.musicVisualizer || 'bars';
  const musicSize = appearance?.musicSize || 'normal';
  const musicBorder: WidgetBorder = appearance?.musicBorder || 'subtle';
  const musicRadius: WidgetRadius = appearance?.musicRadius || 'super';
  const isGhost = appearance?.musicTransparentGhost ?? false;
  const musicOpacity = isGhost ? 0 : (appearance?.musicOpacity ?? 0.95);
  const accentColor = appearance?.musicAccentColor || 'indigo';
  const customColor = appearance?.musicCustomColor;
  const customGlow = appearance?.musicGlowIntensity ?? 50;
  const primaryHex = customColor ? getFirstColor(customColor, '#6366f1') : undefined;

  // Accent Styles Resolver
  const getAccentClass = () => {
    if (customColor) {
      return 'text-white border-white/30';
    }
    switch (accentColor) {
      case 'emerald': return 'text-emerald-400 bg-emerald-500/20 border-emerald-500/30';
      case 'cyan': return 'text-cyan-400 bg-cyan-500/20 border-cyan-500/30';
      case 'amber': return 'text-amber-400 bg-amber-500/20 border-amber-500/30';
      case 'rose': return 'text-rose-400 bg-rose-500/20 border-rose-500/30';
      case 'monochrome': return 'text-slate-100 bg-white/20 border-white/30';
      case 'indigo':
      default: return 'text-indigo-400 bg-indigo-500/20 border-indigo-500/30';
    }
  };

  const getPrimaryBtnColor = () => {
    if (customColor) {
      return 'text-white font-bold shadow-lg';
    }
    switch (accentColor) {
      case 'emerald': return 'bg-emerald-500 hover:bg-emerald-400 text-white';
      case 'cyan': return 'bg-cyan-500 hover:bg-cyan-400 text-white';
      case 'amber': return 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold';
      case 'rose': return 'bg-rose-500 hover:bg-rose-400 text-white';
      case 'monochrome': return 'bg-white hover:bg-slate-200 text-slate-900';
      case 'indigo':
      default: return 'bg-indigo-500 hover:bg-indigo-400 text-white';
    }
  };

  const getBorderClass = () => {
    if (customColor && musicBorder === 'glow') {
      return `border border-white/40 shadow-[0_0_${Math.round(customGlow * 0.4)}px_${primaryHex}88] ring-1 ring-white/30`;
    }
    switch (musicBorder) {
      case 'none': return 'border-0';
      case 'glow': return 'border border-indigo-500/60 shadow-[0_0_25px_rgba(99,102,241,0.25)] ring-1 ring-indigo-400/30';
      case 'double': return 'border-2 border-slate-700 ring-2 ring-slate-900/80 shadow-2xl';
      case 'subtle':
      default: return 'border border-slate-700/80 shadow-2xl';
    }
  };

  const getRadiusClass = () => {
    switch (musicRadius) {
      case 'sharp': return 'rounded-lg';
      case 'rounded': return 'rounded-xl';
      case 'pill': return 'rounded-full';
      case 'super':
      default: return 'rounded-2xl';
    }
  };

  // Render Visualizer
  const renderVisualizerElement = () => {
    if (musicVisualizer === 'vinyl') {
      return (
        <div className={`relative w-8 h-8 rounded-full bg-slate-950 border border-slate-700 flex items-center justify-center flex-shrink-0 ${isPlayingMusic ? 'animate-vinyl-spin' : ''}`}>
          <Disc className="w-5 h-5 text-indigo-400" />
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 absolute" />
        </div>
      );
    }
    if (musicVisualizer === 'wave') {
      return (
        <div className="w-7 h-7 rounded-lg bg-indigo-600/30 border border-indigo-500/30 flex items-center justify-center text-indigo-400 flex-shrink-0">
          <Activity className={`w-4 h-4 ${isPlayingMusic ? 'animate-pulse text-indigo-300' : ''}`} />
        </div>
      );
    }
    if (musicVisualizer === 'pulse') {
      return (
        <div className="w-7 h-7 rounded-lg bg-indigo-600/30 border border-indigo-500/30 flex items-center justify-center flex-shrink-0">
          <span className={`w-3 h-3 rounded-full bg-indigo-400 ${isPlayingMusic ? 'animate-ping' : ''}`} />
        </div>
      );
    }
    if (musicVisualizer === 'bars') {
      return (
        <div className="w-7 h-7 rounded-lg bg-indigo-600/30 border border-indigo-500/30 flex items-center justify-center gap-0.5 px-1 flex-shrink-0">
          <span className={`w-0.5 bg-indigo-400 rounded-full ${isPlayingMusic ? 'animate-bar-1' : 'h-1'}`} />
          <span className={`w-0.5 bg-indigo-300 rounded-full ${isPlayingMusic ? 'animate-bar-2' : 'h-2'}`} />
          <span className={`w-0.5 bg-indigo-400 rounded-full ${isPlayingMusic ? 'animate-bar-3' : 'h-3'}`} />
          <span className={`w-0.5 bg-indigo-300 rounded-full ${isPlayingMusic ? 'animate-bar-4' : 'h-1.5'}`} />
          <span className={`w-0.5 bg-indigo-400 rounded-full ${isPlayingMusic ? 'animate-bar-5' : 'h-2'}`} />
        </div>
      );
    }
    return (
      <div className="w-7 h-7 rounded-lg bg-indigo-600/30 border border-indigo-500/30 flex items-center justify-center text-indigo-400 flex-shrink-0">
        <Music className="w-3.5 h-3.5" />
      </div>
    );
  };

  return (
    <div
      ref={playerRef}
      style={
        position
          ? {
              position: 'fixed',
              left: `${position.x}px`,
              top: `${position.y}px`,
              zIndex: isDragging ? 100 : 45,
              margin: 0,
              willChange: isDragging ? 'left, top' : 'auto',
            }
          : {
              zIndex: isDragging ? 100 : 45,
            }
      }
      className={`${
        position ? 'fixed' : 'fixed bottom-5 left-1/2 -translate-x-1/2'
      } ${
        isHighlighted
          ? 'ring-4 ring-indigo-400 ring-offset-4 ring-offset-slate-950 shadow-[0_0_60px_rgba(99,102,241,0.6)] scale-[1.02] transition-all duration-300 rounded-3xl'
          : ''
      } ${
        isDragging
          ? 'shadow-[0_20px_50px_-10px_rgba(0,0,0,0.8)] ring-2 ring-indigo-500/70 scale-[1.015] select-none transition-none cursor-grabbing'
          : 'transition-[box-shadow,background-color,border-color,opacity] duration-200'
      }`}
    >
      {/* Live Customization Highlight Badge */}
      {isHighlighted && (
        <div className="absolute -top-7 left-1/2 -translate-x-1/2 px-3.5 py-1 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white font-bold text-[10px] tracking-wider rounded-full shadow-2xl flex items-center gap-1.5 z-40 uppercase ring-2 ring-white animate-bounce pointer-events-none whitespace-nowrap">
          <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-spin" />
          <span>Customizing Audio Live</span>
        </div>
      )}

      <audio
        ref={audioRef}
        onEnded={handleNextTrack}
        className="hidden"
      />

      {/* AUDIO UI VARIATION: 1. Pill Capsule Mini-Dock */}
      {musicLayout === 'pill' ? (
        <div
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onDoubleClick={() => {
            if (position?.y === 12) {
              setPosition(null);
              localStorage.removeItem('airiser_audio_position');
            } else {
              setPosition({ x: position?.x ?? (window.innerWidth / 2 - 150), y: 12 });
            }
          }}
          style={{
            touchAction: 'none',
            backgroundColor: `rgba(15, 23, 42, ${musicOpacity})`,
          }}
          className={`backdrop-blur-2xl ${getBorderClass()} rounded-full px-3 py-1.5 shadow-2xl flex items-center gap-2.5 text-slate-100 cursor-grab active:cursor-grabbing select-none hover:border-slate-600 transition-colors`}
          title="Drag anywhere • Double-click to dock to header"
        >
          <span className="flex items-center">
            <GripHorizontal className="w-3.5 h-3.5 text-slate-400" />
          </span>

          <div
            onClick={() => setActiveDrawerTab(activeDrawerTab === 'music' ? null : 'music')}
            className="flex items-center gap-2 cursor-pointer"
          >
            {renderVisualizerElement()}
            <div className="max-w-[100px] truncate">
              <p className="text-xs font-semibold text-slate-200 truncate">{currentTrack ? currentTrack.title : 'No Music'}</p>
            </div>
          </div>

          <button
            onClick={toggleMusicPlay}
            className={`w-6 h-6 rounded-full ${getPrimaryBtnColor()} flex items-center justify-center shadow-md transition active:scale-95`}
          >
            {isPlayingMusic ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3 ml-0.5" />}
          </button>

          <button
            onClick={handleNextTrack}
            className="p-1 text-slate-400 hover:text-white"
            title="Next Track"
          >
            <SkipForward className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setShowStyleMenu(!showStyleMenu)}
            className="p-1 text-slate-400 hover:text-indigo-300"
            title="Customize Audio UI"
          >
            <Palette className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : musicLayout === 'compact' ? (
        /* AUDIO UI VARIATION: 2. Compact Horizontal Micro Bar */
        <div
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onDoubleClick={() => {
            if (position?.y === 12) {
              setPosition(null);
              localStorage.removeItem('airiser_audio_position');
            } else {
              setPosition({ x: position?.x ?? (window.innerWidth / 2 - 180), y: 12 });
            }
          }}
          style={{
            touchAction: 'none',
            backgroundColor: `rgba(15, 23, 42, ${musicOpacity})`,
          }}
          className={`backdrop-blur-2xl ${getBorderClass()} ${getRadiusClass()} px-3 py-1.5 shadow-2xl flex items-center gap-2 text-slate-100 cursor-grab active:cursor-grabbing select-none`}
        >
          <GripHorizontal className="w-3.5 h-3.5 text-slate-500" />
          {renderVisualizerElement()}
          <div className="max-w-[120px] truncate text-left">
            <p className="text-xs font-semibold text-slate-200 truncate">{currentTrack?.title || 'No Music'}</p>
            <p className="text-[9px] text-slate-400 truncate">{currentTrack?.artist || 'Select track'}</p>
          </div>

          <button
            onClick={toggleMusicPlay}
            className={`w-6 h-6 rounded-full ${getPrimaryBtnColor()} flex items-center justify-center`}
          >
            {isPlayingMusic ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3 ml-0.5" />}
          </button>
          <button onClick={handleNextTrack} className="p-1 text-slate-400 hover:text-white">
            <SkipForward className="w-3 h-3" />
          </button>
          <button
            onClick={() => setActiveDrawerTab(activeDrawerTab === 'music' ? null : 'music')}
            className="p-1 text-slate-400 hover:text-indigo-300"
          >
            <ListMusic className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setShowStyleMenu(!showStyleMenu)}
            className="p-1 text-slate-400 hover:text-indigo-300"
          >
            <Palette className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : musicLayout === 'mixer_deck' ? (
        /* AUDIO UI VARIATION: 3. Studio Master Mixer Console */
        <div
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          style={{
            touchAction: 'none',
            backgroundColor: `rgba(15, 23, 42, ${musicOpacity})`,
          }}
          className={`backdrop-blur-2xl ${getBorderClass()} ${getRadiusClass()} p-3 shadow-2xl flex flex-col gap-2.5 text-slate-100 cursor-grab active:cursor-grabbing select-none w-80 sm:w-96`}
        >
          {/* Deck Header */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <GripHorizontal className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-indigo-400" />
                Studio Deck
              </span>
              {position && position.y <= 20 && (
                <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded-full">Header</span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowStyleMenu(!showStyleMenu)}
                className="p-1 text-slate-400 hover:text-white"
                title="Style Settings"
              >
                <Palette className="w-3.5 h-3.5" />
              </button>
              {position && (
                <button onClick={() => setPosition(null)} className="p-1 text-slate-400 hover:text-white">
                  <Move className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Current Music Row */}
          <div className="flex items-center justify-between bg-slate-950/60 p-2 rounded-xl border border-slate-800/80">
            <div className="flex items-center gap-2.5 truncate max-w-[180px]">
              {renderVisualizerElement()}
              <div className="truncate">
                <p className="text-xs font-semibold text-slate-200 truncate">{currentTrack?.title || 'No Music'}</p>
                <p className="text-[10px] text-slate-400 truncate">{currentTrack?.artist || 'Lo-Fi Lounge'}</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={handlePrevTrack} className="p-1 text-slate-400 hover:text-white">
                <SkipBack className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={toggleMusicPlay}
                className={`w-7 h-7 rounded-full ${getPrimaryBtnColor()} flex items-center justify-center shadow`}
              >
                {isPlayingMusic ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
              </button>
              <button onClick={handleNextTrack} className="p-1 text-slate-400 hover:text-white">
                <SkipForward className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Direct Live Ambient Mixer Channels */}
          <div className="space-y-2 pt-1">
            {/* Ambient Presets Quick Carousel */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span className="flex items-center gap-1 font-semibold text-slate-300">
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  <span>Ambient Soundscapes</span>
                </span>
                {activeSoundscape ? (
                  <span className="text-[10px] text-amber-300 font-semibold truncate max-w-[130px] flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                    {activeSoundscape.name}
                  </span>
                ) : activeAmbientCount > 0 ? (
                  <button
                    onClick={muteAllAmbientTracks}
                    className="text-[10px] text-slate-400 hover:text-rose-300 transition flex items-center gap-0.5"
                  >
                    <VolumeX className="w-2.5 h-2.5" />
                    <span>Mute All</span>
                  </button>
                ) : (
                  <span className="text-[10px] text-slate-500">Muted</span>
                )}
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                {AMBIENT_SOUNDSCAPE_PRESETS.map((preset) => {
                  const isThisActive = activeSoundscape?.id === preset.id;
                  return (
                    <button
                      key={preset.id}
                      onClick={() => toggleSoundscapePreset(preset)}
                      className={`px-2 py-1 rounded-lg text-[10px] font-semibold flex items-center gap-1 shrink-0 transition border ${
                        isThisActive
                          ? 'bg-amber-500/25 border-amber-500/60 text-amber-200 shadow-sm'
                          : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                      }`}
                      title={`${preset.name}: ${preset.description}`}
                    >
                      {renderAmbientIcon(preset.layers[0]?.type || 'rain', preset.icon, 'w-3 h-3')}
                      <span>{preset.name}</span>
                      {isThisActive && <Check className="w-2.5 h-2.5 text-amber-400 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-400 pt-0.5">
              <span>Individual Layers</span>
              <button
                onClick={() => setActiveDrawerTab(activeDrawerTab === 'ambient' ? null : 'ambient')}
                className="text-[10px] text-indigo-400 hover:underline"
              >
                All ({ambientTracks.length})
              </button>
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              {ambientTracks.slice(0, 4).map((track) => (
                <div
                  key={track.id}
                  className={`p-1.5 rounded-lg border flex items-center justify-between ${
                    track.active
                      ? 'bg-indigo-950/40 border-indigo-500/40 text-indigo-200'
                      : 'bg-slate-950/40 border-slate-800 text-slate-400'
                  }`}
                >
                  <button
                    onClick={() => toggleAmbientTrack(track.id)}
                    className="flex items-center gap-1.5 text-xs truncate max-w-[90px]"
                  >
                    {renderAmbientIcon(track.type, track.icon, 'w-3 h-3')}
                    <span className="truncate text-[11px]">{track.name}</span>
                  </button>
                  {track.active && (
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={track.volume}
                      onChange={(e) => updateAmbientTrackVolume(track.id, parseFloat(e.target.value))}
                      className="w-10 h-1 bg-slate-700 rounded appearance-none cursor-pointer accent-indigo-500"
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* AUDIO UI VARIATION: 4. Standard Classic Floating Deck */
        <div
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onDoubleClick={() => {
            if (position?.y === 12) {
              setPosition(null);
              localStorage.removeItem('airiser_audio_position');
            } else {
              setPosition({ x: position?.x ?? (window.innerWidth / 2 - 200), y: 12 });
            }
          }}
          style={{
            touchAction: 'none',
            backgroundColor: `rgba(15, 23, 42, ${musicOpacity})`,
          }}
          className={`backdrop-blur-2xl ${getBorderClass()} ${getRadiusClass()} px-3 py-2 shadow-2xl flex items-center gap-2.5 text-slate-100 cursor-grab active:cursor-grabbing select-none hover:border-slate-600 transition-colors`}
          title="Drag anywhere (including header area) • Double-click to dock to header"
        >
          {/* Drag Handle */}
          <span title="Drag Toolbar" className="flex items-center">
            <GripHorizontal className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-200 flex-shrink-0 transition-colors" />
          </span>

          {/* Compact Track / Title Info */}
          <div
            onClick={() => setActiveDrawerTab(activeDrawerTab === 'music' ? null : 'music')}
            className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition py-0.5"
            title="Click to open Music Queue"
          >
            {renderVisualizerElement()}
            <div className="max-w-[110px] sm:max-w-[150px] min-w-0">
              <p className="text-xs font-semibold text-slate-200 truncate leading-tight">
                {currentTrack ? currentTrack.title : 'No Music'}
              </p>
              <p className="text-[10px] text-slate-400 truncate leading-tight">
                {currentTrack ? currentTrack.artist : 'Select track'}
              </p>
            </div>
          </div>

          {/* Playback Controls */}
          <div className="flex items-center gap-1">
            <button
              onClick={handlePrevTrack}
              className="p-1 text-slate-400 hover:text-white transition rounded"
              title="Previous track"
            >
              <SkipBack className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={toggleMusicPlay}
              className={`w-7 h-7 rounded-full ${getPrimaryBtnColor()} flex items-center justify-center shadow-md transition transform active:scale-95 flex-shrink-0`}
              title={isPlayingMusic ? 'Pause' : 'Play'}
            >
              {isPlayingMusic ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
            </button>

            <button
              onClick={handleNextTrack}
              className="p-1 text-slate-400 hover:text-white transition rounded"
              title="Next track"
            >
              <SkipForward className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => updateAudio({
                ...audioCfg,
                musicPlaylist: {
                  tracks: activeMusicPlaylist,
                  shuffleEnabled: !shuffleEnabled,
                }
              })}
              className={`p-1 rounded transition ${shuffleEnabled ? 'text-indigo-400 bg-indigo-500/20' : 'text-slate-500 hover:text-slate-300'}`}
              title="Toggle Shuffle"
            >
              <Shuffle className="w-3 h-3" />
            </button>
          </div>

          <div className="w-px h-4 bg-slate-800" />

          {/* Music Volume Control Slider */}
          <div className="hidden sm:flex items-center gap-1.5">
            <Volume2 className="w-3.5 h-3.5 text-slate-400" />
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={musicVolume}
              onChange={(e) => updateAudio({ ...audioCfg, musicVolume: parseFloat(e.target.value) })}
              className="w-12 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              title="Music Volume"
            />
          </div>

          <div className="w-px h-4 bg-slate-800" />

          {/* Music Queue Drawer Toggle */}
          <button
            onClick={() => setActiveDrawerTab(activeDrawerTab === 'music' ? null : 'music')}
            className={`px-2 py-1 rounded-lg text-xs flex items-center gap-1.5 transition ${
              activeDrawerTab === 'music'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
            }`}
            title="Open Music Queue"
          >
            <ListMusic className="w-3.5 h-3.5 text-indigo-400" />
            <span className="font-semibold text-[11px] hidden sm:inline">Music</span>
            <span className="text-[10px] bg-slate-800/90 text-slate-300 px-1.5 py-0.2 rounded-full">
              {activeMusicPlaylist.length}
            </span>
          </button>

          {/* Ambient Sound Queue Toggle */}
          <button
            onClick={() => setActiveDrawerTab(activeDrawerTab === 'ambient' ? null : 'ambient')}
            className={`px-2 py-1 rounded-lg text-xs flex items-center gap-1.5 transition ${
              activeDrawerTab === 'ambient'
                ? 'bg-amber-500 text-amber-950 font-bold shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
            }`}
            title="Open Ambient Soundscapes & Layers"
          >
            <Layers className={`w-3.5 h-3.5 ${activeAmbientCount > 0 ? 'text-amber-400' : ''}`} />
            <span className="font-semibold text-[11px] hidden sm:inline">Ambient</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
              activeAmbientCount > 0 ? 'bg-amber-400/30 text-amber-300' : 'bg-slate-800 text-slate-400'
            }`}>
              {activeAmbientCount}
            </span>
          </button>

          {/* Active Soundscape Direct Chip */}
          {activeSoundscape && (
            <button
              onClick={() => setActiveDrawerTab('ambient')}
              className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 font-semibold transition shrink-0 shadow-sm"
              title={`Active Preset: ${activeSoundscape.name} (${activeSoundscape.tag}). Click to open soundscapes library.`}
            >
              <Sparkles className="w-3 h-3 text-amber-400 animate-pulse shrink-0" />
              <span className="truncate max-w-[110px]">{activeSoundscape.name}</span>
            </button>
          )}

          {/* AI Sound Generator Action Button */}
          {onOpenSoundGenerator && (
            <button
              onClick={onOpenSoundGenerator}
              className="px-2 py-1 bg-gradient-to-r from-indigo-600/30 to-purple-600/30 hover:from-indigo-600/50 hover:to-purple-600/50 border border-indigo-500/40 text-indigo-200 hover:text-white rounded-lg text-xs flex items-center gap-1.5 transition shadow-sm group"
              title="Open AI Sound Generator (Gemini Powered)"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-400 group-hover:rotate-12 transition animate-pulse" />
              <span className="font-semibold text-[11px] hidden md:inline">AI Sound</span>
            </button>
          )}

          {/* Style Customizer Trigger */}
          <button
            onClick={() => setShowStyleMenu(!showStyleMenu)}
            className={`p-1.5 rounded-lg text-xs transition ${
              showStyleMenu ? 'bg-indigo-600/40 text-white ring-1 ring-indigo-400/40' : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
            title="Customize Music Player UI"
          >
            <Palette className="w-3.5 h-3.5" />
          </button>

          {/* Reset Dock Button if displaced */}
          {position && (
            <button
              onClick={() => setPosition(null)}
              className="p-1 text-slate-400 hover:text-indigo-300 transition rounded hover:bg-slate-800 flex items-center gap-0.5"
              title="Dock to bottom center"
            >
              <Move className="w-3 h-3" />
            </button>
          )}

        </div>
      )}

      {/* Popover Style Menu for Music Player */}
      {showStyleMenu && onUpdateAppearance && (
        <div
          className={`absolute ${
            position && position.y < 320 ? 'top-full mt-2.5' : 'bottom-full mb-2.5'
          } left-1/2 -translate-x-1/2 w-72 bg-slate-950/95 backdrop-blur-2xl border border-slate-800 rounded-2xl p-3.5 shadow-2xl z-50 text-slate-200 space-y-3 animate-in fade-in zoom-in-95 duration-150`}
        >
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Palette className="w-3.5 h-3.5 text-indigo-400" />
              Music Player Styling
            </span>
            <button
              onClick={() => setShowStyleMenu(false)}
              className="text-xs text-slate-500 hover:text-white"
            >
              Done
            </button>
          </div>

          {/* Layout Mode */}
          <div>
            <label className="text-[11px] font-semibold text-slate-400 block mb-1.5">Player Layout</label>
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { id: 'standard', name: 'Standard Deck' },
                { id: 'compact', name: 'Compact Bar' },
                { id: 'pill', name: 'Mini Pill' },
                { id: 'mixer_deck', name: 'Studio Mixer' },
              ].map((layout) => (
                <button
                  key={layout.id}
                  onClick={() => onUpdateAppearance({ musicLayout: layout.id as MusicLayout })}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border text-center transition ${
                    musicLayout === layout.id
                      ? 'bg-indigo-600/30 border-indigo-500 text-white'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {layout.name}
                </button>
              ))}
            </div>
          </div>

          {/* Visualizer Style */}
          <div>
            <label className="text-[11px] font-semibold text-slate-400 block mb-1.5">Audio Visualizer</label>
            <div className="grid grid-cols-4 gap-1">
              {[
                { id: 'bars', name: 'Bars' },
                { id: 'vinyl', name: 'Vinyl' },
                { id: 'wave', name: 'Wave' },
                { id: 'pulse', name: 'Pulse' },
              ].map((vis) => (
                <button
                  key={vis.id}
                  onClick={() => onUpdateAppearance({ musicVisualizer: vis.id as MusicVisualizer })}
                  className={`px-1.5 py-1 rounded-lg text-[11px] font-medium border text-center transition ${
                    musicVisualizer === vis.id
                      ? 'bg-indigo-600/30 border-indigo-500 text-white'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {vis.name}
                </button>
              ))}
            </div>
          </div>

          {/* Border & Glow */}
          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800">
            <div>
              <label className="text-[10px] text-slate-400 block mb-1">Border</label>
              <select
                value={musicBorder}
                onChange={(e) => onUpdateAppearance({ musicBorder: e.target.value as WidgetBorder })}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg text-xs px-2 py-1 text-slate-200 outline-none"
              >
                <option value="subtle">Subtle</option>
                <option value="glow">Neon Glow</option>
                <option value="double">Double Glass</option>
                <option value="none">No Border</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] text-slate-400 block mb-1">Corner Radius</label>
              <select
                value={musicRadius}
                onChange={(e) => onUpdateAppearance({ musicRadius: e.target.value as WidgetRadius })}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg text-xs px-2 py-1 text-slate-200 outline-none"
              >
                <option value="super">Super (24px)</option>
                <option value="pill">Pill Full</option>
                <option value="rounded">Rounded (12px)</option>
                <option value="sharp">Sharp</option>
              </select>
            </div>
          </div>

          {/* Pure Ghost toggle */}
          <div className="flex items-center justify-between pt-1">
            <span className="text-xs text-slate-300">Ghost (0% Background)</span>
            <button
              onClick={() => onUpdateAppearance({ musicTransparentGhost: !isGhost })}
              className={`w-9 h-5 rounded-full transition flex items-center px-0.5 ${
                isGhost ? 'bg-indigo-600 justify-end' : 'bg-slate-800 justify-start'
              }`}
            >
              <span className="w-4 h-4 rounded-full bg-white shadow-sm" />
            </button>
          </div>
        </div>
      )}

      {/* Interactive Audio Toast */}
      {audioToast && (
        <div
          className={`absolute ${
            position && position.y < 120 ? 'top-full mt-2' : '-top-9'
          } left-1/2 -translate-x-1/2 px-3 py-1 bg-slate-900/95 backdrop-blur-md border border-amber-500/50 text-amber-200 text-xs font-semibold rounded-full shadow-2xl flex items-center gap-1.5 z-50 pointer-events-none animate-in fade-in slide-in-from-bottom-2 duration-150 whitespace-nowrap`}
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse shrink-0" />
          <span>{audioToast.message}</span>
        </div>
      )}

      {/* Flyout Drawer for Music Queue / Ambient Queue */}
      {activeDrawerTab && (
        <div
          className={`absolute ${
            position && position.y < 320 ? 'top-full mt-2.5' : 'bottom-full mb-2.5'
          } left-1/2 -translate-x-1/2 w-84 sm:w-[450px] max-w-[95vw] bg-slate-900/95 backdrop-blur-2xl border border-slate-800 rounded-3xl p-4 shadow-2xl z-50 text-slate-200 space-y-3.5 animate-in fade-in zoom-in-95 duration-150`}
        >
          {/* Header Tabs & Actions */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <div className="flex bg-slate-950 p-0.5 rounded-xl border border-slate-800">
              <button
                onClick={() => setActiveDrawerTab('music')}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition flex items-center gap-1.5 ${
                  activeDrawerTab === 'music' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Music className="w-3.5 h-3.5" /> Music ({activeMusicPlaylist.length})
              </button>
              <button
                onClick={() => setActiveDrawerTab('ambient')}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition flex items-center gap-1.5 ${
                  activeDrawerTab === 'ambient' ? 'bg-amber-500 text-amber-950 font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Layers className="w-3.5 h-3.5" /> Soundscapes ({AMBIENT_SOUNDSCAPE_PRESETS.length})
              </button>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => {
                  setUploadModalCategory(activeDrawerTab === 'ambient' ? 'ambient' : 'music');
                  setIsUploadModalOpen(true);
                }}
                className="px-2.5 py-1 bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 hover:text-white border border-indigo-500/30 rounded-lg text-xs font-medium transition flex items-center gap-1"
                title="Upload or import audio"
              >
                <Plus className="w-3 h-3" />
                <span>Import</span>
              </button>

              <button
                onClick={() => setActiveDrawerTab(null)}
                className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition text-xs"
                title="Close Queue"
              >
                ✕
              </button>
            </div>
          </div>

          {/* TAB 1: MUSIC QUEUE WITH DRAG & DROP REORDERING */}
          {activeDrawerTab === 'music' && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs text-slate-400 px-1">
                <span className="flex items-center gap-1.5">
                  <span>{isBreak ? 'Break Music' : 'Focus Music'}</span>
                  <span className="text-[10px] text-slate-500">• Drag ⠿ to reorder</span>
                </span>
                <span className="font-mono text-[11px]">{activeMusicPlaylist.length} tracks</span>
              </div>

              <div className="max-h-64 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
                {activeMusicPlaylist.map((track, idx) => {
                  const isCurrent = idx === currentTrackIndex;
                  const isDraggingThis = draggedMusicIndex === idx;
                  const isOverThis = dragOverMusicIndex === idx;

                  return (
                    <div
                      key={track.id || `music-track-${idx}`}
                      draggable
                      onDragStart={(e) => {
                        setDraggedMusicIndex(idx);
                        e.dataTransfer.effectAllowed = 'move';
                        e.dataTransfer.setData('text/plain', idx.toString());
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = 'move';
                        if (dragOverMusicIndex !== idx) {
                          setDragOverMusicIndex(idx);
                        }
                      }}
                      onDragLeave={() => {
                        if (dragOverMusicIndex === idx) {
                          setDragOverMusicIndex(null);
                        }
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        if (draggedMusicIndex !== null && draggedMusicIndex !== idx) {
                          moveMusicTrack(draggedMusicIndex, idx);
                        }
                        setDraggedMusicIndex(null);
                        setDragOverMusicIndex(null);
                      }}
                      onDragEnd={() => {
                        setDraggedMusicIndex(null);
                        setDragOverMusicIndex(null);
                      }}
                      className={`flex items-center justify-between p-2 rounded-xl text-xs transition border group ${
                        isDraggingThis
                          ? 'opacity-40 border-dashed border-indigo-400 bg-indigo-950/20'
                          : isOverThis
                          ? 'border-indigo-400 bg-indigo-600/30 scale-[1.01]'
                          : isCurrent
                          ? 'bg-indigo-600/25 border-indigo-500/40 text-indigo-200 font-medium'
                          : 'bg-slate-950/40 border-slate-800/60 hover:bg-slate-800/60 text-slate-300'
                      }`}
                    >
                      {/* Drag Handle & Index */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span
                          className="cursor-grab active:cursor-grabbing p-1 text-slate-500 hover:text-indigo-300 transition"
                          title="Drag to reorder track position"
                        >
                          <GripVertical className="w-3.5 h-3.5" />
                        </span>
                        <span className="font-mono text-[10px] text-slate-500 w-4 text-center">
                          {idx + 1}
                        </span>
                      </div>

                      {/* Track Title & Artist */}
                      <div
                        onClick={() => {
                          setCurrentTrackIndex(idx);
                          setIsPlayingMusic(true);
                        }}
                        className="truncate flex-1 min-w-0 cursor-pointer px-1.5"
                      >
                        <p className="truncate font-medium text-xs text-slate-100 flex items-center gap-1.5">
                          {isCurrent && isPlayingMusic && (
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                          )}
                          <span className="truncate">{track.title}</span>
                        </p>
                        <p className="text-[10px] text-slate-400 truncate">{track.artist}</p>
                      </div>

                      {/* Delete / Source Actions */}
                      <div className="flex items-center gap-1 shrink-0">
                        {track.isCustom || track.source === 'upload' || track.source === 'custom_url' ? (
                          <button
                            type="button"
                            onClick={(e) => handleRemoveMusicTrack(track.id, e)}
                            className="p-1 text-slate-500 hover:text-rose-400 transition rounded"
                            title="Remove custom track"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <span className="text-[9px] font-mono text-slate-500 uppercase px-1 bg-slate-900 rounded">
                            {track.source || 'preset'}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Add More Audio CTA */}
              <button
                type="button"
                onClick={() => {
                  setUploadModalCategory('music');
                  setIsUploadModalOpen(true);
                }}
                className="w-full py-2 border border-dashed border-slate-800 hover:border-indigo-500/50 bg-slate-950/40 hover:bg-indigo-950/20 text-indigo-300 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload or Import Custom Music</span>
              </button>
            </div>
          )}

          {/* TAB 2: SOUNDSCAPE PRESETS & AMBIENT LAYERS MIXER */}
          {activeDrawerTab === 'ambient' && (
            <div className="space-y-3">
              {/* Soundscape Presets Section Header & Status */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs px-1">
                  <div className="flex items-center gap-1.5 font-semibold text-slate-200">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>Soundscape Presets</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {activeSoundscape ? (
                      <span className="text-[11px] text-amber-300 font-semibold bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                        Active: {activeSoundscape.name}
                      </span>
                    ) : activeAmbientCount > 0 ? (
                      <span className="text-[11px] text-slate-400 font-medium bg-slate-800 px-2 py-0.5 rounded-full">
                        {activeAmbientCount} Custom Layer{activeAmbientCount > 1 ? 's' : ''}
                      </span>
                    ) : (
                      <span className="text-[11px] text-slate-500 font-medium">All Muted</span>
                    )}

                    {activeAmbientCount > 0 && (
                      <button
                        onClick={muteAllAmbientTracks}
                        className="text-[10px] text-slate-400 hover:text-rose-300 bg-slate-800 hover:bg-rose-950/40 border border-slate-700 hover:border-rose-800/60 px-2 py-0.5 rounded-lg transition flex items-center gap-1 font-medium"
                        title="Mute all ambient sounds"
                      >
                        <VolumeX className="w-3 h-3" />
                        <span>Mute All</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Soundscape Mood Filters */}
                <div className="flex items-center gap-1 overflow-x-auto pb-0.5 no-scrollbar text-[11px]">
                  {['All', 'Focus', 'Nature', 'Deep Work', 'Relax', 'Sleep'].map((tag) => (
                    <button
                      key={tag}
                      onClick={() => setSoundscapeTagFilter(tag)}
                      className={`px-2.5 py-0.5 rounded-full font-medium transition shrink-0 ${
                        soundscapeTagFilter === tag
                          ? 'bg-amber-500 text-amber-950 font-bold shadow-sm'
                          : 'bg-slate-950/60 text-slate-400 hover:text-slate-200 border border-slate-800/80 hover:border-slate-700'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>

                {/* Soundscape Presets Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-52 overflow-y-auto pr-1 custom-scrollbar">
                  {AMBIENT_SOUNDSCAPE_PRESETS.filter(
                    (p) => soundscapeTagFilter === 'All' || p.tag === soundscapeTagFilter
                  ).map((preset) => {
                    const isPresetActive = activeSoundscape?.id === preset.id;
                    return (
                      <div
                        key={preset.id}
                        onClick={() => toggleSoundscapePreset(preset)}
                        className={`p-2.5 rounded-2xl border transition text-left cursor-pointer flex flex-col justify-between group ${
                          isPresetActive
                            ? 'bg-gradient-to-br from-amber-950/40 to-slate-900 border-amber-500/70 text-amber-100 ring-1 ring-amber-500/30 shadow-lg'
                            : 'bg-slate-950/40 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900/50 text-slate-300'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span
                                className={`p-1 rounded-lg ${
                                  isPresetActive ? 'bg-amber-500/20 text-amber-300' : 'bg-slate-800/80 text-slate-400 group-hover:text-amber-300'
                                } transition`}
                              >
                                {renderAmbientIcon(preset.layers[0]?.type || 'rain', preset.icon, 'w-3.5 h-3.5')}
                              </span>
                              <span className="font-bold text-xs truncate">{preset.name}</span>
                            </div>

                            <span
                              className={`text-[9px] px-1.5 py-0.5 rounded-full font-semibold shrink-0 uppercase tracking-wider ${
                                isPresetActive
                                  ? 'bg-amber-400 text-amber-950 font-bold'
                                  : 'bg-slate-800/80 text-slate-400'
                              }`}
                            >
                              {preset.tag}
                            </span>
                          </div>

                          <p className="text-[10px] text-slate-400 line-clamp-2 leading-relaxed mb-2">
                            {preset.description}
                          </p>
                        </div>

                        <div className="flex items-center justify-between pt-1.5 border-t border-slate-800/50 text-[10px]">
                          <div className="flex items-center gap-1 flex-wrap">
                            {preset.layers.map((layer, idx) => (
                              <span
                                key={idx}
                                className={`px-1.5 py-0.5 rounded-md font-mono ${
                                  isPresetActive
                                    ? 'bg-amber-500/20 text-amber-200 border border-amber-500/30'
                                    : 'bg-slate-900 text-slate-400 border border-slate-800'
                                }`}
                              >
                                {layer.type} {Math.round(layer.volume * 100)}%
                              </span>
                            ))}
                          </div>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleSoundscapePreset(preset);
                            }}
                            className={`px-2 py-0.5 rounded-md font-semibold text-[10px] transition flex items-center gap-1 ${
                              isPresetActive
                                ? 'bg-amber-500 text-amber-950 shadow'
                                : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
                            }`}
                          >
                            {isPresetActive ? (
                              <>
                                <Check className="w-2.5 h-2.5" />
                                <span>Active</span>
                              </>
                            ) : (
                              <>
                                <Play className="w-2.5 h-2.5" />
                                <span>Play</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Individual Soundscape Layers & Manual Volume Mixer */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <div className="flex items-center justify-between text-xs text-slate-400 px-1">
                  <span className="flex items-center gap-1.5 font-medium text-slate-300">
                    <Sliders className="w-3 h-3 text-amber-400" />
                    <span>Layer Volume Controls</span>
                    <span className="text-[10px] text-slate-500">• Drag ⠿ to reorder</span>
                  </span>
                  <span className="text-amber-400 font-semibold">{activeAmbientCount} Active</span>
                </div>

                <div className="max-h-44 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
                  {ambientTracks.map((track, idx) => {
                    const isDraggingThis = draggedAmbientIndex === idx;
                    const isOverThis = dragOverAmbientIndex === idx;

                    return (
                      <div
                        key={track.id || `ambient-${idx}`}
                        draggable
                        onDragStart={(e) => {
                          setDraggedAmbientIndex(idx);
                          e.dataTransfer.effectAllowed = 'move';
                          e.dataTransfer.setData('text/plain', idx.toString());
                        }}
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.dataTransfer.dropEffect = 'move';
                          if (dragOverAmbientIndex !== idx) {
                            setDragOverAmbientIndex(idx);
                          }
                        }}
                        onDragLeave={() => {
                          if (dragOverAmbientIndex === idx) {
                            setDragOverAmbientIndex(null);
                          }
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          if (draggedAmbientIndex !== null && draggedAmbientIndex !== idx) {
                            moveAmbientTrack(draggedAmbientIndex, idx);
                          }
                          setDraggedAmbientIndex(null);
                          setDragOverAmbientIndex(null);
                        }}
                        onDragEnd={() => {
                          setDraggedAmbientIndex(null);
                          setDragOverAmbientIndex(null);
                        }}
                        className={`p-2 rounded-xl border transition group ${
                          isDraggingThis
                            ? 'opacity-40 border-dashed border-amber-400 bg-amber-950/20'
                            : isOverThis
                            ? 'border-amber-400 bg-amber-500/20 scale-[1.01]'
                            : track.active
                            ? 'bg-amber-950/20 border-amber-500/40 text-amber-100'
                            : 'bg-slate-950/40 border-slate-800/70 text-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span
                              className="cursor-grab active:cursor-grabbing p-0.5 text-slate-500 hover:text-amber-300 transition"
                              title="Drag to reorder sound layer"
                            >
                              <GripVertical className="w-3.5 h-3.5" />
                            </span>

                            <span className={track.active ? 'text-amber-400' : 'text-slate-400'}>
                              {renderAmbientIcon(track.type, track.icon)}
                            </span>
                            <span className="text-xs font-semibold truncate">{track.name}</span>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {track.isCustom && (
                              <button
                                type="button"
                                onClick={(e) => handleRemoveAmbientTrack(track.id, e)}
                                className="p-1 text-slate-500 hover:text-rose-400 transition"
                                title="Delete custom ambient track"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}

                            <button
                              onClick={() => toggleAmbientTrack(track.id)}
                              className={`w-8 h-4 rounded-full transition flex items-center px-0.5 ${
                                track.active ? 'bg-amber-500 justify-end' : 'bg-slate-800 justify-start'
                              }`}
                            >
                              <span className="w-3 h-3 rounded-full bg-slate-950 shadow-sm" />
                            </button>
                          </div>
                        </div>

                        {track.active && (
                          <div className="flex items-center gap-2 pt-1 border-t border-slate-800/40">
                            <Volume2 className="w-3 h-3 text-slate-400" />
                            <input
                              type="range"
                              min="0"
                              max="1"
                              step="0.05"
                              value={track.volume}
                              onChange={(e) => updateAmbientTrackVolume(track.id, parseFloat(e.target.value))}
                              className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
                            />
                            <span className="text-[10px] font-mono text-slate-400 w-6 text-right">
                              {Math.round(track.volume * 100)}%
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* AI Generator and Custom Ambient Upload CTA */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                {onOpenSoundGenerator && (
                  <button
                    onClick={() => {
                      setActiveDrawerTab(null);
                      onOpenSoundGenerator();
                    }}
                    className="py-1.5 px-2 bg-gradient-to-r from-indigo-600/30 to-purple-600/30 hover:from-indigo-600/50 hover:to-purple-600/50 border border-indigo-500/40 rounded-xl text-xs font-semibold text-indigo-200 hover:text-white flex items-center justify-center gap-1.5 transition shadow-sm"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
                    <span>AI Sound Generator</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setUploadModalCategory('ambient');
                    setIsUploadModalOpen(true);
                  }}
                  className="py-1.5 px-2 border border-dashed border-slate-800 hover:border-amber-500/50 bg-slate-950/40 hover:bg-amber-950/20 text-amber-300 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload Sound</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Custom Audio Upload Modal */}
      <AudioUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        defaultCategory={uploadModalCategory}
        onAddMusicTrack={handleAddMusicTrack}
        onAddAmbientTrack={handleAddAmbientTrack}
      />
    </div>
  );
};
