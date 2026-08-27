import { Template } from '../types';
import { PRESET_BACKGROUNDS, PRESET_BREAK_BACKGROUNDS } from './presetBackgrounds';
import { PRESET_MUSIC_TRACKS, PRESET_BREAK_MUSIC_TRACKS, PRESET_AMBIENT_TRACKS } from './presetAudio';

export const PRESET_TEMPLATES: Template[] = [
  {
    id: 'template-tokyo-rain',
    creatorId: 'official-focus-workspace',
    creatorName: 'Focus Workspace Curated',
    name: 'Tokyo Rainy Cafe Lofi',
    description: 'Immerse in Tokyo neon rain with gentle rain sound, lofi beats, and 25/5 Pomodoro focus cycles.',
    tags: ['Lofi', 'Rain', 'Pomodoro', 'Tokyo', 'Cozy'],
    thumbnail: PRESET_BACKGROUNDS[1].url,
    config: {
      method: {
        type: 'pomodoro',
        workDuration: 1500, // 25 min
        breakDuration: 300, // 5 min
        longBreakDuration: 900, // 15 min
        cyclesBeforeLongBreak: 4,
        totalCycles: null,
        stateLabels: {
          focus: 'Deep Focus Session',
          break: 'Tea & Stretch Break',
          longBreak: 'Extended Rest',
          end: 'Session Complete',
        },
      },
      background: {
        mode: 'playlist',
        workItems: [PRESET_BACKGROUNDS[1], PRESET_BACKGROUNDS[0]],
        breakItems: [PRESET_BREAK_BACKGROUNDS[0]],
        transition: {
          effect: 'crossfade',
          trigger: 'time',
        },
      },
      audio: {
        musicPlaylist: {
          tracks: [PRESET_MUSIC_TRACKS[0], PRESET_MUSIC_TRACKS[1], PRESET_MUSIC_TRACKS[2]],
          shuffleEnabled: false,
        },
        ambientPlaylist: {
          tracks: [
            { ...PRESET_AMBIENT_TRACKS[0], active: true, volume: 0.7 }, // Rain
            { ...PRESET_AMBIENT_TRACKS[2], active: true, volume: 0.3 }, // Cafe
          ],
          shuffleEnabled: false,
        },
        breakMusicPlaylist: [PRESET_BREAK_MUSIC_TRACKS[0]],
        breakAmbientPreset: 'rain-soft',
        musicVolume: 0.8,
        ambientVolume: 0.6,
      },
      layout: {
        visiblePanels: ['timer', 'tasks', 'notes', 'music'],
        positions: {},
        opacity: { card: 0.85 },
      },
      viewMode: 'fullscreen',
    },
    isPublic: true,
    price: 0,
    downloadCount: 1420,
    createdAt: '2026-08-01T00:00:00Z',
    updatedAt: '2026-08-01T00:00:00Z',
  },
  {
    id: 'template-deep-work-cyberpunk',
    creatorId: 'official-focus-workspace',
    creatorName: 'Focus Workspace Curated',
    name: 'Cyberpunk Deep Work Lab (90 min)',
    description: 'Designed for coders & writers. 90-minute unbroken flow blocks with ambient synth & white noise background.',
    tags: ['Deep Work', 'Coding', 'Cyberpunk', 'Focus', '90min'],
    thumbnail: PRESET_BACKGROUNDS[2].url,
    config: {
      method: {
        type: 'deepwork',
        workDuration: 5400, // 90 min
        breakDuration: 600, // 10 min
        longBreakDuration: 1200, // 20 min
        cyclesBeforeLongBreak: 2,
        totalCycles: null,
        stateLabels: {
          focus: '90-Min Deep Code Flow',
          break: 'Unplug & Hydrate',
          longBreak: 'Brain Rest',
          end: 'Deep Work Done',
        },
      },
      background: {
        mode: 'fixed',
        workItems: [PRESET_BACKGROUNDS[2]],
        breakItems: [PRESET_BREAK_BACKGROUNDS[2]],
        transition: {
          effect: 'slide',
          trigger: 'cycle',
        },
      },
      audio: {
        musicPlaylist: {
          tracks: [PRESET_MUSIC_TRACKS[1], PRESET_MUSIC_TRACKS[3]],
          shuffleEnabled: true,
        },
        ambientPlaylist: {
          tracks: [
            { ...PRESET_AMBIENT_TRACKS[6], active: true, volume: 0.4 }, // White noise
          ],
          shuffleEnabled: false,
        },
        breakMusicPlaylist: [PRESET_BREAK_MUSIC_TRACKS[1]],
        breakAmbientPreset: 'ocean-waves',
        musicVolume: 0.7,
        ambientVolume: 0.5,
      },
      layout: {
        visiblePanels: ['timer', 'tasks', 'notepad'],
        positions: {},
        opacity: { card: 0.9 },
      },
      viewMode: 'fullscreen',
    },
    isPublic: true,
    price: 0,
    downloadCount: 980,
    createdAt: '2026-08-05T00:00:00Z',
    updatedAt: '2026-08-05T00:00:00Z',
  },
  {
    id: 'template-cozy-winter-cabin',
    creatorId: 'official-ai-riser',
    creatorName: 'Lofi Community',
    name: 'Cozy Winter Cabin & Crackling Fire',
    description: 'Crackling hearth sound, soft piano chords, and 52/17 rhythm for balanced reading and studying.',
    tags: ['Cozy', 'Fireplace', 'Piano', 'Reading', '52/17'],
    thumbnail: PRESET_BACKGROUNDS[3].url,
    config: {
      method: {
        type: '52-17',
        workDuration: 3120, // 52 min
        breakDuration: 1020, // 17 min
        longBreakDuration: 1200,
        cyclesBeforeLongBreak: 3,
        totalCycles: null,
        stateLabels: {
          focus: 'Cozy Study Block',
          break: 'Step Away & Stretch',
          longBreak: 'Warm Cocoa Rest',
          end: 'Study Finished',
        },
      },
      background: {
        mode: 'fixed',
        workItems: [PRESET_BACKGROUNDS[3]],
        breakItems: [PRESET_BREAK_BACKGROUNDS[1]],
        transition: {
          effect: 'zoom',
          trigger: 'cycle',
        },
      },
      audio: {
        musicPlaylist: {
          tracks: [PRESET_MUSIC_TRACKS[3], PRESET_MUSIC_TRACKS[0]],
          shuffleEnabled: false,
        },
        ambientPlaylist: {
          tracks: [
            { ...PRESET_AMBIENT_TRACKS[1], active: true, volume: 0.8 }, // Fireplace
          ],
          shuffleEnabled: false,
        },
        breakMusicPlaylist: [PRESET_BREAK_MUSIC_TRACKS[0]],
        breakAmbientPreset: 'fireplace-soft',
        musicVolume: 0.6,
        ambientVolume: 0.8,
      },
      layout: {
        visiblePanels: ['timer', 'stickyNotes'],
        positions: {},
        opacity: { card: 0.8 },
      },
      viewMode: 'fullscreen',
    },
    isPublic: true,
    price: 0,
    downloadCount: 2310,
    createdAt: '2026-08-08T00:00:00Z',
    updatedAt: '2026-08-08T00:00:00Z',
  }
];
