import React, { useState, useEffect, useRef, useCallback } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import {
  auth,
  signInWithGoogle,
  signOut as firebaseSignOut,
  loadUserDataFromCloud,
  saveUserDataToCloud,
  saveCustomImagesToCloud,
  saveRollbackSnapshotToCloud,
  clearRollbackSnapshotFromCloud,
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
} from './types';
import {
  DEFAULT_WORKSPACE_CONFIG,
  DEFAULT_TASKS,
  DEFAULT_STICKY_NOTES,
  DEFAULT_NOTEPAD,
} from './data/defaultWorkspace';
import { PRESET_BACKGROUNDS, PRESET_BREAK_BACKGROUNDS } from './data/presetBackgrounds';
import { safeLocalStorageSet } from './utils/storage';
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
import { AiAssistantPanel } from './components/AiAssistantPanel';
import { CustomizerDrawer } from './components/CustomizerDrawer';
import { FloatingWorkspaceBadge } from './components/FloatingWorkspaceBadge';
import { LandingPage } from './components/LandingPage';
import { Sparkles as SparklesIcon, Undo2, RotateCcw, X as CloseIcon, ShieldCheck } from 'lucide-react';

export function App() {
  // 1. Core Workspace Config State
  const [config, setConfig] = useState<WorkspaceConfig>(DEFAULT_WORKSPACE_CONFIG);

  // 2. Timer & View Mode State
  const [timerStatus, setTimerStatus] = useState<TimerStatus>('PENDING');
  const [viewMode, setViewMode] = useState<ViewMode>('fullscreen');

  // 3. Modals & Sidebars Visibility States
  const [isCustomizerOpen, setIsCustomizerOpen] = useState(false);
  const [customizerInitialTab, setCustomizerInitialTab] = useState<'background' | 'audio' | 'method' | 'appearance'>('background');
  const [activeCustomizingPanel, setActiveCustomizingPanel] = useState<'timer' | 'music' | 'notes' | 'canvas' | null>(null);
  const [isTasksOpen, setIsTasksOpen] = useState(false);
  const [isNotesOpen, setIsNotesOpen] = useState(false);
  const [isStatsOpen, setIsStatsOpen] = useState(false);
  const [isTemplatesOpen, setIsTemplatesOpen] = useState(false);
  const [isMarketplaceOpen, setIsMarketplaceOpen] = useState(false);
  const [isRoomsOpen, setIsRoomsOpen] = useState(false);
  const [isAiChatOpen, setIsAiChatOpen] = useState(false);
  const [isBreakModalOpen, setIsBreakModalOpen] = useState(false);

  // 4. Tasks, Notes, Logs & Streaks
  const [tasks, setTasks] = useState<Task[]>(DEFAULT_TASKS);
  const [stickyNotes, setStickyNotes] = useState<StickyNote[]>(DEFAULT_STICKY_NOTES);
  const [notepadContent, setNotepadContent] = useState<string>(DEFAULT_NOTEPAD);
  const [logs, setLogs] = useState<FocusLog[]>([]);
  const [streak, setStreak] = useState<Streak>({
    currentStreak: 1,
    longestStreak: 1,
    lastFocusDate: new Date().toISOString(),
    milestones: [3, 7, 14, 30],
  });

  const [roomState, setRoomState] = useState<RoomState | null>(null);

  // 5. Custom Images Library & Reset / Rollback System State
  const [customImages, setCustomImages] = useState<CustomImageRecord[]>([]);
  const [preResetSnapshot, setPreResetSnapshot] = useState<WorkspaceConfig | null>(null);
  const [rollbackSnapshot, setRollbackSnapshot] = useState<RollbackSnapshot | null>(null);
  const [rollbackToast, setRollbackToast] = useState<{ message: string; timestamp: number } | null>(null);

  // 6. Firebase Auth & Cloud Sync State
  const [user, setUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const hasHydratedFromCloud = useRef<boolean>(false);
  const syncTimeoutRef = useRef<any>(null);

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
        // Reset local workspace to clean defaults when unauthenticated or signed out
        hasHydratedFromCloud.current = false;
        setConfig(DEFAULT_WORKSPACE_CONFIG);
        setTasks(DEFAULT_TASKS);
        setStickyNotes(DEFAULT_STICKY_NOTES);
        setNotepadContent(DEFAULT_NOTEPAD);
        setLogs([]);
        setCustomImages([]);
        setPreResetSnapshot(null);
        setRollbackSnapshot(null);
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
    if (!hasHydratedFromCloud.current && user) return;
    safeLocalStorageSet('airiser_streak', JSON.stringify(streak));
    triggerCloudSync();
  }, [streak, triggerCloudSync, user]);

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

  // Activate & Apply Full Template (Config, Tasks, Notes, Notepad)
  const handleApplyTemplate = async (
    newConfig: WorkspaceConfig,
    newTasks?: Task[],
    newStickyNotes?: StickyNote[],
    newNotepad?: string
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

  // Handle cycle completion
  const handleCompleteCycle = () => {
    const newLog: FocusLog = {
      id: `log-${Date.now()}`,
      date: new Date().toISOString(),
      totalFocusTime: config.method.workDuration,
      methodUsed: config.method.type,
      tasksCompleted: tasks.filter((t) => t.completed).length,
    };
    setLogs((prev) => [newLog, ...prev]);

    // Update streak
    const today = new Date().toDateString();
    const lastDate = new Date(streak.lastFocusDate).toDateString();
    if (today !== lastDate) {
      setStreak((prev) => ({
        ...prev,
        currentStreak: prev.currentStreak + 1,
        longestStreak: Math.max(prev.longestStreak, prev.currentStreak + 1),
        lastFocusDate: new Date().toISOString(),
      }));
    }

    // Open break reflection modal
    setIsBreakModalOpen(true);
  };

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
  if (!user) {
    return (
      <LandingPage
        onSignIn={handleSignIn}
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
          onOpenMethodCustomizer={() => {
            setCustomizerInitialTab('method');
            setActiveCustomizingPanel('timer');
            setIsCustomizerOpen(true);
          }}
          appearance={config.appearance}
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
        onChangeTasks={setTasks}
        isOpen={isTasksOpen}
        onClose={() => setIsTasksOpen(false)}
      />

      {/* 7. Focus Notepad Panel */}
      <NotepadPanel
        content={notepadContent}
        onChangeContent={setNotepadContent}
        isOpen={isNotesOpen}
        onClose={() => setIsNotesOpen(false)}
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
        onApplyTemplate={handleApplyTemplate}
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
        logs={logs}
        streak={streak}
      />

      <RealtimeRoomModal
        isOpen={isRoomsOpen}
        onClose={() => setIsRoomsOpen(false)}
        onRoomStateChange={setRoomState}
        currentTimerStatus={timerStatus}
      />

      {/* 11. Floating Rollback & Reset Toast Notification */}
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

    </div>
  );
}

export default App;
