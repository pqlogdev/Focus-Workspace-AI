import { AudioTrack, AmbientTrack } from '../types';

export const PRESET_MUSIC_TRACKS: AudioTrack[] = [
  {
    id: 'track-1',
    title: 'Midnight Coffee & Lofi Beats',
    artist: 'Lofi Girl Streams',
    url: 'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=lofi-study-112191.mp3',
    source: 'builtin',
    duration: 180,
  },
  {
    id: 'track-2',
    title: 'Rainy Alleyway Synth Chill',
    artist: 'Aesthetic Chillout',
    url: 'https://cdn.pixabay.com/download/audio/2022/01/18/audio_d0a13f69d2.mp3?filename=chill-lofi-song-8444.mp3',
    source: 'builtin',
    duration: 210,
  },
  {
    id: 'track-3',
    title: 'Study Session in Tokyo',
    artist: 'Nights in Shibuya',
    url: 'https://cdn.pixabay.com/download/audio/2022/03/15/audio_c8c8a70d10.mp3?filename=lofi-song-room-112189.mp3',
    source: 'builtin',
    duration: 195,
  },
  {
    id: 'track-4',
    title: 'Celestial Piano & Gentle Strings',
    artist: 'Acoustics & Peace',
    url: 'https://cdn.pixabay.com/download/audio/2022/10/25/audio_2492f25492.mp3?filename=calm-ambient-piano-124982.mp3',
    source: 'builtin',
    duration: 240,
  },
  {
    id: 'track-5',
    title: 'Lofi Girl - 24/7 Study Stream',
    artist: 'YouTube Live Embed',
    url: 'https://www.youtube.com/watch?v=jfKfPfyJRdk',
    source: 'youtube',
    embedId: 'jfKfPfyJRdk',
    duration: 0,
  }
];

export const PRESET_BREAK_MUSIC_TRACKS: AudioTrack[] = [
  {
    id: 'break-track-1',
    title: 'Tea Time Breeze & Acoustic Guitar',
    artist: 'Relaxation Waves',
    url: 'https://cdn.pixabay.com/download/audio/2022/11/06/audio_c640d216f2.mp3?filename=soft-acoustic-chill-126839.mp3',
    source: 'builtin',
    duration: 180,
  },
  {
    id: 'break-track-2',
    title: 'Gentle Ocean Sunbeams',
    artist: 'Restful Mind',
    url: 'https://cdn.pixabay.com/download/audio/2022/10/14/audio_993717df30.mp3?filename=ambient-relax-123456.mp3',
    source: 'builtin',
    duration: 200,
  }
];

export const PRESET_AMBIENT_TRACKS: AmbientTrack[] = [
  {
    id: 'ambient-rain',
    name: 'Gentle Rain',
    icon: 'CloudRain',
    type: 'rain',
    volume: 0.6,
    active: true,
  },
  {
    id: 'ambient-fireplace',
    name: 'Cozy Fireplace',
    icon: 'Flame',
    type: 'fireplace',
    volume: 0.4,
    active: false,
  },
  {
    id: 'ambient-cafe',
    name: 'Cafe Ambience',
    icon: 'Coffee',
    type: 'cafe',
    volume: 0.5,
    active: false,
  },
  {
    id: 'ambient-forest',
    name: 'Forest Wind & Birds',
    icon: 'Trees',
    type: 'forest',
    volume: 0.5,
    active: false,
  },
  {
    id: 'ambient-waves',
    name: 'Ocean Shore Waves',
    icon: 'Waves',
    type: 'waves',
    volume: 0.5,
    active: false,
  },
  {
    id: 'ambient-crickets',
    name: 'Night Crickets',
    icon: 'Moon',
    type: 'crickets',
    volume: 0.4,
    active: false,
  },
  {
    id: 'ambient-whitenoise',
    name: 'White Noise',
    icon: 'Radio',
    type: 'whitenoise',
    volume: 0.3,
    active: false,
  },
  {
    id: 'ambient-thunder',
    name: 'Distant Thunderstorm',
    icon: 'Zap',
    type: 'thunder',
    volume: 0.5,
    active: false,
  }
];
