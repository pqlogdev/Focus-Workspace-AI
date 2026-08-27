import React, { useState, useRef, useEffect } from 'react';
import { Task } from '../types';
import { CheckCircle2, Circle, Plus, Trash2, CheckSquare, X, GripHorizontal, RotateCcw } from 'lucide-react';

interface TaskPlannerSidebarProps {
  tasks: Task[];
  onChangeTasks: (tasks: Task[]) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const TaskPlannerSidebar: React.FC<TaskPlannerSidebarProps> = ({
  tasks,
  onChangeTasks,
  isOpen,
  onClose,
}) => {
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [position, setPosition] = useState<{ x: number; y: number } | null>(() => {
    const saved = localStorage.getItem('airiser_tasks_position');
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
  const panelRef = useRef<HTMLDivElement>(null);

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
    width: 320,
    height: 400,
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
      localStorage.removeItem('airiser_tasks_position');
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
      localStorage.setItem('airiser_tasks_position', JSON.stringify(position));
    } else {
      localStorage.removeItem('airiser_tasks_position');
    }
  }, [position]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (
      (e.target as HTMLElement).tagName === 'BUTTON' ||
      (e.target as HTMLElement).closest('button') ||
      (e.target as HTMLElement).tagName === 'INPUT' ||
      (e.target as HTMLElement).closest('input')
    ) {
      return;
    }

    e.preventDefault();
    const elem = panelRef.current;
    const rect = elem
      ? elem.getBoundingClientRect()
      : { left: 24, top: 80, width: 320, height: 450 };

    const initX = position ? position.x : rect.left;
    const initY = position ? position.y : rect.top;

    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initX,
      initY,
      width: rect.width || 320,
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

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    const newTask: Task = {
      id: `task-${Date.now()}`,
      title: newTaskTitle.trim(),
      completed: false,
      createdAt: new Date().toISOString(),
    };

    onChangeTasks([...tasks, newTask]);
    setNewTaskTitle('');
  };

  const toggleTask = (id: string) => {
    onChangeTasks(
      tasks.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
    );
  };

  const deleteTask = (id: string) => {
    onChangeTasks(tasks.filter((t) => t.id !== id));
  };

  const completedCount = tasks.filter((t) => t.completed).length;
  const progressPercent = tasks.length > 0 ? (completedCount / tasks.length) * 100 : 0;

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
              left: '1.5rem',
              position: 'fixed',
              touchAction: 'none',
              zIndex: isDragging ? 100 : 45,
            }
      }
      className={`w-80 bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-3xl p-5 shadow-2xl text-slate-100 flex flex-col max-h-[80vh] transition-[box-shadow,opacity] duration-150 select-none ${
        isDragging ? 'cursor-grabbing opacity-90 scale-[1.01] shadow-2xl ring-2 ring-emerald-500/30' : ''
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
            localStorage.removeItem('airiser_tasks_position');
          } else {
            setPosition({ x: position?.x ?? 24, y: 12 });
          }
        }}
        className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3 cursor-grab active:cursor-grabbing select-none"
        title="Drag anywhere (including header area) • Double-click to dock to header"
      >
        <div className="flex items-center gap-2 text-emerald-400">
          <GripHorizontal className="w-4 h-4 text-slate-500 group-hover:text-emerald-400" />
          <CheckSquare className="w-4 h-4" />
          <h3 className="font-bold text-sm text-slate-100">Tasks</h3>
          {position && position.y <= 20 && (
            <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded-full font-medium">
              Header
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {position && (
            <button
              onClick={() => {
                setPosition(null);
                localStorage.removeItem('airiser_tasks_position');
              }}
              className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition"
              title="Reset task panel position"
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

      {/* Completion Progress Bar */}
      <div className="mb-4">
        <div className="flex justify-between text-xs text-slate-400 mb-1.5 font-medium">
          <span>{completedCount} of {tasks.length} Completed</span>
          <span>{Math.round(progressPercent)}%</span>
        </div>
        <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-400 transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Add Task Input */}
      <form onSubmit={handleAddTask} className="flex gap-2 mb-4">
        <input
          type="text"
          value={newTaskTitle}
          onChange={(e) => setNewTaskTitle(e.target.value)}
          placeholder="Add focus task..."
          className="flex-1 bg-slate-950/60 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:border-indigo-500 transition"
        />
        <button
          type="submit"
          className="p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition flex items-center justify-center"
        >
          <Plus className="w-4 h-4" />
        </button>
      </form>

      {/* Task List */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
        {tasks.length === 0 ? (
          <p className="text-center text-xs text-slate-500 py-6">
            No tasks set for this focus session. Add a task above to stay on track!
          </p>
        ) : (
          tasks.map((task) => (
            <div
              key={task.id}
              className={`flex items-center justify-between p-2.5 rounded-xl border transition ${
                task.completed
                  ? 'bg-slate-950/30 border-slate-800/50 text-slate-500 line-through'
                  : 'bg-slate-800/40 border-slate-800 text-slate-200 hover:bg-slate-800/70'
              }`}
            >
              <button
                onClick={() => toggleTask(task.id)}
                className="flex items-center gap-2.5 text-xs text-left flex-1"
              >
                {task.completed ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <Circle className="w-4 h-4 text-slate-400 shrink-0" />
                )}
                <span className="truncate">{task.title}</span>
              </button>

              <button
                onClick={() => deleteTask(task.id)}
                className="p-1 text-slate-500 hover:text-rose-400 transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))
        )}
      </div>

    </div>
  );
};
