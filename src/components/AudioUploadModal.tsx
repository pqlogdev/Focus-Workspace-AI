import React, { useState, useRef } from 'react';
import {
  Upload,
  Link,
  Music,
  Layers,
  Volume2,
  Play,
  Pause,
  X,
  Sparkles,
  Check,
  CloudRain,
  Flame,
  Coffee,
  Trees,
  Waves,
  Moon,
  Radio,
  Disc,
  Wind,
  Bell,
  CheckCircle2,
  AlertCircle,
  FileAudio,
} from 'lucide-react';
import { AudioTrack, AmbientTrack, CustomAudioRecord } from '../types';
import {
  processUploadedAudioFile,
  createCustomAudioFromUrl,
  saveAudioRecordToLibrary,
  formatAudioSize,
} from '../utils/audioStorage';

interface AudioUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultCategory?: 'music' | 'ambient';
  onAddMusicTrack?: (track: AudioTrack) => void;
  onAddAmbientTrack?: (track: AmbientTrack) => void;
  userId?: string;
}

const AMBIENT_ICONS = [
  { id: 'Volume2', label: 'Sound', icon: Volume2 },
  { id: 'CloudRain', label: 'Rain', icon: CloudRain },
  { id: 'Waves', label: 'Waves', icon: Waves },
  { id: 'Trees', label: 'Nature', icon: Trees },
  { id: 'Flame', label: 'Fire', icon: Flame },
  { id: 'Coffee', label: 'Cafe', icon: Coffee },
  { id: 'Moon', label: 'Night', icon: Moon },
  { id: 'Wind', label: 'Breeze', icon: Wind },
  { id: 'Disc', label: 'Vinyl', icon: Disc },
  { id: 'Radio', label: 'Radio', icon: Radio },
  { id: 'Bell', label: 'Chime', icon: Bell },
  { id: 'Sparkles', label: 'Zen', icon: Sparkles },
];

export const AudioUploadModal: React.FC<AudioUploadModalProps> = ({
  isOpen,
  onClose,
  defaultCategory = 'music',
  onAddMusicTrack,
  onAddAmbientTrack,
  userId,
}) => {
  if (!isOpen) return null;

  const [category, setCategory] = useState<'music' | 'ambient'>(defaultCategory);
  const [importType, setImportType] = useState<'file' | 'url'>('file');

  // File Upload State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileDataUrl, setFileDataUrl] = useState<string | null>(null);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Metadata State
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [ambientIcon, setAmbientIcon] = useState('Volume2');
  const [streamUrl, setStreamUrl] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Audio Preview State
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  const handleFileChange = async (file: File) => {
    if (!file) return;
    if (!file.type.startsWith('audio/') && !file.name.match(/\.(mp3|wav|ogg|m4a|aac|flac|weba)$/i)) {
      setErrorMessage('Please select a valid audio file (.mp3, .wav, .ogg, .m4a, .aac, .flac)');
      return;
    }

    setErrorMessage(null);
    setSelectedFile(file);
    setIsProcessingFile(true);

    try {
      const cleanName = file.name.replace(/\.[^/.]+$/, '');
      if (!title) {
        setTitle(cleanName);
      }
      if (!artist && category === 'music') {
        setArtist('Local Upload');
      }

      const reader = new FileReader();
      reader.onload = () => {
        setFileDataUrl(reader.result as string);
        setIsProcessingFile(false);
      };
      reader.onerror = () => {
        setErrorMessage('Failed to read file.');
        setIsProcessingFile(false);
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      setErrorMessage(err.message || 'Error processing audio file');
      setIsProcessingFile(false);
    }
  };

  const togglePreview = () => {
    const audioSrc = fileDataUrl || streamUrl;
    if (!audioSrc) return;

    if (!previewAudioRef.current) {
      previewAudioRef.current = new Audio(audioSrc);
      previewAudioRef.current.onended = () => setIsPreviewPlaying(false);
      previewAudioRef.current.onerror = () => {
        setIsPreviewPlaying(false);
        setErrorMessage('Could not play audio preview. Check the format or URL.');
      };
    } else {
      if (previewAudioRef.current.src !== audioSrc) {
        previewAudioRef.current.src = audioSrc;
      }
    }

    if (isPreviewPlaying) {
      previewAudioRef.current.pause();
      setIsPreviewPlaying(false);
    } else {
      previewAudioRef.current
        .play()
        .then(() => setIsPreviewPlaying(true))
        .catch((e) => {
          console.warn('Preview play error:', e);
          setIsPreviewPlaying(false);
        });
    }
  };

  const stopPreview = () => {
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current = null;
      setIsPreviewPlaying(false);
    }
  };

  const handleModalClose = () => {
    stopPreview();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    stopPreview();

    try {
      if (importType === 'file') {
        if (!selectedFile || !fileDataUrl) {
          setErrorMessage('Please select an audio file to upload.');
          return;
        }

        const { track, record } = await processUploadedAudioFile(
          selectedFile,
          category,
          title,
          artist
        );

        if (category === 'ambient' && 'type' in track) {
          track.icon = ambientIcon;
          record.icon = ambientIcon;
          if (onAddAmbientTrack) {
            onAddAmbientTrack(track as AmbientTrack);
          }
        } else {
          if (onAddMusicTrack) {
            onAddMusicTrack(track as AudioTrack);
          }
        }

        // Save to personal audio library & cloud
        await saveAudioRecordToLibrary(record, userId);
        handleModalClose();
      } else {
        // URL stream import
        if (!streamUrl.trim()) {
          setErrorMessage('Please enter a valid audio stream URL.');
          return;
        }

        const finalTitle = title.trim() || (category === 'ambient' ? 'Custom Soundscape' : 'Web Stream');
        const finalArtist = artist.trim() || 'Custom Stream';

        const { track, record } = createCustomAudioFromUrl(
          streamUrl.trim(),
          finalTitle,
          finalArtist,
          category,
          ambientIcon
        );

        if (category === 'ambient' && 'type' in track) {
          if (onAddAmbientTrack) {
            onAddAmbientTrack(track as AmbientTrack);
          }
        } else {
          if (onAddMusicTrack) {
            onAddMusicTrack(track as AudioTrack);
          }
        }

        // Save to personal audio library & cloud
        await saveAudioRecordToLibrary(record, userId);
        handleModalClose();
      }
    } catch (err: any) {
      console.error('Failed to import audio:', err);
      setErrorMessage(err.message || 'Failed to import audio.');
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5 text-slate-100 max-h-[92vh] overflow-y-auto custom-scrollbar"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Import & Customize Audio
              </h2>
              <p className="text-xs text-slate-400">
                Upload tracks or stream URLs linked to your templates & database
              </p>
            </div>
          </div>
          <button
            onClick={handleModalClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Category Choice: Music vs Ambient */}
        <div>
          <label className="text-xs font-semibold text-slate-300 block mb-2">
            Audio Type & Destination
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => {
                setCategory('music');
                if (!artist) setArtist('Custom Track');
              }}
              className={`p-3 rounded-2xl border text-left flex items-center gap-3 transition ${
                category === 'music'
                  ? 'bg-indigo-600/20 border-indigo-500 text-indigo-200 ring-1 ring-indigo-500/50'
                  : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="w-8 h-8 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
                <Music className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-white">Focus Music</p>
                <p className="text-[10px] text-slate-400 truncate">Add to active music queue</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setCategory('ambient')}
              className={`p-3 rounded-2xl border text-left flex items-center gap-3 transition ${
                category === 'ambient'
                  ? 'bg-amber-500/20 border-amber-500 text-amber-200 ring-1 ring-amber-500/50'
                  : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="w-8 h-8 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
                <Layers className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-white">Ambient Sound</p>
                <p className="text-[10px] text-slate-400 truncate">Layer into atmosphere</p>
              </div>
            </button>
          </div>
        </div>

        {/* Source Tab: File Upload vs URL Link */}
        <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            type="button"
            onClick={() => {
              setImportType('file');
              stopPreview();
            }}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition flex items-center justify-center gap-2 ${
              importType === 'file'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Upload className="w-3.5 h-3.5" /> Upload Audio File (.mp3, .wav, .ogg)
          </button>
          <button
            type="button"
            onClick={() => {
              setImportType('url');
              stopPreview();
            }}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition flex items-center justify-center gap-2 ${
              importType === 'url'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Link className="w-3.5 h-3.5" /> Audio Web Stream / URL
          </button>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {importType === 'file' ? (
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                Select or Drop Audio File
              </label>

              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*,.mp3,.wav,.ogg,.m4a,.aac,.flac,.weba"
                onChange={(e) => e.target.files?.[0] && handleFileChange(e.target.files[0])}
                className="hidden"
              />

              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDraggingFile(true);
                }}
                onDragLeave={() => setIsDraggingFile(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDraggingFile(false);
                  if (e.dataTransfer.files?.[0]) {
                    handleFileChange(e.dataTransfer.files[0]);
                  }
                }}
                onClick={() => fileInputRef.current?.click()}
                className={`p-5 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center text-center cursor-pointer transition ${
                  isDraggingFile
                    ? 'border-indigo-500 bg-indigo-600/20'
                    : selectedFile
                    ? 'border-emerald-500/60 bg-emerald-950/20'
                    : 'border-slate-700 hover:border-indigo-500/60 bg-slate-950/60 hover:bg-slate-950'
                }`}
              >
                {selectedFile ? (
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                      <FileAudio className="w-5 h-5" />
                    </div>
                    <div className="text-left min-w-0">
                      <p className="text-xs font-bold text-white truncate max-w-[240px]">
                        {selectedFile.name}
                      </p>
                      <p className="text-[11px] text-emerald-400 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Ready ({formatAudioSize(selectedFile.size)})</span>
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-300 mb-2">
                      <Upload className="w-5 h-5" />
                    </div>
                    <p className="text-xs font-medium text-slate-200">
                      Click to choose or drag & drop audio here
                    </p>
                    <p className="text-[10px] text-slate-400 mt-1">
                      Supports MP3, WAV, OGG, M4A, FLAC, AAC
                    </p>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                Audio Stream URL / Web Audio Link
              </label>
              <input
                type="url"
                placeholder="https://example.com/audio-stream.mp3"
                value={streamUrl}
                onChange={(e) => setStreamUrl(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 placeholder-slate-500 outline-none focus:border-indigo-500 font-mono"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Direct audio file link or web radio stream (e.g. .mp3, .ogg, .wav, CDN stream)
              </p>
            </div>
          )}

          {/* Track Metadata Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                {category === 'ambient' ? 'Soundscape Name' : 'Track Title'}
              </label>
              <input
                type="text"
                placeholder={category === 'ambient' ? 'e.g. Summer Rainfall' : 'e.g. Chill Synthwave'}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-500 outline-none focus:border-indigo-500"
              />
            </div>

            {category === 'music' && (
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Artist / Source
                </label>
                <input
                  type="text"
                  placeholder="e.g. My Favorites / Lofi Beats"
                  value={artist}
                  onChange={(e) => setArtist(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-500 outline-none focus:border-indigo-500"
                />
              </div>
            )}
          </div>

          {/* Ambient Icon Selector */}
          {category === 'ambient' && (
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                Soundscape Icon
              </label>
              <div className="grid grid-cols-6 gap-2">
                {AMBIENT_ICONS.map((item) => {
                  const IconComp = item.icon;
                  const isSelected = ambientIcon === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setAmbientIcon(item.id)}
                      className={`p-2 rounded-xl border flex flex-col items-center justify-center gap-1 transition ${
                        isSelected
                          ? 'bg-amber-500/20 border-amber-500 text-amber-300 ring-1 ring-amber-400/50'
                          : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                      }`}
                      title={item.label}
                    >
                      <IconComp className="w-4 h-4" />
                      <span className="text-[9px] font-medium truncate">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Preview Audio Controls */}
          {(fileDataUrl || streamUrl) && (
            <div className="p-3 bg-slate-950/80 rounded-2xl border border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5 min-w-0">
                <button
                  type="button"
                  onClick={togglePreview}
                  className="w-8 h-8 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center shadow transition active:scale-95 shrink-0"
                >
                  {isPreviewPlaying ? (
                    <Pause className="w-4 h-4" />
                  ) : (
                    <Play className="w-4 h-4 ml-0.5" />
                  )}
                </button>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-200 truncate">
                    {title || 'Audio Preview'}
                  </p>
                  <p className="text-[10px] text-indigo-400">
                    {isPreviewPlaying ? 'Playing preview...' : 'Click play to listen'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3 bg-rose-950/40 border border-rose-500/40 rounded-xl text-xs text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={handleModalClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isProcessingFile || (!selectedFile && !streamUrl.trim())}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Check className="w-4 h-4" />
              <span>Add to Workspace & Templates</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
