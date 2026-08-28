import React, { useState, useRef, useEffect } from 'react';
import {
  FileText,
  Bold,
  Italic,
  List,
  CheckSquare,
  Code,
  Copy,
  Trash2,
  X,
  Image as ImageIcon,
  GripHorizontal,
  Download,
  FileDown,
  Check,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { optimizeImage } from '../utils/imageOptimizer';
import { exportNotesToPdf } from '../utils/pdfExport';

interface NotepadPanelProps {
  content: string;
  onChangeContent: (text: string) => void;
  isOpen: boolean;
  onClose: () => void;
  onOpenSoundGenerator?: () => void;
}

export const NotepadPanel: React.FC<NotepadPanelProps> = ({
  content,
  onChangeContent,
  isOpen,
  onClose,
  onOpenSoundGenerator,
}) => {
  const [isPersistent, setIsPersistent] = useState(true);
  const [copied, setCopied] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [pdfSuccess, setPdfSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const [position, setPosition] = useState<{ x: number; y: number } | null>(() => {
    const saved = localStorage.getItem('airiser_notepad_position');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (
          typeof parsed?.x === 'number' &&
          typeof parsed?.y === 'number' &&
          parsed.x >= 0 &&
          parsed.x < window.innerWidth - 100 &&
          parsed.y >= 0 &&
          parsed.y < window.innerHeight - 50
        ) {
          return parsed;
        }
      } catch (e) {}
    }
    return null;
  });
  const [isDragging, setIsDragging] = useState(false);

  const dragRef = useRef<{
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
    startX: 0,
    startY: 0,
    initX: 0,
    initY: 0,
    width: 380,
    height: 450,
    rafId: null,
    pendingX: 0,
    pendingY: 0,
  });

  useEffect(() => {
    const validatePosition = () => {
      setPosition((prev) => {
        if (!prev) return null;
        if (
          prev.x < 5 ||
          prev.x > window.innerWidth - 100 ||
          prev.y < 5 ||
          prev.y > window.innerHeight - 50
        ) {
          return null;
        }
        return prev;
      });
    };

    const handleReset = () => {
      setPosition(null);
      localStorage.removeItem('airiser_notepad_position');
    };

    window.addEventListener('resize', validatePosition);
    window.addEventListener('reset-all-positions', handleReset);
    return () => {
      window.removeEventListener('resize', validatePosition);
      window.removeEventListener('reset-all-positions', handleReset);
      if (dragRef.current.rafId !== null) cancelAnimationFrame(dragRef.current.rafId);
    };
  }, []);

  useEffect(() => {
    if (position) {
      localStorage.setItem('airiser_notepad_position', JSON.stringify(position));
    } else {
      localStorage.removeItem('airiser_notepad_position');
    }
  }, [position]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (
      (e.target as HTMLElement).tagName === 'BUTTON' ||
      (e.target as HTMLElement).closest('button') ||
      (e.target as HTMLElement).tagName === 'TEXTAREA' ||
      (e.target as HTMLElement).tagName === 'INPUT' ||
      (e.target as HTMLElement).closest('input')
    ) {
      return;
    }

    e.preventDefault();
    const elem = panelRef.current;
    const rect = elem
      ? elem.getBoundingClientRect()
      : { left: window.innerWidth - 410, top: 80, width: 384, height: 450 };

    const initX = position ? position.x : rect.left;
    const initY = position ? position.y : rect.top;

    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initX,
      initY,
      width: rect.width || 384,
      height: rect.height || 450,
      rafId: null,
      pendingX: initX,
      pendingY: initY,
    };

    setIsDragging(true);
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;

    const { startX, startY, initX, initY, width, height } = dragRef.current;
    const deltaX = e.clientX - startX;
    const deltaY = e.clientY - startY;

    // Allow dragging freely anywhere, right up into the header area (min top 0px)
    const nextX = Math.max(0, Math.min(window.innerWidth - width, initX + deltaX));
    const nextY = Math.max(0, Math.min(window.innerHeight - 60, initY + deltaY));

    dragRef.current.pendingX = nextX;
    dragRef.current.pendingY = nextY;

    if (dragRef.current.rafId === null) {
      dragRef.current.rafId = requestAnimationFrame(() => {
        setPosition({
          x: dragRef.current.pendingX,
          y: dragRef.current.pendingY,
        });
        dragRef.current.rafId = null;
      });
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDragging) {
      if (dragRef.current.rafId !== null) {
        cancelAnimationFrame(dragRef.current.rafId);
        dragRef.current.rafId = null;
      }
      // If dropped near header top zone (y < 45), snap flush into header row at y=12
      const finalY = dragRef.current.pendingY < 45 ? 12 : dragRef.current.pendingY;
      setPosition({
        x: dragRef.current.pendingX,
        y: finalY,
      });
      setIsDragging(false);
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {}
    }
  };

  if (!isOpen) return null;

  const insertSyntax = (prefix: string, suffix: string = '') => {
    onChangeContent(content + `${prefix} ${suffix}`);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.indexOf('image') !== -1) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) {
          try {
            const dataUrl = await optimizeImage(file, 900, 900, 0.8);
            if (dataUrl) {
              const imageMarkdown = `\n\n![Pasted Image](${dataUrl})\n\n`;
              onChangeContent(content + imageMarkdown);
            }
          } catch (err) {
            console.warn('Error pasting image:', err);
          }
          return;
        }
      }
    }
  };

  const handleImageUpload = async (file: File) => {
    try {
      const dataUrl = await optimizeImage(file, 900, 900, 0.8);
      if (dataUrl) {
        onChangeContent(content + `\n\n![Uploaded Image](${dataUrl})\n\n`);
      }
    } catch (err) {
      console.warn('Error uploading image:', err);
    }
  };

  const handleDownloadPdf = async () => {
    if (!content.trim()) return;
    try {
      setIsExportingPdf(true);
      const success = await exportNotesToPdf(content);
      if (success) {
        setPdfSuccess(true);
        setTimeout(() => setPdfSuccess(false), 2500);
      }
    } catch (err) {
      console.error('Failed to export notes to PDF:', err);
    } finally {
      setIsExportingPdf(false);
    }
  };

  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
  const charCount = content.length;

  return (
    <div
      ref={panelRef}
      style={
        position
          ? {
              left: `${position.x}px`,
              top: `${position.y}px`,
              position: 'fixed',
              transform: 'none',
              touchAction: 'none',
              zIndex: isDragging ? 100 : 45,
            }
          : {
              top: '5rem',
              right: '1.5rem',
              position: 'fixed',
              touchAction: 'none',
              zIndex: isDragging ? 100 : 45,
            }
      }
      className={`w-96 bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-3xl p-5 shadow-2xl text-slate-100 flex flex-col h-[70vh] transition-[box-shadow,opacity] duration-150 select-none ${
        isDragging ? 'cursor-grabbing opacity-90 scale-[1.01] shadow-2xl ring-2 ring-indigo-500/30' : ''
      }`}
    >
      
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            handleImageUpload(e.target.files[0]);
            e.target.value = '';
          }
        }}
      />

      {/* Panel Header & Drag Handle */}
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onDoubleClick={() => {
          if (position) {
            setPosition(null);
            localStorage.removeItem('airiser_notepad_position');
          }
        }}
        className="flex items-center justify-between border-b border-slate-800/80 pb-3 mb-3 cursor-grab active:cursor-grabbing select-none"
        title="Drag notepad anywhere • Double-click to reset"
      >
        <div className="flex items-center gap-2">
          <GripHorizontal className="w-4 h-4 text-slate-500 hover:text-indigo-400 transition-colors" />
          <div className="flex items-center gap-1.5 text-indigo-400">
            <FileText className="w-4 h-4" />
            <h3 className="font-bold text-sm text-slate-100">Notepad</h3>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onClose}
            className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition"
            title="Close Notepad"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Formatting Toolbar */}
      <div className="flex items-center gap-1.5 bg-slate-800/50 p-1.5 rounded-xl border border-slate-800 mb-3 text-slate-300">
        <button
          onClick={() => insertSyntax('**Bold Text**')}
          className="p-1.5 hover:bg-slate-700 rounded-lg transition"
          title="Bold"
        >
          <Bold className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => insertSyntax('*Italic Text*')}
          className="p-1.5 hover:bg-slate-700 rounded-lg transition"
          title="Italic"
        >
          <Italic className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => insertSyntax('\n- ')}
          className="p-1.5 hover:bg-slate-700 rounded-lg transition"
          title="Bullet List"
        >
          <List className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => insertSyntax('\n- [ ] ')}
          className="p-1.5 hover:bg-slate-700 rounded-lg transition"
          title="Checklist"
        >
          <CheckSquare className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => insertSyntax('\n```\nCode block\n```')}
          className="p-1.5 hover:bg-slate-700 rounded-lg transition"
          title="Code Block"
        >
          <Code className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="p-1.5 hover:bg-slate-700 rounded-lg transition text-indigo-300"
          title="Insert Image (or paste with Ctrl+V)"
        >
          <ImageIcon className="w-3.5 h-3.5" />
        </button>

        <div className="ml-auto flex items-center gap-1.5">
          {onOpenSoundGenerator && (
            <button
              type="button"
              onClick={onOpenSoundGenerator}
              className="p-1.5 hover:bg-slate-700 rounded-lg transition text-indigo-300 hover:text-white flex items-center gap-1"
              title="Generate AI Ambient Soundscape based on Notes"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
            </button>
          )}
          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={!content.trim() || isExportingPdf}
            className={`p-1.5 rounded-lg transition flex items-center gap-1 ${
              pdfSuccess
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : !content.trim()
                ? 'text-slate-600 cursor-not-allowed'
                : 'hover:bg-slate-700 text-indigo-300 hover:text-indigo-200'
            }`}
            title={pdfSuccess ? 'PDF Downloaded!' : 'Download as PDF'}
          >
            {isExportingPdf ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : pdfSuccess ? (
              <Check className="w-3.5 h-3.5" />
            ) : (
              <FileDown className="w-3.5 h-3.5" />
            )}
          </button>
          <button
            type="button"
            onClick={() => setIsPersistent(!isPersistent)}
            className={`text-[9px] px-2 py-0.5 rounded-full border font-medium transition ${
              isPersistent
                ? 'bg-indigo-500/15 border-indigo-500/30 text-indigo-300'
                : 'bg-slate-800/80 border-slate-700 text-slate-400'
            }`}
            title={isPersistent ? 'Saved automatically across sessions' : 'Session only (clears on refresh)'}
          >
            {isPersistent ? 'Auto-Save' : 'Session'}
          </button>
          <button
            onClick={handleCopy}
            className="p-1.5 hover:bg-slate-700 rounded-lg transition text-slate-400 hover:text-white"
            title="Copy All"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onChangeContent('')}
            className="p-1.5 hover:bg-slate-700 rounded-lg transition text-rose-400"
            title="Clear"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Textarea */}
      <textarea
        value={content}
        onChange={(e) => onChangeContent(e.target.value)}
        onPaste={handlePaste}
        placeholder="Type study notes, key formulas, or paste an image from clipboard (Ctrl+V / ⌘V)..."
        className="w-full flex-1 bg-slate-950/40 p-4 rounded-2xl border border-slate-800 outline-none text-xs text-slate-200 resize-none font-mono leading-relaxed custom-scrollbar"
      />

      {/* Footer info & Backup bar */}
      <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono">
          <span>{wordCount} {wordCount === 1 ? 'word' : 'words'}</span>
          <span>•</span>
          <span>{charCount} chars</span>
        </div>

        <div className="flex items-center gap-2">
          {copied && (
            <span className="text-[10px] text-emerald-400 flex items-center gap-1 animate-pulse">
              <Check className="w-3 h-3" /> Copied!
            </span>
          )}
          {pdfSuccess && (
            <span className="text-[10px] text-emerald-400 flex items-center gap-1 animate-pulse font-medium">
              <Check className="w-3 h-3" /> PDF Saved!
            </span>
          )}

          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={!content.trim() || isExportingPdf}
            className={`px-3 py-1.5 rounded-xl font-medium text-xs flex items-center gap-1.5 transition select-none ${
              pdfSuccess
                ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/50'
                : !content.trim()
                ? 'bg-slate-800/40 text-slate-600 cursor-not-allowed border border-slate-800'
                : 'bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 hover:text-indigo-100 border border-indigo-500/40 hover:border-indigo-500/60 shadow-sm active:scale-95 cursor-pointer'
            }`}
            title="Download formatted PDF to local storage"
          >
            {isExportingPdf ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Exporting...</span>
              </>
            ) : pdfSuccess ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>Saved as PDF</span>
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5" />
                <span>Download as PDF</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
