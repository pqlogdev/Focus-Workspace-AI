import { WorkspaceConfig, Task, StickyNote } from '../types';
import { PRESET_BACKGROUNDS, PRESET_BREAK_BACKGROUNDS } from './presetBackgrounds';
import { PRESET_MUSIC_TRACKS, PRESET_BREAK_MUSIC_TRACKS, PRESET_AMBIENT_TRACKS } from './presetAudio';

export const DEFAULT_WORKSPACE_CONFIG: WorkspaceConfig = {
  background: {
    mode: 'fixed',
    workItems: [PRESET_BACKGROUNDS[0]],
    breakItems: [PRESET_BREAK_BACKGROUNDS[0]],
    transition: {
      effect: 'crossfade',
      trigger: 'time',
    },
  },
  audio: {
    musicTrack: PRESET_MUSIC_TRACKS[0],
    musicPlaylist: {
      tracks: PRESET_MUSIC_TRACKS,
      shuffleEnabled: false,
    },
    ambientTracks: PRESET_AMBIENT_TRACKS.map((t, index) => ({
      ...t,
      active: index === 0, // Enable gentle rain by default at subtle volume
      volume: index === 0 ? 0.35 : 0.4,
    })),
    ambientPlaylist: {
      tracks: PRESET_AMBIENT_TRACKS,
      shuffleEnabled: false,
    },
    breakMusicPlaylist: PRESET_BREAK_MUSIC_TRACKS,
    breakAmbientPreset: 'rain-soft',
    musicVolume: 0.7,
    ambientVolume: 0.5,
    isMuted: false,
  },
  method: {
    type: 'pomodoro',
    workDuration: 1500, // 25 min
    breakDuration: 300, // 5 min
    longBreakDuration: 900, // 15 min
    cyclesBeforeLongBreak: 4,
    totalCycles: null,
    autoPauseOnTabSwitch: true,
    autoPauseOnIdle: true,
    idleTimeoutMinutes: 5,
    stateLabels: {
      focus: 'Deep Focus',
      break: 'Refresh Break',
      longBreak: 'Deep Rest',
      end: 'Session Complete',
    },
  },
  layout: {
    timerPosition: 'center',
    notepadOpen: false,
    tasksOpen: false,
    visiblePanels: ['timer', 'music', 'stickyNotes'],
    positions: {
      timer: { x: 0, y: 0 },
      musicBar: { x: 0, y: 0 },
      tasks: { x: 0, y: 0 },
      notepad: { x: 0, y: 0 },
    },
    opacity: { card: 0.85 },
  },
  appearance: {
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
    autoPauseOnTabSwitch: true,
    autoPauseOnIdle: true,
    idleTimeoutMinutes: 5,
  },
  viewMode: 'fullscreen',
};

export const DEFAULT_TASKS: Task[] = [
  {
    id: 'task-1',
    title: 'Define primary goals for this focus sprint',
    completed: false,
    priority: 'high',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'task-2',
    title: 'Review notes and organize workspace layout',
    completed: false,
    priority: 'medium',
    createdAt: new Date().toISOString(),
  },
];

export const DEFAULT_STICKY_NOTES: StickyNote[] = [
  {
    id: 'note-welcome',
    text: 'Welcome to your private Focus Atmosphere.\n\n• Press Space to Start / Pause\n• Drag panels and adjust ambience\n• Publish & copy templates anytime!',
    color: 'Yellow',
    x: 60,
    y: 110,
    width: 240,
    height: 180,
    isPinned: false,
  },
];

export const DEFAULT_NOTEPAD = `# Focus Session Scratchpad

## Objectives
- [ ] Deep focus block on core project
- [ ] Take a 5-minute hydration & stretch break

## Insights & Breakthroughs
- 
`;
