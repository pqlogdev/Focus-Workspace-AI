import React, { useState, useRef, useEffect } from 'react';
import { StickyNote } from '../types';
import { optimizeImage } from '../utils/imageOptimizer';
import { ColorPickerControl } from './ColorPickerControl';
import {
  Plus,
  Pin,
  Trash2,
  GripHorizontal,
  Image as ImageIcon,
  X,
  Maximize2,
  Upload,
  Clipboard,
  Check,
  Crop,
  Sparkles,
  Palette,
} from 'lucide-react';

interface StickyNotesCanvasProps {
  notes: StickyNote[];
  onChangeNotes: (notes: StickyNote[]) => void;
  isHighlighted?: boolean;
}

const COLOR_OPTIONS = [
  { name: 'Yellow', bg: 'bg-amber-100/95 text-amber-950 border-amber-300 shadow-amber-950/10' },
  { name: 'Mint', bg: 'bg-emerald-100/95 text-emerald-950 border-emerald-300 shadow-emerald-950/10' },
  { name: 'Lavender', bg: 'bg-purple-100/95 text-purple-950 border-purple-300 shadow-purple-950/10' },
  { name: 'Peach', bg: 'bg-orange-100/95 text-orange-950 border-orange-300 shadow-orange-950/10' },
  { name: 'Sky', bg: 'bg-sky-100/95 text-sky-950 border-sky-300 shadow-sky-950/10' },
  { name: 'Dark', bg: 'bg-slate-900/95 text-slate-100 border-slate-700 shadow-black/30' },
];

const PRESET_SIZES = [
  { label: 'Compact', width: 220, height: 180 },
  { label: 'Medium', width: 300, height: 260 },
  { label: 'Large', width: 400, height: 350 },
  { label: 'Wide', width: 480, height: 260 },
];

export const StickyNotesCanvas: React.FC<StickyNotesCanvasProps> = ({ notes, onChangeNotes, isHighlighted = false }) => {
  const [activeDraggingId, setActiveDraggingId] = useState<string | null>(null);
  const [activeResizingId, setActiveResizingId] = useState<string | null>(null);
  const [activeImageResizingId, setActiveImageResizingId] = useState<string | null>(null);
  const [activeAttachMenuId, setActiveAttachMenuId] = useState<string | null>(null);
  const [activeColorPickerNoteId, setActiveColorPickerNoteId] = useState<string | null>(null);
  const [imageUrlInput, setImageUrlInput] = useState<string>('');
  const [isDragOverNoteId, setIsDragOverNoteId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [lightboxImageUrl, setLightboxImageUrl] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const activeNoteForUploadRef = useRef<string | null>(null);
  const notesRef = useRef(notes);
  notesRef.current = notes;

  // Drag tracking ref (60fps rAF)
  const dragRef = useRef<{
    noteId: string | null;
    startX: number;
    startY: number;
    initX: number;
    initY: number;
    width: number;
    height: number;
    rafId: number | null;
    pendingX: number;
    pendingY: number;
  }>({
    noteId: null,
    startX: 0,
    startY: 0,
    initX: 0,
    initY: 0,
    width: 260,
    height: 220,
    rafId: null,
    pendingX: 0,
    pendingY: 0,
  });

  // Note resize tracking ref (60fps rAF)
  const resizeRef = useRef<{
    noteId: string | null;
    startX: number;
    startY: number;
    initWidth: number;
    initHeight: number;
    rafId: number | null;
    pendingWidth: number;
    pendingHeight: number;
  }>({
    noteId: null,
    startX: 0,
    startY: 0,
    initWidth: 260,
    initHeight: 220,
    rafId: null,
    pendingWidth: 260,
    pendingHeight: 220,
  });

  // Image height resize tracking ref
  const imageResizeRef = useRef<{
    noteId: string | null;
    startY: number;
    initHeight: number;
    rafId: number | null;
    pendingHeight: number;
  }>({
    noteId: null,
    startY: 0,
    initHeight: 140,
    rafId: null,
    pendingHeight: 140,
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const bringToFront = (id: string) => {
    const target = notes.find((n) => n.id === id);
    if (!target) return;
    const others = notes.filter((n) => n.id !== id);
    onChangeNotes([...others, target]);
  };

  const addNote = () => {
    const newNote: StickyNote = {
      id: `note-${Date.now()}`,
      text: 'New focus note...',
      color: COLOR_OPTIONS[notes.length % COLOR_OPTIONS.length].name,
      x: Math.max(20, Math.min(window.innerWidth - 300, 80 + (notes.length % 6) * 35)),
      y: Math.max(80, Math.min(window.innerHeight - 280, 100 + (notes.length % 6) * 35)),
      width: 280,
      height: 230,
      isPinned: false,
    };
    onChangeNotes([...notes, newNote]);
  };

  const updateNote = (id: string, updates: Partial<StickyNote>) => {
    onChangeNotes(
      notesRef.current.map((n) => (n.id === id ? { ...n, ...updates } : n))
    );
  };

  const deleteNote = (id: string) => {
    onChangeNotes(notes.filter((n) => n.id !== id));
  };

  // Helper to read File / Blob as Data URL with client-side canvas optimization
  const processImageFile = async (file: File | Blob, noteId: string) => {
    if (file.type && !file.type.startsWith('image/')) {
      showToast('File must be an image (PNG, JPG, WebP, GIF)');
      return;
    }
    showToast('Optimizing image...');
    try {
      const optimizedDataUrl = await optimizeImage(file, 1000, 1000, 0.82);
      if (optimizedDataUrl) {
        const note = notesRef.current.find((n) => n.id === noteId);
        // If note is too small for image, expand it slightly for comfort
        const currentHeight = note?.height || 230;
        const currentWidth = note?.width || 280;
        updateNote(noteId, {
          imageUrl: optimizedDataUrl,
          imageHeight: note?.imageHeight || 140,
          imageFit: note?.imageFit || 'cover',
          height: Math.max(currentHeight, 280),
          width: Math.max(currentWidth, 260),
        });
        showToast('Attached image to note!');
        setActiveAttachMenuId(null);
      } else {
        showToast('Could not process image');
      }
    } catch (err) {
      console.warn('Failed to process image:', err);
      showToast('Error processing image');
    }
  };

  // Handle Clipboard Paste directly on note
  const handlePasteOnNote = (e: React.ClipboardEvent, noteId: string) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.indexOf('image') !== -1) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) {
          processImageFile(file, noteId);
          return;
        }
      }
    }

    // Check if pasted text is an image URL
    const pastedText = e.clipboardData.getData('text/plain');
    if (
      pastedText &&
      (pastedText.startsWith('http://') ||
        pastedText.startsWith('https://') ||
        pastedText.startsWith('data:image/')) &&
      (/\.(jpeg|jpg|gif|png|webp|svg)($|\?)/i.test(pastedText) ||
        pastedText.includes('images.unsplash.com') ||
        pastedText.startsWith('data:image/'))
    ) {
      e.preventDefault();
      const note = notesRef.current.find((n) => n.id === noteId);
      updateNote(noteId, {
        imageUrl: pastedText,
        imageHeight: note?.imageHeight || 140,
        imageFit: note?.imageFit || 'cover',
        height: Math.max(note?.height || 230, 280),
      });
      showToast('Image URL embedded in note!');
    }
  };

  // Read image directly from browser clipboard via navigator.clipboard.read()
  const handlePasteFromClipboardAPI = async (noteId: string) => {
    try {
      if (navigator.clipboard && navigator.clipboard.read) {
        const items = await navigator.clipboard.read();
        for (const item of items) {
          const imageType = item.types.find((t) => t.startsWith('image/'));
          if (imageType) {
            const blob = await item.getType(imageType);
            processImageFile(blob, noteId);
            return;
          }
        }
      }
      
      // Fallback to text clipboard if it's an image link
      const text = await navigator.clipboard.readText();
      if (
        text &&
        (text.startsWith('http://') ||
          text.startsWith('https://') ||
          text.startsWith('data:image/'))
      ) {
        const note = notesRef.current.find((n) => n.id === noteId);
        updateNote(noteId, {
          imageUrl: text,
          imageHeight: note?.imageHeight || 140,
          imageFit: note?.imageFit || 'cover',
          height: Math.max(note?.height || 230, 280),
        });
        showToast('Attached image link from clipboard!');
        setActiveAttachMenuId(null);
        return;
      }

      showToast('No image found in clipboard. Copy an image first, or press Ctrl+V / ⌘V!');
    } catch {
      showToast('Click note and press Ctrl+V (or ⌘V) to paste clipboard image.');
    }
  };

  // Drag & drop file handlers
  const handleDragOverNote = (e: React.DragEvent, noteId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOverNoteId(noteId);
  };

  const handleDragLeaveNote = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOverNoteId(null);
  };

  const handleDropOnNote = (e: React.DragEvent, noteId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOverNoteId(null);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      processImageFile(file, noteId);
    }
  };

  // --- DRAGGING LOGIC (Smooth 60fps/120fps Pointer Capture) ---
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>, note: StickyNote) => {
    if (note.isPinned) return;
    if (
      (e.target as HTMLElement).tagName === 'BUTTON' ||
      (e.target as HTMLElement).closest('button') ||
      (e.target as HTMLElement).tagName === 'INPUT' ||
      (e.target as HTMLElement).tagName === 'TEXTAREA' ||
      (e.target as HTMLElement).closest('.no-drag')
    ) {
      return;
    }

    e.preventDefault();
    bringToFront(note.id);
    setActiveDraggingId(note.id);

    dragRef.current = {
      noteId: note.id,
      startX: e.clientX,
      startY: e.clientY,
      initX: note.x,
      initY: note.y,
      width: note.width || 280,
      height: note.height || 230,
      rafId: null,
      pendingX: note.x,
      pendingY: note.y,
    };

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!activeDraggingId || dragRef.current.noteId !== activeDraggingId) return;

    const { startX, startY, initX, initY, width, height, noteId } = dragRef.current;
    if (!noteId) return;

    const deltaX = e.clientX - startX;
    const deltaY = e.clientY - startY;

    const nextX = Math.max(0, Math.min(window.innerWidth - width, initX + deltaX));
    const nextY = Math.max(0, Math.min(window.innerHeight - 50, initY + deltaY));

    dragRef.current.pendingX = nextX;
    dragRef.current.pendingY = nextY;

    if (dragRef.current.rafId === null) {
      dragRef.current.rafId = requestAnimationFrame(() => {
        if (dragRef.current.noteId) {
          updateNote(dragRef.current.noteId, {
            x: dragRef.current.pendingX,
            y: dragRef.current.pendingY,
          });
        }
        dragRef.current.rafId = null;
      });
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (activeDraggingId) {
      if (dragRef.current.rafId !== null) {
        cancelAnimationFrame(dragRef.current.rafId);
        dragRef.current.rafId = null;
      }
      if (dragRef.current.noteId) {
        updateNote(dragRef.current.noteId, {
          x: dragRef.current.pendingX,
          y: dragRef.current.pendingY,
        });
      }
      setActiveDraggingId(null);
      dragRef.current.noteId = null;
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {}
    }
  };

  // --- NOTE RESIZING LOGIC (Smooth Corner Pointer Capture) ---
  const handleResizePointerDown = (e: React.PointerEvent<HTMLDivElement>, note: StickyNote) => {
    e.preventDefault();
    e.stopPropagation();
    bringToFront(note.id);
    setActiveResizingId(note.id);

    resizeRef.current = {
      noteId: note.id,
      startX: e.clientX,
      startY: e.clientY,
      initWidth: note.width || 280,
      initHeight: note.height || 230,
      rafId: null,
      pendingWidth: note.width || 280,
      pendingHeight: note.height || 230,
    };

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
  };

  const handleResizePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!activeResizingId || resizeRef.current.noteId !== activeResizingId) return;

    const { startX, startY, initWidth, initHeight, noteId } = resizeRef.current;
    if (!noteId) return;

    const deltaX = e.clientX - startX;
    const deltaY = e.clientY - startY;

    // Minimum size 200x160, Maximum window size - 20px
    const nextWidth = Math.max(200, Math.min(window.innerWidth - 40, initWidth + deltaX));
    const nextHeight = Math.max(160, Math.min(window.innerHeight - 80, initHeight + deltaY));

    resizeRef.current.pendingWidth = nextWidth;
    resizeRef.current.pendingHeight = nextHeight;

    if (resizeRef.current.rafId === null) {
      resizeRef.current.rafId = requestAnimationFrame(() => {
        if (resizeRef.current.noteId) {
          updateNote(resizeRef.current.noteId, {
            width: Math.round(resizeRef.current.pendingWidth),
            height: Math.round(resizeRef.current.pendingHeight),
          });
        }
        resizeRef.current.rafId = null;
      });
    }
  };

  const handleResizePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (activeResizingId) {
      if (resizeRef.current.rafId !== null) {
        cancelAnimationFrame(resizeRef.current.rafId);
        resizeRef.current.rafId = null;
      }
      if (resizeRef.current.noteId) {
        updateNote(resizeRef.current.noteId, {
          width: Math.round(resizeRef.current.pendingWidth),
          height: Math.round(resizeRef.current.pendingHeight),
        });
      }
      setActiveResizingId(null);
      resizeRef.current.noteId = null;
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {}
    }
  };

  // --- IMAGE HEIGHT RESIZING LOGIC (Smooth Drag Handle on Image Bottom) ---
  const handleImageResizePointerDown = (e: React.PointerEvent<HTMLDivElement>, note: StickyNote) => {
    e.preventDefault();
    e.stopPropagation();
    bringToFront(note.id);
    setActiveImageResizingId(note.id);

    imageResizeRef.current = {
      noteId: note.id,
      startY: e.clientY,
      initHeight: note.imageHeight || 140,
      rafId: null,
      pendingHeight: note.imageHeight || 140,
    };

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
  };

  const handleImageResizePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!activeImageResizingId || imageResizeRef.current.noteId !== activeImageResizingId) return;

    const { startY, initHeight, noteId } = imageResizeRef.current;
    if (!noteId) return;

    const deltaY = e.clientY - startY;
    const nextHeight = Math.max(50, Math.min(500, initHeight + deltaY));

    imageResizeRef.current.pendingHeight = nextHeight;

    if (imageResizeRef.current.rafId === null) {
      imageResizeRef.current.rafId = requestAnimationFrame(() => {
        if (imageResizeRef.current.noteId) {
          updateNote(imageResizeRef.current.noteId, {
            imageHeight: Math.round(imageResizeRef.current.pendingHeight),
          });
        }
        imageResizeRef.current.rafId = null;
      });
    }
  };

  const handleImageResizePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (activeImageResizingId) {
      if (imageResizeRef.current.rafId !== null) {
        cancelAnimationFrame(imageResizeRef.current.rafId);
        imageResizeRef.current.rafId = null;
      }
      if (imageResizeRef.current.noteId) {
        updateNote(imageResizeRef.current.noteId, {
          imageHeight: Math.round(imageResizeRef.current.pendingHeight),
        });
      }
      setActiveImageResizingId(null);
      imageResizeRef.current.noteId = null;
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {}
    }
  };

  const getColorStyle = (colorName: string) => {
    if (colorName.startsWith('#') || colorName.startsWith('rgb') || colorName.includes('gradient')) {
      return 'border-white/20 text-white shadow-2xl';
    }
    const found = COLOR_OPTIONS.find((c) => c.name === colorName);
    return found ? found.bg : COLOR_OPTIONS[0].bg;
  };

  const getCustomNoteBg = (colorName: string) => {
    if (colorName.startsWith('#') || colorName.startsWith('rgb') || colorName.includes('gradient')) {
      return colorName;
    }
    return undefined;
  };

  return (
    <div className="fixed inset-0 pointer-events-none z-25">
      {/* Canvas Highlight Frame when Note Customizing is Active */}
      {isHighlighted && (
        <div className="fixed inset-4 border-2 border-dashed border-indigo-400/70 rounded-3xl pointer-events-none z-30 animate-pulse flex items-start justify-center pt-3">
          <div className="px-4 py-1 bg-indigo-600 text-white font-bold text-xs tracking-wider rounded-full shadow-2xl flex items-center gap-1.5 uppercase ring-2 ring-white animate-bounce">
            <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-spin" />
            <span>Interactive Sticky Notes Canvas</span>
          </div>
        </div>
      )}
      {/* Hidden File Input for uploading local images */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0 && activeNoteForUploadRef.current) {
            processImageFile(e.target.files[0], activeNoteForUploadRef.current);
            e.target.value = '';
          }
        }}
      />

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 pointer-events-auto bg-slate-900/95 text-slate-100 border border-slate-700 px-4 py-2 rounded-full text-xs font-medium shadow-2xl flex items-center gap-2 backdrop-blur-xl animate-fade-in">
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Lightbox Modal for enlarged image preview */}
      {lightboxImageUrl && (
        <div
          onClick={() => setLightboxImageUrl(null)}
          className="fixed inset-0 z-50 pointer-events-auto bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-6 cursor-zoom-out"
        >
          <div className="relative max-w-4xl max-h-[85vh] bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl p-2">
            <button
              onClick={() => setLightboxImageUrl(null)}
              className="absolute top-4 right-4 p-2 bg-slate-950/80 text-slate-200 hover:text-white rounded-full transition"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={lightboxImageUrl}
              alt="Enlarged note preview"
              className="max-h-[80vh] w-auto object-contain rounded-xl"
            />
          </div>
        </div>
      )}

      {/* Render Sticky Notes */}
      {notes.map((note) => {
        const isDragging = activeDraggingId === note.id;
        const isResizing = activeResizingId === note.id;
        const isImageResizing = activeImageResizingId === note.id;
        const isDragOver = isDragOverNoteId === note.id;
        const isAttachOpen = activeAttachMenuId === note.id;
        const noteWidth = note.width || 280;
        const noteHeight = note.height || 230;
        const imgHeight = note.imageHeight || 140;
        const imgFit = note.imageFit || 'cover';

        return (
          <div
            key={note.id}
            id={`sticky-note-${note.id}`}
            onMouseDown={() => bringToFront(note.id)}
            onPaste={(e) => handlePasteOnNote(e, note.id)}
            onDragOver={(e) => handleDragOverNote(e, note.id)}
            onDragLeave={handleDragLeaveNote}
            onDrop={(e) => handleDropOnNote(e, note.id)}
            style={{
              left: `${note.x}px`,
              top: `${note.y}px`,
              width: `${noteWidth}px`,
              height: `${noteHeight}px`,
              zIndex: isDragging || isResizing || isAttachOpen || activeColorPickerNoteId === note.id ? 50 : 25,
              willChange: isDragging ? 'left, top' : isResizing ? 'width, height' : 'auto',
              background: getCustomNoteBg(note.color),
            }}
            className={`absolute pointer-events-auto rounded-2xl border shadow-xl flex flex-col backdrop-blur-md select-none group/note ${getColorStyle(
              note.color
            )} ${
              isDragging
                ? 'shadow-[0_20px_50px_-10px_rgba(0,0,0,0.4)] scale-[1.02] rotate-1 ring-2 ring-indigo-500/60 cursor-grabbing transition-none'
                : isResizing
                ? 'ring-2 ring-indigo-500/60 transition-none'
                : isDragOver
                ? 'ring-4 ring-indigo-500/80 scale-[1.02] transition-all'
                : 'hover:shadow-2xl transition-[box-shadow,transform] duration-150'
            }`}
          >
            {/* Note Header / Drag Handle */}
            <div
              onPointerDown={(e) => handlePointerDown(e, note)}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              style={{ touchAction: 'none' }}
              className={`flex items-center justify-between px-3 py-2 border-b border-black/10 select-none ${
                note.isPinned
                  ? 'cursor-default'
                  : 'cursor-grab active:cursor-grabbing hover:bg-black/5 rounded-t-2xl transition-colors'
              }`}
              title={note.isPinned ? 'Pinned Note (Unpin to drag)' : 'Drag Sticky Note'}
            >
              <div className="flex items-center gap-1.5">
                <GripHorizontal
                  className={`w-3.5 h-3.5 ${
                    note.isPinned ? 'opacity-20' : 'opacity-40 hover:opacity-100 text-slate-700'
                  }`}
                />

                <button
                  type="button"
                  onClick={() => updateNote(note.id, { isPinned: !note.isPinned })}
                  className={`p-1 rounded transition ${
                    note.isPinned
                      ? 'text-indigo-600 bg-indigo-500/15 font-bold opacity-100'
                      : 'opacity-40 hover:opacity-100 hover:bg-black/10'
                  }`}
                  title={note.isPinned ? 'Pinned (Click to unpin)' : 'Pin note'}
                >
                  <Pin className="w-3 h-3" />
                </button>
              </div>

              {/* Right Action Icons in Header */}
              <div className="flex items-center gap-1">
                {/* Palette Popover */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setActiveColorPickerNoteId(activeColorPickerNoteId === note.id ? null : note.id)}
                    className={`p-1 rounded transition text-slate-700 ${
                      activeColorPickerNoteId === note.id ? 'bg-black/10 opacity-100' : 'opacity-50 hover:opacity-100 hover:bg-black/10'
                    }`}
                    title="Change Note Color"
                  >
                    <Palette className="w-3 h-3" />
                  </button>
                  {activeColorPickerNoteId === note.id && (
                    <div
                      onMouseDown={(e) => e.stopPropagation()}
                      className="absolute right-0 top-full mt-2 z-50 w-72 bg-slate-950 border border-slate-800 rounded-2xl p-3.5 shadow-2xl backdrop-blur-2xl text-left"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-bold text-slate-300">Choose Note Color</span>
                        <button
                          type="button"
                          onClick={() => setActiveColorPickerNoteId(null)}
                          className="text-[10px] text-slate-400 hover:text-white"
                        >
                          Done
                        </button>
                      </div>

                      {/* Quick preset swatches */}
                      <div className="flex items-center gap-1.5 mb-3 pb-2.5 border-b border-slate-800">
                        {COLOR_OPTIONS.map((col) => (
                          <button
                            key={col.name}
                            type="button"
                            onClick={() => updateNote(note.id, { color: col.name })}
                            className={`w-5 h-5 rounded-full border border-black/20 hover:scale-110 transition ${
                              col.bg.split(' ')[0]
                            } ${note.color === col.name ? 'ring-2 ring-indigo-500 scale-110' : ''}`}
                            title={col.name}
                          />
                        ))}
                      </div>

                      <ColorPickerControl
                        value={note.color.startsWith('#') || note.color.includes('gradient') ? note.color : '#fef08a'}
                        onChange={(c) => updateNote(note.id, { color: c })}
                        allowGradients={true}
                      />
                    </div>
                  )}
                </div>

                {/* Attach Image Button */}
                <button
                  type="button"
                  onClick={() => {
                    setActiveAttachMenuId(isAttachOpen ? null : note.id);
                    setImageUrlInput('');
                  }}
                  className={`p-1 rounded transition ${
                    note.imageUrl
                      ? 'text-indigo-600 bg-indigo-500/15 font-semibold opacity-100'
                      : 'opacity-50 hover:opacity-100 hover:bg-black/10'
                  }`}
                  title={note.imageUrl ? 'Manage Attached Image' : 'Attach Image'}
                >
                  <ImageIcon className="w-3 h-3" />
                </button>

                {/* Delete Note */}
                <button
                  type="button"
                  onClick={() => deleteNote(note.id)}
                  className="p-1 opacity-40 hover:opacity-100 text-rose-600 hover:bg-rose-500/15 rounded transition"
                  title="Delete Note"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* Attach Image Dropdown Menu */}
            {isAttachOpen && (
              <div
                onMouseDown={(e) => e.stopPropagation()}
                className="absolute top-10 right-3 z-50 w-64 bg-slate-900/98 backdrop-blur-2xl border border-slate-700 rounded-2xl p-3 shadow-2xl text-slate-100 text-xs no-drag"
              >
                <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2.5">
                  <span className="font-bold flex items-center gap-1.5 text-indigo-300">
                    <ImageIcon className="w-3.5 h-3.5" /> Attach Image
                  </span>
                  <button
                    onClick={() => setActiveAttachMenuId(null)}
                    className="p-0.5 hover:bg-slate-800 rounded text-slate-400 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex flex-col gap-2">
                  {/* Paste from Clipboard button */}
                  <button
                    onClick={() => handlePasteFromClipboardAPI(note.id)}
                    className="w-full py-1.5 px-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium transition flex items-center justify-center gap-1.5 shadow-md active:scale-98"
                  >
                    <Clipboard className="w-3.5 h-3.5" />
                    <span>Paste from Clipboard</span>
                  </button>

                  {/* Upload local file */}
                  <button
                    onClick={() => {
                      activeNoteForUploadRef.current = note.id;
                      fileInputRef.current?.click();
                    }}
                    className="w-full py-1.5 px-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl transition flex items-center justify-center gap-1.5 border border-slate-700"
                  >
                    <Upload className="w-3.5 h-3.5 text-slate-400" />
                    <span>Upload Image File</span>
                  </button>

                  {/* URL Input */}
                  <div className="mt-1">
                    <span className="text-[10px] text-slate-400 block mb-1">Or paste image web link:</span>
                    <div className="flex gap-1">
                      <input
                        type="url"
                        value={imageUrlInput}
                        onChange={(e) => setImageUrlInput(e.target.value)}
                        placeholder="https://... image.png"
                        className="flex-1 bg-slate-950/80 border border-slate-700 rounded-lg px-2 py-1 text-[11px] text-slate-200 outline-none focus:border-indigo-500"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && imageUrlInput.trim()) {
                            updateNote(note.id, {
                              imageUrl: imageUrlInput.trim(),
                              imageHeight: note.imageHeight || 140,
                              height: Math.max(note.height || 230, 280),
                            });
                            setActiveAttachMenuId(null);
                            setImageUrlInput('');
                            showToast('Attached image link!');
                          }
                        }}
                      />
                      <button
                        onClick={() => {
                          if (imageUrlInput.trim()) {
                            updateNote(note.id, {
                              imageUrl: imageUrlInput.trim(),
                              imageHeight: note.imageHeight || 140,
                              height: Math.max(note.height || 230, 280),
                            });
                            setActiveAttachMenuId(null);
                            setImageUrlInput('');
                            showToast('Attached image link!');
                          }
                        }}
                        disabled={!imageUrlInput.trim()}
                        className="p-1 bg-indigo-600 disabled:opacity-40 text-white rounded-lg hover:bg-indigo-500"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {note.imageUrl && (
                    <button
                      onClick={() => {
                        updateNote(note.id, { imageUrl: undefined });
                        setActiveAttachMenuId(null);
                        showToast('Removed image from note');
                      }}
                      className="mt-1 text-[11px] text-rose-400 hover:text-rose-300 hover:underline text-center"
                    >
                      Remove attached image
                    </button>
                  )}

                  <span className="text-[10px] text-slate-500 text-center italic mt-0.5">
                    Tip: Click note & press Ctrl+V / ⌘V anytime
                  </span>
                </div>
              </div>
            )}

            {/* ATTACHED IMAGE SECTION (If Present) */}
            {note.imageUrl && (
              <div className="relative group/img flex-shrink-0 mx-2 mt-2 rounded-xl overflow-hidden border border-black/15 bg-black/5">
                {/* The Image Element */}
                <img
                  src={note.imageUrl}
                  alt="Attached to sticky note"
                  onError={() => {
                    console.warn('Failed to render attached note image');
                  }}
                  style={{
                    height: `${imgHeight}px`,
                    width: '100%',
                    objectFit: imgFit === 'contain' ? 'contain' : 'cover',
                  }}
                  className="block rounded-lg transition-[height] duration-75 select-none"
                  draggable={false}
                />

                {/* Floating Image Toolbar on Hover */}
                <div className="absolute top-1.5 right-1.5 opacity-0 group-hover/img:opacity-100 transition-opacity bg-slate-950/85 backdrop-blur-md rounded-lg p-1 flex items-center gap-1 shadow-lg border border-slate-700/80 z-20">
                  {/* Fit Mode Toggle */}
                  <button
                    onClick={() =>
                      updateNote(note.id, {
                        imageFit: imgFit === 'cover' ? 'contain' : 'cover',
                      })
                    }
                    className="p-1 text-slate-300 hover:text-white rounded hover:bg-slate-800 text-[10px] flex items-center gap-0.5"
                    title={`Fit: ${imgFit === 'cover' ? 'Fill/Cover' : 'Fit/Contain'}`}
                  >
                    <Crop className="w-3 h-3 text-indigo-400" />
                    <span className="capitalize">{imgFit}</span>
                  </button>

                  {/* Preset Image Height quick toggles */}
                  <button
                    onClick={() => updateNote(note.id, { imageHeight: 80 })}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                      imgHeight <= 90 ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-800'
                    }`}
                    title="Small Image (80px)"
                  >
                    S
                  </button>
                  <button
                    onClick={() => updateNote(note.id, { imageHeight: 140 })}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                      imgHeight > 90 && imgHeight <= 160 ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-800'
                    }`}
                    title="Medium Image (140px)"
                  >
                    M
                  </button>
                  <button
                    onClick={() => updateNote(note.id, { imageHeight: 220 })}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                      imgHeight > 160 ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-800'
                    }`}
                    title="Large Image (220px)"
                  >
                    L
                  </button>

                  {/* Enlarge in Lightbox */}
                  <button
                    onClick={() => setLightboxImageUrl(note.imageUrl || null)}
                    className="p-1 text-slate-300 hover:text-white rounded hover:bg-slate-800"
                    title="View Fullscreen"
                  >
                    <Maximize2 className="w-3 h-3" />
                  </button>

                  {/* Remove Image */}
                  <button
                    onClick={() => updateNote(note.id, { imageUrl: undefined })}
                    className="p-1 text-rose-400 hover:text-rose-200 rounded hover:bg-rose-500/20"
                    title="Remove Image"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>

                {/* Interactive Drag Bar for direct continuous image height adjustment */}
                <div
                  onPointerDown={(e) => handleImageResizePointerDown(e, note)}
                  onPointerMove={handleImageResizePointerMove}
                  onPointerUp={handleImageResizePointerUp}
                  onPointerCancel={handleImageResizePointerUp}
                  style={{ touchAction: 'none' }}
                  className={`h-2.5 w-full cursor-row-resize flex items-center justify-center bg-black/10 hover:bg-indigo-500/60 active:bg-indigo-600 transition-colors border-t border-black/10 select-none ${
                    isImageResizing ? 'bg-indigo-600' : ''
                  }`}
                  title="Drag up/down to adjust image size"
                >
                  <div className="w-8 h-1 rounded-full bg-black/30" />
                </div>
              </div>
            )}

            {/* Note Content Textarea */}
            <textarea
              value={note.text}
              onChange={(e) => updateNote(note.id, { text: e.target.value })}
              onFocus={() => bringToFront(note.id)}
              className="w-full flex-1 p-3 bg-transparent resize-none outline-none font-sans text-xs leading-relaxed placeholder-black/30 dark:placeholder-white/30 custom-scrollbar"
              placeholder="Type your focus note or press Ctrl+V / ⌘V to attach an image..."
            />

            {/* Note Dimension Badge & Smooth Corner Resize Handle */}
            <div className="relative flex items-center justify-between px-2.5 py-1 text-[9px] opacity-40 group-hover/note:opacity-90 transition-opacity border-t border-black/5 select-none">
              <span className="font-mono">
                {Math.round(noteWidth)} × {Math.round(noteHeight)}
                {note.imageUrl ? ` (img ${Math.round(imgHeight)}h)` : ''}
              </span>

              {/* Bottom-Right Resize Handle */}
              <div
                onPointerDown={(e) => handleResizePointerDown(e, note)}
                onPointerMove={handleResizePointerMove}
                onPointerUp={handleResizePointerUp}
                onPointerCancel={handleResizePointerUp}
                style={{ touchAction: 'none' }}
                className={`p-1 cursor-nwse-resize hover:text-indigo-600 active:text-indigo-700 transition select-none flex items-center justify-center ${
                  isResizing ? 'text-indigo-600 scale-125' : ''
                }`}
                title="Drag corner to resize note"
              >
                <svg width="10" height="10" viewBox="0 0 10 10" className="fill-current">
                  <path d="M9 1L1 9M9 5L5 9M9 9L9 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </div>
            </div>
          </div>
        );
      })}

      {/* Floating Add Sticky Note Button */}
      <button
        onClick={addNote}
        className="fixed bottom-6 left-6 z-30 pointer-events-auto bg-amber-400 hover:bg-amber-300 text-amber-950 font-bold p-3.5 rounded-full shadow-2xl transition transform active:scale-95 flex items-center gap-2 border border-amber-300 hover:shadow-amber-400/25"
        title="Add Sticky Note"
      >
        <Plus className="w-5 h-5" />
        <span className="text-xs font-semibold">Sticky Note</span>
      </button>
    </div>
  );
};
