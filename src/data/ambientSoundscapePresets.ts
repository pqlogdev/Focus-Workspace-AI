import { AmbientTrack, SoundscapePreset } from '../types';
import { ALL_AVAILABLE_AMBIENT_TRACKS } from './availableAmbient';

export const AMBIENT_SOUNDSCAPE_PRESETS: SoundscapePreset[] = [
  {
    id: 'preset-rainy-cafe',
    name: 'Rainy Cafe',
    description: 'Warm Tokyo coffeehouse murmur paired with gentle falling rain',
    icon: 'Coffee',
    tag: 'Focus',
    color: 'amber',
    layers: [
      { type: 'cafe', volume: 0.55 },
      { type: 'rain', volume: 0.6 },
    ],
  },
  {
    id: 'preset-forest-stream',
    name: 'Forest Stream',
    description: 'Serene woodland birdsong and a babbling mountain brook',
    icon: 'Trees',
    tag: 'Nature',
    color: 'emerald',
    layers: [
      { type: 'forest', volume: 0.6 },
      { type: 'stream', volume: 0.55 },
      { type: 'rain', volume: 0.2 },
    ],
  },
  {
    id: 'preset-cozy-cabin',
    name: 'Cozy Cabin Fire',
    description: 'Crackling hearth warmth sheltered from a distant thunderstorm',
    icon: 'Flame',
    tag: 'Relax',
    color: 'orange',
    layers: [
      { type: 'fireplace', volume: 0.65 },
      { type: 'rain', volume: 0.4 },
      { type: 'thunder', volume: 0.35 },
    ],
  },
  {
    id: 'preset-ocean-sanctuary',
    name: 'Ocean Sanctuary',
    description: 'Rhythmic coastal surf waves with a refreshing sea breeze',
    icon: 'Waves',
    tag: 'Calm',
    color: 'cyan',
    layers: [
      { type: 'waves', volume: 0.65 },
      { type: 'wind', volume: 0.4 },
      { type: 'rain', volume: 0.2 },
    ],
  },
  {
    id: 'preset-midnight-starlight',
    name: 'Midnight Starlight',
    description: 'Nocturnal crickets chirping beneath an expansive starry sky',
    icon: 'Moon',
    tag: 'Sleep',
    color: 'indigo',
    layers: [
      { type: 'crickets', volume: 0.6 },
      { type: 'wind', volume: 0.3 },
      { type: 'fireplace', volume: 0.25 },
    ],
  },
  {
    id: 'preset-stormy-library',
    name: 'Stormy Library',
    description: 'Rumbling thunder and heavy downpour outside a quiet study hall',
    icon: 'Zap',
    tag: 'Deep Work',
    color: 'purple',
    layers: [
      { type: 'thunder', volume: 0.55 },
      { type: 'rain', volume: 0.65 },
      { type: 'cafe', volume: 0.25 },
    ],
  },
  {
    id: 'preset-zen-temple',
    name: 'Zen Mountain Temple',
    description: 'Meditative mountain breeze, woodland chirps, and running water',
    icon: 'Sparkles',
    tag: 'Nature',
    color: 'teal',
    layers: [
      { type: 'stream', volume: 0.55 },
      { type: 'forest', volume: 0.5 },
      { type: 'crickets', volume: 0.25 },
    ],
  },
  {
    id: 'preset-deep-whiteout',
    name: 'Deep Whiteout',
    description: 'Analog noise-canceling blend engineered for high-intensity analytical flow',
    icon: 'Radio',
    tag: 'Deep Work',
    color: 'slate',
    layers: [
      { type: 'whitenoise', volume: 0.55 },
      { type: 'rain', volume: 0.35 },
      { type: 'waves', volume: 0.25 },
    ],
  },
];

/**
 * Apply a chosen soundscape preset to the current list of ambient tracks.
 * Automatically injects any missing default tracks from ALL_AVAILABLE_AMBIENT_TRACKS.
 */
export function applySoundscapePreset(
  preset: SoundscapePreset,
  currentTracks: AmbientTrack[]
): AmbientTrack[] {
  const targetLayerMap = new Map<string, number>();
  preset.layers.forEach((l) => {
    targetLayerMap.set(l.type, l.volume);
  });

  // Ensure all available ambient tracks are present in the working track list
  const existingTypes = new Set(currentTracks.map((t) => t.type));
  const workingTracks: AmbientTrack[] = [...currentTracks];

  ALL_AVAILABLE_AMBIENT_TRACKS.forEach((availTrack) => {
    if (!existingTypes.has(availTrack.type)) {
      workingTracks.push({
        ...availTrack,
        active: false,
      });
      existingTypes.add(availTrack.type);
    }
  });

  // Map active status and designated layer volume
  return workingTracks.map((track) => {
    if (targetLayerMap.has(track.type)) {
      return {
        ...track,
        active: true,
        volume: targetLayerMap.get(track.type) ?? track.volume,
      };
    } else {
      return {
        ...track,
        active: false,
      };
    }
  });
}

/**
 * Check if the active ambient tracks match a given preset
 */
export function isSoundscapePresetActive(
  preset: SoundscapePreset,
  tracks: AmbientTrack[]
): boolean {
  const activeTracks = tracks.filter((t) => t.active);
  const presetTypes = new Set(preset.layers.map((l) => l.type));

  if (activeTracks.length !== preset.layers.length) return false;

  return activeTracks.every((t) => presetTypes.has(t.type));
}

/**
 * Find matching active soundscape preset if any
 */
export function detectActiveSoundscapePreset(
  presets: SoundscapePreset[],
  tracks: AmbientTrack[]
): SoundscapePreset | null {
  const activeTracks = tracks.filter((t) => t.active);
  if (activeTracks.length === 0) return null;

  for (const preset of presets) {
    if (isSoundscapePresetActive(preset, tracks)) {
      return preset;
    }
  }
  return null;
}
