import React, { useState, useRef, useEffect } from 'react';
import { Task } from '../types';
import {
  Bot,
  Send,
  Sparkles,
  Search,
  Globe,
  X,
  RefreshCw,
  GripHorizontal,
  RotateCcw,
  Maximize2,
  Minimize2,
  Sliders,
  Check,
} from 'lucide-react';

interface AiAssistantPanelProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: Task[];
  notes: string;
}

interface Message {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  sources?: { title: string; url: string }[];
}

interface PanelSize {
  width: number;
  height: number;
}

const DEFAULT_SIZE: PanelSize = { width: 384, height: 540 };

export const AiAssistantPanel: React.FC<AiAssistantPanelProps> = ({
  isOpen,
  onClose,
  tasks,
  notes,
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'msg-1',
      sender: 'ai',
      text: "Hello! I'm your Focus Workspace study assistant. Need help clarifying a concept, summarizing notes, or planning your next focus block?",
    },
  ]);
  const [input, setInput] = useState('');
  const [useSearch, setUseSearch] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showSizeMenu, setShowSizeMenu] = useState(false);

  const panelRef = useRef<HTMLDivElement>(null);

  // Position state for draggable AI panel
  const [position, setPosition] = useState<{ x: number; y: number } | null>(() => {
    const saved = localStorage.getItem('airiser_ai_chat_position');
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

  // Size state for resizable AI panel
  const [size, setSize] = useState<PanelSize>(() => {
    const saved = localStorage.getItem('airiser_ai_chat_size');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (
          typeof parsed?.width === 'number' &&
          typeof parsed?.height === 'number' &&
          parsed.width >= 300 &&
          parsed.width <= window.innerWidth &&
          parsed.height >= 340 &&
          parsed.height <= window.innerHeight
        ) {
          return parsed;
        }
      } catch (e) {}
    }
    return DEFAULT_SIZE;
  });
  const [isResizing, setIsResizing] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const prevSizeRef = useRef<PanelSize>(DEFAULT_SIZE);

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
    width: 384,
    height: 540,
    rafId: null,
    pendingX: 0,
    pendingY: 0,
  });

  const resizeRef = useRef<{
    startX: number;
    startY: number;
    initWidth: number;
    initHeight: number;
    direction: 'se' | 'sw' | 's' | 'e';
    rafId: number | null;
    pendingWidth: number;
    pendingHeight: number;
  }>({
    startX: 0,
    startY: 0,
    initWidth: 384,
    initHeight: 540,
    direction: 'se',
    rafId: null,
    pendingWidth: 384,
    pendingHeight: 540,
  });

  useEffect(() => {
    const validatePositionAndSize = () => {
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

      setSize((prev) => {
        const maxWidth = Math.min(window.innerWidth - 40, 950);
        const maxHeight = Math.min(window.innerHeight - 60, 900);
        if (prev.width > maxWidth || prev.height > maxHeight) {
          return {
            width: Math.min(prev.width, maxWidth),
            height: Math.min(prev.height, maxHeight),
          };
        }
        return prev;
      });
    };

    const handleReset = () => {
      setPosition(null);
      setSize(DEFAULT_SIZE);
      localStorage.removeItem('airiser_ai_chat_position');
      localStorage.removeItem('airiser_ai_chat_size');
    };

    window.addEventListener('resize', validatePositionAndSize);
    window.addEventListener('reset-all-positions', handleReset);
    return () => {
      window.removeEventListener('resize', validatePositionAndSize);
      window.removeEventListener('reset-all-positions', handleReset);
      if (dragRef.current.rafId !== null) cancelAnimationFrame(dragRef.current.rafId);
      if (resizeRef.current.rafId !== null) cancelAnimationFrame(resizeRef.current.rafId);
    };
  }, []);

  useEffect(() => {
    if (position) {
      localStorage.setItem('airiser_ai_chat_position', JSON.stringify(position));
    } else {
      localStorage.removeItem('airiser_ai_chat_position');
    }
  }, [position]);

  useEffect(() => {
    if (!isMaximized) {
      localStorage.setItem('airiser_ai_chat_size', JSON.stringify(size));
    }
  }, [size, isMaximized]);

  // Drag handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (
      (e.target as HTMLElement).tagName === 'BUTTON' ||
      (e.target as HTMLElement).closest('button') ||
      (e.target as HTMLElement).tagName === 'INPUT' ||
      (e.target as HTMLElement).closest('input') ||
      (e.target as HTMLElement).tagName === 'A'
    ) {
      return;
    }

    e.preventDefault();
    const elem = panelRef.current;
    const rect = elem
      ? elem.getBoundingClientRect()
      : { left: window.innerWidth - (size.width + 24), top: 80, width: size.width, height: size.height };

    const initX = position ? position.x : rect.left;
    const initY = position ? position.y : rect.top;

    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initX,
      initY,
      width: rect.width || size.width,
      height: rect.height || size.height,
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

    const { startX, startY, initX, initY, width } = dragRef.current;
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

  // Resize handlers
  const handleResizePointerDown = (
    e: React.PointerEvent<HTMLDivElement>,
    direction: 'se' | 'sw' | 's' | 'e' = 'se'
  ) => {
    e.preventDefault();
    e.stopPropagation();

    const elem = panelRef.current;
    const rect = elem ? elem.getBoundingClientRect() : { width: size.width, height: size.height };

    resizeRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initWidth: rect.width || size.width,
      initHeight: rect.height || size.height,
      direction,
      rafId: null,
      pendingWidth: rect.width || size.width,
      pendingHeight: rect.height || size.height,
    };

    setIsResizing(true);
    setIsMaximized(false);

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
  };

  const handleResizePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isResizing) return;

    const { startX, startY, initWidth, initHeight, direction } = resizeRef.current;
    const deltaX = e.clientX - startX;
    const deltaY = e.clientY - startY;

    const minW = 300;
    const maxW = Math.min(920, window.innerWidth - 30);
    const minH = 340;
    const maxH = Math.min(window.innerHeight - 50, 920);

    let nextWidth = initWidth;
    let nextHeight = initHeight;

    if (direction === 'se' || direction === 'e') {
      nextWidth = Math.max(minW, Math.min(maxW, initWidth + deltaX));
    } else if (direction === 'sw') {
      nextWidth = Math.max(minW, Math.min(maxW, initWidth - deltaX));
    }

    if (direction === 'se' || direction === 'sw' || direction === 's') {
      nextHeight = Math.max(minH, Math.min(maxH, initHeight + deltaY));
    }

    resizeRef.current.pendingWidth = nextWidth;
    resizeRef.current.pendingHeight = nextHeight;

    if (resizeRef.current.rafId === null) {
      resizeRef.current.rafId = requestAnimationFrame(() => {
        setSize({
          width: Math.round(resizeRef.current.pendingWidth),
          height: Math.round(resizeRef.current.pendingHeight),
        });
        resizeRef.current.rafId = null;
      });
    }
  };

  const handleResizePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isResizing) {
      if (resizeRef.current.rafId !== null) {
        cancelAnimationFrame(resizeRef.current.rafId);
        resizeRef.current.rafId = null;
      }
      const finalSize: PanelSize = {
        width: Math.round(resizeRef.current.pendingWidth),
        height: Math.round(resizeRef.current.pendingHeight),
      };
      setSize(finalSize);
      setIsResizing(false);
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {}
    }
  };

  const toggleMaximize = () => {
    if (isMaximized) {
      setSize(prevSizeRef.current);
      setIsMaximized(false);
    } else {
      prevSizeRef.current = size;
      const targetW = Math.min(740, window.innerWidth - 60);
      const targetH = Math.min(window.innerHeight - 80, 750);
      setSize({ width: targetW, height: targetH });
      setIsMaximized(true);
    }
  };

  const applyPresetSize = (w: number, h: number) => {
    const nextSize = {
      width: Math.min(w, window.innerWidth - 40),
      height: Math.min(h, window.innerHeight - 60),
    };
    setSize(nextSize);
    setIsMaximized(false);
    setShowSizeMenu(false);
  };

  if (!isOpen) return null;

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMsgText = input.trim();
    const userMsg: Message = { id: `user-${Date.now()}`, sender: 'user', text: userMsgText };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMsgText,
          context: { tasks, notes },
          useSearch,
        }),
      });

      const data = await res.json();
      if (data.text) {
        const sources = data.groundingChunks?.map((c: any) => ({
          title: c.web?.title || c.web?.uri,
          url: c.web?.uri,
        })).filter((s: any) => s.url);

        const aiMsg: Message = {
          id: `ai-${Date.now()}`,
          sender: 'ai',
          text: data.text,
          sources,
        };
        setMessages((prev) => [...prev, aiMsg]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { id: `err-${Date.now()}`, sender: 'ai', text: 'Sorry, I encountered an issue. Please try again.' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      ref={panelRef}
      style={{
        width: `${size.width}px`,
        height: `${size.height}px`,
        left: position ? `${position.x}px` : undefined,
        top: position ? `${position.y}px` : '5rem',
        right: position ? undefined : '1.5rem',
        position: 'fixed',
        transform: 'none',
        zIndex: isDragging || isResizing ? 100 : 45,
        willChange: isDragging || isResizing ? 'left, top, width, height' : 'auto',
      }}
      className={`bg-slate-900/95 backdrop-blur-xl border border-slate-800 rounded-3xl p-4 sm:p-5 shadow-2xl text-slate-100 flex flex-col transition-[box-shadow,opacity] duration-150 select-none relative group ${
        isDragging
          ? 'cursor-grabbing opacity-90 scale-[1.01] shadow-2xl ring-2 ring-indigo-500/40'
          : isResizing
          ? 'ring-2 ring-indigo-400/60 shadow-2xl'
          : ''
      }`}
    >
      
      {/* Header & Drag Handle */}
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onDoubleClick={() => {
          // Double-click title bar to toggle dock to header
          if (position?.y === 12) {
            setPosition(null);
            localStorage.removeItem('airiser_ai_chat_position');
          } else {
            setPosition({ x: position?.x ?? (window.innerWidth - (size.width + 24)), y: 12 });
          }
        }}
        className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3 cursor-grab active:cursor-grabbing select-none"
        title="Drag anywhere (including header area) • Double-click to dock to header"
      >
        <div className="flex items-center gap-2 text-indigo-400">
          <GripHorizontal className="w-4 h-4 text-slate-500 group-hover:text-indigo-400" />
          <div className="p-1.5 bg-indigo-500/20 border border-indigo-500/30 rounded-xl">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="font-bold text-sm text-slate-100">AI Tutor</h3>
              {position && position.y <= 20 && (
                <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded-full font-medium">
                  Header
                </span>
              )}
            </div>
            <p className="text-[10px] text-slate-400">Gemini 3.6 Flash</p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {/* Quick Size Presets Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowSizeMenu(!showSizeMenu)}
              className={`p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition text-xs flex items-center gap-1 ${
                showSizeMenu ? 'bg-indigo-600/30 text-indigo-300 ring-1 ring-indigo-500/40' : ''
              }`}
              title="Resize Presets"
            >
              <Sliders className="w-3.5 h-3.5" />
            </button>

            {showSizeMenu && (
              <div className="absolute right-0 top-full mt-1.5 w-44 bg-slate-950/95 backdrop-blur-2xl border border-slate-800 rounded-2xl p-2 shadow-2xl z-50 text-slate-200 space-y-1 animate-in fade-in zoom-in-95 duration-100">
                <p className="text-[10px] font-bold text-slate-400 px-2 py-1 uppercase tracking-wider">
                  Panel Size Presets
                </p>
                {[
                  { label: 'Compact', width: 320, height: 460 },
                  { label: 'Standard', width: 384, height: 540 },
                  { label: 'Wide Screen', width: 560, height: 600 },
                  { label: 'Studio Large', width: 700, height: 680 },
                ].map((item) => {
                  const isCurrent = Math.abs(size.width - item.width) < 30 && Math.abs(size.height - item.height) < 40;
                  return (
                    <button
                      key={item.label}
                      onClick={() => applyPresetSize(item.width, item.height)}
                      className={`w-full text-left px-2.5 py-1.5 rounded-xl text-xs flex items-center justify-between transition ${
                        isCurrent
                          ? 'bg-indigo-600/30 text-indigo-200 font-semibold'
                          : 'hover:bg-slate-800 text-slate-300'
                      }`}
                    >
                      <span>{item.label}</span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {item.width}×{item.height}
                      </span>
                    </button>
                  );
                })}
                <div className="border-t border-slate-800 pt-1 mt-1">
                  <button
                    onClick={() => {
                      applyPresetSize(DEFAULT_SIZE.width, DEFAULT_SIZE.height);
                      setPosition(null);
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded-xl text-xs text-slate-400 hover:text-white hover:bg-slate-800 transition flex items-center gap-1.5"
                  >
                    <RotateCcw className="w-3 h-3" /> Reset Size & Pos
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Maximize / Restore Toggle */}
          <button
            onClick={toggleMaximize}
            className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition"
            title={isMaximized ? 'Restore Default Size' : 'Maximize Panel'}
          >
            {isMaximized ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>

          {/* Reset Position if dragged */}
          {position && (
            <button
              onClick={() => {
                setPosition(null);
                localStorage.removeItem('airiser_ai_chat_position');
              }}
              className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition"
              title="Reset AI tutor position"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition"
            title="Close AI Assistant"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Google Search Grounding Toggle */}
      <div className="flex items-center justify-between bg-slate-950/60 p-2 px-3 rounded-xl border border-slate-800 mb-3 flex-shrink-0">
        <span className="text-[11px] font-medium text-slate-300 flex items-center gap-1.5">
          <Globe className="w-3.5 h-3.5 text-indigo-400" /> Web Search Grounding
        </span>
        <button
          onClick={() => setUseSearch(!useSearch)}
          className={`text-[10px] px-2.5 py-1 rounded-full border transition ${
            useSearch
              ? 'bg-indigo-600 border-indigo-500 text-white font-medium shadow-sm'
              : 'bg-slate-800 border-slate-700 text-slate-400'
          }`}
        >
          {useSearch ? 'ON' : 'OFF'}
        </button>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar mb-3 min-h-0">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div
              className={`p-3 rounded-2xl text-xs max-w-[88%] leading-relaxed ${
                msg.sender === 'user'
                  ? 'bg-indigo-600 text-white rounded-tr-none shadow-md'
                  : 'bg-slate-800/80 text-slate-200 border border-slate-700/80 rounded-tl-none shadow-sm'
              }`}
            >
              {msg.text}

              {/* Grounded Web Sources */}
              {msg.sources && msg.sources.length > 0 && (
                <div className="mt-2 pt-2 border-t border-slate-700/60 space-y-1">
                  <p className="text-[10px] text-indigo-300 font-semibold">Sources:</p>
                  {msg.sources.map((s, idx) => (
                    <a
                      key={idx}
                      href={s.url}
                      target="_blank"
                      rel="noreferrer"
                      className="block text-[10px] text-indigo-400 hover:underline truncate"
                    >
                      🔗 {s.title || s.url}
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-2 text-xs text-indigo-400 bg-slate-800/50 p-2.5 rounded-2xl border border-slate-800 w-max">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            <span>Focus Assistant is researching...</span>
          </div>
        )}
      </div>

      {/* Input Box */}
      <form onSubmit={handleSendMessage} className="flex gap-2 flex-shrink-0 pt-1">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask AI study assistant..."
          className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="p-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl transition flex items-center justify-center shadow-md active:scale-95"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>

      {/* Live Resizing Dimension Pill Indicator */}
      {isResizing && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-slate-950/90 border border-indigo-500/50 text-indigo-300 text-[10px] font-mono px-2.5 py-1 rounded-full shadow-lg pointer-events-none z-50">
          {size.width} × {size.height} px
        </div>
      )}

      {/* --- CORNER RESIZE HANDLES --- */}
      {/* 1. Bottom-Right Corner Handle */}
      <div
        onPointerDown={(e) => handleResizePointerDown(e, 'se')}
        onPointerMove={handleResizePointerMove}
        onPointerUp={handleResizePointerUp}
        onPointerCancel={handleResizePointerUp}
        onDoubleClick={() => applyPresetSize(DEFAULT_SIZE.width, DEFAULT_SIZE.height)}
        className="absolute bottom-1 right-1 w-6 h-6 flex items-end justify-end p-1 cursor-se-resize text-slate-500 hover:text-indigo-400 group-hover:opacity-100 opacity-60 transition-opacity z-20"
        title="Drag to resize panel (Double-click to reset size)"
      >
        <svg viewBox="0 0 10 10" className="w-3 h-3 fill-current">
          <circle cx="8" cy="8" r="1.2" />
          <circle cx="8" cy="4" r="1.2" />
          <circle cx="4" cy="8" r="1.2" />
        </svg>
      </div>

      {/* 2. Bottom-Left Corner Handle */}
      <div
        onPointerDown={(e) => handleResizePointerDown(e, 'sw')}
        onPointerMove={handleResizePointerMove}
        onPointerUp={handleResizePointerUp}
        onPointerCancel={handleResizePointerUp}
        className="absolute bottom-1 left-1 w-6 h-6 flex items-end justify-start p-1 cursor-sw-resize text-slate-500 hover:text-indigo-400 group-hover:opacity-100 opacity-60 transition-opacity z-20"
        title="Drag to resize panel"
      >
        <svg viewBox="0 0 10 10" className="w-3 h-3 fill-current transform scale-x-[-1]">
          <circle cx="8" cy="8" r="1.2" />
          <circle cx="8" cy="4" r="1.2" />
          <circle cx="4" cy="8" r="1.2" />
        </svg>
      </div>

    </div>
  );
};

