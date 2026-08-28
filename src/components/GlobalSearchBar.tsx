import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Search,
  Sliders,
  Sparkles,
  Flame,
  CheckSquare,
  FileText,
  BarChart2,
  Layout,
  Store,
  Users,
  Bot,
  Music,
  Eye,
  Play,
  Pause,
  RotateCcw,
  Plus,
  ArrowRight,
  Clock,
  CloudRain,
  Flame as FireIcon,
  Coffee,
  TreePine,
  Waves,
  Radio,
  Volume2,
  X,
  Command,
  CornerDownLeft,
  Pin,
  CheckCircle2,
  Circle,
  Tag,
  FolderHeart,
  Palette,
  Undo2,
  Headphones,
} from 'lucide-react';
import {
  WorkspaceConfig,
  Task,
  StickyNote,
  Template,
  TimerStatus,
  FocusMethodType,
  AudioTrack,
  AmbientTrack,
} from '../types';
import { PRESET_BACKGROUNDS } from '../data/presetBackgrounds';
import { PRESET_MUSIC_TRACKS, PRESET_AMBIENT_TRACKS } from '../data/presetAudio';
import { loadPersonalTemplates } from '../firebase';
import { type User } from 'firebase/auth';

export type SearchCategory = 'all' | 'templates' | 'notes' | 'tasks' | 'features' | 'audio' | 'timer';

export interface SearchResultItem {
  id: string;
  category: 'templates' | 'notes' | 'tasks' | 'features' | 'audio' | 'timer';
  title: string;
  subtitle?: string;
  badge?: string;
  badgeColor?: string;
  icon: React.ReactNode;
  thumbnail?: string;
  keywords?: string[];
  action: () => void;
  secondaryAction?: {
    label: string;
    action: () => void;
  };
  isCompletedTask?: boolean;
  onToggleTask?: () => void;
}

interface GlobalSearchBarProps {
  config: WorkspaceConfig;
  tasks: Task[];
  stickyNotes: StickyNote[];
  notepadContent: string;
  user: User | null;
  activeTemplate: Template | null;
  timerStatus: TimerStatus;
  currentStreak: number;
  onApplyTemplate: (
    newConfig: WorkspaceConfig,
    newTasks?: Task[],
    newStickyNotes?: StickyNote[],
    newNotepad?: string,
    appliedTemplate?: Template
  ) => void;
  onChangeConfig: (config: WorkspaceConfig) => void;
  onChangeTasks: (tasks: Task[]) => void;
  onChangeStickyNotes: (notes: StickyNote[]) => void;
  onChangeNotepad: (content: string) => void;
  onToggleTasks: () => void;
  onToggleNotes: () => void;
  onToggleCustomizer: (initialTab?: 'background' | 'audio' | 'method' | 'appearance') => void;
  onToggleAudio: () => void;
  onToggleStats: () => void;
  onToggleTemplates: () => void;
  onToggleMarketplace: () => void;
  onToggleRooms: () => void;
  onToggleAiChat: () => void;
  onToggleSoundGenerator: () => void;
  onToggleZenMode: () => void;
  onSetTimerStatus: (status: TimerStatus) => void;
  onRollback?: () => void;
  canRollback?: boolean;
  onShowToast?: (message: string) => void;
}

export const GlobalSearchBar: React.FC<GlobalSearchBarProps> = ({
  config,
  tasks,
  stickyNotes,
  notepadContent,
  user,
  activeTemplate,
  timerStatus,
  currentStreak,
  onApplyTemplate,
  onChangeConfig,
  onChangeTasks,
  onChangeStickyNotes,
  onChangeNotepad,
  onToggleTasks,
  onToggleNotes,
  onToggleCustomizer,
  onToggleAudio,
  onToggleStats,
  onToggleTemplates,
  onToggleMarketplace,
  onToggleRooms,
  onToggleAiChat,
  onToggleSoundGenerator,
  onToggleZenMode,
  onSetTimerStatus,
  onRollback,
  canRollback,
  onShowToast,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<SearchCategory>('all');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [savedTemplates, setSavedTemplates] = useState<Template[]>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const isMac = typeof window !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);

  // Load saved templates when opening the search bar
  useEffect(() => {
    if (isOpen) {
      setIsLoadingTemplates(true);
      loadPersonalTemplates(user?.uid, user?.email)
        .then((tmpls) => {
          setSavedTemplates(tmpls);
        })
        .catch((err) => {
          console.warn('Failed to load templates for global search:', err);
        })
        .finally(() => {
          setIsLoadingTemplates(false);
        });
    }
  }, [isOpen, user?.uid, user?.email]);

  // Global keyboard shortcut listener (Cmd+K / Ctrl+K / slash)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+K or Ctrl+K
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
        return;
      }

      // Single key '/' when not in input/textarea
      if (
        e.key === '/' &&
        !isOpen &&
        !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || (e.target as HTMLElement).isContentEditable)
      ) {
        e.preventDefault();
        setIsOpen(true);
        return;
      }

      // Escape to close
      if (e.key === 'Escape' && isOpen) {
        e.preventDefault();
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Auto focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 50);
    } else {
      setSearchQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Helper: Flash / scroll to sticky note on canvas
  const handleFocusStickyNote = (noteId: string) => {
    // 1. Ensure sticky notes are visible in workspace appearance
    if (config.appearance?.showStickyNotes === false) {
      onChangeConfig({
        ...config,
        appearance: {
          ...config.appearance,
          showStickyNotes: true,
        },
      });
    }

    // 2. Find and highlight note element
    setTimeout(() => {
      const el = document.getElementById(`sticky-note-${noteId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('ring-4', 'ring-indigo-400', 'scale-105', 'transition-all', 'duration-300');
        setTimeout(() => {
          el.classList.remove('ring-4', 'ring-indigo-400', 'scale-105');
        }, 2200);
      }
    }, 100);

    onShowToast?.('🎯 Focused sticky note on canvas');
    setIsOpen(false);
  };

  // Helper: Toggle task completion directly from search
  const handleToggleTaskCompletion = (taskId: string) => {
    const updated = tasks.map((t) => (t.id === taskId ? { ...t, completed: !t.completed } : t));
    onChangeTasks(updated);
  };

  // Helper: Add a new task from query
  const handleCreateTaskFromQuery = (text: string) => {
    if (!text.trim()) return;
    const newTask: Task = {
      id: `task-${Date.now()}`,
      title: text.trim(),
      completed: false,
      priority: 'medium',
      createdAt: new Date().toISOString(),
    };
    onChangeTasks([newTask, ...tasks]);
    onShowToast?.(`✅ Created task: "${newTask.title}"`);
    setIsOpen(false);
  };

  // Helper: Add a new sticky note from query
  const handleCreateNoteFromQuery = (text: string) => {
    if (!text.trim()) return;
    const newNote: StickyNote = {
      id: `note-${Date.now()}`,
      text: text.trim(),
      color: 'Yellow',
      x: Math.floor(window.innerWidth / 2 - 140),
      y: Math.floor(window.innerHeight / 2 - 110),
      width: 280,
      height: 220,
      isPinned: false,
    };
    onChangeStickyNotes([...stickyNotes, newNote]);
    handleFocusStickyNote(newNote.id);
    onShowToast?.('📝 Created new sticky note on canvas');
    setIsOpen(false);
  };

  // Build Comprehensive Search Index
  const allSearchItems = useMemo<SearchResultItem[]>(() => {
    const items: SearchResultItem[] = [];

    // 1. SAVED & PRESET TEMPLATES
    savedTemplates.forEach((tmpl) => {
      const isCurrentActive = activeTemplate?.id === tmpl.id;
      items.push({
        id: `template-${tmpl.id}`,
        category: 'templates',
        title: tmpl.name,
        subtitle: `${tmpl.description || 'Custom workspace template'} • ${tmpl.category || 'Focus'}`,
        badge: isCurrentActive ? 'Active Template' : tmpl.isGroup === 1 ? 'Team Template' : 'Template',
        badgeColor: isCurrentActive ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40' : 'bg-slate-800 text-slate-300 border-slate-700',
        icon: <Layout className="w-4 h-4 text-indigo-400" />,
        thumbnail: tmpl.thumbnail || tmpl.config?.background?.workItems?.[0]?.thumbnailUrl || tmpl.config?.background?.workItems?.[0]?.url,
        keywords: ['template', 'workspace', tmpl.name, tmpl.description, tmpl.category || '', ...(tmpl.tags || [])],
        action: () => {
          onApplyTemplate(tmpl.config, tmpl.tasks, tmpl.stickyNotes, tmpl.notepad, tmpl);
          onShowToast?.(`✨ Applied template: "${tmpl.name}"`);
          setIsOpen(false);
        },
        secondaryAction: {
          label: isCurrentActive ? 'Current' : 'Switch Workspace',
          action: () => {
            onApplyTemplate(tmpl.config, tmpl.tasks, tmpl.stickyNotes, tmpl.notepad, tmpl);
            onShowToast?.(`✨ Applied template: "${tmpl.name}"`);
            setIsOpen(false);
          },
        },
      });
    });

    // Built-in presets if no saved templates or as default quick starters
    PRESET_BACKGROUNDS.slice(0, 6).forEach((bg, idx) => {
      items.push({
        id: `preset-bg-${bg.id || idx}`,
        category: 'templates',
        title: bg.title,
        subtitle: `Built-in theme atmosphere • ${bg.type.toUpperCase()}`,
        badge: 'Preset Atmosphere',
        badgeColor: 'bg-indigo-950/60 text-indigo-300 border-indigo-800/40',
        icon: <Palette className="w-4 h-4 text-indigo-400" />,
        thumbnail: bg.thumbnailUrl || bg.url,
        keywords: ['preset', 'theme', 'background', 'wallpaper', bg.title, bg.type],
        action: () => {
          onChangeConfig({
            ...config,
            background: {
              ...config.background,
              workItems: [bg],
            },
          });
          onShowToast?.(`🎨 Background switched to "${bg.title}"`);
          setIsOpen(false);
        },
      });
    });

    // 2. STICKY NOTES
    stickyNotes.forEach((note, idx) => {
      const cleanSnippet = note.text ? note.text.trim() : 'Empty sticky note';
      const firstLine = cleanSnippet.split('\n')[0].slice(0, 50);
      const remainder = cleanSnippet.split('\n').slice(1).join(' ').slice(0, 70);

      items.push({
        id: `note-${note.id}`,
        category: 'notes',
        title: firstLine || `Sticky Note #${idx + 1}`,
        subtitle: remainder || `Color: ${note.color}${note.isPinned ? ' • Pinned' : ''}`,
        badge: note.isPinned ? 'Pinned Note' : 'Canvas Note',
        badgeColor: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
        icon: <Pin className={`w-4 h-4 ${note.isPinned ? 'text-amber-400 fill-amber-400' : 'text-amber-300'}`} />,
        thumbnail: note.imageUrl,
        keywords: ['note', 'sticky', 'board', 'canvas', note.text, note.color],
        action: () => handleFocusStickyNote(note.id),
        secondaryAction: {
          label: 'Jump to Note',
          action: () => handleFocusStickyNote(note.id),
        },
      });
    });

    // 3. TASKS & PLANNER
    tasks.forEach((task) => {
      items.push({
        id: `task-${task.id}`,
        category: 'tasks',
        title: task.title,
        subtitle: `Priority: ${task.priority || 'normal'} • ${task.completed ? 'Completed' : 'Pending'}`,
        badge: task.completed ? 'Done' : (task.priority ? `${task.priority.toUpperCase()} Priority` : 'Task'),
        badgeColor: task.completed
          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
          : task.priority === 'high'
          ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
          : task.priority === 'medium'
          ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
          : 'bg-slate-800 text-slate-300 border-slate-700',
        icon: task.completed ? (
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
        ) : (
          <Circle className="w-4 h-4 text-slate-400" />
        ),
        isCompletedTask: task.completed,
        onToggleTask: () => handleToggleTaskCompletion(task.id),
        keywords: ['task', 'todo', 'planner', task.title, task.priority || '', task.completed ? 'completed' : 'pending'],
        action: () => {
          onToggleTasks();
          onShowToast?.(`📋 Opened task: "${task.title}"`);
          setIsOpen(false);
        },
        secondaryAction: {
          label: task.completed ? 'Mark Pending' : 'Mark Done',
          action: () => handleToggleTaskCompletion(task.id),
        },
      });
    });

    // Notepad Snippet Search
    if (notepadContent.trim()) {
      const firstLine = notepadContent.trim().split('\n')[0].slice(0, 60);
      items.push({
        id: 'feature-notepad-content',
        category: 'notes',
        title: `Notepad: ${firstLine}`,
        subtitle: `${notepadContent.length} characters in focus scratchpad`,
        badge: 'Notepad',
        badgeColor: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
        icon: <FileText className="w-4 h-4 text-sky-400" />,
        keywords: ['notepad', 'scratchpad', 'notes', notepadContent],
        action: () => {
          onToggleNotes();
          setIsOpen(false);
        },
      });
    }

    // 4. CORE FEATURES & TOOLS
    items.push(
      {
        id: 'tool-customizer-bg',
        category: 'features',
        title: 'Background & Theme Customizer',
        subtitle: 'Change wallpapers, video loops, blur, and brightness',
        badge: 'Appearance',
        badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
        icon: <Sliders className="w-4 h-4 text-indigo-400" />,
        keywords: ['customizer', 'background', 'wallpaper', 'brightness', 'blur', 'theme', 'video', 'appearance'],
        action: () => {
          onToggleCustomizer('background');
          setIsOpen(false);
        },
      },
      {
        id: 'tool-customizer-audio',
        category: 'features',
        title: 'Audio & Soundscape Mixer Drawer',
        subtitle: 'Configure ambient layers, focus playlists, and chimes',
        badge: 'Audio',
        badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
        icon: <Music className="w-4 h-4 text-purple-400" />,
        keywords: ['audio', 'music', 'sound', 'ambient', 'soundscape', 'playlist', 'chime', 'bell'],
        action: () => {
          onToggleCustomizer('audio');
          setIsOpen(false);
        },
      },
      {
        id: 'tool-customizer-method',
        category: 'features',
        title: 'Focus Method & Timer Intervals',
        subtitle: 'Configure Pomodoro, Deep Work, 52/17, work & break durations',
        badge: 'Timer',
        badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
        icon: <Clock className="w-4 h-4 text-emerald-400" />,
        keywords: ['timer', 'method', 'pomodoro', 'deepwork', 'duration', 'break', 'cycles', 'intervals'],
        action: () => {
          onToggleCustomizer('method');
          setIsOpen(false);
        },
      },
      {
        id: 'tool-customizer-appearance',
        category: 'features',
        title: 'Widget & Clock Styling (Glow, Fonts, Glass)',
        subtitle: 'Customize digital clocks, widget borders, radii, fonts, and accents',
        badge: 'Styling',
        badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
        icon: <Palette className="w-4 h-4 text-cyan-400" />,
        keywords: ['clock', 'font', 'glow', 'border', 'radius', 'glass', 'appearance', 'widget', 'theme', 'style'],
        action: () => {
          onToggleCustomizer('appearance');
          setIsOpen(false);
        },
      },
      {
        id: 'tool-ai-tutor',
        category: 'features',
        title: 'AI Study Assistant & Tutor Chat',
        subtitle: 'Ask study questions, break down complex topics, explain concepts',
        badge: 'Gemini AI',
        badgeColor: 'bg-indigo-600/30 text-indigo-200 border-indigo-400/40',
        icon: <Bot className="w-4 h-4 text-indigo-300 animate-pulse" />,
        keywords: ['ai', 'tutor', 'assistant', 'chat', 'gemini', 'study', 'explain', 'homework', 'summary'],
        action: () => {
          onToggleAiChat();
          setIsOpen(false);
        },
      },
      {
        id: 'tool-ai-sound-gen',
        category: 'features',
        title: 'AI Sound Generator',
        subtitle: 'Synthesize custom acoustic soundscapes calibrated to tasks',
        badge: 'Gemini AI',
        badgeColor: 'bg-purple-600/30 text-purple-200 border-purple-400/40',
        icon: <Sparkles className="w-4 h-4 text-purple-300 animate-spin" />,
        keywords: ['ai', 'sound', 'generator', 'synthesize', 'binaural', 'music', 'ambient', 'gemini'],
        action: () => {
          onToggleSoundGenerator();
          setIsOpen(false);
        },
      },
      {
        id: 'tool-templates-manager',
        category: 'features',
        title: 'Workspace Templates Hub',
        subtitle: 'Save, export, and switch between your personal & group workspace templates',
        badge: 'Templates',
        badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
        icon: <Layout className="w-4 h-4 text-indigo-400" />,
        keywords: ['template', 'templates', 'save', 'manage', 'export', 'import', 'workspaces'],
        action: () => {
          onToggleTemplates();
          setIsOpen(false);
        },
      },
      {
        id: 'tool-marketplace',
        category: 'features',
        title: 'Community Template Marketplace',
        subtitle: 'Browse and install aesthetic workspaces shared by creators',
        badge: 'Community',
        badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
        icon: <Store className="w-4 h-4 text-rose-400" />,
        keywords: ['marketplace', 'community', 'explore', 'public', 'templates', 'download', 'creators'],
        action: () => {
          onToggleMarketplace();
          setIsOpen(false);
        },
      },
      {
        id: 'tool-rooms',
        category: 'features',
        title: 'Real-Time Co-Working Study Rooms',
        subtitle: 'Focus together in live synced study rooms with friends or teams',
        badge: 'Multiplayer',
        badgeColor: 'bg-teal-500/20 text-teal-300 border-teal-500/40',
        icon: <Users className="w-4 h-4 text-teal-400" />,
        keywords: ['room', 'rooms', 'study', 'live', 'sync', 'coworking', 'friends', 'team', 'collaboration'],
        action: () => {
          onToggleRooms();
          setIsOpen(false);
        },
      },
      {
        id: 'tool-analytics',
        category: 'features',
        title: 'Focus Stats & Streak Analytics',
        subtitle: `View focus history, charts, milestones (${currentStreak}d current streak)`,
        badge: 'Analytics',
        badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
        icon: <BarChart2 className="w-4 h-4 text-amber-400" />,
        keywords: ['stats', 'analytics', 'streak', 'charts', 'history', 'logs', 'focus time'],
        action: () => {
          onToggleStats();
          setIsOpen(false);
        },
      },
      {
        id: 'tool-zen-mode',
        category: 'features',
        title: 'Zen Distraction-Free Mode',
        subtitle: 'Hide all sidebars, controls, and docks for 100% pure focus (Press Z)',
        badge: 'View Mode',
        badgeColor: 'bg-slate-800 text-slate-300 border-slate-700',
        icon: <Eye className="w-4 h-4 text-slate-300" />,
        keywords: ['zen', 'fullscreen', 'hide', 'minimalist', 'clean', 'distraction'],
        action: () => {
          onToggleZenMode();
          setIsOpen(false);
        },
      },
      {
        id: 'tool-tasks-sidebar',
        category: 'features',
        title: 'Task Planner Sidebar',
        subtitle: `Manage focus task priorities (${tasks.filter((t) => !t.completed).length} pending)`,
        badge: 'Tasks',
        badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
        icon: <CheckSquare className="w-4 h-4 text-emerald-400" />,
        keywords: ['tasks', 'planner', 'todo', 'list', 'goals'],
        action: () => {
          onToggleTasks();
          setIsOpen(false);
        },
      },
      {
        id: 'tool-notepad',
        category: 'features',
        title: 'Focus Scratchpad & Notepad',
        subtitle: 'Quick notes, formulas, and draft thoughts during focus sessions',
        badge: 'Notepad',
        badgeColor: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
        icon: <FileText className="w-4 h-4 text-sky-400" />,
        keywords: ['notepad', 'notes', 'scratchpad', 'draft', 'text'],
        action: () => {
          onToggleNotes();
          setIsOpen(false);
        },
      }
    );

    if (canRollback && onRollback) {
      items.push({
        id: 'tool-rollback',
        category: 'features',
        title: 'Rollback Workspace to Snapshot',
        subtitle: 'Restore your previous customized layout and settings',
        badge: 'Restore',
        badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
        icon: <Undo2 className="w-4 h-4 text-rose-400" />,
        keywords: ['rollback', 'restore', 'undo', 'snapshot', 'reset'],
        action: () => {
          onRollback();
          setIsOpen(false);
        },
      });
    }

    // 5. FOCUS METHODS & TIMER SHORTCUTS
    const methods: { type: FocusMethodType; name: string; desc: string; work: number; breakM: number }[] = [
      { type: 'pomodoro', name: 'Pomodoro Technique (25m / 5m)', desc: 'Standard 25 min sprint followed by 5 min rest', work: 1500, breakM: 300 },
      { type: 'deepwork', name: 'Deep Work Protocol (50m / 10m)', desc: 'Extended 50 min deep flow block with 10 min break', work: 3000, breakM: 600 },
      { type: '52-17', name: '52/17 Science Flow (52m / 17m)', desc: 'Optimal productivity cycle backed by desk research', work: 3120, breakM: 1020 },
      { type: 'flowtime', name: 'Flowtime Stopwatch (Continuous)', desc: 'Open-ended focus timer without rigid alarms', work: 0, breakM: 0 },
    ];

    methods.forEach((m) => {
      const isCurrentMethod = config.method.type === m.type;
      items.push({
        id: `method-${m.type}`,
        category: 'timer',
        title: `Switch Method: ${m.name}`,
        subtitle: m.desc,
        badge: isCurrentMethod ? 'Current Method' : 'Method',
        badgeColor: isCurrentMethod ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' : 'bg-slate-800 text-slate-400 border-slate-700',
        icon: <Clock className="w-4 h-4 text-emerald-400" />,
        keywords: ['method', 'timer', 'pomodoro', 'deepwork', 'flowtime', '52-17', m.name, m.type],
        action: () => {
          onChangeConfig({
            ...config,
            method: {
              ...config.method,
              type: m.type,
              workDuration: m.work || config.method.workDuration,
              breakDuration: m.breakM || config.method.breakDuration,
            },
          });
          onShowToast?.(`⏱️ Switched focus method to ${m.name}`);
          setIsOpen(false);
        },
      });
    });

    // Timer Controls
    items.push(
      {
        id: 'timer-toggle-focus',
        category: 'timer',
        title: timerStatus === 'FOCUS' ? 'Pause Focus Timer' : 'Start Focus Sprint',
        subtitle: `Currently in ${timerStatus} mode`,
        badge: 'Timer Control',
        badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
        icon: timerStatus === 'FOCUS' ? <Pause className="w-4 h-4 text-amber-400" /> : <Play className="w-4 h-4 text-emerald-400" />,
        keywords: ['timer', 'start', 'pause', 'focus', 'play', 'stop'],
        action: () => {
          onSetTimerStatus(timerStatus === 'FOCUS' ? 'PENDING' : 'FOCUS');
          onShowToast?.(timerStatus === 'FOCUS' ? '⏸️ Timer paused' : '▶️ Focus timer started');
          setIsOpen(false);
        },
      },
      {
        id: 'timer-switch-break',
        category: 'timer',
        title: 'Switch to Refresh Break',
        subtitle: 'Start a restorative break cycle with relaxing atmosphere',
        badge: 'Break',
        badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
        icon: <Coffee className="w-4 h-4 text-amber-400" />,
        keywords: ['break', 'rest', 'coffee', 'pause', 'refresh'],
        action: () => {
          onSetTimerStatus('BREAK');
          onShowToast?.('☕ Switched to refresh break');
          setIsOpen(false);
        },
      },
      {
        id: 'timer-reset',
        category: 'timer',
        title: 'Reset Timer Cycle',
        subtitle: 'Reset current countdown back to starting duration',
        badge: 'Reset',
        badgeColor: 'bg-slate-800 text-slate-300 border-slate-700',
        icon: <RotateCcw className="w-4 h-4 text-slate-400" />,
        keywords: ['reset', 'restart', 'timer', 'cycle'],
        action: () => {
          onSetTimerStatus('PENDING');
          onShowToast?.('🔄 Timer cycle reset');
          setIsOpen(false);
        },
      }
    );

    // 6. AUDIO & SOUNDSCAPES
    const currentAmbientList = config.audio?.ambientPlaylist?.tracks || config.audio?.ambientTracks || PRESET_AMBIENT_TRACKS;
    currentAmbientList.forEach((ambient) => {
      items.push({
        id: `ambient-${ambient.id}`,
        category: 'audio',
        title: `Ambient Layer: ${ambient.name}`,
        subtitle: `${ambient.active ? 'Active layer' : 'Muted'} • Volume ${Math.round((ambient.volume || 0.5) * 100)}%`,
        badge: ambient.active ? 'Active Layer' : 'Ambient',
        badgeColor: ambient.active ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' : 'bg-slate-800 text-slate-400 border-slate-700',
        icon: <Volume2 className={`w-4 h-4 ${ambient.active ? 'text-amber-400' : 'text-slate-400'}`} />,
        keywords: ['sound', 'ambient', 'soundscape', 'noise', 'layer', ambient.name, ambient.type],
        action: () => {
          const updated = currentAmbientList.map((t) => (t.id === ambient.id ? { ...t, active: !t.active } : t));
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
          onShowToast?.(`${ambient.active ? '🔇 Muted' : '🔊 Activated'} ${ambient.name}`);
          setIsOpen(false);
        },
        secondaryAction: {
          label: ambient.active ? 'Mute' : 'Activate',
          action: () => {
            const updated = currentAmbientList.map((t) => (t.id === ambient.id ? { ...t, active: !t.active } : t));
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
          },
        },
      });
    });

    const currentMusicList = config.audio?.musicPlaylist?.tracks || PRESET_MUSIC_TRACKS;
    currentMusicList.forEach((track) => {
      const isCurrent = config.audio?.musicTrack?.id === track.id;
      items.push({
        id: `music-track-${track.id}`,
        category: 'audio',
        title: track.title,
        subtitle: `Artist: ${track.artist} • ${track.source.toUpperCase()}`,
        badge: isCurrent ? 'Now Playing' : 'Music Track',
        badgeColor: isCurrent ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40' : 'bg-slate-800 text-slate-400 border-slate-700',
        icon: <Headphones className="w-4 h-4 text-indigo-400" />,
        keywords: ['music', 'track', 'song', 'lofi', 'playlist', track.title, track.artist],
        action: () => {
          onChangeConfig({
            ...config,
            audio: {
              ...config.audio,
              musicTrack: track,
            },
          });
          onShowToast?.(`🎵 Playing: "${track.title}"`);
          setIsOpen(false);
        },
      });
    });

    return items;
  }, [
    savedTemplates,
    activeTemplate,
    stickyNotes,
    tasks,
    notepadContent,
    config,
    timerStatus,
    currentStreak,
    canRollback,
  ]);

  // Filter items by active category and search query
  const filteredResults = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return allSearchItems.filter((item) => {
      // 1. Category check
      if (activeCategory !== 'all' && item.category !== activeCategory) {
        return false;
      }

      // 2. Query check
      if (!query) return true;

      const titleMatch = item.title.toLowerCase().includes(query);
      const subtitleMatch = item.subtitle?.toLowerCase().includes(query);
      const badgeMatch = item.badge?.toLowerCase().includes(query);
      const keywordMatch = item.keywords?.some((k) => k.toLowerCase().includes(query));

      return titleMatch || subtitleMatch || badgeMatch || keywordMatch;
    });
  }, [allSearchItems, searchQuery, activeCategory]);

  // Reset selected index when search query or category changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [searchQuery, activeCategory]);

  // Handle arrow navigation and enter key in search input
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (filteredResults.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % filteredResults.length);
      scrollItemIntoView((selectedIndex + 1) % filteredResults.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredResults.length) % filteredResults.length);
      scrollItemIntoView((selectedIndex - 1 + filteredResults.length) % filteredResults.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const selected = filteredResults[selectedIndex];
      if (selected) {
        selected.action();
      } else if (searchQuery.trim()) {
        handleCreateTaskFromQuery(searchQuery);
      }
    }
  };

  const scrollItemIntoView = (index: number) => {
    const el = document.getElementById(`search-result-${index}`);
    if (el && listRef.current) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  };

  const categories: { id: SearchCategory; label: string; count?: number }[] = [
    { id: 'all', label: 'All' },
    { id: 'templates', label: 'Templates' },
    { id: 'notes', label: 'Sticky Notes' },
    { id: 'tasks', label: 'Tasks' },
    { id: 'features', label: 'Features' },
    { id: 'audio', label: 'Audio & Music' },
    { id: 'timer', label: 'Timer & Methods' },
  ];

  return (
    <>
      {/* 1. Main Dashboard Header Search Bar Pill (Always visible, sleek, responsive) */}
      <div className="flex items-center">
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="group relative flex items-center gap-2.5 px-3 py-1.5 md:py-2 md:px-4 bg-slate-950/70 hover:bg-slate-900/90 border border-slate-800/80 hover:border-indigo-500/50 rounded-2xl backdrop-blur-xl transition-all duration-200 shadow-xl text-left select-none max-w-[200px] sm:max-w-xs md:max-w-sm lg:max-w-md w-full active:scale-98"
          title={`Global Workspace Search (${isMac ? '⌘K' : 'Ctrl+K'} or /)`}
        >
          <Search className="w-3.5 h-3.5 md:w-4 md:h-4 text-indigo-400 group-hover:scale-110 transition duration-200 shrink-0" />
          
          <div className="flex-1 truncate">
            <span className="text-xs text-slate-400 group-hover:text-slate-200 font-medium truncate block">
              Search templates, notes, tasks...
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-1 shrink-0">
            <kbd className="px-1.5 py-0.5 text-[10px] font-mono font-bold bg-slate-900 border border-slate-800 text-slate-400 rounded-md shadow-inner group-hover:border-indigo-500/40 group-hover:text-indigo-300 transition">
              {isMac ? '⌘K' : 'Ctrl+K'}
            </kbd>
          </div>
        </button>
      </div>

      {/* 2. Global Search Command Palette Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-20 px-4 select-none animate-in fade-in duration-150">
          
          {/* Backdrop Blur Overlay */}
          <div
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-md transition-opacity"
            onClick={() => setIsOpen(false)}
          />

          {/* Search Card Container */}
          <div className="relative w-full max-w-2xl bg-slate-950/95 border border-slate-800/90 rounded-3xl shadow-2xl overflow-hidden z-10 flex flex-col max-h-[80vh] backdrop-blur-2xl animate-in zoom-in-95 duration-200 ring-1 ring-white/5">
            
            {/* Top Search Input Box */}
            <div className="relative flex items-center p-3.5 sm:p-4 border-b border-slate-800/80 gap-3">
              <Search className="w-5 h-5 text-indigo-400 shrink-0 ml-1" />
              
              <input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search templates, notes, tasks, soundscapes, features..."
                className="w-full bg-transparent text-sm sm:text-base text-white placeholder-slate-500 focus:outline-none font-medium tracking-tight"
              />

              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    inputRef.current?.focus();
                  }}
                  className="p-1 text-slate-500 hover:text-slate-300 rounded-lg transition"
                >
                  <X className="w-4 h-4" />
                </button>
              )}

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-xl bg-slate-900 border border-slate-800 transition text-xs flex items-center gap-1 shrink-0"
              >
                <span className="text-[11px] font-mono">ESC</span>
              </button>
            </div>

            {/* Category Filter Chips */}
            <div className="flex items-center gap-1.5 p-2 px-3 border-b border-slate-800/60 overflow-x-auto custom-scrollbar bg-slate-950/60">
              {categories.map((cat) => {
                const isActive = activeCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setActiveCategory(cat.id)}
                    className={`px-3 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-150 flex items-center gap-1.5 ${
                      isActive
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-950/50'
                        : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 border border-slate-800/60'
                    }`}
                  >
                    <span>{cat.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Search Results List */}
            <div
              ref={listRef}
              className="flex-1 overflow-y-auto p-2 sm:p-3 space-y-1.5 custom-scrollbar max-h-[50vh]"
            >
              {filteredResults.length === 0 ? (
                <div className="py-12 px-4 text-center space-y-4">
                  <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 mx-auto flex items-center justify-center text-slate-500">
                    <Search className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-300">
                      No results found for "{searchQuery}"
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      Try searching another keyword or create a new item below
                    </p>
                  </div>

                  {searchQuery.trim() && (
                    <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => handleCreateTaskFromQuery(searchQuery)}
                        className="px-3.5 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 text-xs font-semibold flex items-center gap-2 transition"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add as Task: "{searchQuery.slice(0, 24)}"</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleCreateNoteFromQuery(searchQuery)}
                        className="px-3.5 py-2 rounded-xl bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/40 text-xs font-semibold flex items-center gap-2 transition"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add as Sticky Note</span>
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                filteredResults.map((item, index) => {
                  const isSelected = selectedIndex === index;

                  return (
                    <div
                      key={item.id}
                      id={`search-result-${index}`}
                      onClick={() => item.action()}
                      onMouseEnter={() => setSelectedIndex(index)}
                      className={`p-2.5 sm:p-3 rounded-2xl border transition-all duration-150 cursor-pointer flex items-center justify-between gap-3 group ${
                        isSelected
                          ? 'bg-indigo-600/20 border-indigo-500/60 shadow-lg shadow-indigo-950/30'
                          : 'bg-slate-900/60 hover:bg-slate-900 border-slate-800/80'
                      }`}
                    >
                      {/* Left: Icon or Thumbnail + Text */}
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        {item.thumbnail ? (
                          <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-900 border border-slate-800 shrink-0 relative">
                            <img
                              src={item.thumbnail}
                              alt=""
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                          </div>
                        ) : (
                          <div className="w-9 h-9 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center shrink-0">
                            {item.icon}
                          </div>
                        )}

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="text-xs sm:text-sm font-semibold text-slate-100 truncate group-hover:text-white">
                              {item.title}
                            </h4>
                            {item.badge && (
                              <span
                                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0 ${
                                  item.badgeColor || 'bg-slate-800 text-slate-300 border-slate-700'
                                }`}
                              >
                                {item.badge}
                              </span>
                            )}
                          </div>
                          {item.subtitle && (
                            <p className="text-[11px] text-slate-400 truncate mt-0.5">
                              {item.subtitle}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Right: Quick Action Controls */}
                      <div className="flex items-center gap-2 shrink-0">
                        {item.onToggleTask && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              item.onToggleTask?.();
                            }}
                            className={`p-1.5 rounded-lg border transition text-xs font-semibold flex items-center gap-1 ${
                              item.isCompletedTask
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                : 'bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border-slate-700'
                            }`}
                            title="Toggle completion"
                          >
                            {item.isCompletedTask ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Circle className="w-3.5 h-3.5" />
                            )}
                          </button>
                        )}

                        {item.secondaryAction ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              item.secondaryAction?.action();
                            }}
                            className="hidden sm:flex px-2.5 py-1 bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 border border-indigo-500/30 rounded-xl text-xs font-medium items-center gap-1 transition"
                          >
                            <span>{item.secondaryAction.label}</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        ) : (
                          <div className={`p-1 text-slate-500 ${isSelected ? 'text-indigo-300' : ''}`}>
                            <CornerDownLeft className="w-3.5 h-3.5" />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Bottom Keyboard Hint Bar */}
            <div className="p-3 px-4 border-t border-slate-800/80 bg-slate-950 flex items-center justify-between text-[11px] text-slate-400">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <kbd className="px-1 py-0.5 bg-slate-900 border border-slate-800 rounded font-mono text-[10px]">↑</kbd>
                  <kbd className="px-1 py-0.5 bg-slate-900 border border-slate-800 rounded font-mono text-[10px]">↓</kbd>
                  <span>Navigate</span>
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 bg-slate-900 border border-slate-800 rounded font-mono text-[10px]">ENTER</kbd>
                  <span>Select / Open</span>
                </span>
                <span className="hidden sm:flex items-center gap-1">
                  <kbd className="px-1 py-0.5 bg-slate-900 border border-slate-800 rounded font-mono text-[10px]">ESC</kbd>
                  <span>Close</span>
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] text-slate-500">
                  {filteredResults.length} {filteredResults.length === 1 ? 'result' : 'results'}
                </span>
              </div>
            </div>

          </div>
        </div>
      )}
    </>
  );
};
