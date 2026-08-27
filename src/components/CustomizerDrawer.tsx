import React, { useState } from 'react';
import {
  WorkspaceConfig,
  MediaItem,
  FocusMethodType,
  AmbientTrack,
  ClockStyle,
  FontTheme,
  ChimeType,
  CustomImageRecord,
  RollbackSnapshot,
  WidgetSize,
  WidgetBorder,
  WidgetRadius,
  AccentColor,
  MusicLayout,
  MusicVisualizer,
} from '../types';
import { PRESET_BACKGROUNDS, PRESET_BREAK_BACKGROUNDS } from '../data/presetBackgrounds';
import { PRESET_MUSIC_TRACKS } from '../data/presetAudio';
import { ALL_AVAILABLE_AMBIENT_TRACKS } from '../data/availableAmbient';
import { audioSynth } from '../utils/audioSynth';
import { ColorPickerControl } from './ColorPickerControl';
import {
  X,
  Image,
  Music,
  Clock,
  Palette,
  Check,
  Plus,
  Trash2,
  Volume2,
  Layers,
  Sparkles,
  Sliders,
  Bell,
  Sun,
  Eye,
  RotateCcw,
  Type,
  CircleDot,
  Undo2,
  History,
  AlertTriangle,
  CheckCircle2,
  Clipboard,
  ClipboardPaste,
  ShieldCheck,
  Globe,
  Film,
  Layout,
  Store,
  Users,
  BarChart2,
  CheckSquare,
  FileText,
  Bot,
  Disc,
  Activity,
  Zap,
  Radio,
  Minimize2,
  Maximize2
} from 'lucide-react';

interface CustomizerDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  config: WorkspaceConfig;
  onChangeConfig: (newConfig: WorkspaceConfig) => void;
  initialTab?: 'background' | 'audio' | 'method' | 'appearance';
  savedCustomImages?: CustomImageRecord[];
  onSaveCustomImage?: (image: CustomImageRecord) => void;
  onDeleteCustomImage?: (id: string) => void;
  onResetToDefault?: () => void;
  onResetAllCustom?: () => void;
  onRollback?: () => void;
  canRollback?: boolean;
  rollbackSnapshot?: RollbackSnapshot | null;
  onOpenTemplates?: () => void;
  onOpenMarketplace?: () => void;
  onOpenRooms?: () => void;
  onOpenStats?: () => void;
  onOpenTasks?: () => void;
  onOpenNotes?: () => void;
  onOpenAiChat?: () => void;
  onCustomizingPanelChange?: (panel: 'timer' | 'music' | 'notes' | 'canvas' | null) => void;
}

export const CustomizerDrawer: React.FC<CustomizerDrawerProps> = ({
  isOpen,
  onClose,
  config,
  onChangeConfig,
  initialTab = 'background',
  savedCustomImages = [],
  onSaveCustomImage,
  onDeleteCustomImage,
  onResetToDefault,
  onResetAllCustom,
  onRollback,
  canRollback = false,
  rollbackSnapshot,
  onOpenTemplates,
  onOpenMarketplace,
  onOpenRooms,
  onOpenStats,
  onOpenTasks,
  onOpenNotes,
  onOpenAiChat,
  onCustomizingPanelChange,
}) => {
  const [activeTab, setActiveTab] = useState<'background' | 'audio' | 'method' | 'appearance'>(initialTab);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetType, setResetType] = useState<'settings_only' | 'full_wipe'>('full_wipe');
  const [resetSuccessMessage, setResetSuccessMessage] = useState<string | null>(null);
  const [clipboardFeedback, setClipboardFeedback] = useState<string | null>(null);

  // Custom wallpaper inputs
  const [customBgUrl, setCustomBgUrl] = useState('');
  const [customBgTitle, setCustomBgTitle] = useState('');
  const [customBgType, setCustomBgType] = useState<'image' | 'video'>('image');

  if (!isOpen) return null;

  const currentAppearance = config.appearance || {
    backgroundBrightness: 0.8,
    backgroundBlur: 0,
    cardOpacity: 0.85,
    fontStyle: 'sans',
    clockStyle: 'digital',
    vignetteTint: 'dark',
    chimeSound: 'zen-bell',
    showProgressBar: true,
    showSeconds: true,
    showHotkeyHints: true,
    showMusicBar: true,
    showStickyNotes: true,
    showStreakBadge: true,
    minimalMode: false,
  };

  const updateAppearance = (changes: Partial<typeof currentAppearance>) => {
    onChangeConfig({
      ...config,
      appearance: {
        ...currentAppearance,
        ...changes,
      },
    });
  };

  // Add custom wallpaper to work items and cloud image library
  const handleAddCustomWallpaper = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customBgUrl.trim()) return;

    const newItem: MediaItem = {
      id: `custom-bg-${Date.now()}`,
      title: customBgTitle.trim() || 'Custom Wallpaper',
      type: customBgType,
      url: customBgUrl.trim(),
      thumbnailUrl: customBgType === 'image' ? customBgUrl.trim() : undefined,
      duration: 1800,
      source: 'custom_url',
      isCustom: true,
      isPreservedAfterReset: false,
      hasResetCustoms: false,
      addedAt: new Date().toISOString(),
    };

    const currentWork = config.background?.workItems || [];
    onChangeConfig({
      ...config,
      background: {
        ...config.background,
        workItems: [newItem, ...currentWork],
      },
    });

    onSaveCustomImage?.({
      id: newItem.id,
      title: newItem.title,
      type: newItem.type,
      url: newItem.url,
      thumbnailUrl: newItem.thumbnailUrl,
      source: 'custom_url',
      isCustom: true,
      isPreservedAfterReset: false,
      hasResetCustoms: false,
      addedAt: newItem.addedAt || new Date().toISOString(),
    });

    setCustomBgUrl('');
    setCustomBgTitle('');
    setClipboardFeedback('Added custom wallpaper and saved to cloud library!');
    setTimeout(() => setClipboardFeedback(null), 3500);
  };

  // Paste image URL directly from clipboard
  const handlePasteFromClipboard = async () => {
    try {
      if (!navigator.clipboard) {
        setClipboardFeedback('Clipboard access unavailable. Please paste into the URL box.');
        setTimeout(() => setClipboardFeedback(null), 4000);
        return;
      }
      const text = await navigator.clipboard.readText();
      if (!text || !text.trim()) {
        setClipboardFeedback('Clipboard is empty. Copy an image URL first.');
        setTimeout(() => setClipboardFeedback(null), 4000);
        return;
      }
      const trimmed = text.trim();
      const isVideo = trimmed.endsWith('.mp4') || trimmed.endsWith('.webm');
      const newItem: MediaItem = {
        id: `clipboard-bg-${Date.now()}`,
        title: customBgTitle.trim() || `Clipboard Wallpaper (${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`,
        type: isVideo ? 'video' : 'image',
        url: trimmed,
        thumbnailUrl: isVideo ? undefined : trimmed,
        duration: 1800,
        source: 'clipboard',
        isCustom: true,
        isPreservedAfterReset: false,
        hasResetCustoms: false,
        addedAt: new Date().toISOString(),
      };

      const currentWork = config.background?.workItems || [];
      onChangeConfig({
        ...config,
        background: {
          ...config.background,
          workItems: [newItem, ...currentWork],
        },
      });

      onSaveCustomImage?.({
        id: newItem.id,
        title: newItem.title,
        type: newItem.type,
        url: newItem.url,
        thumbnailUrl: newItem.thumbnailUrl,
        source: 'clipboard',
        isCustom: true,
        isPreservedAfterReset: false,
        hasResetCustoms: false,
        addedAt: newItem.addedAt || new Date().toISOString(),
      });

      setCustomBgUrl('');
      setCustomBgTitle('');
      setClipboardFeedback('Pasted from clipboard & saved to cloud library!');
      setTimeout(() => setClipboardFeedback(null), 4000);
    } catch (err) {
      console.warn('Clipboard read error:', err);
      setClipboardFeedback('Could not read clipboard. Please paste URL manually.');
      setTimeout(() => setClipboardFeedback(null), 4000);
    }
  };

  const handleTogglePlaylistItem = (item: MediaItem) => {
    const currentList = config.background?.workItems || [];
    const exists = currentList.some((i) => i.id === item.id);
    let updated: MediaItem[];
    if (exists) {
      if (currentList.length === 1) return; // Keep at least one
      updated = currentList.filter((i) => i.id !== item.id);
    } else {
      updated = [...currentList, item];
    }
    onChangeConfig({
      ...config,
      background: { ...config.background, workItems: updated },
    });
  };

  const handleSelectBreakBg = (item: MediaItem) => {
    onChangeConfig({
      ...config,
      background: { ...config.background, breakItems: [item] },
    });
  };

  const handleSetAsActiveWork = (item: MediaItem | CustomImageRecord) => {
    const mediaItem: MediaItem = {
      id: item.id,
      title: item.title,
      type: item.type,
      url: item.url,
      thumbnailUrl: item.thumbnailUrl,
      source: item.source,
      isCustom: true,
      duration: 1800,
    };
    const rest = (config.background?.workItems || []).filter((i) => i.id !== item.id);
    onChangeConfig({
      ...config,
      background: {
        ...config.background,
        workItems: [mediaItem, ...rest],
      },
    });
    setClipboardFeedback(`Set "${item.title}" as active work wallpaper!`);
    setTimeout(() => setClipboardFeedback(null), 3000);
  };

  const handleSetAsBreakBgOnly = (item: MediaItem | CustomImageRecord) => {
    const mediaItem: MediaItem = {
      id: item.id,
      title: item.title,
      type: item.type,
      url: item.url,
      thumbnailUrl: item.thumbnailUrl,
      source: item.source,
      isCustom: true,
      duration: 1800,
    };
    onChangeConfig({
      ...config,
      background: {
        ...config.background,
        breakItems: [mediaItem],
      },
    });
    setClipboardFeedback(`Set "${item.title}" as break wallpaper!`);
    setTimeout(() => setClipboardFeedback(null), 3000);
  };

  const handleDeleteSavedImage = (item: MediaItem | CustomImageRecord) => {
    const updatedWork = (config.background?.workItems || []).filter((i) => i.id !== item.id);
    const updatedBreak = (config.background?.breakItems || []).filter((i) => i.id !== item.id);
    onChangeConfig({
      ...config,
      background: {
        ...config.background,
        workItems: updatedWork.length > 0 ? updatedWork : [PRESET_BACKGROUNDS[0]],
        breakItems: updatedBreak.length > 0 ? updatedBreak : [PRESET_BREAK_BACKGROUNDS[0]],
      },
    });
    onDeleteCustomImage?.(item.id);
    setClipboardFeedback(`Removed "${item.title}" from library.`);
    setTimeout(() => setClipboardFeedback(null), 3000);
  };

  const handleMethodTypeChange = (type: FocusMethodType) => {
    let work = 1500;
    let brk = 300;
    let lBrk = 900;
    let cycles = 4;

    if (type === 'deepwork') {
      work = 5400; // 90 min
      brk = 600; // 10 min
      lBrk = 1800; // 30 min
      cycles = 2;
    } else if (type === '52-17') {
      work = 3120; // 52 min
      brk = 1020; // 17 min
      lBrk = 1800;
      cycles = 3;
    } else if (type === 'flowtime') {
      work = 0;
      brk = 300;
      lBrk = 900;
      cycles = 1;
    }

    onChangeConfig({
      ...config,
      method: {
        ...config.method,
        type,
        workDuration: work,
        breakDuration: brk,
        longBreakDuration: lBrk,
        cyclesBeforeLongBreak: cycles,
      },
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/60 backdrop-blur-sm transition-all duration-300 pointer-events-auto">
      <div className="w-full max-w-md bg-slate-900/95 border-l border-slate-800 backdrop-blur-2xl h-full flex flex-col p-6 shadow-2xl overflow-hidden text-slate-100 animate-in slide-in-from-right duration-300">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-indigo-400" />
            <div>
              <h2 className="text-base font-bold tracking-tight text-white leading-tight">Workspace Customizer</h2>
              <p className="text-[11px] text-slate-400">Atmosphere, Audio, Timer & Layouts</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Workspace Quick Hub Actions Bar */}
        <div className="mt-3 p-2 bg-slate-950/80 rounded-2xl border border-slate-800/80 flex items-center justify-between gap-1 overflow-x-auto scrollbar-none">
          <button
            type="button"
            onClick={() => onOpenTemplates?.()}
            className="flex-1 py-1.5 px-2 rounded-xl bg-slate-900/90 hover:bg-indigo-600/30 text-slate-300 hover:text-indigo-200 border border-slate-800 hover:border-indigo-500/30 text-[11px] font-semibold transition flex items-center justify-center gap-1.5 shrink-0"
            title="Browse Workspace Templates"
          >
            <Layout className="w-3.5 h-3.5 text-indigo-400" />
            <span>Templates</span>
          </button>

          <button
            type="button"
            onClick={() => onOpenMarketplace?.()}
            className="flex-1 py-1.5 px-2 rounded-xl bg-slate-900/90 hover:bg-rose-600/30 text-slate-300 hover:text-rose-200 border border-slate-800 hover:border-rose-500/30 text-[11px] font-semibold transition flex items-center justify-center gap-1.5 shrink-0"
            title="Explore Themes & Wallpapers"
          >
            <Store className="w-3.5 h-3.5 text-rose-400" />
            <span>Explore</span>
          </button>

          <button
            type="button"
            onClick={() => onOpenRooms?.()}
            className="flex-1 py-1.5 px-2 rounded-xl bg-slate-900/90 hover:bg-teal-600/30 text-slate-300 hover:text-teal-200 border border-slate-800 hover:border-teal-500/30 text-[11px] font-semibold transition flex items-center justify-center gap-1.5 shrink-0"
            title="Join Co-working Room"
          >
            <Users className="w-3.5 h-3.5 text-teal-400" />
            <span>Rooms</span>
          </button>

          <button
            type="button"
            onClick={() => onOpenStats?.()}
            className="flex-1 py-1.5 px-2 rounded-xl bg-slate-900/90 hover:bg-amber-600/30 text-slate-300 hover:text-amber-200 border border-slate-800 hover:border-amber-500/30 text-[11px] font-semibold transition flex items-center justify-center gap-1.5 shrink-0"
            title="Streak & Focus History"
          >
            <BarChart2 className="w-3.5 h-3.5 text-amber-400" />
            <span>Stats</span>
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="grid grid-cols-4 gap-1.5 p-1 bg-slate-950 rounded-2xl border border-slate-800/80 my-4 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('background')}
            className={`py-2 px-1 rounded-xl transition flex flex-col items-center gap-1 ${
              activeTab === 'background' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Image className="w-3.5 h-3.5" />
            <span>Visuals</span>
          </button>
          <button
            onClick={() => setActiveTab('audio')}
            className={`py-2 px-1 rounded-xl transition flex flex-col items-center gap-1 ${
              activeTab === 'audio' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Music className="w-3.5 h-3.5" />
            <span>Audio</span>
          </button>
          <button
            onClick={() => setActiveTab('method')}
            className={`py-2 px-1 rounded-xl transition flex flex-col items-center gap-1 ${
              activeTab === 'method' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Timer</span>
          </button>
          <button
            onClick={() => setActiveTab('appearance')}
            className={`py-2 px-1 rounded-xl transition flex flex-col items-center gap-1 ${
              activeTab === 'appearance' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Palette className="w-3.5 h-3.5" />
            <span>UI & Style</span>
          </button>
        </div>

        {/* TAB 1: Visuals & Atmosphere */}
        {activeTab === 'background' && (() => {
          // Collect all custom and clipboard images
          const customMap = new Map<string, CustomImageRecord | MediaItem>();
          savedCustomImages.forEach((img) => customMap.set(img.id, img));
          (config.background?.workItems || []).forEach((item) => {
            if (item.isCustom || item.source || item.id.startsWith('custom-') || item.id.startsWith('clipboard-')) {
              if (!customMap.has(item.id)) customMap.set(item.id, item);
            }
          });
          (config.background?.breakItems || []).forEach((item) => {
            if (item.isCustom || item.source || item.id.startsWith('custom-') || item.id.startsWith('clipboard-')) {
              if (!customMap.has(item.id)) customMap.set(item.id, item);
            }
          });
          const allCustomImages = Array.from(customMap.values());

          return (
            <div className="flex-1 overflow-y-auto space-y-6 pr-1 custom-scrollbar">
              
              {/* Feedback toast inside drawer */}
              {clipboardFeedback && (
                <div className="p-3 bg-indigo-500/10 border border-indigo-500/30 rounded-2xl flex items-center gap-2 text-xs text-indigo-300 animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0" />
                  <span className="truncate">{clipboardFeedback}</span>
                </div>
              )}

              {/* Background Dimmer & Blur Sliders */}
              <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800 space-y-4">
                <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                  <span>Atmosphere Adjustments</span>
                </h3>

                <div>
                  <div className="flex justify-between text-xs text-slate-300 mb-1.5">
                    <span>Background Brightness</span>
                    <span className="font-mono text-indigo-400">
                      {Math.round((currentAppearance.backgroundBrightness ?? 0.8) * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.15"
                    max="1"
                    step="0.05"
                    value={currentAppearance.backgroundBrightness ?? 0.8}
                    onChange={(e) => updateAppearance({ backgroundBrightness: parseFloat(e.target.value) })}
                    className="w-full accent-indigo-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs text-slate-300 mb-1.5">
                    <span>Backdrop Blur</span>
                    <span className="font-mono text-indigo-400">
                      {currentAppearance.backgroundBlur ?? 0}px
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="25"
                    step="1"
                    value={currentAppearance.backgroundBlur ?? 0}
                    onChange={(e) => updateAppearance({ backgroundBlur: parseInt(e.target.value) })}
                    className="w-full accent-indigo-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                  />
                </div>

                <div>
                  <span className="block text-xs text-slate-300 mb-2">Vignette & Ambient Tint</span>
                  <div className="grid grid-cols-4 gap-1.5 text-xs">
                    {[
                      { id: 'dark', label: 'Dark' },
                      { id: 'amber', label: 'Warm' },
                      { id: 'blue', label: 'Cool' },
                      { id: 'none', label: 'Clear' },
                    ].map((tint) => (
                      <button
                        key={tint.id}
                        onClick={() => updateAppearance({ vignetteTint: tint.id as any })}
                        className={`py-1.5 rounded-xl border text-center font-medium transition ${
                          currentAppearance.vignetteTint === tint.id
                            ? 'bg-indigo-600 border-indigo-500 text-white'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        {tint.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Custom Wallpaper URL & Clipboard Input */}
              <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                    <span>Add Custom Wallpaper</span>
                  </h3>
                  <button
                    type="button"
                    onClick={handlePasteFromClipboard}
                    className="py-1 px-2.5 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 rounded-xl text-[11px] font-semibold transition flex items-center gap-1.5 shadow-sm"
                    title="Paste direct image link from clipboard"
                  >
                    <ClipboardPaste className="w-3 h-3" />
                    <span>Paste Clipboard</span>
                  </button>
                </div>

                <form onSubmit={handleAddCustomWallpaper} className="space-y-2.5">
                  <input
                    type="text"
                    placeholder="Title (e.g. Kyoto Midnight, Studio Lo-Fi)"
                    value={customBgTitle}
                    onChange={(e) => setCustomBgTitle(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-500 outline-none focus:border-indigo-500"
                  />
                  <input
                    type="url"
                    placeholder="Image URL / GIF / Direct MP4 URL..."
                    value={customBgUrl}
                    onChange={(e) => setCustomBgUrl(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-500 outline-none focus:border-indigo-500"
                  />
                  <div className="flex gap-2">
                    <select
                      value={customBgType}
                      onChange={(e) => setCustomBgType(e.target.value as any)}
                      className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-300 outline-none"
                    >
                      <option value="image">Image / GIF</option>
                      <option value="video">Video (MP4)</option>
                    </select>
                    <button
                      type="submit"
                      disabled={!customBgUrl.trim()}
                      className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold text-xs py-1.5 px-3 rounded-xl transition flex items-center justify-center gap-1.5 shadow-md shadow-indigo-900/20"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Save to Cloud Library</span>
                    </button>
                  </div>
                </form>

                <div className="pt-1 flex items-center gap-1.5 text-[11px] text-slate-400">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Images are retained in cloud storage & preserved across resets.</span>
                </div>
              </div>

              {/* Saved Custom & Clipboard Images Library */}
              {allCustomImages.length > 0 && (
                <div className="bg-slate-950/80 p-4 rounded-2xl border border-indigo-500/20 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-indigo-400" />
                      <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                        My Saved & Clipboard Wallpapers ({allCustomImages.length})
                      </h3>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-2.5">
                    {allCustomImages.map((item) => {
                      const isWorkActive = (config.background?.workItems || []).some((i) => i.id === item.id);
                      const isBreakActive = (config.background?.breakItems || []).some((i) => i.id === item.id);
                      const isClipboard = item.source === 'clipboard' || item.id.startsWith('clipboard-');
                      const isPreserved = item.isPreservedAfterReset || item.hasResetCustoms;

                      return (
                        <div
                          key={item.id}
                          className={`p-2.5 rounded-2xl border transition bg-slate-900/90 flex flex-col gap-2 ${
                            isWorkActive
                              ? 'border-indigo-500 ring-1 ring-indigo-500/30'
                              : isBreakActive
                              ? 'border-amber-500 ring-1 ring-amber-500/30'
                              : 'border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-16 h-12 rounded-xl overflow-hidden bg-slate-950 shrink-0 border border-slate-800 relative">
                              {item.type === 'video' ? (
                                <div className="w-full h-full flex items-center justify-center bg-slate-900 text-slate-400">
                                  <Film className="w-5 h-5" />
                                </div>
                              ) : (
                                <img
                                  src={item.thumbnailUrl || item.url}
                                  alt={item.title}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    (e.target as any).src = PRESET_BACKGROUNDS[0].url;
                                  }}
                                />
                              )}
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-xs font-bold text-white truncate max-w-[140px]">
                                  {item.title}
                                </span>

                                {/* Source Badge */}
                                {isClipboard ? (
                                  <span className="px-1.5 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 text-[9px] font-semibold flex items-center gap-1">
                                    <Clipboard className="w-2.5 h-2.5" />
                                    <span>Clipboard</span>
                                  </span>
                                ) : (
                                  <span className="px-1.5 py-0.5 rounded-md bg-slate-800 text-slate-300 text-[9px] font-semibold flex items-center gap-1">
                                    <Globe className="w-2.5 h-2.5" />
                                    <span>Web URL</span>
                                  </span>
                                )}

                                {/* Reset-Preserved Badge */}
                                {isPreserved && (
                                  <span className="px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 text-[9px] font-semibold flex items-center gap-1">
                                    <ShieldCheck className="w-2.5 h-2.5" />
                                    <span>Reset-Preserved</span>
                                  </span>
                                )}
                              </div>

                              <p className="text-[10px] text-slate-400 truncate mt-0.5 font-mono">
                                {item.url}
                              </p>
                            </div>
                          </div>

                          {/* Quick Actions */}
                          <div className="flex items-center gap-1.5 pt-1 border-t border-slate-800/80">
                            <button
                              type="button"
                              onClick={() => handleSetAsActiveWork(item)}
                              className={`flex-1 py-1 px-2 rounded-lg text-[11px] font-semibold transition flex items-center justify-center gap-1 ${
                                isWorkActive
                                  ? 'bg-indigo-600 text-white'
                                  : 'bg-slate-800/80 hover:bg-indigo-950/40 text-slate-300 hover:text-indigo-200'
                              }`}
                            >
                              <Check className="w-3 h-3" />
                              <span>{isWorkActive ? 'Active Work' : 'Set as Work'}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleSetAsBreakBgOnly(item)}
                              className={`py-1 px-2.5 rounded-lg text-[11px] font-semibold transition flex items-center justify-center gap-1 ${
                                isBreakActive
                                  ? 'bg-amber-500 text-slate-950'
                                  : 'bg-slate-800/80 hover:bg-amber-950/40 text-slate-300 hover:text-amber-200'
                              }`}
                            >
                              <span>{isBreakActive ? 'Break Bg ✓' : 'Break Bg'}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleTogglePlaylistItem(item as MediaItem)}
                              className="py-1 px-2 rounded-lg text-[11px] font-medium bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition"
                              title="Toggle in Playlist"
                            >
                              <Layers className="w-3 h-3" />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteSavedImage(item)}
                              className="py-1 px-2 rounded-lg text-[11px] font-medium bg-slate-800/80 hover:bg-rose-950/40 text-slate-400 hover:text-rose-300 transition"
                              title="Remove from workspace"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Presets Gallery */}
              <div>
                <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-3">
                  Focus Wallpaper Presets
                </h3>
                <div className="grid grid-cols-2 gap-2.5">
                  {PRESET_BACKGROUNDS.map((item) => {
                    const isSelected = (config.background?.workItems || []).some((i) => i.id === item.id);
                    return (
                      <div
                        key={item.id}
                        onClick={() => handleTogglePlaylistItem(item)}
                        className={`relative rounded-2xl overflow-hidden cursor-pointer border-2 transition group ${
                          isSelected ? 'border-indigo-500 ring-2 ring-indigo-500/30' : 'border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <img src={item.thumbnailUrl || item.url} alt={item.title} className="w-full h-24 object-cover group-hover:scale-105 transition duration-300" />
                        <div className="absolute inset-0 bg-slate-950/40 p-2.5 flex flex-col justify-between">
                          {isSelected && (
                            <span className="bg-indigo-600 text-white p-1 rounded-full w-5 h-5 flex items-center justify-center self-end shadow">
                              <Check className="w-3.5 h-3.5" />
                            </span>
                          )}
                          <span className="text-[11px] font-bold text-white drop-shadow truncate mt-auto">
                            {item.title}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Break Background Selection */}
              <div className="border-t border-slate-800 pt-4">
                <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-3">
                  Auto Break Wallpaper (Rest Mode)
                </h3>
                <div className="grid grid-cols-2 gap-2.5">
                  {PRESET_BREAK_BACKGROUNDS.map((item) => {
                    const isSelected = (config.background?.breakItems || []).some((i) => i.id === item.id);
                    return (
                      <div
                        key={item.id}
                        onClick={() => handleSelectBreakBg(item)}
                        className={`relative rounded-2xl overflow-hidden cursor-pointer border-2 transition group ${
                          isSelected ? 'border-amber-500 ring-2 ring-amber-500/30' : 'border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <img src={item.thumbnailUrl || item.url} alt={item.title} className="w-full h-24 object-cover group-hover:scale-105 transition duration-300" />
                        <div className="absolute inset-0 bg-slate-950/40 p-2.5 flex flex-col justify-between">
                          {isSelected && (
                            <span className="bg-amber-500 text-slate-950 p-1 rounded-full w-5 h-5 flex items-center justify-center self-end shadow font-bold">
                              <Check className="w-3.5 h-3.5" />
                            </span>
                          )}
                          <span className="text-[11px] font-bold text-white drop-shadow truncate mt-auto">
                            {item.title}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          );
        })()}

        {/* TAB 2: Audio & Ambient Mixer */}
        {activeTab === 'audio' && (() => {
          const currentAmbientList: AmbientTrack[] =
            config.audio?.ambientPlaylist?.tracks || config.audio?.ambientTracks || [];

          const toggleAmbient = (track: AmbientTrack) => {
            const exists = currentAmbientList.some((t) => t.id === track.id);
            let updated: AmbientTrack[];
            if (exists) {
              updated = currentAmbientList.map((t) => (t.id === track.id ? { ...t, active: !t.active } : t));
            } else {
              updated = [...currentAmbientList, { ...track, active: true }];
            }
            onChangeConfig({
              ...config,
              audio: {
                ...config.audio,
                ambientTracks: updated,
                ambientPlaylist: {
                  tracks: updated,
                  shuffleEnabled: config.audio?.ambientPlaylist?.shuffleEnabled ?? false,
                },
              },
            });
          };

          const removeAmbient = (id: string) => {
            const updated = currentAmbientList.filter((t) => t.id !== id);
            onChangeConfig({
              ...config,
              audio: {
                ...config.audio,
                ambientTracks: updated,
                ambientPlaylist: {
                  tracks: updated,
                  shuffleEnabled: config.audio?.ambientPlaylist?.shuffleEnabled ?? false,
                },
              },
            });
          };

          const handleTestChime = (sound: ChimeType) => {
            audioSynth.playChime(sound);
          };

          return (
            <div className="flex-1 overflow-y-auto space-y-6 pr-1 custom-scrollbar">
              
              {/* Notification Chime Customizer */}
              <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800 space-y-3">
                <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-indigo-400">
                    <Bell className="w-3.5 h-3.5" /> Timer End Chime Sound
                  </span>
                </h3>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {[
                    { id: 'zen-bell', name: 'Zen Bell', desc: 'Serene sine chime' },
                    { id: 'bowl', name: 'Singing Bowl', desc: 'Tibetan 432Hz' },
                    { id: 'marimba', name: 'Warm Marimba', desc: 'Wooden arpeggio' },
                    { id: 'modern', name: 'Crisp Modern', desc: 'Clean dual tone' },
                    { id: 'silent', name: 'Mute Chime', desc: 'No sound on finish' },
                  ].map((chime) => (
                    <div
                      key={chime.id}
                      className={`p-2.5 rounded-xl border flex flex-col justify-between transition cursor-pointer ${
                        currentAppearance.chimeSound === chime.id
                          ? 'bg-indigo-600/20 border-indigo-500 text-indigo-200'
                          : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                      onClick={() => {
                        updateAppearance({ chimeSound: chime.id as any });
                        handleTestChime(chime.id as any);
                      }}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-xs">{chime.name}</span>
                        {currentAppearance.chimeSound === chime.id && (
                          <Check className="w-3.5 h-3.5 text-indigo-400" />
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400">{chime.desc}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Ambient Sound Queue Section */}
              <div>
                <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-3 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-amber-300">
                    <Layers className="w-3.5 h-3.5" /> Ambient Sound Queue
                  </span>
                  <span className="text-[10px] text-amber-400">
                    {currentAmbientList.filter((t) => t.active).length} Active
                  </span>
                </h3>

                {/* Current Active Queue */}
                <div className="space-y-2 mb-4">
                  {currentAmbientList.length === 0 ? (
                    <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800 text-center text-xs text-slate-400">
                      No ambient tracks added yet. Select from below to layer your atmosphere.
                    </div>
                  ) : (
                    currentAmbientList.map((track) => (
                      <div
                        key={track.id}
                        className={`p-2.5 rounded-xl border flex items-center justify-between transition ${
                          track.active
                            ? 'bg-amber-500/10 border-amber-500/40 text-amber-200'
                            : 'bg-slate-950/60 border-slate-800 text-slate-400'
                        }`}
                      >
                        <button
                          onClick={() => toggleAmbient(track)}
                          className="text-left flex-1 font-semibold text-xs flex items-center gap-2"
                        >
                          <Volume2 className="w-3.5 h-3.5" />
                          <span>{track.name}</span>
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                              track.active ? 'bg-amber-400/20 text-amber-300' : 'bg-slate-800 text-slate-500'
                            }`}
                          >
                            {track.active ? 'Active' : 'Muted'}
                          </span>
                        </button>

                        <button
                          onClick={() => removeAmbient(track.id)}
                          className="p-1 text-slate-500 hover:text-rose-400 transition"
                          title="Remove from queue"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>

                {/* Add Available Ambient Sounds */}
                <div className="bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800">
                  <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2.5">
                    Soundscape Library
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {ALL_AVAILABLE_AMBIENT_TRACKS.map((track) => {
                      const inQueue = currentAmbientList.some((t) => t.id === track.id);
                      return (
                        <button
                          key={track.id}
                          onClick={() => toggleAmbient(track)}
                          className={`p-2 rounded-xl border text-left text-xs flex items-center justify-between transition ${
                            inQueue
                              ? 'bg-amber-500/15 border-amber-500/30 text-amber-300 font-medium'
                              : 'bg-slate-900 border-slate-800 hover:border-slate-700 text-slate-300'
                          }`}
                        >
                          <span className="truncate">{track.name}</span>
                          <Plus className="w-3 h-3 opacity-60 flex-shrink-0" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Music Queue Section */}
              <div className="border-t border-slate-800 pt-4">
                <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-3 flex items-center justify-between">
                  <span>Music Tracks</span>
                  <span className="text-[10px] text-indigo-400 font-normal">{PRESET_MUSIC_TRACKS.length} available</span>
                </h3>
                <div className="space-y-2">
                  {PRESET_MUSIC_TRACKS.map((track) => (
                    <div
                      key={track.id}
                      className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl flex items-center justify-between text-xs"
                    >
                      <div>
                        <p className="font-semibold text-slate-200">{track.title}</p>
                        <p className="text-[10px] text-slate-400">{track.artist}</p>
                      </div>
                      <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full uppercase">
                        {track.source}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          );
        })()}

        {/* TAB 3: Timer & Focus Method */}
        {activeTab === 'method' && (
          <div className="flex-1 overflow-y-auto space-y-6 pr-1 custom-scrollbar">
            
            {/* Presets */}
            <div>
              <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-3">
                Focus Regimen Presets
              </h3>
              <div className="grid grid-cols-2 gap-2.5">
                {[
                  { id: 'pomodoro', name: 'Pomodoro', desc: '25 min focus / 5 min break' },
                  { id: 'deepwork', name: 'Deep Work', desc: '90 min focus / 10 min break' },
                  { id: '52-17', name: '52/17 Rule', desc: '52 min focus / 17 min break' },
                  { id: 'flowtime', name: 'Flowtime', desc: 'Stopwatch count-up' },
                ].map((m) => (
                  <button
                    key={m.id}
                    onClick={() => handleMethodTypeChange(m.id as FocusMethodType)}
                    className={`p-3 rounded-2xl border text-left transition ${
                      config.method.type === m.id
                        ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300 ring-1 ring-indigo-500/40'
                        : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <p className="font-bold text-xs">{m.name}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{m.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Minute Adjusters */}
            <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800 space-y-4">
              <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                Fine-Tune Custom Durations
              </h3>

              <div>
                <div className="flex justify-between text-xs text-slate-300 mb-1.5">
                  <span>Focus Duration</span>
                  <span className="font-mono text-indigo-400 font-bold">
                    {Math.round(config.method.workDuration / 60)} minutes
                  </span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="120"
                  step="1"
                  value={Math.round(config.method.workDuration / 60)}
                  onChange={(e) =>
                    onChangeConfig({
                      ...config,
                      method: {
                        ...config.method,
                        workDuration: parseInt(e.target.value) * 60,
                      },
                    })
                  }
                  className="w-full accent-indigo-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs text-slate-300 mb-1.5">
                  <span>Short Break Duration</span>
                  <span className="font-mono text-emerald-400 font-bold">
                    {Math.round(config.method.breakDuration / 60)} minutes
                  </span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="30"
                  step="1"
                  value={Math.round(config.method.breakDuration / 60)}
                  onChange={(e) =>
                    onChangeConfig({
                      ...config,
                      method: {
                        ...config.method,
                        breakDuration: parseInt(e.target.value) * 60,
                      },
                    })
                  }
                  className="w-full accent-emerald-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs text-slate-300 mb-1.5">
                  <span>Long Break Duration</span>
                  <span className="font-mono text-purple-400 font-bold">
                    {Math.round(config.method.longBreakDuration / 60)} minutes
                  </span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="60"
                  step="5"
                  value={Math.round(config.method.longBreakDuration / 60)}
                  onChange={(e) =>
                    onChangeConfig({
                      ...config,
                      method: {
                        ...config.method,
                        longBreakDuration: parseInt(e.target.value) * 60,
                      },
                    })
                  }
                  className="w-full accent-purple-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs text-slate-300 mb-1.5">
                  <span>Cycles before Long Break</span>
                  <span className="font-mono text-amber-400 font-bold">
                    {config.method.cyclesBeforeLongBreak} cycles
                  </span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="8"
                  step="1"
                  value={config.method.cyclesBeforeLongBreak}
                  onChange={(e) =>
                    onChangeConfig({
                      ...config,
                      method: {
                        ...config.method,
                        cyclesBeforeLongBreak: parseInt(e.target.value),
                      },
                    })
                  }
                  className="w-full accent-amber-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                />
              </div>
            </div>

            {/* Custom State Labels */}
            <div className="border-t border-slate-800 pt-4">
              <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-3">
                Custom State Labels
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Focus State Title</label>
                  <input
                    type="text"
                    value={config.method.stateLabels.focus}
                    onChange={(e) =>
                      onChangeConfig({
                        ...config,
                        method: {
                          ...config.method,
                          stateLabels: { ...config.method.stateLabels, focus: e.target.value },
                        },
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Break State Title</label>
                  <input
                    type="text"
                    value={config.method.stateLabels.break}
                    onChange={(e) =>
                      onChangeConfig({
                        ...config,
                        method: {
                          ...config.method,
                          stateLabels: { ...config.method.stateLabels, break: e.target.value },
                        },
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>

          </div>
        )}

        {/* TAB 4: UI & Minimalist Workspace Customization */}
        {activeTab === 'appearance' && (
          <div className="flex-1 overflow-y-auto space-y-6 pr-1 custom-scrollbar">
            
            {/* ONE-CLICK WORKSPACE PRESETS */}
            <div>
              <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-2.5 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                  Instant Workspace Aesthetics
                </span>
                <span className="text-[10px] text-slate-400">1-click presets</span>
              </h3>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[
                  {
                    id: 'cyberdeck_hud',
                    name: 'Cyber HUD',
                    tag: 'Neon Sci-Fi',
                    color: 'from-cyan-500/20 to-blue-500/20 border-cyan-500/40 text-cyan-300',
                    preset: {
                      clockStyle: 'hud' as ClockStyle,
                      fontStyle: 'cyber' as FontTheme,
                      timerAccentColor: 'cyan' as AccentColor,
                      timerBorder: 'glow' as WidgetBorder,
                      timerRadius: 'sharp' as WidgetRadius,
                      musicLayout: 'compact' as MusicLayout,
                      musicVisualizer: 'bars' as MusicVisualizer,
                      musicBorder: 'glow' as WidgetBorder,
                      musicRadius: 'sharp' as WidgetRadius,
                      cardOpacity: 0.85,
                      timerTransparentGhost: false,
                    }
                  },
                  {
                    id: 'ghost_minimal',
                    name: 'Pure Ghost',
                    tag: '0% See-Through',
                    color: 'from-slate-800/40 to-slate-900/40 border-white/30 text-white',
                    preset: {
                      clockStyle: 'minimal' as ClockStyle,
                      fontStyle: 'sans' as FontTheme,
                      timerAccentColor: 'monochrome' as AccentColor,
                      timerBorder: 'subtle' as WidgetBorder,
                      timerRadius: 'super' as WidgetRadius,
                      timerTransparentGhost: true,
                      musicTransparentGhost: true,
                      musicLayout: 'pill' as MusicLayout,
                      musicVisualizer: 'pulse' as MusicVisualizer,
                      cardOpacity: 0,
                    }
                  },
                  {
                    id: 'zen_ring',
                    name: 'Zen Radial',
                    tag: 'Focus Loop',
                    color: 'from-emerald-500/20 to-teal-500/20 border-emerald-500/40 text-emerald-300',
                    preset: {
                      clockStyle: 'ring' as ClockStyle,
                      fontStyle: 'sans' as FontTheme,
                      timerAccentColor: 'emerald' as AccentColor,
                      timerBorder: 'subtle' as WidgetBorder,
                      timerRadius: 'super' as WidgetRadius,
                      timerTransparentGhost: false,
                      musicLayout: 'standard' as MusicLayout,
                      musicVisualizer: 'wave' as MusicVisualizer,
                      cardOpacity: 0.85,
                    }
                  },
                  {
                    id: 'retro_studio',
                    name: 'Retro LCD',
                    tag: 'Amber Studio',
                    color: 'from-amber-500/20 to-orange-500/20 border-amber-500/40 text-amber-300',
                    preset: {
                      clockStyle: 'lcd' as ClockStyle,
                      fontStyle: 'digital' as FontTheme,
                      timerAccentColor: 'amber' as AccentColor,
                      timerBorder: 'double' as WidgetBorder,
                      timerRadius: 'rounded' as WidgetRadius,
                      timerTransparentGhost: false,
                      musicLayout: 'mixer_deck' as MusicLayout,
                      musicVisualizer: 'bars' as MusicVisualizer,
                      cardOpacity: 0.95,
                    }
                  },
                  {
                    id: 'lofi_night',
                    name: 'Lo-Fi Vinyl',
                    tag: 'Cozy Twilight',
                    color: 'from-rose-500/20 to-purple-500/20 border-rose-500/40 text-rose-300',
                    preset: {
                      clockStyle: 'digital' as ClockStyle,
                      fontStyle: 'serif' as FontTheme,
                      timerAccentColor: 'rose' as AccentColor,
                      timerBorder: 'glow' as WidgetBorder,
                      timerRadius: 'pill' as WidgetRadius,
                      timerTransparentGhost: false,
                      musicLayout: 'standard' as MusicLayout,
                      musicVisualizer: 'vinyl' as MusicVisualizer,
                      cardOpacity: 0.85,
                    }
                  },
                  {
                    id: 'oled_mono',
                    name: 'OLED Mono',
                    tag: 'Pitch Black',
                    color: 'from-slate-900 to-black border-slate-700 text-slate-200',
                    preset: {
                      clockStyle: 'digital' as ClockStyle,
                      fontStyle: 'mono' as FontTheme,
                      timerAccentColor: 'monochrome' as AccentColor,
                      timerBorder: 'none' as WidgetBorder,
                      timerRadius: 'super' as WidgetRadius,
                      timerTransparentGhost: false,
                      musicLayout: 'compact' as MusicLayout,
                      musicVisualizer: 'bars' as MusicVisualizer,
                      cardOpacity: 0.98,
                    }
                  },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => updateAppearance(item.preset)}
                    className={`p-2.5 rounded-2xl border text-left bg-gradient-to-br transition hover:scale-[1.02] active:scale-95 ${item.color}`}
                  >
                    <p className="font-bold text-xs">{item.name}</p>
                    <p className="text-[10px] opacity-80 mt-0.5">{item.tag}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* SECTION 1: TIMER CUSTOMIZATION */}
            <div
              onMouseEnter={() => onCustomizingPanelChange?.('timer')}
              onFocus={() => onCustomizingPanelChange?.('timer')}
              className="border-t border-slate-800 pt-4 space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Timer Widget Customization</span>
                </h3>
                <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-500/30">
                  Live Highlight
                </span>
              </div>

              {/* Timer Layout Style */}
              <div>
                <label className="text-[11px] text-slate-400 block mb-1.5 font-medium">Clock Display Layout</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'digital', name: 'Digital Classic', desc: 'Sleek numbers' },
                    { id: 'ring', name: 'Radial Ring', desc: 'Progress circle' },
                    { id: 'minimal', name: 'Minimalist', desc: 'Pure typography' },
                    { id: 'lcd', name: 'Retro LCD', desc: 'Segment & scanline' },
                    { id: 'hud', name: 'Cyber HUD', desc: 'Sci-fi telemetry' },
                    { id: 'compact', name: 'Micro Bar', desc: 'Horizontal slim' },
                  ].map((s) => (
                    <button
                      key={s.id}
                      onClick={() => updateAppearance({ clockStyle: s.id as ClockStyle })}
                      className={`p-2.5 rounded-xl border text-left transition ${
                        currentAppearance.clockStyle === s.id
                          ? 'bg-indigo-600/20 border-indigo-500 text-white ring-1 ring-indigo-500/40'
                          : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      <p className="font-bold text-xs">{s.name}</p>
                      <p className="text-[9px] text-slate-500 mt-0.5">{s.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Timer Custom Color & Gradients */}
              <div className="bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800 space-y-3">
                <ColorPickerControl
                  label="Timer Color & Dynamic Gradients"
                  value={currentAppearance.timerCustomColor || '#6366f1'}
                  glowIntensity={currentAppearance.timerGlowIntensity ?? 50}
                  showGlowControl={true}
                  onChange={(c, g) =>
                    updateAppearance({
                      timerCustomColor: c,
                      ...(g !== undefined ? { timerGlowIntensity: g } : {}),
                    })
                  }
                  allowGradients={true}
                />
              </div>

              {/* Timer Background Glass Tint */}
              <div className="bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800 space-y-3">
                <ColorPickerControl
                  label="Timer Card Tint Color"
                  value={currentAppearance.timerBgTint || '#0f172a'}
                  onChange={(c) => updateAppearance({ timerBgTint: c })}
                  allowGradients={false}
                />
              </div>

              {/* Timer Size & Corner Radius */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1.5 font-medium">Timer Widget Size</label>
                  <select
                    value={currentAppearance.timerSize || 'normal'}
                    onChange={(e) => updateAppearance({ timerSize: e.target.value as WidgetSize })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:border-indigo-500"
                  >
                    <option value="compact">Compact (Small)</option>
                    <option value="normal">Normal (Standard)</option>
                    <option value="large">Large (Expanded)</option>
                    <option value="hero">Hero Studio Display</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] text-slate-400 block mb-1.5 font-medium">Border Style</label>
                  <select
                    value={currentAppearance.timerBorder || 'subtle'}
                    onChange={(e) => updateAppearance({ timerBorder: e.target.value as WidgetBorder })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:border-indigo-500"
                  >
                    <option value="subtle">Subtle Hairline</option>
                    <option value="glow">Neon Aura Glow</option>
                    <option value="double">Double Glass Border</option>
                    <option value="dashed">Tech Dashed Edge</option>
                    <option value="none">No Border (Floating)</option>
                  </select>
                </div>
              </div>

              {/* Corner Radius & Blur */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1.5 font-medium">Corner Curvature</label>
                  <select
                    value={currentAppearance.timerRadius || 'super'}
                    onChange={(e) => updateAppearance({ timerRadius: e.target.value as WidgetRadius })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:border-indigo-500"
                  >
                    <option value="sharp">Sharp (0px)</option>
                    <option value="rounded">Rounded (16px)</option>
                    <option value="super">Super Rounded (24px)</option>
                    <option value="pill">Pill Capsule</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] text-slate-400 block mb-1.5 font-medium">Glass Frosted Blur</label>
                  <select
                    value={currentAppearance.timerGlassBlur || 'high'}
                    onChange={(e) => updateAppearance({ timerGlassBlur: e.target.value as any })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:border-indigo-500"
                  >
                    <option value="none">None (Crisp)</option>
                    <option value="low">Low Blur (4px)</option>
                    <option value="medium">Medium Blur (12px)</option>
                    <option value="high">High Frosted (24px)</option>
                    <option value="ultra">Ultra Deep Glass (40px)</option>
                  </select>
                </div>
              </div>

              {/* Pure Ghost Mode Toggle */}
              <div
                onClick={() => updateAppearance({ timerTransparentGhost: !currentAppearance.timerTransparentGhost })}
                className="p-3 bg-slate-950/60 border border-slate-800 rounded-2xl flex items-center justify-between cursor-pointer hover:border-slate-700 transition"
              >
                <div>
                  <p className="text-xs font-semibold text-slate-200">Timer Pure Ghost Mode</p>
                  <p className="text-[10px] text-slate-400">0% background opacity for ultra-clean floating typography</p>
                </div>
                <div
                  className={`w-10 h-5 rounded-full transition flex items-center px-0.5 ${
                    currentAppearance.timerTransparentGhost ? 'bg-indigo-600 justify-end' : 'bg-slate-800 justify-start'
                  }`}
                >
                  <div className="w-4 h-4 rounded-full bg-white shadow-md" />
                </div>
              </div>

            </div>

            {/* SECTION 2: MUSIC & AUDIO UI CUSTOMIZATION */}
            <div
              onMouseEnter={() => onCustomizingPanelChange?.('music')}
              onFocus={() => onCustomizingPanelChange?.('music')}
              className="border-t border-slate-800 pt-4 space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                  <Music className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Music Player & Audio UI</span>
                </h3>
                <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-500/30">
                  Live Highlight
                </span>
              </div>

              {/* Music Player Layout */}
              <div>
                <label className="text-[11px] text-slate-400 block mb-1.5 font-medium">Player Layout Mode</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'standard', name: 'Standard Deck', desc: 'Full controls' },
                    { id: 'compact', name: 'Compact Bar', desc: 'Micro width' },
                    { id: 'pill', name: 'Mini Pill', desc: 'Floating capsule' },
                    { id: 'mixer_deck', name: 'Studio Mixer', desc: 'Live layers' },
                  ].map((m) => (
                    <button
                      key={m.id}
                      onClick={() => updateAppearance({ musicLayout: m.id as MusicLayout })}
                      className={`p-2.5 rounded-xl border text-left transition ${
                        (currentAppearance.musicLayout || 'standard') === m.id
                          ? 'bg-indigo-600/20 border-indigo-500 text-white ring-1 ring-indigo-500/40'
                          : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      <p className="font-bold text-xs">{m.name}</p>
                      <p className="text-[9px] text-slate-500 mt-0.5">{m.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Music Custom Color & Gradients */}
              <div className="bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800 space-y-3">
                <ColorPickerControl
                  label="Music Player Color & Gradients"
                  value={currentAppearance.musicCustomColor || '#6366f1'}
                  glowIntensity={currentAppearance.musicGlowIntensity ?? 50}
                  showGlowControl={true}
                  onChange={(c, g) =>
                    updateAppearance({
                      musicCustomColor: c,
                      ...(g !== undefined ? { musicGlowIntensity: g } : {}),
                    })
                  }
                  allowGradients={true}
                />
              </div>

              {/* Music Player Background Tint */}
              <div className="bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800 space-y-3">
                <ColorPickerControl
                  label="Music Dock Background Tint"
                  value={currentAppearance.musicBgTint || '#0f172a'}
                  onChange={(c) => updateAppearance({ musicBgTint: c })}
                  allowGradients={false}
                />
              </div>

              {/* Audio Visualizer Style */}
              <div>
                <label className="text-[11px] text-slate-400 block mb-1.5 font-medium">Animated Audio Visualizer</label>
                <div className="grid grid-cols-5 gap-1.5">
                  {[
                    { id: 'bars', name: 'Spectrum', icon: Activity },
                    { id: 'vinyl', name: 'Vinyl LP', icon: Disc },
                    { id: 'wave', name: 'Waveform', icon: Radio },
                    { id: 'pulse', name: 'Neon Dot', icon: CircleDot },
                    { id: 'none', name: 'Clean', icon: Music },
                  ].map((vis) => {
                    const IconComp = vis.icon;
                    return (
                      <button
                        key={vis.id}
                        onClick={() => updateAppearance({ musicVisualizer: vis.id as MusicVisualizer })}
                        className={`p-2 rounded-xl border text-center transition flex flex-col items-center gap-1 ${
                          (currentAppearance.musicVisualizer || 'bars') === vis.id
                            ? 'bg-indigo-600/20 border-indigo-500 text-white ring-1 ring-indigo-500/40'
                            : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        <IconComp className="w-3.5 h-3.5 text-indigo-400" />
                        <span className="text-[9px] font-medium">{vis.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Music Opacity & Border */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1.5 font-medium">Player Border</label>
                  <select
                    value={currentAppearance.musicBorder || 'subtle'}
                    onChange={(e) => updateAppearance({ musicBorder: e.target.value as WidgetBorder })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:border-indigo-500"
                  >
                    <option value="subtle">Subtle Slate</option>
                    <option value="glow">Neon Glow</option>
                    <option value="double">Double Glass</option>
                    <option value="none">No Border</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] text-slate-400 block mb-1.5 font-medium">Corner Curvature</label>
                  <select
                    value={currentAppearance.musicRadius || 'super'}
                    onChange={(e) => updateAppearance({ musicRadius: e.target.value as WidgetRadius })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:border-indigo-500"
                  >
                    <option value="sharp">Sharp (0px)</option>
                    <option value="rounded">Rounded (16px)</option>
                    <option value="super">Super Rounded (24px)</option>
                    <option value="pill">Pill Capsule</option>
                  </select>
                </div>
              </div>

              {/* Music Ghost Mode Toggle */}
              <div
                onClick={() => updateAppearance({ musicTransparentGhost: !currentAppearance.musicTransparentGhost })}
                className="p-3 bg-slate-950/60 border border-slate-800 rounded-2xl flex items-center justify-between cursor-pointer hover:border-slate-700 transition"
              >
                <div>
                  <p className="text-xs font-semibold text-slate-200">Music Pure Ghost Mode</p>
                  <p className="text-[10px] text-slate-400">See-through floating audio dock</p>
                </div>
                <div
                  className={`w-10 h-5 rounded-full transition flex items-center px-0.5 ${
                    currentAppearance.musicTransparentGhost ? 'bg-indigo-600 justify-end' : 'bg-slate-800 justify-start'
                  }`}
                >
                  <div className="w-4 h-4 rounded-full bg-white shadow-md" />
                </div>
              </div>

            </div>

            {/* SECTION 3: TYPOGRAPHY & GENERAL GLASS */}
            <div className="border-t border-slate-800 pt-4 space-y-4">
              <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <Type className="w-3.5 h-3.5 text-purple-400" />
                <span>Typography & Global Glass</span>
              </h3>

              {/* Typography Font Theme */}
              <div>
                <label className="text-[11px] text-slate-400 block mb-1.5 font-medium">Font Family Aesthetic</label>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
                  {[
                    { id: 'sans', name: 'Sans', font: 'font-sans-custom' },
                    { id: 'mono', name: 'Mono', font: 'font-mono-custom' },
                    { id: 'serif', name: 'Serif', font: 'font-serif-custom' },
                    { id: 'digital', name: 'Digital', font: 'font-digital-custom' },
                    { id: 'cyber', name: 'Cyber', font: 'font-cyber-custom' },
                  ].map((f) => (
                    <button
                      key={f.id}
                      onClick={() => updateAppearance({ fontStyle: f.id as FontTheme })}
                      className={`p-2 rounded-xl border text-center transition ${
                        currentAppearance.fontStyle === f.id
                          ? 'bg-indigo-600/20 border-indigo-500 text-white ring-1 ring-indigo-500/40'
                          : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      <p className={`font-bold text-xs ${f.font}`}>{f.name}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Glass Card Opacity */}
              <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800 space-y-3">
                <div className="flex justify-between text-xs text-slate-300">
                  <span>General Glass Transparency</span>
                  <span className="font-mono text-indigo-400">
                    {Math.round((currentAppearance.cardOpacity ?? 0.85) * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0.10"
                  max="1.00"
                  step="0.05"
                  value={currentAppearance.cardOpacity ?? 0.85}
                  onChange={(e) => updateAppearance({ cardOpacity: parseFloat(e.target.value) })}
                  className="w-full accent-indigo-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                />
              </div>

              {/* Canvas Atmosphere & Tint Control */}
              <div
                onMouseEnter={() => onCustomizingPanelChange?.('canvas')}
                onFocus={() => onCustomizingPanelChange?.('canvas')}
                className="bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800 space-y-3"
              >
                <ColorPickerControl
                  label="Canvas Atmosphere Tint"
                  value={currentAppearance.canvasTint || '#000000'}
                  onChange={(c) => updateAppearance({ canvasTint: c })}
                  allowGradients={true}
                />
              </div>
            </div>

            {/* Widget & Workspace Toggles */}
            <div className="border-t border-slate-800 pt-4">
              <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-3">
                Widget & Element Toggles
              </h3>
              <div className="space-y-2.5">
                {[
                  {
                    key: 'minimalMode',
                    label: 'Minimal Clean Header Mode',
                    desc: 'Streamlines top navigation for minimal distraction',
                    value: currentAppearance.minimalMode ?? false,
                  },
                  {
                    key: 'showProgressBar',
                    label: 'Show Progress Bar',
                    desc: 'Linear progress track beneath countdown',
                    value: currentAppearance.showProgressBar ?? true,
                  },
                  {
                    key: 'showSeconds',
                    label: 'Show Seconds in Countdown',
                    desc: 'Display MM:SS vs MM',
                    value: currentAppearance.showSeconds ?? true,
                  },
                  {
                    key: 'showHotkeyHints',
                    label: 'Show Keyboard Shortcuts Footer',
                    desc: 'Space, Shift+S, Z shortcuts hint',
                    value: currentAppearance.showHotkeyHints ?? true,
                  },
                  {
                    key: 'showMusicBar',
                    label: 'Show Floating Audio Toolbar',
                    desc: 'Compact audio player bar',
                    value: currentAppearance.showMusicBar ?? true,
                  },
                  {
                    key: 'showStreakBadge',
                    label: 'Show Streak Badge in Navbar',
                    desc: 'Daily focus streak counter',
                    value: currentAppearance.showStreakBadge ?? true,
                  },
                ].map((item) => (
                  <div
                    key={item.key}
                    onClick={() => updateAppearance({ [item.key]: !item.value })}
                    className="p-3 bg-slate-950/60 border border-slate-800 rounded-2xl flex items-center justify-between cursor-pointer hover:border-slate-700 transition"
                  >
                    <div>
                      <p className="text-xs font-semibold text-slate-200">{item.label}</p>
                      <p className="text-[10px] text-slate-400">{item.desc}</p>
                    </div>
                    <div
                      className={`w-10 h-5 rounded-full transition flex items-center px-0.5 ${
                        item.value ? 'bg-indigo-600 justify-end' : 'bg-slate-800 justify-start'
                      }`}
                    >
                      <div className="w-4 h-4 rounded-full bg-white shadow-md" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Action Bar in UI Tab */}
            <div className="pt-2 space-y-2">
              {canRollback && (
                <button
                  onClick={() => {
                    onRollback?.();
                    setResetSuccessMessage('Restored previous workspace configuration.');
                    setTimeout(() => setResetSuccessMessage(null), 4000);
                  }}
                  className="w-full py-2.5 px-4 bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 text-amber-300 hover:text-amber-200 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-2 shadow-sm"
                >
                  <Undo2 className="w-3.5 h-3.5" />
                  <span>Rollback to Pre-Reset Version</span>
                </button>
              )}

              <button
                onClick={() => setShowResetConfirm(true)}
                className="w-full py-2.5 px-4 bg-slate-950 border border-slate-800 hover:border-rose-900/40 hover:bg-rose-950/20 text-slate-400 hover:text-rose-200 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset All Workspace Customizations to Defaults</span>
              </button>
            </div>

          </div>
        )}

        {/* Global Pinned Footer: Reset to Default & Rollback System */}
        <div className="mt-4 pt-4 border-t border-slate-800/80 bg-slate-900/90 -mx-6 -mb-6 p-6 space-y-3">
          {resetSuccessMessage && (
            <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-2 text-xs text-emerald-300 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="truncate">{resetSuccessMessage}</span>
            </div>
          )}

          {showResetConfirm ? (
            <div className="p-3.5 bg-slate-950 rounded-2xl border border-rose-500/40 space-y-3 animate-in zoom-in-95 duration-200">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-xs font-bold text-slate-100">Reset Workspace Customizations</p>
                  <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                    Choose how thoroughly you would like to reset your workspace.
                  </p>

                  {/* Reset Mode Selector */}
                  <div className="grid grid-cols-2 gap-2 mt-3">
                    <button
                      type="button"
                      onClick={() => setResetType('full_wipe')}
                      className={`p-2.5 rounded-xl border text-left transition ${
                        resetType === 'full_wipe'
                          ? 'bg-rose-500/10 border-rose-500 text-white'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 font-semibold text-xs text-rose-300">
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Reset All Custom</span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1 leading-tight">
                        Resets all panel locations, custom images, audio mixers, and layouts to factory default.
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setResetType('settings_only')}
                      className={`p-2.5 rounded-xl border text-left transition ${
                        resetType === 'settings_only'
                          ? 'bg-indigo-500/10 border-indigo-500 text-white'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 font-semibold text-xs text-indigo-300">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Keep Image Library</span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1 leading-tight">
                        Resets timer & audio settings while keeping your custom & clipboard images saved.
                      </p>
                    </button>
                  </div>

                  <div className="mt-2.5 p-2 bg-slate-900/90 rounded-xl border border-slate-800 space-y-1 text-[11px]">
                    <div className="flex items-center gap-1.5 text-indigo-300">
                      <History className="w-3.5 h-3.5 shrink-0 text-indigo-400" />
                      <span><strong>Rollback Safe:</strong> A snapshot is saved in case you want to undo this reset.</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowResetConfirm(false)}
                  className="px-3 py-1.5 rounded-xl text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowResetConfirm(false);
                    if (resetType === 'full_wipe') {
                      onResetAllCustom ? onResetAllCustom() : onResetToDefault?.();
                      setResetSuccessMessage('Reset all custom settings, panel locations, and images to factory defaults.');
                    } else {
                      onResetToDefault?.();
                      setResetSuccessMessage('Reset workspace settings. Custom image library preserved.');
                    }
                    setTimeout(() => setResetSuccessMessage(null), 5000);
                  }}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold text-white shadow-md transition flex items-center gap-1.5 ${
                    resetType === 'full_wipe'
                      ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-900/30'
                      : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-900/30'
                  }`}
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>{resetType === 'full_wipe' ? 'Reset All (Locations & Images)' : 'Reset Settings'}</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {canRollback && rollbackSnapshot && (
                <div className="flex items-center justify-between text-[10px] text-amber-300/80 px-1 font-mono">
                  <span>Snapshot available:</span>
                  <span>{new Date(rollbackSnapshot.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                {canRollback && (
                  <button
                    type="button"
                    onClick={() => {
                      onRollback?.();
                      setResetSuccessMessage('Workspace restored to pre-reset version.');
                      setTimeout(() => setResetSuccessMessage(null), 4000);
                    }}
                    className="flex-1 py-2.5 px-3 bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 text-amber-300 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1.5 shadow-sm"
                    title="Rollback to the version before you last reset"
                  >
                    <History className="w-3.5 h-3.5" />
                    <span>Rollback Version</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setShowResetConfirm(true)}
                  className={`py-2.5 px-3 bg-slate-950 border border-slate-800 hover:border-rose-900/40 hover:bg-rose-950/20 text-slate-300 hover:text-rose-200 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1.5 ${
                    canRollback ? 'flex-1' : 'w-full'
                  }`}
                >
                  <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                  <span>Reset to Default</span>
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
