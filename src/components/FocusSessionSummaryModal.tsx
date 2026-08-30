import React, { useState, useEffect } from 'react';
import { Task, Streak, FocusMethodType } from '../types';
import {
  Sparkles,
  CheckCircle2,
  Circle,
  Coffee,
  Zap,
  Flame,
  Clock,
  CheckCheck,
  Plus,
  ArrowRight,
  X,
  FileText,
  Smile,
  Meh,
  BatteryCharging,
  Trophy,
  Share2,
  Check
} from 'lucide-react';
import { audioSynth } from '../utils/audioSynth';

export interface CompletedSessionStats {
  focusDurationSeconds: number;
  cycleNumber: number;
  isLongBreakNext: boolean;
  methodType: FocusMethodType;
  methodName?: string;
  breakDurationMinutes: number;
  completedAt: string;
}

interface FocusSessionSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionData: CompletedSessionStats | null;
  tasks: Task[];
  onToggleTask: (taskId: string) => void;
  onAddTask: (title: string, priority?: 'low' | 'medium' | 'high') => void;
  streak: Streak;
  todayTotalFocusSeconds: number;
  onStartBreak: () => void;
  onStartNextFocus: () => void;
  onSaveBreakNote: (note: string) => void;
}

type EnergyLevel = 'energized' | 'in_flow' | 'calm' | 'tired';

export const FocusSessionSummaryModal: React.FC<FocusSessionSummaryModalProps> = ({
  isOpen,
  onClose,
  sessionData,
  tasks,
  onToggleTask,
  onAddTask,
  streak,
  todayTotalFocusSeconds,
  onStartBreak,
  onStartNextFocus,
  onSaveBreakNote,
}) => {
  const [reflectionPrompt, setReflectionPrompt] = useState<string>('Loading AI reflection prompt...');
  const [sessionNote, setSessionNote] = useState('');
  const [energyLevel, setEnergyLevel] = useState<EnergyLevel>('in_flow');
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [copiedSummary, setCopiedSummary] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'tasks' | 'reflection'>('overview');

  // Format seconds to human readable string (e.g., "25m 00s" or "1h 15m")
  const formatSeconds = (secs: number) => {
    const hours = Math.floor(secs / 3600);
    const minutes = Math.floor((secs % 3600) / 60);
    const seconds = secs % 60;

    if (hours > 0) {
      return `${hours}h ${minutes > 0 ? `${minutes}m` : ''}`;
    }
    if (minutes > 0) {
      return seconds > 0 ? `${minutes}m ${seconds}s` : `${minutes}m`;
    }
    return `${seconds}s`;
  };

  const formatDetailedTime = (secs: number) => {
    const minutes = Math.floor(secs / 60);
    const seconds = secs % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    if (!isOpen) {
      setCopiedSummary(false);
      return;
    }

    // Fetch AI reflection prompt tailored for the completed session
    const durationMins = sessionData ? Math.round(sessionData.focusDurationSeconds / 60) : 25;
    const completedCount = tasks.filter((t) => t.completed).length;

    fetch('/api/gemini/reflection', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tasks,
        focusMethod: sessionData?.methodName || sessionData?.methodType || 'Pomodoro',
        durationMinutes: durationMins,
        completedCount,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.reflectionPrompt) {
          setReflectionPrompt(data.reflectionPrompt);
        } else {
          setReflectionPrompt(
            'Incredible focus! Take a deep breath, hydrate, and celebrate what you accomplished before the next cycle.'
          );
        }
      })
      .catch(() => {
        setReflectionPrompt(
          'Deep work complete! Take 3 deep breaths, stretch your shoulders, and rest your eyes before the next round.'
        );
      });
  }, [isOpen, sessionData, tasks]);

  // Keyboard Escape listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  if (!isOpen) return null;

  const completedTasks = tasks.filter((t) => t.completed);
  const totalTasksCount = tasks.length;
  const completionPercentage =
    totalTasksCount > 0 ? Math.round((completedTasks.length / totalTasksCount) * 100) : 100;

  const sessionDuration = sessionData?.focusDurationSeconds || 1500;
  const cycleNum = sessionData?.cycleNumber || 1;
  const isLongBreak = sessionData?.isLongBreakNext || false;
  const breakMinutes = sessionData?.breakDurationMinutes || (isLongBreak ? 15 : 5);

  const handleClose = () => {
    if (sessionNote.trim()) {
      onSaveBreakNote(sessionNote.trim());
    }
    onClose();
  };

  const handleStartBreakAction = () => {
    if (sessionNote.trim()) {
      onSaveBreakNote(sessionNote.trim());
    }
    onStartBreak();
    onClose();
  };

  const handleStartNextFocusAction = () => {
    if (sessionNote.trim()) {
      onSaveBreakNote(sessionNote.trim());
    }
    onStartNextFocus();
    onClose();
  };

  const handleAddNewTaskInline = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    onAddTask(newTaskTitle.trim(), 'medium');
    setNewTaskTitle('');
    audioSynth.playClick();
  };

  const handleCopySummary = () => {
    const summaryText = `🎯 Focus Session Completed!\n⏱️ Session Time: ${formatSeconds(
      sessionDuration
    )}\n📈 Daily Focus: ${formatSeconds(
      todayTotalFocusSeconds
    )}\n✅ Tasks: ${completedTasks.length}/${totalTasksCount} (${completionPercentage}%)\n🔥 Streak: ${
      streak.currentStreak
    } days\n${sessionNote ? `📝 Notes: ${sessionNote}\n` : ''}`;

    navigator.clipboard.writeText(summaryText);
    setCopiedSummary(true);
    setTimeout(() => setCopiedSummary(false), 2500);
  };

  return (
    <div
      id="focus-session-summary-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200"
    >
      <div
        id="focus-session-summary-modal"
        className="bg-slate-900 border border-slate-800/90 rounded-3xl p-5 sm:p-6 shadow-2xl max-w-xl w-full text-slate-100 relative my-auto animate-in zoom-in-95 duration-200 max-h-[92vh] flex flex-col"
      >
        {/* Top Header with Close and Share */}
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3 mb-4 shrink-0">
          <div className="flex items-center gap-2">
            <span className="p-2 bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 rounded-xl text-emerald-400">
              <Trophy className="w-5 h-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  Focus Session Complete!
                </h2>
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full">
                  Cycle #{cycleNum}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {sessionData?.methodName || 'Pomodoro'} • Session Stats & Task Review
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              id="btn-copy-session-summary"
              onClick={handleCopySummary}
              className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-xl transition flex items-center gap-1 text-xs"
              title="Copy session summary"
            >
              {copiedSummary ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span className="text-[10px] text-emerald-400 hidden sm:inline">Copied</span>
                </>
              ) : (
                <>
                  <Share2 className="w-4 h-4" />
                  <span className="text-[10px] hidden sm:inline">Share</span>
                </>
              )}
            </button>
            <button
              type="button"
              id="btn-close-session-summary"
              onClick={handleClose}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
              title="Close summary (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Main Content */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1 custom-scrollbar">
          {/* Key Metrics 4-Box Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {/* 1. Session Focus Time */}
            <div
              id="stat-session-focus-time"
              className="p-3 bg-gradient-to-br from-slate-950 to-slate-900 border border-emerald-500/30 rounded-2xl flex flex-col justify-between"
            >
              <div className="flex items-center justify-between text-slate-400 text-[11px] mb-1">
                <span>Session Time</span>
                <Clock className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <div>
                <span className="text-lg sm:text-xl font-bold font-mono text-emerald-300">
                  {formatDetailedTime(sessionDuration)}
                </span>
                <span className="text-[10px] text-emerald-400/80 block font-medium">
                  +{Math.round(sessionDuration / 60)} min accrued
                </span>
              </div>
            </div>

            {/* 2. Today's Total Focus Time */}
            <div
              id="stat-today-total-time"
              className="p-3 bg-gradient-to-br from-slate-950 to-slate-900 border border-slate-800 rounded-2xl flex flex-col justify-between"
            >
              <div className="flex items-center justify-between text-slate-400 text-[11px] mb-1">
                <span>Today's Total</span>
                <Zap className="w-3.5 h-3.5 text-indigo-400" />
              </div>
              <div>
                <span className="text-lg sm:text-xl font-bold font-mono text-indigo-300">
                  {formatSeconds(todayTotalFocusSeconds)}
                </span>
                <span className="text-[10px] text-slate-400 block font-medium">
                  Total daily focus
                </span>
              </div>
            </div>

            {/* 3. Tasks Completed */}
            <div
              id="stat-tasks-completed"
              className="p-3 bg-gradient-to-br from-slate-950 to-slate-900 border border-slate-800 rounded-2xl flex flex-col justify-between"
            >
              <div className="flex items-center justify-between text-slate-400 text-[11px] mb-1">
                <span>Tasks Done</span>
                <CheckCheck className="w-3.5 h-3.5 text-teal-400" />
              </div>
              <div>
                <div className="flex items-baseline gap-1">
                  <span className="text-lg sm:text-xl font-bold font-mono text-teal-300">
                    {completedTasks.length}
                  </span>
                  <span className="text-xs text-slate-400">/{totalTasksCount}</span>
                </div>
                <span className="text-[10px] text-teal-400/80 block font-medium">
                  {completionPercentage}% complete
                </span>
              </div>
            </div>

            {/* 4. Streak Tracker */}
            <div
              id="stat-streak-progress"
              className="p-3 bg-gradient-to-br from-slate-950 to-slate-900 border border-amber-500/30 rounded-2xl flex flex-col justify-between"
            >
              <div className="flex items-center justify-between text-slate-400 text-[11px] mb-1">
                <span>Streak</span>
                <Flame className="w-3.5 h-3.5 text-amber-400" />
              </div>
              <div>
                <span className="text-lg sm:text-xl font-bold font-mono text-amber-300">
                  {streak.currentStreak} {streak.currentStreak === 1 ? 'Day' : 'Days'}
                </span>
                <span className="text-[10px] text-amber-400/80 block font-medium">
                  Streak maintained! 🔥
                </span>
              </div>
            </div>
          </div>

          {/* Tab Navigation for Detailed Sections */}
          <div className="flex items-center gap-1 bg-slate-950/60 p-1 rounded-2xl border border-slate-800 text-xs">
            <button
              type="button"
              id="btn-tab-overview"
              onClick={() => setActiveTab('overview')}
              className={`flex-1 py-1.5 rounded-xl font-semibold transition flex items-center justify-center gap-1.5 ${
                activeTab === 'overview'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Session Overview</span>
            </button>

            <button
              type="button"
              id="btn-tab-tasks"
              onClick={() => setActiveTab('tasks')}
              className={`flex-1 py-1.5 rounded-xl font-semibold transition flex items-center justify-center gap-1.5 ${
                activeTab === 'tasks'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <CheckCheck className="w-3.5 h-3.5 text-teal-400" />
              <span>Tasks ({completedTasks.length}/{totalTasksCount})</span>
            </button>

            <button
              type="button"
              id="btn-tab-reflection"
              onClick={() => setActiveTab('reflection')}
              className={`flex-1 py-1.5 rounded-xl font-semibold transition flex items-center justify-center gap-1.5 ${
                activeTab === 'reflection'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileText className="w-3.5 h-3.5 text-indigo-400" />
              <span>Notes & Energy</span>
            </button>
          </div>

          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-3">
              {/* AI Reflection Prompt Banner */}
              <div
                id="ai-session-reflection-prompt"
                className="bg-slate-950/70 border border-amber-500/25 rounded-2xl p-3.5 flex gap-3 text-slate-200"
              >
                <Sparkles className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div className="text-xs leading-relaxed">
                  <span className="font-semibold text-amber-300 block mb-0.5">Session Insight</span>
                  <p className="italic text-slate-300">"{reflectionPrompt}"</p>
                </div>
              </div>

              {/* Tasks Quick Snapshot */}
              <div className="bg-slate-950/50 border border-slate-800/80 rounded-2xl p-3">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-300 mb-2">
                  <span className="flex items-center gap-1.5">
                    <CheckCheck className="w-3.5 h-3.5 text-teal-400" />
                    <span>Focus Tasks Progress</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setActiveTab('tasks')}
                    className="text-[11px] text-indigo-400 hover:underline"
                  >
                    Manage Tasks →
                  </button>
                </div>

                {tasks.length === 0 ? (
                  <p className="text-xs text-slate-500 py-1">
                    No tasks were tagged for this session. Use the tasks tab to add goals!
                  </p>
                ) : (
                  <div className="space-y-1.5 max-h-28 overflow-y-auto pr-1 custom-scrollbar">
                    {tasks.slice(0, 4).map((task) => (
                      <div
                        key={task.id}
                        onClick={() => onToggleTask(task.id)}
                        className={`flex items-center justify-between p-2 rounded-xl border text-xs cursor-pointer transition ${
                          task.completed
                            ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-200'
                            : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {task.completed ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          ) : (
                            <Circle className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          )}
                          <span className={`truncate ${task.completed ? 'line-through opacity-80' : ''}`}>
                            {task.title}
                          </span>
                        </div>

                        {task.priority && (
                          <span className="text-[9px] uppercase px-1.5 py-0.5 rounded font-mono bg-slate-800 text-slate-400 shrink-0">
                            {task.priority}
                          </span>
                        )}
                      </div>
                    ))}
                    {tasks.length > 4 && (
                      <p className="text-[10px] text-slate-400 text-center pt-1">
                        +{tasks.length - 4} more tasks in Tasks tab
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: TASKS CHECKLIST & INLINE ADD */}
          {activeTab === 'tasks' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-400 px-1">
                <span>Click any task to toggle completed status</span>
                <span className="text-teal-400 font-medium">
                  {completedTasks.length} of {totalTasksCount} Done
                </span>
              </div>

              {/* Interactive Tasks List */}
              <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1 custom-scrollbar">
                {tasks.length === 0 ? (
                  <div className="text-center py-6 text-slate-500 text-xs">
                    <p>No tasks configured yet. Add one below!</p>
                  </div>
                ) : (
                  tasks.map((task) => (
                    <div
                      key={task.id}
                      id={`summary-task-item-${task.id}`}
                      onClick={() => onToggleTask(task.id)}
                      className={`flex items-center justify-between p-2.5 rounded-xl border text-xs cursor-pointer transition select-none ${
                        task.completed
                          ? 'bg-emerald-950/25 border-emerald-500/40 text-emerald-100'
                          : 'bg-slate-950/60 border-slate-800 text-slate-200 hover:border-slate-700 hover:bg-slate-900/60'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {task.completed ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        ) : (
                          <Circle className="w-4 h-4 text-slate-500 shrink-0" />
                        )}
                        <span className={`truncate ${task.completed ? 'line-through text-slate-400' : ''}`}>
                          {task.title}
                        </span>
                      </div>

                      {task.priority && (
                        <span
                          className={`text-[9px] uppercase px-1.5 py-0.5 rounded font-mono font-semibold shrink-0 ${
                            task.priority === 'high'
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              : task.priority === 'low'
                              ? 'bg-slate-800 text-slate-400 border border-slate-700'
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          }`}
                        >
                          {task.priority}
                        </span>
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* Inline Add Task Form */}
              <form onSubmit={handleAddNewTaskInline} className="flex gap-2 pt-1">
                <input
                  type="text"
                  id="summary-inline-add-task-input"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder="Add a new task for next session... (Enter)"
                  className="flex-1 bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 outline-none focus:border-teal-500 transition"
                />
                <button
                  type="submit"
                  id="btn-summary-add-task"
                  disabled={!newTaskTitle.trim()}
                  className="px-3 py-2 bg-teal-600 hover:bg-teal-500 disabled:bg-slate-800 disabled:text-slate-600 text-white rounded-xl text-xs font-semibold flex items-center gap-1 transition shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add</span>
                </button>
              </form>
            </div>
          )}

          {/* TAB 3: NOTES & ENERGY CHECK-IN */}
          {activeTab === 'reflection' && (
            <div className="space-y-3">
              {/* Energy Level Check-in */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  How do you feel after this focus block?
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(
                    [
                      { id: 'energized', label: 'Energized', icon: Zap, color: 'text-amber-400' },
                      { id: 'in_flow', label: 'In Flow', icon: BatteryCharging, color: 'text-emerald-400' },
                      { id: 'calm', label: 'Calm', icon: Smile, color: 'text-sky-400' },
                      { id: 'tired', label: 'Need Break', icon: Coffee, color: 'text-rose-400' },
                    ] as const
                  ).map((lvl) => {
                    const Icon = lvl.icon;
                    const isSelected = energyLevel === lvl.id;
                    return (
                      <button
                        key={lvl.id}
                        type="button"
                        id={`btn-energy-${lvl.id}`}
                        onClick={() => setEnergyLevel(lvl.id)}
                        className={`p-2 rounded-xl border text-xs font-medium flex items-center justify-center gap-1.5 transition ${
                          isSelected
                            ? 'bg-slate-800 border-indigo-500 text-white shadow-sm ring-1 ring-indigo-500/30'
                            : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <Icon className={`w-3.5 h-3.5 ${lvl.color}`} />
                        <span>{lvl.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Quick Breakthrough Note / Reflection */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Session Note or Breakthrough (Auto-saves to Notepad)
                </label>
                <textarea
                  id="summary-session-note-textarea"
                  value={sessionNote}
                  onChange={(e) => setSessionNote(e.target.value)}
                  placeholder="Jot down any key takeaways, solved bugs, or where to pick up next..."
                  className="w-full h-24 bg-slate-950 border border-slate-800 rounded-2xl p-3 text-xs outline-none focus:border-indigo-500 transition text-slate-200 resize-none placeholder-slate-500"
                />
              </div>
            </div>
          )}
        </div>

        {/* Action Footer */}
        <div className="border-t border-slate-800/80 pt-3.5 mt-3 shrink-0 flex flex-col sm:flex-row items-center justify-between gap-2.5">
          <button
            type="button"
            id="btn-summary-dismiss"
            onClick={handleClose}
            className="w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition"
          >
            Dismiss to Workspace
          </button>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* Start Next Focus Session Immediately */}
            <button
              type="button"
              id="btn-summary-start-next-focus"
              onClick={handleStartNextFocusAction}
              className="flex-1 sm:flex-initial px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition flex items-center justify-center gap-1.5"
            >
              <Zap className="w-3.5 h-3.5 text-indigo-400" />
              <span>Next Focus</span>
            </button>

            {/* Primary Action: Start Break */}
            <button
              type="button"
              id="btn-summary-start-break"
              onClick={handleStartBreakAction}
              className="flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 shadow-lg shadow-amber-500/20 transition flex items-center justify-center gap-1.5 active:scale-95"
            >
              <Coffee className="w-4 h-4" />
              <span>
                Start {isLongBreak ? 'Long Break' : 'Break'} ({breakMinutes}m)
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
