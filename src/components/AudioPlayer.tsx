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
} from '../types';
import { audioSynth } from '../utils/audioSynth';
import { getFirstColor, isGradient } from '../utils/colorUtils';
import { PRESET_MUSIC_TRACKS, PRESET_BREAK_MUSIC_TRACKS, PRESET_AMBIENT_TRACKS } from '../data/presetAudio';
import { ALL_AVAILABLE_AMBIENT_TRACKS } from '../data/availableAmbient';
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
  Move,
  Layers,
  Trash2,
  Sliders,
  Sparkles,
  Palette,
  Disc,
  Activity,
  Check,
  Minimize2,
  Maximize2
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
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [activeDrawerTab, setActiveDrawerTab] = useState<'music' | 'ambient' | null>(null);
  const [showStyleMenu, setShowStyleMenu] = useState(false);

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

    validatePosition();
    window.addEventListener('resize', validatePosition);
    window.addEventListener('reset-audio-position', handleReset);
    return () => {
      window.removeEventListener('resize', validatePosition);
      window.removeEventListener('reset-audio-position', handleReset);
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

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
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
      setPosition({
        x: dragRef.current.pendingX,
        y: finalY,
      });
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
        audioSynth.playAmbient(track.id, track.type, track.volume * ambientVolume);
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

  const renderAmbientIcon = (type: string, className = 'w-4 h-4') => {
    switch (type) {
      case 'rain': return <CloudRain className={className} />;
      case 'fireplace': return <Flame className={className} />;
      case 'cafe': return <Coffee className={className} />;
      case 'forest': return <Trees className={className} />;
      case 'waves': return <Waves className={className} />;
      case 'whitenoise': return <Radio className={className} />;
      case 'crickets': return <Moon className={className} />;
      case 'thunder': return <Zap className={className} />;
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
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>Ambient Sound Layers</span>
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
                    {renderAmbientIcon(track.type, 'w-3 h-3')}
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
            title="Open Ambient Sound Queue"
          >
            <Layers className={`w-3.5 h-3.5 ${activeAmbientCount > 0 ? 'text-amber-400' : ''}`} />
            <span className="font-semibold text-[11px] hidden sm:inline">Ambient</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
              activeAmbientCount > 0 ? 'bg-amber-400/30 text-amber-300' : 'bg-slate-800 text-slate-400'
            }`}>
              {activeAmbientCount}
            </span>
          </button>

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

      {/* Flyout Drawer for Music Queue / Ambient Queue */}
      {activeDrawerTab && (
        <div
          className={`absolute ${
            position && position.y < 320 ? 'top-full mt-2.5' : 'bottom-full mb-2.5'
          } left-1/2 -translate-x-1/2 w-80 max-w-[94vw] bg-slate-900/95 backdrop-blur-2xl border border-slate-800 rounded-3xl p-4 shadow-2xl z-50 text-slate-200 space-y-3.5 animate-in fade-in zoom-in-95 duration-150`}
        >
          
          {/* Header Tabs */}
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
                <Layers className="w-3.5 h-3.5" /> Ambient ({ambientTracks.length})
              </button>
            </div>
            
            <button
              onClick={() => setActiveDrawerTab(null)}
              className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition text-xs"
              title="Close Queue"
            >
              ✕
            </button>
          </div>

          {/* TAB 1: MUSIC QUEUE */}
          {activeDrawerTab === 'music' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-400 px-1">
                <span>{isBreak ? 'Break Music Queue' : 'Focus Music Queue'}</span>
                <span>{activeMusicPlaylist.length} tracks</span>
              </div>

              <div className="max-h-56 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                {activeMusicPlaylist.map((track, idx) => (
                  <div
                    key={track.id}
                    onClick={() => {
                      setCurrentTrackIndex(idx);
                      setIsPlayingMusic(true);
                    }}
                    className={`flex items-center justify-between p-2.5 rounded-xl text-xs cursor-pointer transition border ${
                      idx === currentTrackIndex
                        ? 'bg-indigo-600/25 border-indigo-500/40 text-indigo-200 font-medium'
                        : 'bg-slate-950/40 border-slate-800/60 hover:bg-slate-800/60 text-slate-300'
                    }`}
                  >
                    <div className="truncate max-w-[190px]">
                      <p className="truncate font-medium">{track.title}</p>
                      <p className="text-[10px] text-slate-400">{track.artist}</p>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {idx === currentTrackIndex && isPlayingMusic ? (
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      ) : null}
                      <span className="text-[10px] text-slate-400 uppercase font-mono">
                        {track.source}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: AMBIENT SOUNDS QUEUE */}
          {activeDrawerTab === 'ambient' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-400 px-1">
                <span>Ambient Soundscapes</span>
                <span className="text-amber-400 font-semibold">{activeAmbientCount} Active</span>
              </div>

              <div className="max-h-56 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                {ambientTracks.map((track) => (
                  <div
                    key={track.id}
                    className={`p-2.5 rounded-2xl border transition ${
                      track.active
                        ? 'bg-amber-950/20 border-amber-500/40 text-amber-100'
                        : 'bg-slate-950/40 border-slate-800/70 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className={track.active ? 'text-amber-400' : 'text-slate-400'}>
                          {renderAmbientIcon(track.type)}
                        </span>
                        <span className="text-xs font-semibold">{track.name}</span>
                      </div>
                      
                      <button
                        onClick={() => toggleAmbientTrack(track.id)}
                        className={`w-8 h-4 rounded-full transition flex items-center px-0.5 ${
                          track.active ? 'bg-amber-500 justify-end' : 'bg-slate-800 justify-start'
                        }`}
                      >
                        <span className="w-3 h-3 rounded-full bg-slate-950 shadow-sm" />
                      </button>
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
                ))}
              </div>
            </div>
          )}

        </div>
      )}

    </div>
  );
};
