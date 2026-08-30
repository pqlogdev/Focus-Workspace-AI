import React, { useState, useRef, useEffect } from 'react';
import { Task } from '../types';
import {
  CheckSquare,
  Plus,
  Trash2,
  CheckCircle2,
  Circle,
  GripHorizontal,
  X,
  Sparkles,
  CornerDownLeft,
  Flag,
} from 'lucide-react';
import { audioSynth } from '../utils/audioSynth';

interface TaskPlannerSidebarProps {
  tasks: Task[];
  onChangeTasks: (tasks: Task[]) => void;
  isOpen: boolean;
  onClose: () => void;
  onOpenSoundGenerator?: () => void;
}

export const TaskPlannerSidebar: React.FC<TaskPlannerSidebarProps> = ({
  tasks,
  onChangeTasks,
  isOpen,
  onClose,
  onOpenSoundGenerator,
}) => {
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [taskFilter, setTaskFilter] = useState<'all' | 'active' | 'done'>('all');
  const [selectedPriority, setSelectedPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const inputRef = useRef<HTMLInputElement>(null);

  // Position state for floating draggable panel
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

  // Drag tracking ref (60fps rAF)
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

  const handleAddNewTask = () => {
    const trimmed = newTaskTitle.trim();
    if (!trimmed) return;

    const newTask: Task = {
      id: `task-${Date.now()}`,
      title: trimmed,
      completed: false,
      priority: selectedPriority,
      createdAt: new Date().toISOString(),
    };

    onChangeTasks([...tasks, newTask]);
    setNewTaskTitle('');
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddNewTask();
    } else if (e.key === 'Escape') {
      setNewTaskTitle('');
      inputRef.current?.blur();
    }
  };

  const cyclePriority = () => {
    if (selectedPriority === 'medium') setSelectedPriority('high');
    else if (selectedPriority === 'high') setSelectedPriority('low');
    else setSelectedPriority('medium');
  };

  const toggleTask = (id: string) => {
    const targetTask = tasks.find((t) => t.id === id);
    const willBeCompleted = targetTask ? !targetTask.completed : false;

    if (willBeCompleted) {
      try {
        audioSynth.playChime('modern');
      } catch {}
    }

    const updated = tasks.map((t) => {
      if (t.id === id) {
        const completed = !t.completed;
        return {
          ...t,
          completed,
          completedAt: completed ? new Date().toISOString() : undefined,
        };
      }
      return t;
    });

    onChangeTasks(updated);
  };

  const deleteTask = (id: string) => {
    onChangeTasks(tasks.filter((t) => t.id !== id));
  };

  const clearCompletedTasks = () => {
    onChangeTasks(tasks.filter((t) => !t.completed));
  };

  const completedCount = tasks.filter((t) => t.completed).length;
  const progressPercent = tasks.length > 0 ? (completedCount / tasks.length) * 100 : 0;

  const filteredTasks = tasks.filter((t) => {
    if (taskFilter === 'active') return !t.completed;
    if (taskFilter === 'done') return t.completed;
    return true;
  });

  return (
    <div
      ref={panelRef}
      id="task-planner-sidebar"
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
      className={`w-84 bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-3xl p-5 shadow-2xl text-slate-100 flex flex-col max-h-[82vh] transition-[box-shadow,opacity] duration-150 select-none ${
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
          if (position) {
            setPosition(null);
            localStorage.removeItem('airiser_tasks_position');
          }
        }}
        className="flex items-center justify-between border-b border-slate-800/80 pb-3 mb-3 cursor-grab active:cursor-grabbing select-none shrink-0"
        title="Drag task panel anywhere • Double-click to reset"
      >
        <div className="flex items-center gap-2">
          <GripHorizontal className="w-4 h-4 text-slate-500 hover:text-emerald-400 transition-colors" />
          <div className="flex items-center gap-1.5 text-emerald-400">
            <CheckSquare className="w-4 h-4" />
            <h3 className="font-bold text-sm text-slate-100">Tasks</h3>
          </div>
          {tasks.length > 0 && (
            <span className="text-[10px] font-mono bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-medium">
              {completedCount}/{tasks.length}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          {onOpenSoundGenerator && (
            <button
              type="button"
              id="btn-tasks-ai-soundscape"
              onClick={onOpenSoundGenerator}
              className="p-1.5 hover:bg-slate-800 rounded-lg text-indigo-400 hover:text-indigo-200 transition"
              title="Generate Ambient Soundscape for Tasks"
            >
              <Sparkles className="w-4 h-4 animate-pulse" />
            </button>
          )}
          <button
            type="button"
            id="btn-close-tasks-sidebar"
            onClick={onClose}
            className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition"
            title="Close Tasks"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Completion Progress Bar */}
      <div className="mb-3 shrink-0">
        <div className="flex justify-between text-xs text-slate-400 mb-1.5 font-medium">
          <span>{completedCount} of {tasks.length} Completed</span>
          <span className="font-mono text-emerald-400">{Math.round(progressPercent)}%</span>
        </div>
        <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-300 rounded-full"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Filter Tabs & Quick Actions */}
      <div className="flex items-center justify-between gap-1 mb-2.5 text-[11px] shrink-0">
        <div className="flex items-center bg-slate-950/60 p-0.5 rounded-xl border border-slate-800/80">
          {(['all', 'active', 'done'] as const).map((f) => (
            <button
              key={f}
              type="button"
              id={`btn-task-filter-${f}`}
              onClick={() => setTaskFilter(f)}
              className={`px-2 py-0.5 rounded-lg capitalize transition font-medium ${
                taskFilter === f ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {completedCount > 0 && (
          <button
            type="button"
            id="btn-clear-completed-tasks"
            onClick={clearCompletedTasks}
            className="text-slate-500 hover:text-rose-400 transition text-[10px] flex items-center gap-1"
            title="Remove completed tasks"
          >
            <Trash2 className="w-3 h-3" /> Clear Done
          </button>
        )}
      </div>

      {/* Task List (Real-time updates) */}
      <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar min-h-[140px]">
        {filteredTasks.length === 0 ? (
          <div className="text-center text-xs text-slate-500 py-8 px-2">
            {taskFilter === 'done' ? (
              <p>No completed tasks yet. Keep focusing!</p>
            ) : taskFilter === 'active' ? (
              <p>All active tasks completed! Great work.</p>
            ) : (
              <p>No tasks set for this session. Add a task below to stay on track!</p>
            )}
          </div>
        ) : (
          filteredTasks.map((task) => (
            <div
              key={task.id}
              id={`task-item-${task.id}`}
              className={`group flex items-center justify-between p-2 rounded-xl border transition ${
                task.completed
                  ? 'bg-slate-950/40 border-slate-800/40 text-slate-500'
                  : 'bg-slate-800/40 border-slate-800 text-slate-200 hover:bg-slate-800/70 hover:border-slate-700'
              }`}
            >
              <button
                type="button"
                id={`btn-toggle-task-${task.id}`}
                onClick={() => toggleTask(task.id)}
                className="flex items-center gap-2.5 text-xs text-left flex-1 min-w-0"
              >
                {task.completed ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <Circle className="w-4 h-4 text-slate-400 group-hover:text-emerald-400 transition shrink-0" />
                )}
                <span
                  className={`truncate ${
                    task.completed ? 'line-through opacity-70 text-slate-400' : 'text-slate-200 font-medium'
                  }`}
                >
                  {task.title}
                </span>
              </button>

              <div className="flex items-center gap-1.5 shrink-0">
                {task.priority && (
                  <span
                    className={`text-[9px] font-mono px-1.5 py-0.2 rounded border font-semibold ${
                      task.priority === 'high'
                        ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                        : task.priority === 'low'
                        ? 'bg-slate-800 text-slate-400 border-slate-700'
                        : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                    }`}
                  >
                    {task.priority.toUpperCase()}
                  </span>
                )}

                <button
                  type="button"
                  id={`btn-delete-task-${task.id}`}
                  onClick={() => deleteTask(task.id)}
                  className="p-1 text-slate-500 hover:text-rose-400 transition opacity-0 group-hover:opacity-100"
                  title="Delete task"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Inline Quick Task Input at the Bottom */}
      <div className="mt-3 pt-2.5 border-t border-slate-800/80 shrink-0">
        <div className="flex items-center gap-1.5 bg-slate-950/70 border border-slate-800/90 focus-within:border-indigo-500/60 focus-within:ring-1 focus-within:ring-indigo-500/30 rounded-2xl p-1 transition shadow-inner">
          <input
            ref={inputRef}
            id="inline-new-task-input"
            type="text"
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Add task... (press Enter)"
            className="flex-1 bg-transparent px-2.5 py-1.5 text-xs text-slate-100 placeholder-slate-500 outline-none min-w-0"
          />

          {/* Quick Priority Cycle Button */}
          <button
            type="button"
            id="btn-cycle-task-priority"
            onClick={cyclePriority}
            className={`px-2 py-1 rounded-xl text-[10px] font-mono font-semibold transition border flex items-center gap-1 shrink-0 ${
              selectedPriority === 'high'
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                : selectedPriority === 'low'
                ? 'bg-slate-800 text-slate-400 border-slate-700'
                : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
            }`}
            title={`Priority: ${selectedPriority} (Click to change)`}
          >
            <Flag className="w-2.5 h-2.5" />
            <span className="capitalize">{selectedPriority}</span>
          </button>

          {/* Inline Add Action Button */}
          <button
            type="button"
            id="btn-add-inline-task"
            onClick={handleAddNewTask}
            disabled={!newTaskTitle.trim()}
            className={`p-1.5 rounded-xl transition flex items-center justify-center shrink-0 ${
              newTaskTitle.trim()
                ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md active:scale-95'
                : 'text-slate-600 bg-slate-900/50 cursor-not-allowed'
            }`}
            title="Add Task (Enter ↵)"
          >
            {newTaskTitle.trim() ? (
              <CornerDownLeft className="w-3.5 h-3.5" />
            ) : (
              <Plus className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

