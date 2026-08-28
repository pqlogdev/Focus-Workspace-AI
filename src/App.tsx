import React, { useState, useEffect, useRef, useCallback } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import {
  auth,
  signInWithGoogle,
  signOut as firebaseSignOut,
  loadUserDataFromCloud,
  saveUserDataToCloud,
  saveUserStreak,
  saveCustomImagesToCloud,
  saveRollbackSnapshotToCloud,
  clearRollbackSnapshotFromCloud,
  savePersonalTemplate,
} from './firebase';
import {
  WorkspaceConfig,
  TimerStatus,
  ViewMode,
  Task,
  StickyNote,
  FocusLog,
  Streak,
  RoomState,
  CustomImageRecord,
  RollbackSnapshot,
  Template,
} from './types';
import {
  DEFAULT_WORKSPACE_CONFIG,
  DEFAULT_TASKS,
  DEFAULT_STICKY_NOTES,
  DEFAULT_NOTEPAD,
} from './data/defaultWorkspace';
import { PRESET_BACKGROUNDS, PRESET_BREAK_BACKGROUNDS } from './data/presetBackgrounds';
import { safeLocalStorageSet, safeLocalStorageGet, safeLocalStorageJSONGet } from './utils/storage';
import { BackgroundLayer } from './components/BackgroundLayer';
import { AudioPlayer } from './components/AudioPlayer';
import { TimerWidget } from './components/TimerWidget';
import { StickyNotesCanvas } from './components/StickyNotesCanvas';
import { NotepadPanel } from './components/NotepadPanel';
import { TaskPlannerSidebar } from './components/TaskPlannerSidebar';
import { BreakReflectionModal } from './components/BreakReflectionModal';
import { TemplateModal } from './components/TemplateModal';
import { MarketplaceModal } from './components/MarketplaceModal';
import { StatsAnalyticsModal } from './components/StatsAnalyticsModal';
import { RealtimeRoomModal } from './components/RealtimeRoomModal';
import { LiveRoomFloatingBar } from './components/LiveRoomFloatingBar';
import { AiAssistantPanel } from './components/AiAssistantPanel';
import { AiSoundGeneratorModal } from './components/AiSoundGeneratorModal';
import { CustomizerDrawer } from './components/CustomizerDrawer';
import { FloatingWorkspaceBadge } from './components/FloatingWorkspaceBadge';
import { GlobalSearchBar } from './components/GlobalSearchBar';
import { LandingPage } from './components/LandingPage';
import { Sparkles as SparklesIcon, Undo2, RotateCcw, X as CloseIcon, ShieldCheck, Flame, Layout as LayoutIcon, RefreshCw as RefreshCwIcon } from 'lucide-react';

export function App() {
  // 1. Core Workspace Config State (Persisted across refreshes & hard refreshes)
  const [config, setConfig] = useState<WorkspaceConfig>(() => {
    const saved = safeLocalStorageJSONGet<WorkspaceConfig | null>('airiser_workspace_config', null);
    if (saved && typeof saved === 'object') {
      return {
        ...DEFAULT_WORKSPACE_CONFIG,
        ...saved,
        background: {
          ...DEFAULT_WORKSPACE_CONFIG.background,
          ...(saved.background || {}),
        },
        audio: {
          ...DEFAULT_WORKSPACE_CONFIG.audio,
          ...(saved.audio || {}),
        },
        method: {
          ...DEFAULT_WORKSPACE_CONFIG.method,
          ...(saved.method || {}),
        },
        appearance: {
          ...DEFAULT_WORKSPACE_CONFIG.appearance,
          ...(saved.appearance || {}),
        },
        layout: {
          ...DEFAULT_WORKSPACE_CONFIG.layout,
          ...(saved.layout || {}),
        },
      };
    }
    return DEFAULT_WORKSPACE_CONFIG;
  });

  // 2. Timer & View Mode State
  const [timerStatus, setTimerStatus] = useState<TimerStatus>(() =>
    (safeLocalStorageGet('airiser_timer_status', 'PENDING') as TimerStatus) || 'PENDING'
  );
  const [viewMode, setViewMode] = useState<ViewMode>(() =>
    (safeLocalStorageGet('airiser_view_mode', 'fullscreen') as ViewMode) || 'fullscreen'
  );

  // 3. Modals & Sidebars Visibility States
  const [isCustomizerOpen, setIsCustomizerOpen] = useState(false);
  const [customizerInitialTab, setCustomizerInitialTab] = useState<'background' | 'audio' | 'method' | 'appearance'>('background');
  const [activeCustomizingPanel, setActiveCustomizingPanel] = useState<'timer' | 'music' | 'notes' | 'canvas' | null>(null);
  const [isTasksOpen, setIsTasksOpen] = useState<boolean>(() =>
    safeLocalStorageGet('airiser_tasks_open', 'false') === 'true'
  );
  const [isNotesOpen, setIsNotesOpen] = useState<boolean>(() =>
    safeLocalStorageGet('airiser_notes_open', 'false') === 'true'
  );
  const [isStatsOpen, setIsStatsOpen] = useState(false);
  const [isTemplatesOpen, setIsTemplatesOpen] = useState(false);
  const [isMarketplaceOpen, setIsMarketplaceOpen] = useState(false);
  const [isRoomsOpen, setIsRoomsOpen] = useState(false);
  const [isAiChatOpen, setIsAiChatOpen] = useState(false);
  const [isSoundGenOpen, setIsSoundGenOpen] = useState(false);
  const [isBreakModalOpen, setIsBreakModalOpen] = useState(false);

  const [streakToast, setStreakToast] = useState<{ message: string; days: number; isMilestone?: boolean } | null>(null);

  // Helper: Calculate daily streak progression on focus/task activity and persist to database
  const calculateStreakOnActivity = useCallback((prevStreak: Streak): Streak => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const lastDateStr = prevStreak.lastFocusDate ? prevStreak.lastFocusDate.split('T')[0] : '';

    const history = Array.isArray(prevStreak.streakHistory) ? [...prevStreak.streakHistory] : [];
    if (!history.includes(todayStr)) {
      history.push(todayStr);
    }
    const trimmedHistory = history.slice(-60);
    const totalFocusDays = Math.max(
      trimmedHistory.length,
      (prevStreak.totalFocusDays || 0) + (lastDateStr !== todayStr ? 1 : 0)
    );

    if (!lastDateStr) {
      // First ever activity recorded
      const initialStreak: Streak = {
        currentStreak: 1,
        longestStreak: Math.max(1, prevStreak.longestStreak || 1),
        lastFocusDate: now.toISOString(),
        milestones: prevStreak.milestones || [3, 7, 14, 30, 60, 100],
        totalFocusDays: 1,
        streakHistory: trimmedHistory,
        freezeDaysAvailable: prevStreak.freezeDaysAvailable ?? 1,
        unlockedMilestones: [1],
        updatedAt: now.toISOString(),
      };
      setStreakToast({ message: '🔥 Focus streak started! Day 1 complete.', days: 1 });
      return initialStreak;
    }

    if (lastDateStr === todayStr) {
      // Activity recorded again today - maintain streak count and update timestamp & history
      return {
        ...prevStreak,
        lastFocusDate: now.toISOString(),
        totalFocusDays,
        streakHistory: trimmedHistory,
        updatedAt: now.toISOString(),
      };
    }

    // Calculate calendar day difference
    const todayDateObj = new Date(todayStr);
    const lastDateObj = new Date(lastDateStr);
    const diffDays = Math.round((todayDateObj.getTime() - lastDateObj.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      // Consecutive day: extend streak!
      const newCurrent = (prevStreak.currentStreak || 0) + 1;
      const newLongest = Math.max(prevStreak.longestStreak || 0, newCurrent);
      const allMilestones = prevStreak.milestones || [3, 7, 14, 30, 60, 100];
      const newlyUnlocked = allMilestones.filter(
        (m) => newCurrent >= m && !(prevStreak.unlockedMilestones || []).includes(m)
      );
      const unlockedMilestones = Array.from(
        new Set([...(prevStreak.unlockedMilestones || []), ...newlyUnlocked, ...(newCurrent === 1 ? [1] : [])])
      );

      const isMilestone = newlyUnlocked.length > 0;
      setStreakToast({
        message: isMilestone
          ? `🎉 Milestone Unlocked! 🔥 ${newCurrent}-Day Focus Streak!`
          : `🔥 Streak Advanced! Day ${newCurrent} achieved!`,
        days: newCurrent,
        isMilestone,
      });

      return {
        ...prevStreak,
        currentStreak: newCurrent,
        longestStreak: newLongest,
        lastFocusDate: now.toISOString(),
        totalFocusDays,
        streakHistory: trimmedHistory,
        unlockedMilestones,
        updatedAt: now.toISOString(),
      };
    } else {
      // 2+ days gap: reset streak to 1
      setStreakToast({
        message: `🔥 New Streak Started! Day 1 recorded.`,
        days: 1,
      });

      return {
        ...prevStreak,
        currentStreak: 1,
        longestStreak: Math.max(prevStreak.longestStreak || 1, 1),
        lastFocusDate: now.toISOString(),
        totalFocusDays,
        streakHistory: trimmedHistory,
        updatedAt: now.toISOString(),
      };
    }
  }, []);

  // 4. Tasks, Notes, Logs & Streaks
  const [tasks, setTasks] = useState<Task[]>(() =>
    safeLocalStorageJSONGet<Task[]>('airiser_tasks', DEFAULT_TASKS)
  );
  const [stickyNotes, setStickyNotes] = useState<StickyNote[]>(() =>
    safeLocalStorageJSONGet<StickyNote[]>('airiser_sticky_notes', DEFAULT_STICKY_NOTES)
  );
  const [notepadContent, setNotepadContent] = useState<string>(() =>
    safeLocalStorageGet('airiser_notepad', DEFAULT_NOTEPAD)
  );
  const [logs, setLogs] = useState<FocusLog[]>(() =>
    safeLocalStorageJSONGet<FocusLog[]>('airiser_logs', [])
  );
  const [streak, setStreak] = useState<Streak>(() =>
    safeLocalStorageJSONGet<Streak>('airiser_streak', {
      currentStreak: 1,
      longestStreak: 1,
      lastFocusDate: new Date().toISOString(),
      milestones: [3, 7, 14, 30, 60, 100],
      totalFocusDays: 1,
      streakHistory: [new Date().toISOString().split('T')[0]],
      freezeDaysAvailable: 1,
    })
  );

  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [floatingReactions, setFloatingReactions] = useState<{ id: string; emoji: string; left: number }[]>([]);

  // Check URL for ?room=CODE to auto open or join
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    if (roomParam) {
      setIsRoomsOpen(true);
    }
  }, []);

  const handleSendReaction = useCallback((emoji: string) => {
    const newReaction = {
      id: `reaction-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      emoji,
      left: Math.floor(Math.random() * 60) + 20, // 20% to 80% screen width
    };
    setFloatingReactions((prev) => [...prev, newReaction]);
    setTimeout(() => {
      setFloatingReactions((prev) => prev.filter((r) => r.id !== newReaction.id));
    }, 2800);
  }, []);

  // When room is active, synchronize timer if host changes it
  useEffect(() => {
    if (roomState?.timerState?.status && roomState.timerState.status !== timerStatus) {
      setTimerStatus(roomState.timerState.status);
    }
  }, [roomState?.timerState?.status]);

  // 5. Custom Images Library & Reset / Rollback System State
  const [customImages, setCustomImages] = useState<CustomImageRecord[]>(() =>
    safeLocalStorageJSONGet<CustomImageRecord[]>('airiser_custom_images', [])
  );
  const [preResetSnapshot, setPreResetSnapshot] = useState<WorkspaceConfig | null>(() =>
    safeLocalStorageJSONGet<WorkspaceConfig | null>('airiser_prereset_snapshot', null)
  );
  const [rollbackSnapshot, setRollbackSnapshot] = useState<RollbackSnapshot | null>(() =>
    safeLocalStorageJSONGet<RollbackSnapshot | null>('airiser_rollback_snapshot', null)
  );
  const [rollbackToast, setRollbackToast] = useState<{ message: string; timestamp: number } | null>(null);

  // 6. Firebase Auth & Cloud Sync State
  const [user, setUser] = useState<User | null>(null);
  const [isGuestMode, setIsGuestMode] = useState<boolean>(false);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const hasHydratedFromCloud = useRef<boolean>(false);
  const syncTimeoutRef = useRef<any>(null);

  // 6.1. Active Template & Template Auto-Sync Engine
  const [activeTemplate, setActiveTemplate] = useState<Template | null>(() =>
    safeLocalStorageJSONGet<Template | null>('airiser_active_template', null)
  );
  const [isTemplateAutoSync, setIsTemplateAutoSync] = useState<boolean>(() =>
    safeLocalStorageJSONGet<boolean>('airiser_template_auto_sync', true)
  );
  const [isTemplateSyncing, setIsTemplateSyncing] = useState<boolean>(false);
  const [lastTemplateSyncedAt, setLastTemplateSyncedAt] = useState<Date | null>(null);
  const templateSyncTimeoutRef = useRef<any>(null);

  // Listen to Auth State Changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setIsAuthLoading(false);

      if (currentUser) {
        setIsSyncing(true);
        try {
          const cloudData = await loadUserDataFromCloud(currentUser.uid);
          if (cloudData && (cloudData.config || cloudData.tasks || cloudData.stickyNotes || cloudData.notepad !== undefined)) {
            // Hydrate exact account-specific customization from Firestore
            if (cloudData.config) setConfig(cloudData.config);
            if (cloudData.tasks) setTasks(cloudData.tasks);
            if (cloudData.stickyNotes) setStickyNotes(cloudData.stickyNotes);
            if (cloudData.notepad !== undefined) setNotepadContent(cloudData.notepad);
            if (cloudData.logs) setLogs(cloudData.logs);
            if (cloudData.streak) setStreak(cloudData.streak);
            if (cloudData.customImages) setCustomImages(cloudData.customImages);
            if (cloudData.rollbackSnapshot) {
              setRollbackSnapshot(cloudData.rollbackSnapshot);
              setPreResetSnapshot(cloudData.rollbackSnapshot.config);
            }
          } else {
            // New user account / clean slate: initialize with the default workspace and persist to Firestore
            setConfig(DEFAULT_WORKSPACE_CONFIG);
            setTasks(DEFAULT_TASKS);
            setStickyNotes(DEFAULT_STICKY_NOTES);
            setNotepadContent(DEFAULT_NOTEPAD);

            await saveUserDataToCloud(currentUser.uid, {
              config: DEFAULT_WORKSPACE_CONFIG,
              tasks: DEFAULT_TASKS,
              stickyNotes: DEFAULT_STICKY_NOTES,
              notepad: DEFAULT_NOTEPAD,
              logs: [],
              streak: {
                currentStreak: 1,
                longestStreak: 1,
                lastFocusDate: new Date().toISOString(),
                milestones: [3, 7, 14, 30],
              },
              customImages: [],
            });
          }
          setLastSyncedAt(new Date());
          hasHydratedFromCloud.current = true;
        } catch (err) {
          console.warn('Initial cloud sync error:', err);
        } finally {
          setIsSyncing(false);
        }
      } else {
        hasHydratedFromCloud.current = false;
        // Keep local state in localStorage intact for offline/unauthenticated mode
      }
    });

    return () => unsubscribe();
  }, []);

  // Debounced auto-save to Cloud when state changes and user is signed in
  const triggerCloudSync = useCallback(() => {
    if (!user || !hasHydratedFromCloud.current) return;

    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
    }

    syncTimeoutRef.current = setTimeout(async () => {
      setIsSyncing(true);
      try {
        await saveUserDataToCloud(user.uid, {
          config,
          tasks,
          stickyNotes,
          notepad: notepadContent,
          logs,
          streak,
          customImages,
        });
        setLastSyncedAt(new Date());
      } catch (error) {
        console.warn('Cloud auto-save error:', error);
      } finally {
        setIsSyncing(false);
      }
    }, 1200);
  }, [user, config, tasks, stickyNotes, notepadContent, logs, streak, customImages]);

  // Debounced auto-sync to the Active Template whenever workspace changes
  const triggerTemplateAutoSync = useCallback(() => {
    if (!activeTemplate || !isTemplateAutoSync) return;

    if (templateSyncTimeoutRef.current) {
      clearTimeout(templateSyncTimeoutRef.current);
    }

    templateSyncTimeoutRef.current = setTimeout(async () => {
      setIsTemplateSyncing(true);
      try {
        const updatedTmpl: Template = {
          ...activeTemplate,
          config,
          tasks: activeTemplate.tasks !== undefined ? tasks : activeTemplate.tasks,
          stickyNotes: activeTemplate.stickyNotes !== undefined ? stickyNotes : activeTemplate.stickyNotes,
          notepad: activeTemplate.notepad !== undefined ? notepadContent : activeTemplate.notepad,
          thumbnail: config.background.workItems?.[0]?.thumbnailUrl || config.background.workItems?.[0]?.url || activeTemplate.thumbnail,
          updatedAt: new Date().toISOString(),
        };
        const saved = await savePersonalTemplate(user?.uid || 'guest', updatedTmpl);
        setActiveTemplate(saved);
        safeLocalStorageSet('airiser_active_template', JSON.stringify(saved));
        setLastTemplateSyncedAt(new Date());
      } catch (err) {
        console.warn('Auto-syncing to active template warning:', err);
      } finally {
        setIsTemplateSyncing(false);
      }
    }, 1200);
  }, [activeTemplate, isTemplateAutoSync, user, config, tasks, stickyNotes, notepadContent]);

  // Trigger template auto-sync on state changes
  useEffect(() => {
    triggerTemplateAutoSync();
  }, [config, tasks, stickyNotes, notepadContent, triggerTemplateAutoSync]);

  // Sync state to local storage & cloud trigger
  useEffect(() => {
    if (!hasHydratedFromCloud.current && user) return;
    safeLocalStorageSet('airiser_workspace_config', JSON.stringify(config));
    triggerCloudSync();
  }, [config, triggerCloudSync, user]);

  useEffect(() => {
    if (!hasHydratedFromCloud.current && user) return;
    safeLocalStorageSet('airiser_tasks', JSON.stringify(tasks));
    triggerCloudSync();
  }, [tasks, triggerCloudSync, user]);

  useEffect(() => {
    if (!hasHydratedFromCloud.current && user) return;
    safeLocalStorageSet('airiser_sticky_notes', JSON.stringify(stickyNotes));
    triggerCloudSync();
  }, [stickyNotes, triggerCloudSync, user]);

  useEffect(() => {
    if (!hasHydratedFromCloud.current && user) return;
    safeLocalStorageSet('airiser_notepad', notepadContent);
    triggerCloudSync();
  }, [notepadContent, triggerCloudSync, user]);

  useEffect(() => {
    if (!hasHydratedFromCloud.current && user) return;
    safeLocalStorageSet('airiser_logs', JSON.stringify(logs));
    triggerCloudSync();
  }, [logs, triggerCloudSync, user]);

  useEffect(() => {
    if (!streakToast) return;
    const timer = setTimeout(() => {
      setStreakToast(null);
    }, 4500);
    return () => clearTimeout(timer);
  }, [streakToast]);

  useEffect(() => {
    if (!hasHydratedFromCloud.current && user) return;
    safeLocalStorageSet('airiser_streak', JSON.stringify(streak));
    triggerCloudSync();
  }, [streak, triggerCloudSync, user]);

  useEffect(() => {
    if (!hasHydratedFromCloud.current && user) return;
    safeLocalStorageSet('airiser_custom_images', JSON.stringify(customImages));
    triggerCloudSync();
  }, [customImages, triggerCloudSync, user]);

  useEffect(() => {
    safeLocalStorageSet('airiser_view_mode', viewMode);
  }, [viewMode]);

  useEffect(() => {
    safeLocalStorageSet('airiser_timer_status', timerStatus);
  }, [timerStatus]);

  useEffect(() => {
    safeLocalStorageSet('airiser_tasks_open', String(isTasksOpen));
  }, [isTasksOpen]);

  useEffect(() => {
    safeLocalStorageSet('airiser_notes_open', String(isNotesOpen));
  }, [isNotesOpen]);

  useEffect(() => {
    if (rollbackSnapshot) {
      safeLocalStorageSet('airiser_rollback_snapshot', JSON.stringify(rollbackSnapshot));
    } else {
      safeLocalStorageSet('airiser_rollback_snapshot', '');
    }
  }, [rollbackSnapshot]);

  useEffect(() => {
    if (preResetSnapshot) {
      safeLocalStorageSet('airiser_prereset_snapshot', JSON.stringify(preResetSnapshot));
    } else {
      safeLocalStorageSet('airiser_prereset_snapshot', '');
    }
  }, [preResetSnapshot]);

  const handleSignIn = async () => {
    await signInWithGoogle();
  };

  const handleSignOut = async () => {
    await firebaseSignOut();
  };

  const handleSyncNow = async () => {
    if (!user) return;
    setIsSyncing(true);
    try {
      await saveUserDataToCloud(user.uid, {
        config,
        tasks,
        stickyNotes,
        notepad: notepadContent,
        logs,
        streak,
      });
      setLastSyncedAt(new Date());
    } catch (err) {
      console.warn('Manual sync error:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  // Active Template linkage and sync controls
  const handleSetActiveTemplate = (tmpl: Template | null, enableAutoSync: boolean = true) => {
    setActiveTemplate(tmpl);
    setIsTemplateAutoSync(enableAutoSync);
    if (tmpl) {
      safeLocalStorageSet('airiser_active_template', JSON.stringify(tmpl));
      safeLocalStorageSet('airiser_template_auto_sync', JSON.stringify(enableAutoSync));
      setRollbackToast({
        message: `⚡ Active template "${tmpl.name}" linked! All workspace updates will auto-sync to this template.`,
        timestamp: Date.now(),
      });
    } else {
      safeLocalStorageSet('airiser_active_template', '');
    }
  };

  const handleToggleTemplateAutoSync = () => {
    setIsTemplateAutoSync((prev) => {
      const next = !prev;
      safeLocalStorageSet('airiser_template_auto_sync', JSON.stringify(next));
      setRollbackToast({
        message: next ? '⚡ Template auto-sync enabled' : '⏸️ Template auto-sync paused',
        timestamp: Date.now(),
      });
      return next;
    });
  };

  const handleDetachActiveTemplate = () => {
    setActiveTemplate(null);
    safeLocalStorageSet('airiser_active_template', '');
    setRollbackToast({
      message: 'Detached active template. Future changes will only save to your personal workspace account.',
      timestamp: Date.now(),
    });
  };

  const handleSyncActiveTemplateNow = async () => {
    if (!activeTemplate) return;
    setIsTemplateSyncing(true);
    try {
      const updatedTmpl: Template = {
        ...activeTemplate,
        config,
        tasks: activeTemplate.tasks !== undefined ? tasks : activeTemplate.tasks,
        stickyNotes: activeTemplate.stickyNotes !== undefined ? stickyNotes : activeTemplate.stickyNotes,
        notepad: activeTemplate.notepad !== undefined ? notepadContent : activeTemplate.notepad,
        thumbnail: config.background.workItems?.[0]?.thumbnailUrl || config.background.workItems?.[0]?.url || activeTemplate.thumbnail,
        updatedAt: new Date().toISOString(),
      };
      const saved = await savePersonalTemplate(user?.uid || 'guest', updatedTmpl);
      setActiveTemplate(saved);
      safeLocalStorageSet('airiser_active_template', JSON.stringify(saved));
      setLastTemplateSyncedAt(new Date());
      setRollbackToast({
        message: `✨ Synced current workspace to template "${saved.name}"!`,
        timestamp: Date.now(),
      });
    } catch (err) {
      console.warn('Failed to sync active template now:', err);
    } finally {
      setIsTemplateSyncing(false);
    }
  };

  // Activate & Apply Full Template (Config, Tasks, Notes, Notepad)
  const handleApplyTemplate = async (
    newConfig: WorkspaceConfig,
    newTasks?: Task[],
    newStickyNotes?: StickyNote[],
    newNotepad?: string,
    appliedTemplate?: Template
  ) => {
    setConfig(newConfig);
    if (newTasks && newTasks.length > 0) {
      setTasks(newTasks);
    }
    if (newStickyNotes && newStickyNotes.length > 0) {
      setStickyNotes(newStickyNotes);
    }
    if (newNotepad !== undefined && newNotepad !== '') {
      setNotepadContent(newNotepad);
    }

    if (appliedTemplate) {
      setActiveTemplate(appliedTemplate);
      safeLocalStorageSet('airiser_active_template', JSON.stringify(appliedTemplate));
      safeLocalStorageSet('airiser_template_auto_sync', JSON.stringify(true));
      setIsTemplateAutoSync(true);
    }

    if (user) {
      setIsSyncing(true);
      try {
        await saveUserDataToCloud(user.uid, {
          config: newConfig,
          tasks: newTasks && newTasks.length > 0 ? newTasks : tasks,
          stickyNotes: newStickyNotes && newStickyNotes.length > 0 ? newStickyNotes : stickyNotes,
          notepad: newNotepad !== undefined && newNotepad !== '' ? newNotepad : notepadContent,
          logs,
          streak,
        });
        setLastSyncedAt(new Date());
      } catch (err) {
        console.warn('Failed to sync applied template to cloud:', err);
      } finally {
        setIsSyncing(false);
      }
    }
  };

  // Handle task additions, updates, completions, and deletions with instant analytics and streak synchronization
  const handleTasksChange = useCallback((newTasks: Task[]) => {
    // Identify tasks that transitioned to completed
    const newlyCompleted = newTasks.filter(
      (nt) => nt.completed && !tasks.find((ot) => ot.id === nt.id && ot.completed)
    );

    const nowIso = new Date().toISOString();
    const todayStr = nowIso.split('T')[0];

    let processedTasks = newTasks;

    if (newlyCompleted.length > 0) {
      // 1. Stamp completion timestamp
      processedTasks = newTasks.map((t) => {
        if (t.completed && !t.completedAt) {
          return { ...t, completedAt: nowIso };
        }
        return t;
      });

      // 2. Instantly update or create today's FocusLog
      setLogs((prevLogs) => {
        const todayLogIndex = prevLogs.findIndex(
          (l) => l.date && l.date.startsWith(todayStr)
        );

        if (todayLogIndex >= 0) {
          const updated = [...prevLogs];
          updated[todayLogIndex] = {
            ...updated[todayLogIndex],
            tasksCompleted: (updated[todayLogIndex].tasksCompleted || 0) + newlyCompleted.length,
          };
          return updated;
        } else {
          const newLog: FocusLog = {
            id: `log-${Date.now()}`,
            date: nowIso,
            totalFocusTime: 0,
            methodUsed: config.method.type,
            tasksCompleted: newlyCompleted.length,
          };
          return [newLog, ...prevLogs];
        }
      });

      // 3. Instantly calculate and update daily streak
      setStreak((prev) => calculateStreakOnActivity(prev));
    } else {
      // Handle unchecked tasks
      const uncompletedTasks = newTasks.filter(
        (nt) => !nt.completed && tasks.find((ot) => ot.id === nt.id && ot.completed)
      );

      if (uncompletedTasks.length > 0) {
        processedTasks = newTasks.map((t) => (!t.completed ? { ...t, completedAt: undefined } : t));

        setLogs((prevLogs) => {
          const todayLogIndex = prevLogs.findIndex(
            (l) => l.date && l.date.startsWith(todayStr)
          );
          if (todayLogIndex >= 0) {
            const updated = [...prevLogs];
            updated[todayLogIndex] = {
              ...updated[todayLogIndex],
              tasksCompleted: Math.max(
                0,
                (updated[todayLogIndex].tasksCompleted || 0) - uncompletedTasks.length
              ),
            };
            return updated;
          }
          return prevLogs;
        });
      }
    }

    setTasks(processedTasks);
  }, [tasks, config.method.type, calculateStreakOnActivity]);

  // Accrue focused seconds incrementally into today's log and streak
  const handleAccrueFocusTime = useCallback((seconds: number) => {
    if (seconds <= 0) return;
    const nowIso = new Date().toISOString();
    const todayStr = nowIso.split('T')[0];

    setLogs((prevLogs) => {
      const todayLogIndex = prevLogs.findIndex(
        (l) => l.date && l.date.startsWith(todayStr)
      );

      let updatedLogs: FocusLog[];
      if (todayLogIndex >= 0) {
        updatedLogs = [...prevLogs];
        updatedLogs[todayLogIndex] = {
          ...updatedLogs[todayLogIndex],
          totalFocusTime: (updatedLogs[todayLogIndex].totalFocusTime || 0) + seconds,
          methodUsed: config.method.type,
        };
      } else {
        const newLog: FocusLog = {
          id: `log-${Date.now()}`,
          date: nowIso,
          totalFocusTime: seconds,
          methodUsed: config.method.type,
          tasksCompleted: tasks.filter((t) => t.completed).length,
        };
        updatedLogs = [newLog, ...prevLogs];
      }
      safeLocalStorageSet('airiser_logs', JSON.stringify(updatedLogs));
      return updatedLogs;
    });

    setStreak((prev) => calculateStreakOnActivity(prev));
  }, [config.method.type, tasks, calculateStreakOnActivity]);

  // Handle cycle completion
  const handleCompleteCycle = useCallback(() => {
    const nowIso = new Date().toISOString();
    const todayStr = nowIso.split('T')[0];

    setLogs((prevLogs) => {
      const todayLogIndex = prevLogs.findIndex(
        (l) => l.date && l.date.startsWith(todayStr)
      );

      if (todayLogIndex >= 0) {
        const updated = [...prevLogs];
        updated[todayLogIndex] = {
          ...updated[todayLogIndex],
          methodUsed: config.method.type,
          tasksCompleted: Math.max(
            updated[todayLogIndex].tasksCompleted || 0,
            tasks.filter((t) => t.completed).length
          ),
        };
        safeLocalStorageSet('airiser_logs', JSON.stringify(updated));
        return updated;
      } else {
        const newLog: FocusLog = {
          id: `log-${Date.now()}`,
          date: nowIso,
          totalFocusTime: 0,
          methodUsed: config.method.type,
          tasksCompleted: tasks.filter((t) => t.completed).length,
        };
        const updated = [newLog, ...prevLogs];
        safeLocalStorageSet('airiser_logs', JSON.stringify(updated));
        return updated;
      }
    });

    // Update streak for today
    setStreak((prev) => calculateStreakOnActivity(prev));

    // Open break reflection modal
    setIsBreakModalOpen(true);
  }, [config.method.type, tasks, calculateStreakOnActivity]);

  const handleSaveBreakNote = (note: string) => {
    setNotepadContent((prev) => prev + `\n\n--- Break Note (${new Date().toLocaleTimeString()}) ---\n${note}`);
  };

  // Add / update custom image in persistent library
  const handleSaveCustomImage = useCallback(
    async (imageRecord: CustomImageRecord) => {
      setCustomImages((prev) => {
        const filtered = prev.filter((i) => i.id !== imageRecord.id);
        const updated = [imageRecord, ...filtered];
        if (user) {
          saveCustomImagesToCloud(user.uid, updated).catch((err) =>
            console.warn('Failed to save custom image to cloud:', err)
          );
        }
        return updated;
      });
    },
    [user]
  );

  // Delete custom image from persistent library
  const handleDeleteCustomImage = useCallback(
    async (imageId: string) => {
      setCustomImages((prev) => {
        const updated = prev.filter((i) => i.id !== imageId);
        if (user) {
          saveCustomImagesToCloud(user.uid, updated).catch((err) =>
            console.warn('Failed to delete custom image from cloud:', err)
          );
        }
        return updated;
      });
    },
    [user]
  );

  // Reset all workspace customizations while preserving user custom images in cloud storage
  const handleResetToDefault = async () => {
    // 1. Take a full snapshot of pre-reset configuration
    const snapshot: RollbackSnapshot = {
      id: `snapshot-${Date.now()}`,
      snapshotId: `snapshot-${Date.now()}`,
      timestamp: new Date().toISOString(),
      config: { ...config },
      tasks: [...tasks],
      stickyNotes: [...stickyNotes],
      notepad: notepadContent,
      customImagesCount: customImages.length,
      reason: 'pre_reset',
    };
    setPreResetSnapshot(config);
    setRollbackSnapshot(snapshot);

    // 2. Extract and preserve all custom & clipboard images with storage preservation flags
    const presetWorkIds = new Set(PRESET_BACKGROUNDS.map((p) => p.id));
    const presetBreakIds = new Set(PRESET_BREAK_BACKGROUNDS.map((p) => p.id));

    const allPreservedMap = new Map<string, CustomImageRecord>();
    customImages.forEach((img) => {
      allPreservedMap.set(img.id, {
        ...img,
        isPreservedAfterReset: true,
        hasResetCustoms: true,
      });
    });

    (config.background?.workItems || []).forEach((item) => {
      if (!presetWorkIds.has(item.id) || item.isCustom || item.source) {
        allPreservedMap.set(item.id, {
          id: item.id,
          title: item.title,
          type: item.type,
          url: item.url,
          thumbnailUrl: item.thumbnailUrl,
          source: item.source || 'custom_url',
          isCustom: true,
          isPreservedAfterReset: true,
          hasResetCustoms: true,
          addedAt: item.addedAt || new Date().toISOString(),
        });
      }
    });

    (config.background?.breakItems || []).forEach((item) => {
      if (!presetBreakIds.has(item.id) || item.isCustom || item.source) {
        allPreservedMap.set(item.id, {
          id: item.id,
          title: item.title,
          type: item.type,
          url: item.url,
          thumbnailUrl: item.thumbnailUrl,
          source: item.source || 'custom_url',
          isCustom: true,
          isPreservedAfterReset: true,
          hasResetCustoms: true,
          addedAt: item.addedAt || new Date().toISOString(),
        });
      }
    });

    const updatedCustomImagesList = Array.from(allPreservedMap.values());
    setCustomImages(updatedCustomImagesList);

    // 3. Assemble clean default workspace
    const cleanDefaultConfig: WorkspaceConfig = {
      ...DEFAULT_WORKSPACE_CONFIG,
      background: {
        ...DEFAULT_WORKSPACE_CONFIG.background,
        workItems: [PRESET_BACKGROUNDS[0]],
        breakItems: [PRESET_BREAK_BACKGROUNDS[0]],
      },
    };

    setConfig(cleanDefaultConfig);
    setRollbackToast({
      message: 'Workspace reset to defaults. Custom images preserved with rollback snapshot.',
      timestamp: Date.now(),
    });

    // 4. Persist snapshot & preserved images to Cloud Storage / Firestore
    if (user) {
      saveRollbackSnapshotToCloud(user.uid, snapshot).catch((err) =>
        console.warn('Failed to save rollback snapshot to cloud:', err)
      );
      saveCustomImagesToCloud(user.uid, updatedCustomImagesList).catch((err) =>
        console.warn('Failed to save preserved images to cloud:', err)
      );
      saveUserDataToCloud(user.uid, {
        config: cleanDefaultConfig,
        tasks,
        stickyNotes,
        notepad: notepadContent,
        logs,
        streak,
        customImages: updatedCustomImagesList,
        rollbackSnapshot: snapshot,
      }).catch((err) => console.warn('Failed to sync reset state to cloud:', err));
    }
  };

  // Complete factory reset: resets all customized settings, panel coordinates/locations, and custom image library
  const handleResetAllCustom = async () => {
    // 1. Take a full snapshot of pre-reset configuration
    const snapshot: RollbackSnapshot = {
      id: `snapshot-${Date.now()}`,
      snapshotId: `snapshot-${Date.now()}`,
      timestamp: new Date().toISOString(),
      config: { ...config },
      tasks: [...tasks],
      stickyNotes: [...stickyNotes],
      notepad: notepadContent,
      customImagesCount: customImages.length,
      reason: 'pre_reset',
    };
    setPreResetSnapshot(config);
    setRollbackSnapshot(snapshot);

    // 2. Clear custom images library
    setCustomImages([]);

    // 3. Reset sticky notes and tasks to factory defaults & positions
    setStickyNotes(DEFAULT_STICKY_NOTES);
    setTasks(DEFAULT_TASKS);
    setNotepadContent(DEFAULT_NOTEPAD);

    // Clear local storage positions
    localStorage.removeItem('airiser_audio_position');
    localStorage.removeItem('airiser_header_position');
    localStorage.removeItem('airiser_dock_position');
    localStorage.removeItem('airiser_timer_position');
    localStorage.removeItem('airiser_tasks_position');
    localStorage.removeItem('airiser_notepad_position');
    localStorage.removeItem('airiser_ai_chat_position');
    window.dispatchEvent(new CustomEvent('reset-audio-position'));
    window.dispatchEvent(new CustomEvent('reset-all-positions'));

    // 4. Restore pure factory default workspace (all coordinates/positions reset to {0,0})
    const factoryDefaultConfig: WorkspaceConfig = {
      ...DEFAULT_WORKSPACE_CONFIG,
      layout: {
        ...DEFAULT_WORKSPACE_CONFIG.layout,
        timerPosition: 'center',
        positions: {
          timer: { x: 0, y: 0 },
          musicBar: { x: 0, y: 0 },
          tasks: { x: 0, y: 0 },
          notepad: { x: 0, y: 0 },
        },
      },
      background: {
        ...DEFAULT_WORKSPACE_CONFIG.background,
        workItems: [PRESET_BACKGROUNDS[0]],
        breakItems: [PRESET_BREAK_BACKGROUNDS[0]],
      },
    };

    setConfig(factoryDefaultConfig);
    setRollbackToast({
      message: 'Reset all custom settings, panel locations, and images. Rollback snapshot saved.',
      timestamp: Date.now(),
    });

    // 5. Persist to Cloud Storage / Firestore
    if (user) {
      saveRollbackSnapshotToCloud(user.uid, snapshot).catch((err) =>
        console.warn('Failed to save rollback snapshot to cloud:', err)
      );
      saveCustomImagesToCloud(user.uid, []).catch((err) =>
        console.warn('Failed to clear custom images in cloud:', err)
      );
      saveUserDataToCloud(user.uid, {
        config: factoryDefaultConfig,
        tasks: DEFAULT_TASKS,
        stickyNotes: DEFAULT_STICKY_NOTES,
        notepad: DEFAULT_NOTEPAD,
        logs,
        streak,
        customImages: [],
        rollbackSnapshot: snapshot,
      }).catch((err) => console.warn('Failed to sync full reset state to cloud:', err));
    }
  };

  // Rollback to previous version before reset
  const handleRollback = async () => {
    if (!preResetSnapshot && !rollbackSnapshot) return;
    const restoredConfig = rollbackSnapshot?.config || preResetSnapshot!;
    setConfig(restoredConfig);
    if (rollbackSnapshot?.tasks && rollbackSnapshot.tasks.length > 0) setTasks(rollbackSnapshot.tasks);
    if (rollbackSnapshot?.stickyNotes && rollbackSnapshot.stickyNotes.length > 0) setStickyNotes(rollbackSnapshot.stickyNotes);
    if (rollbackSnapshot?.notepad !== undefined) setNotepadContent(rollbackSnapshot.notepad);

    setPreResetSnapshot(null);
    setRollbackSnapshot(null);
    if (user) {
      clearRollbackSnapshotFromCloud(user.uid).catch((err) =>
        console.warn('Failed to clear cloud rollback snapshot:', err)
      );
    }

    setRollbackToast({
      message: 'Restored your previous customized workspace version from snapshot.',
      timestamp: Date.now(),
    });
  };

  // 1. Initial Authentication Loading State
  if (isAuthLoading) {
    return (
      <div className="min-h-screen w-full bg-slate-950 flex flex-col items-center justify-center text-slate-200 select-none">
        <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mb-4 animate-pulse">
          <SparklesIcon className="w-6 h-6 animate-spin text-indigo-400" />
        </div>
        <div className="text-sm font-semibold text-white tracking-tight">Focus Atmosphere</div>
        <div className="text-xs text-slate-500 mt-1">Connecting secure workspace...</div>
      </div>
    );
  }

  // 2. Unauthenticated Gate: Surprise Interactive Landing Page
  if (!user && !isGuestMode) {
    return (
      <LandingPage
        onSignIn={handleSignIn}
        onExploreGuest={() => setIsGuestMode(true)}
        isLoading={isAuthLoading}
      />
    );
  }

  // 3. Authenticated Full Workspace
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#0a0502] text-[#e0d8d0] font-sans select-none">
      
      {/* 1. Background Video / Image / Motion Layer */}
      <BackgroundLayer
        backgroundConfig={config.background}
        appearance={config.appearance}
        timerStatus={timerStatus}
      />

      {/* 2. Floating User & Command Badge + Minimalist Dock */}
      <FloatingWorkspaceBadge
        user={user}
        isLoading={isAuthLoading}
        isSyncing={isSyncing}
        lastSyncedAt={lastSyncedAt}
        currentStreak={streak.currentStreak}
        viewMode={viewMode}
        pendingTasksCount={tasks.filter((t) => !t.completed).length}
        searchBarElement={
          <GlobalSearchBar
            config={config}
            tasks={tasks}
            stickyNotes={stickyNotes}
            notepadContent={notepadContent}
            user={user}
            activeTemplate={activeTemplate}
            timerStatus={timerStatus}
            currentStreak={streak.currentStreak}
            onApplyTemplate={handleApplyTemplate}
            onChangeConfig={setConfig}
            onChangeTasks={handleTasksChange}
            onChangeStickyNotes={setStickyNotes}
            onChangeNotepad={setNotepadContent}
            onToggleTasks={() => setIsTasksOpen(!isTasksOpen)}
            onToggleNotes={() => setIsNotesOpen(!isNotesOpen)}
            onToggleCustomizer={(tab) => {
              setCustomizerInitialTab(tab || 'background');
              setIsCustomizerOpen(true);
            }}
            onToggleAudio={() => {
              if (viewMode === 'zen') setViewMode('fullscreen');
              window.dispatchEvent(new CustomEvent('reset-audio-position'));
              setCustomizerInitialTab('audio');
              setIsCustomizerOpen(true);
            }}
            onToggleStats={() => setIsStatsOpen(true)}
            onToggleTemplates={() => setIsTemplatesOpen(true)}
            onToggleMarketplace={() => setIsMarketplaceOpen(true)}
            onToggleRooms={() => setIsRoomsOpen(true)}
            onToggleAiChat={() => setIsAiChatOpen(!isAiChatOpen)}
            onToggleSoundGenerator={() => setIsSoundGenOpen(true)}
            onToggleZenMode={() => setViewMode(viewMode === 'zen' ? 'fullscreen' : 'zen')}
            onSetTimerStatus={setTimerStatus}
            onRollback={handleRollback}
            canRollback={!!preResetSnapshot || !!rollbackSnapshot}
            onShowToast={(message) => {
              setRollbackToast({
                message,
                timestamp: Date.now(),
              });
            }}
          />
        }
        onOpenSearch={() => {
          // Trigger global search shortcut
          window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }));
        }}
        onSignIn={handleSignIn}
        onSignOut={handleSignOut}
        onSyncNow={handleSyncNow}
        onToggleCustomizer={(tab) => {
          setCustomizerInitialTab(tab || 'background');
          setIsCustomizerOpen(true);
        }}
        onToggleAudio={() => {
          if (viewMode === 'zen') setViewMode('fullscreen');
          window.dispatchEvent(new CustomEvent('reset-audio-position'));
          setCustomizerInitialTab('audio');
          setIsCustomizerOpen(true);
        }}
        onToggleTasks={() => setIsTasksOpen(!isTasksOpen)}
        onToggleNotes={() => setIsNotesOpen(!isNotesOpen)}
        onToggleStats={() => setIsStatsOpen(true)}
        onToggleTemplates={() => setIsTemplatesOpen(true)}
        onToggleMarketplace={() => setIsMarketplaceOpen(true)}
        onToggleRooms={() => setIsRoomsOpen(true)}
        onToggleAiChat={() => setIsAiChatOpen(!isAiChatOpen)}
        onToggleZenMode={() => setViewMode(viewMode === 'zen' ? 'fullscreen' : 'zen')}
        onToggleSoundGenerator={() => setIsSoundGenOpen(true)}
      />

      {/* 3. Main Center Focus Canvas Area */}
      <main className="relative flex flex-col items-center justify-center h-full px-4 pointer-events-none">
        
        {/* Main Countdown Timer Widget */}
        <TimerWidget
          methodConfig={config.method}
          status={timerStatus}
          onStatusChange={setTimerStatus}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          onCompleteCycle={handleCompleteCycle}
          onAccrueFocusTime={handleAccrueFocusTime}
          onOpenMethodCustomizer={() => {
            setCustomizerInitialTab('method');
            setActiveCustomizingPanel('timer');
            setIsCustomizerOpen(true);
          }}
          appearance={config.appearance}
          onUpdateAppearance={(changes) =>
            setConfig((prev) => ({
              ...prev,
              appearance: {
                ...(prev.appearance || {}),
                ...changes,
              },
            }))
          }
          isHighlighted={isCustomizerOpen && (activeCustomizingPanel === 'timer' || customizerInitialTab === 'method')}
        />

      </main>

      {/* 4. Floating Audio Mixer Widget */}
      {viewMode !== 'zen' && (config.appearance?.showMusicBar ?? true) && (
        <AudioPlayer
          audioConfig={config.audio}
          onChangeAudioConfig={(audio) => setConfig({ ...config, audio })}
          timerStatus={timerStatus}
          appearance={config.appearance}
          isHighlighted={isCustomizerOpen && (activeCustomizingPanel === 'music' || customizerInitialTab === 'audio')}
          onOpenSoundGenerator={() => setIsSoundGenOpen(true)}
          onUpdateAppearance={(changes) =>
            setConfig({
              ...config,
              appearance: {
                ...(config.appearance || {}),
                ...changes,
              },
            })
          }
        />
      )}

      {/* 5. Canvas Floating Sticky Notes */}
      {viewMode !== 'zen' && (config.appearance?.showStickyNotes ?? true) && (
        <StickyNotesCanvas
          notes={stickyNotes}
          onChangeNotes={setStickyNotes}
          isHighlighted={isCustomizerOpen && activeCustomizingPanel === 'notes'}
        />
      )}

      {/* 6. Session Task Planner Sidebar */}
      <TaskPlannerSidebar
        tasks={tasks}
        onChangeTasks={handleTasksChange}
        isOpen={isTasksOpen}
        onClose={() => setIsTasksOpen(false)}
        onOpenSoundGenerator={() => setIsSoundGenOpen(true)}
      />

      {/* 7. Focus Notepad Panel */}
      <NotepadPanel
        content={notepadContent}
        onChangeContent={setNotepadContent}
        isOpen={isNotesOpen}
        onClose={() => setIsNotesOpen(false)}
        onOpenSoundGenerator={() => setIsSoundGenOpen(true)}
      />

      {/* 8. AI Study Assistant Chat */}
      <AiAssistantPanel
        isOpen={isAiChatOpen}
        onClose={() => setIsAiChatOpen(false)}
        tasks={tasks}
        notes={notepadContent}
      />

      {/* 9. Workspace Customizer Drawer */}
      <CustomizerDrawer
        isOpen={isCustomizerOpen}
        onClose={() => {
          setIsCustomizerOpen(false);
          setActiveCustomizingPanel(null);
        }}
        config={config}
        onChangeConfig={setConfig}
        initialTab={customizerInitialTab}
        savedCustomImages={customImages}
        onSaveCustomImage={handleSaveCustomImage}
        onDeleteCustomImage={handleDeleteCustomImage}
        onResetToDefault={handleResetToDefault}
        onResetAllCustom={handleResetAllCustom}
        onRollback={handleRollback}
        canRollback={!!preResetSnapshot || !!rollbackSnapshot}
        rollbackSnapshot={rollbackSnapshot}
        onCustomizingPanelChange={setActiveCustomizingPanel}
        onOpenTemplates={() => {
          setIsCustomizerOpen(false);
          setIsTemplatesOpen(true);
        }}
        onOpenMarketplace={() => {
          setIsCustomizerOpen(false);
          setIsMarketplaceOpen(true);
        }}
        onOpenRooms={() => {
          setIsCustomizerOpen(false);
          setIsRoomsOpen(true);
        }}
        onOpenStats={() => {
          setIsCustomizerOpen(false);
          setIsStatsOpen(true);
        }}
        onOpenTasks={() => {
          setIsCustomizerOpen(false);
          setIsTasksOpen(true);
        }}
        onOpenNotes={() => {
          setIsCustomizerOpen(false);
          setIsNotesOpen(true);
        }}
        onOpenAiChat={() => {
          setIsCustomizerOpen(false);
          setIsAiChatOpen(true);
        }}
        onOpenSoundGenerator={() => {
          setIsCustomizerOpen(false);
          setIsSoundGenOpen(true);
        }}
      />

      {/* 10. Modals */}
      <BreakReflectionModal
        isOpen={isBreakModalOpen}
        tasks={tasks}
        onClose={() => setIsBreakModalOpen(false)}
        onSaveBreakNote={handleSaveBreakNote}
      />

      <TemplateModal
        isOpen={isTemplatesOpen}
        onClose={() => setIsTemplatesOpen(false)}
        user={user}
        currentConfig={config}
        currentTasks={tasks}
        currentStickyNotes={stickyNotes}
        currentNotepad={notepadContent}
        roomParticipants={roomState?.participants || []}
        onApplyTemplate={handleApplyTemplate}
        activeTemplate={activeTemplate}
        isTemplateAutoSync={isTemplateAutoSync}
        isTemplateSyncing={isTemplateSyncing}
        lastTemplateSyncedAt={lastTemplateSyncedAt}
        onSetActiveTemplate={handleSetActiveTemplate}
        onToggleTemplateAutoSync={handleToggleTemplateAutoSync}
        onDetachActiveTemplate={handleDetachActiveTemplate}
        onSyncActiveTemplateNow={handleSyncActiveTemplateNow}
        onOpenMarketplace={() => {
          setIsTemplatesOpen(false);
          setIsMarketplaceOpen(true);
        }}
      />

      <MarketplaceModal
        isOpen={isMarketplaceOpen}
        onClose={() => setIsMarketplaceOpen(false)}
        user={user}
        currentConfig={config}
        currentTasks={tasks}
        currentStickyNotes={stickyNotes}
        currentNotepad={notepadContent}
        onApplyTemplate={handleApplyTemplate}
      />

      <StatsAnalyticsModal
        isOpen={isStatsOpen}
        onClose={() => setIsStatsOpen(false)}
        tasks={tasks}
        logs={logs}
        streak={streak}
        userEmail={user?.email}
        isCloudSyncActive={!!user}
      />

      <RealtimeRoomModal
        isOpen={isRoomsOpen}
        onClose={() => setIsRoomsOpen(false)}
        roomState={roomState}
        onRoomStateChange={setRoomState}
        currentTimerStatus={timerStatus}
        currentUser={user}
        currentConfig={config}
        onApplyAtmosphere={(newConfig) => {
          setConfig(newConfig);
          setRollbackToast({
            message: '✨ Synchronized room atmosphere & background from Host',
            timestamp: Date.now(),
          });
        }}
        onSendReaction={handleSendReaction}
      />

      {/* Floating Live Room Pill */}
      {roomState && (
        <LiveRoomFloatingBar
          roomState={roomState}
          onOpenRoomModal={() => setIsRoomsOpen(true)}
          onLeaveRoom={() => setRoomState(null)}
          onSendReaction={handleSendReaction}
        />
      )}

      {/* Live Floating Reaction Bubbles Animation */}
      {floatingReactions.map((reaction) => (
        <div
          key={reaction.id}
          style={{ left: `${reaction.left}%` }}
          className="fixed bottom-16 z-50 pointer-events-none text-3xl sm:text-4xl animate-bounce duration-1000 transition transform -translate-x-1/2 drop-shadow-2xl"
        >
          <span className="inline-block animate-pulse">{reaction.emoji}</span>
        </div>
      ))}

      {/* AI Sound Generator Modal */}
      <AiSoundGeneratorModal
        isOpen={isSoundGenOpen}
        onClose={() => setIsSoundGenOpen(false)}
        tasks={tasks}
        notes={notepadContent}
        focusMethod={config.method.type}
        audioConfig={config.audio}
        onChangeAudioConfig={(newAudio) => setConfig((prev) => ({ ...prev, audio: newAudio }))}
        onShowToast={(msg) => setRollbackToast({ message: msg, timestamp: Date.now() })}
      />

      {/* 11. Interactive Daily Streak Advancement Toast */}
      {streakToast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-2.5 bg-gradient-to-r from-amber-950/95 via-slate-900/95 to-slate-900/95 border border-amber-500/40 shadow-2xl backdrop-blur-xl rounded-2xl text-slate-100 text-xs animate-in fade-in slide-in-from-top-4 duration-300 pointer-events-auto">
          <div className="p-1 bg-amber-500/20 rounded-lg text-amber-400">
            <Flame className="w-4 h-4 fill-amber-400 animate-bounce" />
          </div>
          <div>
            <p className="font-bold text-amber-300">{streakToast.message}</p>
            <p className="text-[10px] text-slate-400">
              {user ? `Saved to your cloud database account (${user.email})` : 'Stored locally. Sign in to sync across devices.'}
            </p>
          </div>
          <button
            onClick={() => setStreakToast(null)}
            className="p-1 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition ml-2"
            title="Dismiss"
          >
            <CloseIcon className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 12. Floating Rollback & Reset Toast Notification */}
      {rollbackToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-2.5 bg-slate-900/95 border border-slate-700/80 shadow-2xl backdrop-blur-xl rounded-2xl text-slate-100 text-xs animate-in fade-in slide-in-from-bottom-4 duration-200 pointer-events-auto">
          <div className="flex items-center gap-2">
            <RotateCcw className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <span className="font-medium text-slate-200">{rollbackToast.message}</span>
          </div>

          {preResetSnapshot && (
            <button
              onClick={handleRollback}
              className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 hover:text-amber-200 font-semibold rounded-lg transition flex items-center gap-1.5 shadow-sm"
            >
              <Undo2 className="w-3 h-3" />
              <span>Rollback Version</span>
            </button>
          )}

          <button
            onClick={() => setRollbackToast(null)}
            className="p-1 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition ml-1"
            title="Dismiss"
          >
            <CloseIcon className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 13. Floating Active Template Auto-Sync Pill */}
      {activeTemplate && (
        <div className="fixed bottom-6 left-6 z-40 hidden sm:flex items-center gap-2.5 p-1.5 pl-3 pr-2 bg-slate-950/90 hover:bg-slate-950 border border-indigo-500/40 hover:border-indigo-500/70 rounded-2xl shadow-2xl backdrop-blur-xl text-slate-100 text-xs animate-in fade-in slide-in-from-bottom-2 duration-300 transition group">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-xl bg-indigo-500/20 text-indigo-400">
              <LayoutIcon className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0 max-w-[150px] md:max-w-[220px]">
              <div className="font-bold text-white text-[11px] truncate flex items-center gap-1">
                <span>{activeTemplate.name}</span>
                {activeTemplate.isGroup === 1 && (
                  <span className="px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-300 text-[8px] font-semibold">
                    Group
                  </span>
                )}
              </div>
              <div className="text-[9px] text-slate-400 flex items-center gap-1.5">
                <span
                  className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                    !isTemplateAutoSync
                      ? 'bg-slate-500'
                      : isTemplateSyncing
                      ? 'bg-amber-400 animate-ping'
                      : 'bg-emerald-400'
                  }`}
                />
                <span className="truncate">
                  {!isTemplateAutoSync
                    ? 'Auto-sync paused'
                    : isTemplateSyncing
                    ? 'Syncing changes...'
                    : 'Auto-syncing to template'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 pl-1.5 border-l border-slate-800">
            <button
              onClick={handleSyncActiveTemplateNow}
              disabled={isTemplateSyncing}
              className="p-1.5 text-slate-300 hover:text-white rounded-lg hover:bg-slate-800 transition disabled:opacity-50"
              title="Sync current workspace to template now"
            >
              <RefreshCwIcon className={`w-3.5 h-3.5 ${isTemplateSyncing ? 'animate-spin text-indigo-400' : ''}`} />
            </button>
            <button
              onClick={() => setIsTemplatesOpen(true)}
              className="px-2 py-1 bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 hover:text-indigo-200 text-[10px] font-semibold rounded-lg transition"
              title="Manage Template"
            >
              Manage
            </button>
            <button
              onClick={handleDetachActiveTemplate}
              className="p-1 text-slate-400 hover:text-rose-300 rounded-lg hover:bg-slate-800 transition"
              title="Stop auto-syncing to this template (Detach)"
            >
              <CloseIcon className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

    </div>
  );
}

export default App;
