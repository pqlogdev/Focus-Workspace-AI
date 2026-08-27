import React, { useState, useRef, useEffect } from 'react';
import { FileText, Bold, Italic, List, CheckSquare, Code, Copy, Trash2, X, Image as ImageIcon, GripHorizontal, RotateCcw } from 'lucide-react';
import { optimizeImage } from '../utils/imageOptimizer';

interface NotepadPanelProps {
  content: string;
  onChangeContent: (text: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const NotepadPanel: React.FC<NotepadPanelProps> = ({
  content,
  onChangeContent,
  isOpen,
  onClose,
}) => {
  const [isPersistent, setIsPersistent] = useState(true);
  const [copied, setCopied] = useState(false);
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
          // Double-click title bar to toggle dock to header
          if (position?.y === 12) {
            setPosition(null);
            localStorage.removeItem('airiser_notepad_position');
          } else {
            setPosition({ x: position?.x ?? (window.innerWidth - 410), y: 12 });
          }
        }}
        className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3 cursor-grab active:cursor-grabbing select-none"
        title="Drag anywhere (including header area) • Double-click to dock to header"
      >
        <div className="flex items-center gap-2 text-indigo-400">
          <GripHorizontal className="w-4 h-4 text-slate-500 group-hover:text-indigo-400" />
          <FileText className="w-4 h-4" />
          <h3 className="font-bold text-sm text-slate-100">Notepad</h3>
          {position && position.y <= 20 && (
            <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded-full font-medium">
              Header
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Persistence Toggle */}
          <button
            onClick={() => setIsPersistent(!isPersistent)}
            className={`text-[10px] px-2.5 py-1 rounded-full border transition ${
              isPersistent
                ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-300'
                : 'bg-slate-800 border-slate-700 text-slate-400'
            }`}
          >
            {isPersistent ? 'Persistent' : 'Session'}
          </button>

          {position && (
            <button
              onClick={() => {
                setPosition(null);
                localStorage.removeItem('airiser_notepad_position');
              }}
              className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition"
              title="Reset notepad position"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition"
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

        <div className="ml-auto flex items-center gap-1">
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

      {copied && (
        <span className="text-[10px] text-emerald-400 text-center mt-2 animate-pulse">
          Copied notes to clipboard!
        </span>
      )}
    </div>
  );
};
