import React, { useState } from 'react';
import { FocusLog, Streak } from '../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { BarChart2, Flame, Award, Share2, CheckCircle2, Clock, Calendar, X, Download } from 'lucide-react';

interface StatsAnalyticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  logs: FocusLog[];
  streak: Streak;
}

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'];

export const StatsAnalyticsModal: React.FC<StatsAnalyticsModalProps> = ({
  isOpen,
  onClose,
  logs,
  streak,
}) => {
  const [showProofCard, setShowProofCard] = useState(false);

  if (!isOpen) return null;

  // Compute daily aggregated focus time in minutes
  const dailyDataMap = new Map<string, number>();
  // Pre-fill last 7 days
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  days.forEach((d) => dailyDataMap.set(d, 0));

  logs.forEach((log) => {
    const dayName = new Date(log.date || Date.now()).toLocaleDateString('en-US', { weekday: 'short' });
    const currentMins = dailyDataMap.get(dayName) || 0;
    dailyDataMap.set(dayName, currentMins + Math.round(log.totalFocusTime / 60));
  });

  const chartData = Array.from(dailyDataMap.entries()).map(([day, minutes]) => ({
    day,
    minutes,
  }));

  const totalFocusMinutes = logs.reduce((acc, l) => acc + Math.round(l.totalFocusTime / 60), 0);
  const totalSessionsCompleted = logs.length;
  const totalTasksCompleted = logs.reduce((acc, l) => acc + l.tasksCompleted, 0);

  // Method Breakdown Pie Chart Data
  const methodMap = new Map<string, number>();
  logs.forEach((l) => {
    const count = methodMap.get(l.methodUsed) || 0;
    methodMap.set(l.methodUsed, count + 1);
  });

  const pieData = Array.from(methodMap.entries()).map(([method, count]) => ({
    name: method.toUpperCase(),
    value: count,
  }));

  if (pieData.length === 0) {
    pieData.push({ name: 'POMODORO', value: 1 });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl max-w-2xl w-full text-slate-100 relative max-h-[85vh] overflow-y-auto custom-scrollbar animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
          <div className="flex items-center gap-3 text-indigo-400">
            <div className="p-3 bg-indigo-500/20 border border-indigo-500/30 rounded-2xl">
              <BarChart2 className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Focus Analytics & Streaks</h2>
              <p className="text-xs text-slate-400">Track your deep work velocity and productivity streaks</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowProofCard(!showProofCard)}
              className="px-3 py-1.5 bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 hover:bg-indigo-600/50 rounded-xl text-xs font-semibold transition flex items-center gap-1.5"
            >
              <Share2 className="w-3.5 h-3.5" /> Proof Card
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 1. Shareable Proof Card Generator */}
        {showProofCard && (
          <div className="mb-6 p-6 rounded-3xl bg-gradient-to-br from-indigo-950 via-slate-900 to-purple-950 border border-indigo-500/40 shadow-2xl text-center relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
            
            <span className="text-[10px] font-mono tracking-widest text-indigo-300 uppercase bg-indigo-500/20 border border-indigo-500/30 px-3 py-1 rounded-full">
              Focus Workspace • Daily Focus Proof
            </span>

            <h3 className="text-2xl font-black text-white my-3">
              🔥 {streak.currentStreak} Day Focus Streak!
            </h3>

            <div className="grid grid-cols-3 gap-3 my-4">
              <div className="bg-slate-900/60 p-3 rounded-2xl border border-white/10">
                <p className="text-xl font-bold text-indigo-400">{totalFocusMinutes} mins</p>
                <p className="text-[10px] text-slate-400">Total Focus Time</p>
              </div>
              <div className="bg-slate-900/60 p-3 rounded-2xl border border-white/10">
                <p className="text-xl font-bold text-emerald-400">{totalSessionsCompleted}</p>
                <p className="text-[10px] text-slate-400">Sessions Finished</p>
              </div>
              <div className="bg-slate-900/60 p-3 rounded-2xl border border-white/10">
                <p className="text-xl font-bold text-amber-400">{totalTasksCompleted}</p>
                <p className="text-[10px] text-slate-400">Tasks Completed</p>
              </div>
            </div>

            <p className="text-xs text-slate-400 font-mono">
              "Consistency beats intensity." • Shared via Focus Workspace
            </p>
          </div>
        )}

        {/* Key Metrics Cards */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          
          <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800 flex items-center gap-3">
            <div className="p-3 bg-amber-500/20 border border-amber-500/30 text-amber-400 rounded-xl">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <p className="text-lg font-bold text-slate-100">{streak.currentStreak} Days</p>
              <p className="text-[11px] text-slate-400">Current Streak</p>
            </div>
          </div>

          <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800 flex items-center gap-3">
            <div className="p-3 bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 rounded-xl">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-lg font-bold text-slate-100">{totalFocusMinutes} Mins</p>
              <p className="text-[11px] text-slate-400">Total Focus Logged</p>
            </div>
          </div>

          <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800 flex items-center gap-3">
            <div className="p-3 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded-xl">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-lg font-bold text-slate-100">{totalTasksCompleted}</p>
              <p className="text-[11px] text-slate-400">Tasks Done</p>
            </div>
          </div>

        </div>

        {/* Weekly Focus Time Bar Chart */}
        <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800 mb-6">
          <h3 className="text-xs font-semibold text-slate-300 mb-3 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-indigo-400" /> Weekly Focus Duration (Minutes)
          </h3>
          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <XAxis dataKey="day" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }}
                  labelStyle={{ color: '#cbd5e1' }}
                />
                <Bar dataKey="minutes" fill="#6366f1" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Streak Milestones Badges */}
        <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
          <h3 className="text-xs font-semibold text-slate-300 mb-3 flex items-center gap-2">
            <Award className="w-4 h-4 text-amber-400" /> Milestone Badges
          </h3>
          <div className="grid grid-cols-3 gap-3">
            {[7, 30, 100].map((m) => {
              const achieved = streak.currentStreak >= m || (streak.milestones && streak.milestones.includes(m));
              return (
                <div
                  key={m}
                  className={`p-3 rounded-xl border text-center transition ${
                    achieved
                      ? 'bg-amber-500/10 border-amber-500/40 text-amber-300'
                      : 'bg-slate-900/40 border-slate-800 text-slate-600'
                  }`}
                >
                  <Award className="w-6 h-6 mx-auto mb-1 opacity-80" />
                  <p className="text-xs font-bold">{m} Days Focus</p>
                  <p className="text-[10px] opacity-75">{achieved ? 'Achieved!' : 'Locked'}</p>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
};
