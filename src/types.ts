export type MediaFormat = 'image' | 'gif' | 'lottie' | 'video';

export interface MediaItem {
  id: string;
  title: string;
  type: MediaFormat;
  url: string;
  thumbnailUrl?: string;
  duration?: number; // in seconds, default 1800 (30 mins) for playlists
  source?: 'clipboard' | 'custom_url' | 'upload' | 'preset';
  isCustom?: boolean;
  isPreservedAfterReset?: boolean;
  hasResetCustoms?: boolean;
  addedAt?: string;
}

export interface CustomImageRecord {
  id: string;
  title: string;
  type: MediaFormat;
  url: string;
  thumbnailUrl?: string;
  source: 'clipboard' | 'custom_url' | 'upload' | 'preset';
  isCustom: boolean;
  isPreservedAfterReset?: boolean;
  hasResetCustoms?: boolean;
  addedAt: string;
  updatedAt?: string;
}

export interface RollbackSnapshot {
  id: string;
  snapshotId?: string;
  timestamp: string;
  config: WorkspaceConfig;
  tasks?: Task[];
  stickyNotes?: StickyNote[];
  notepad?: string;
  customImagesCount?: number;
  reason?: 'pre_reset' | 'manual';
}

export type TransitionEffect = 'crossfade' | 'slide' | 'zoom' | 'cut';
export type TransitionTrigger = 'time' | 'cycle';

export interface BackgroundConfig {
  mode: 'fixed' | 'playlist' | 'shuffle';
  workItems: MediaItem[];
  breakItems: MediaItem[]; // Empty = keep work background
  transition?: {
    effect: TransitionEffect;
    trigger: TransitionTrigger;
  };
}

export type AudioSourceType = 'builtin' | 'upload' | 'youtube' | 'soundcloud';

export interface AudioTrack {
  id: string;
  title: string;
  artist: string;
  url: string;
  source: AudioSourceType;
  duration?: number;
  embedId?: string; // for youtube or soundcloud
}

export interface AmbientTrack {
  id: string;
  name: string;
  icon: string;
  type: 'rain' | 'fireplace' | 'cafe' | 'forest' | 'waves' | 'whitenoise' | 'crickets' | 'thunder';
  url?: string;
  volume: number; // 0.0 to 1.0
  active: boolean;
}

export interface AudioConfig {
  musicTrack?: AudioTrack;
  musicPlaylist?: {
    tracks: AudioTrack[];
    shuffleEnabled: boolean;
  };
  ambientTracks?: AmbientTrack[];
  ambientPlaylist?: {
    tracks: AmbientTrack[];
    shuffleEnabled: boolean;
  };
  breakMusicPlaylist?: AudioTrack[];
  breakAmbientPreset?: string;
  musicVolume?: number; // 0 to 1
  ambientVolume?: number; // 0 to 1
  isMuted?: boolean;
}

export type FocusMethodType = 'pomodoro' | 'deepwork' | '52-17' | 'flowtime' | 'custom';

export interface StateLabels {
  focus: string;
  break: string;
  longBreak: string;
  end: string;
}

export interface FocusMethodConfig {
  type: FocusMethodType;
  workDuration: number; // seconds
  breakDuration: number; // seconds
  longBreakDuration: number; // seconds
  cyclesBeforeLongBreak: number;
  totalCycles?: number | null; // null = infinite
  stateLabels: StateLabels;
  autoPauseOnTabSwitch?: boolean; // auto-pause when user switches tabs
  autoPauseOnIdle?: boolean; // auto-pause on inactivity > 5 min
  idleTimeoutMinutes?: number; // default 5 minutes
}

export type TimerStatus = 'PENDING' | 'FOCUS' | 'BREAK' | 'LONG_BREAK' | 'END';

export interface StickyNote {
  id: string;
  text: string;
  color: string;
  x: number;
  y: number;
  width: number;
  height: number;
  isPinned: boolean;
  imageUrl?: string;
  imageHeight?: number;
  imageFit?: 'cover' | 'contain' | 'auto';
}

export interface Task {
  id: string;
  title: string;
  completed: boolean;
  priority?: 'low' | 'medium' | 'high';
  createdAt: string;
  completedAt?: string;
}

export interface LayoutConfig {
  timerPosition?: string;
  notepadOpen?: boolean;
  tasksOpen?: boolean;
  visiblePanels?: string[];
  positions?: Record<string, { x: number; y: number }>;
  opacity?: Record<string, number>;
}

export type ViewMode = 'fullscreen' | 'pip' | 'compact' | 'zen';

export type ClockStyle = 'digital' | 'ring' | 'minimal' | 'lcd' | 'compact' | 'hud';
export type FontTheme = 'sans' | 'mono' | 'serif' | 'cyber' | 'digital';
export type ChimeType = 'zen-bell' | 'bowl' | 'marimba' | 'modern' | 'silent';
export type WidgetSize = 'compact' | 'normal' | 'large' | 'hero';
export type WidgetBorder = 'none' | 'subtle' | 'glow' | 'double' | 'dashed';
export type WidgetRadius = 'sharp' | 'rounded' | 'super' | 'pill';
export type AccentColor = 'dynamic' | 'indigo' | 'emerald' | 'cyan' | 'amber' | 'rose' | 'monochrome';
export type MusicLayout = 'standard' | 'compact' | 'pill' | 'mixer_deck';
export type MusicVisualizer = 'bars' | 'wave' | 'vinyl' | 'pulse' | 'none';

export interface WorkspaceAppearanceConfig {
  backgroundBrightness?: number; // 0.1 to 1.0 (default 0.8)
  backgroundBlur?: number; // 0 to 25 px (default 0)
  cardOpacity?: number; // 0.0 to 1.0 (default 0.85)
  fontStyle?: FontTheme; // sans, mono, serif, cyber, digital
  clockStyle?: ClockStyle; // digital, ring, minimal, lcd, compact, hud
  vignetteTint?: 'dark' | 'amber' | 'blue' | 'none';
  chimeSound?: ChimeType;
  showProgressBar?: boolean;
  showSeconds?: boolean;
  showHotkeyHints?: boolean;
  showMusicBar?: boolean;
  showStickyNotes?: boolean;
  showStreakBadge?: boolean;
  minimalMode?: boolean; // hides non-essential headers/panels for hyper-minimalism

  // Advanced Timer Customization
  timerSize?: WidgetSize; // compact, normal, large, hero
  timerBorder?: WidgetBorder; // none, subtle, glow, double, dashed
  timerRadius?: WidgetRadius; // sharp, rounded, super, pill
  timerAccentColor?: AccentColor; // dynamic, indigo, emerald, cyan, amber, rose, monochrome
  timerCustomColor?: string; // custom hex (e.g. #8b5cf6) or gradient (e.g. linear-gradient(...))
  timerGlowIntensity?: number; // 0 to 100
  timerBgTint?: string; // custom background fill/gradient
  timerGlassBlur?: 'none' | 'low' | 'medium' | 'high' | 'ultra';
  timerTransparentGhost?: boolean; // ultra-pure see-through look
  autoPauseOnTabSwitch?: boolean; // auto-pause when user switches tabs
  autoPauseOnIdle?: boolean; // auto-pause on inactivity > 5 min
  idleTimeoutMinutes?: number; // default 5 minutes

  // Advanced Music & Audio UI Customization
  musicLayout?: MusicLayout; // standard, compact, pill, mixer_deck
  musicSize?: 'compact' | 'normal' | 'large';
  musicBorder?: WidgetBorder;
  musicRadius?: WidgetRadius;
  musicOpacity?: number; // 0.2 to 1.0
  musicVisualizer?: MusicVisualizer; // bars, wave, vinyl, pulse, none
  musicAccentColor?: AccentColor;
  musicCustomColor?: string; // custom hex or gradient
  musicGlowIntensity?: number; // 0 to 100
  musicBgTint?: string;
  musicTransparentGhost?: boolean;

  // Workspace & Canvas Color Customization
  vignetteCustomColor?: string;
  canvasTint?: string;

  // Visual Theme Preset
  activePresetTheme?: string;
}

export interface WorkspaceConfig {
  method: FocusMethodConfig;
  background: BackgroundConfig;
  audio: AudioConfig;
  layout: LayoutConfig;
  appearance?: WorkspaceAppearanceConfig;
  viewMode?: ViewMode;
}

export interface TemplateMember {
  uid: string;
  email?: string;
  displayName?: string;
  photoURL?: string;
  role?: 'owner' | 'editor' | 'member';
  addedAt?: string;
}

export interface Template {
  id: string;
  creatorId: string;
  creatorName: string;
  creatorPhoto?: string;
  name: string;
  description: string;
  category?: string;
  tags: string[];
  thumbnail: string;
  config: WorkspaceConfig;
  tasks?: Task[];
  stickyNotes?: StickyNote[];
  notepad?: string;
  isPublic: boolean;

  // Group flag (0 = individual/personal, 1 = group/team) and Member user list (max 5 members)
  isGroup?: 0 | 1;
  members?: TemplateMember[]; // Max 5 members stored directly in the template data
  memberUids?: string[]; // Array of user UIDs for fast indexing and lookups (max 5)

  price: number; // 0 = free
  downloadCount: number;
  likesCount?: number;
  likedBy?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface FocusLog {
  id: string;
  userId?: string;
  sessionId?: string;
  startTime?: string;
  endTime?: string;
  totalFocusTime: number; // seconds
  totalBreakTime?: number; // seconds
  cyclesCompleted?: number;
  tasksCompleted: number;
  totalTasks?: number;
  methodUsed: FocusMethodType;
  date: string; // YYYY-MM-DD or ISO
}

export interface Streak {
  currentStreak: number;
  longestStreak: number;
  lastFocusDate: string; // ISO string or YYYY-MM-DD
  milestones: number[];
  totalFocusDays?: number;
  streakHistory?: string[]; // Array of YYYY-MM-DD strings for calendar view
  freezeDaysAvailable?: number;
  unlockedMilestones?: number[];
  updatedAt?: string;
}

export interface Participant {
  id: string;
  displayName: string;
  photoURL?: string;
  currentTask?: string;
  status: 'active' | 'idle' | 'break';
  isHost: boolean;
  joinedAt?: string;
}

export interface RoomChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderPhoto?: string;
  text: string;
  timestamp: string;
  isSystem?: boolean;
}

export interface RoomState {
  id: string;
  hostId: string;
  hostName?: string;
  code: string;
  name?: string;
  participants: Participant[];
  sharedTasks: Task[];
  sharedNotes?: StickyNote[];
  sharedScratchpad?: string;
  chatMessages?: RoomChatMessage[];
  timerState: {
    status: TimerStatus;
    remainingSeconds: number;
    currentCycle: number;
    isRunning: boolean;
    lastUpdated?: number;
  };
  votesToSkipBreak: string[]; // participant IDs
  syncAtmosphere?: boolean;
  config?: WorkspaceConfig;
  createdAt?: string;
}

export interface BinauralConfig {
  enabled: boolean;
  frequencyHz: number;
  waveType: 'gamma' | 'beta' | 'alpha' | 'theta';
  label: string;
  volume: number;
}

export interface SoundscapeRecommendation {
  id?: string;
  title: string;
  moodTag: string;
  reasoning: string;
  binauralBeat: BinauralConfig;
  ambientTracks: Array<{
    type: 'rain' | 'thunder' | 'fireplace' | 'cafe' | 'forest' | 'waves' | 'crickets' | 'whitenoise';
    name: string;
    volume: number;
    active: boolean;
  }>;
  suggestedMusicGenre: string;
  suggestedMusicTrackIndex?: number;
  musicVolume: number;
  masterAmbientVolume: number;
  createdAt?: string;
}

export interface UserProfile {
  uid: string;
  displayName: string;
  photoURL: string;
  timezone: string;
  plan: 'free' | 'pro';
  createdAt: string;
}
