import { AudioTrack, AmbientTrack, CustomAudioRecord, AudioSourceType } from '../types';
import { saveCustomAudioToCloud, loadCustomAudioFromCloud, auth } from '../firebase';

const LOCAL_STORAGE_AUDIO_KEY = 'airiser_custom_audio_library';

/**
 * Format file size in human-readable units
 */
export function formatAudioSize(bytes: number): string {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * Get all saved custom audio records from local storage & cloud
 */
export async function getCustomAudioLibrary(userId?: string): Promise<CustomAudioRecord[]> {
  const libraryMap = new Map<string, CustomAudioRecord>();

  // 1. Local storage cache
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_AUDIO_KEY);
    if (raw) {
      const list: CustomAudioRecord[] = JSON.parse(raw);
      list.forEach((item) => {
        if (item && item.id) {
          libraryMap.set(item.id, item);
        }
      });
    }
  } catch (e) {
    console.warn('Failed to parse local audio library:', e);
  }

  // 2. Cloud Firestore if user is authenticated
  const uid = userId || auth.currentUser?.uid;
  if (uid && uid !== 'guest') {
    try {
      const cloudItems = await loadCustomAudioFromCloud(uid);
      cloudItems.forEach((item) => {
        if (item && item.id) {
          libraryMap.set(item.id, item);
        }
      });
    } catch (err) {
      console.warn('Failed to load cloud audio library:', err);
    }
  }

  return Array.from(libraryMap.values()).sort(
    (a, b) => new Date(b.addedAt || 0).getTime() - new Date(a.addedAt || 0).getTime()
  );
}

/**
 * Save a custom audio record to library and cloud
 */
export async function saveAudioRecordToLibrary(record: CustomAudioRecord, userId?: string): Promise<void> {
  try {
    const existing = await getCustomAudioLibrary(userId);
    const updated = [record, ...existing.filter((item) => item.id !== record.id)];

    // Save to local storage
    try {
      localStorage.setItem(LOCAL_STORAGE_AUDIO_KEY, JSON.stringify(updated.slice(0, 50)));
    } catch (localErr) {
      console.warn('Local storage quota warning for audio library:', localErr);
    }

    // Save to Firestore
    const uid = userId || auth.currentUser?.uid;
    if (uid && uid !== 'guest') {
      await saveCustomAudioToCloud(uid, updated.slice(0, 50));
    }
  } catch (e) {
    console.warn('Failed to save audio record to library:', e);
  }
}

/**
 * Remove a custom audio record from library
 */
export async function removeAudioRecordFromLibrary(recordId: string, userId?: string): Promise<void> {
  try {
    const existing = await getCustomAudioLibrary(userId);
    const updated = existing.filter((item) => item.id !== recordId);

    localStorage.setItem(LOCAL_STORAGE_AUDIO_KEY, JSON.stringify(updated));

    const uid = userId || auth.currentUser?.uid;
    if (uid && uid !== 'guest') {
      await saveCustomAudioToCloud(uid, updated);
    }
  } catch (e) {
    console.warn('Failed to remove audio record from library:', e);
  }
}

/**
 * Read and convert an uploaded audio File into a data URL and audio track object
 */
export async function processUploadedAudioFile(
  file: File,
  category: 'music' | 'ambient' = 'music',
  customTitle?: string,
  customArtist?: string
): Promise<{ track: AudioTrack | AmbientTrack; record: CustomAudioRecord }> {
  return new Promise((resolve, reject) => {
    const cleanFileName = file.name.replace(/\.[^/.]+$/, '');
    const title = (customTitle && customTitle.trim()) || cleanFileName;
    const artist = (customArtist && customArtist.trim()) || 'Custom Audio';

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const id = `custom-audio-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

      // Attempt to inspect audio duration
      const audioTemp = new Audio();
      audioTemp.src = dataUrl;
      audioTemp.onloadedmetadata = () => {
        const duration = Math.round(audioTemp.duration) || 0;

        const record: CustomAudioRecord = {
          id,
          title,
          artist,
          url: dataUrl,
          source: 'upload',
          category,
          ambientType: category === 'ambient' ? 'custom' : undefined,
          volume: 0.7,
          duration,
          isCustom: true,
          addedAt: new Date().toISOString(),
        };

        if (category === 'ambient') {
          const ambientTrack: AmbientTrack = {
            id,
            name: title,
            icon: 'Volume2',
            type: 'custom',
            url: dataUrl,
            volume: 0.7,
            active: true,
            isCustom: true,
            source: 'upload',
            addedAt: new Date().toISOString(),
          };
          resolve({ track: ambientTrack, record });
        } else {
          const musicTrack: AudioTrack = {
            id,
            title,
            artist,
            url: dataUrl,
            source: 'upload',
            duration,
            isCustom: true,
            addedAt: new Date().toISOString(),
          };
          resolve({ track: musicTrack, record });
        }
      };

      audioTemp.onerror = () => {
        // Fallback if metadata read fails
        const record: CustomAudioRecord = {
          id,
          title,
          artist,
          url: dataUrl,
          source: 'upload',
          category,
          ambientType: category === 'ambient' ? 'custom' : undefined,
          volume: 0.7,
          isCustom: true,
          addedAt: new Date().toISOString(),
        };

        if (category === 'ambient') {
          const ambientTrack: AmbientTrack = {
            id,
            name: title,
            icon: 'Volume2',
            type: 'custom',
            url: dataUrl,
            volume: 0.7,
            active: true,
            isCustom: true,
            source: 'upload',
            addedAt: new Date().toISOString(),
          };
          resolve({ track: ambientTrack, record });
        } else {
          const musicTrack: AudioTrack = {
            id,
            title,
            artist,
            url: dataUrl,
            source: 'upload',
            isCustom: true,
            addedAt: new Date().toISOString(),
          };
          resolve({ track: musicTrack, record });
        }
      };
    };

    reader.onerror = () => {
      reject(new Error('Failed to read audio file'));
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Create a custom audio track from direct URL stream (e.g. mp3, stream, soundcloud)
 */
export function createCustomAudioFromUrl(
  url: string,
  title: string,
  artist?: string,
  category: 'music' | 'ambient' = 'music',
  icon: string = 'Volume2'
): { track: AudioTrack | AmbientTrack; record: CustomAudioRecord } {
  const id = `custom-url-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const cleanTitle = (title && title.trim()) || 'Custom Stream';
  const cleanArtist = (artist && artist.trim()) || 'Web Audio';

  let source: AudioSourceType = 'custom_url';
  if (url.includes('youtube.com') || url.includes('youtu.be')) {
    source = 'youtube';
  } else if (url.includes('soundcloud.com')) {
    source = 'soundcloud';
  }

  const record: CustomAudioRecord = {
    id,
    title: cleanTitle,
    artist: cleanArtist,
    url,
    source,
    category,
    ambientType: category === 'ambient' ? 'custom' : undefined,
    icon,
    volume: 0.7,
    isCustom: true,
    addedAt: new Date().toISOString(),
  };

  if (category === 'ambient') {
    const ambientTrack: AmbientTrack = {
      id,
      name: cleanTitle,
      icon,
      type: 'custom',
      url,
      volume: 0.7,
      active: true,
      isCustom: true,
      source: 'url',
      addedAt: new Date().toISOString(),
    };
    return { track: ambientTrack, record };
  } else {
    const musicTrack: AudioTrack = {
      id,
      title: cleanTitle,
      artist: cleanArtist,
      url,
      source,
      isCustom: true,
      addedAt: new Date().toISOString(),
    };
    return { track: musicTrack, record };
  }
}
