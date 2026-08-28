import React, { useState } from 'react';
import { FocusLog, Streak, Task } from '../types';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import {
  BarChart2,
  Flame,
  Award,
  Share2,
  CheckCircle2,
  Clock,
  Calendar,
  X,
  Copy,
  Check,
  Zap,
  Activity,
  Target,
  Sparkles,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react';

interface StatsAnalyticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: Task[];
  logs: FocusLog[];
  streak: Streak;
  userEmail?: string | null;
  isCloudSyncActive?: boolean;
}

const PIE_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4'];

export const StatsAnalyticsModal: React.FC<StatsAnalyticsModalProps> = ({
  isOpen,
  onClose,
  tasks = [],
  logs = [],
  streak,
  userEmail,
  isCloudSyncActive = true,
}) => {
  const [showProofCard, setShowProofCard] = useState(false);
  const [copied, setCopied] = useState(false);
  const [chartMetric, setChartMetric] = useState<'all' | 'focus' | 'tasks'>('all');

  if (!isOpen) return null;

  // 1. Calculate Last 7 Rolling Days for Precise Charting
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  const past7Days = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const isoDate = d.toISOString().split('T')[0];
    const dayLabel = d.toLocaleDateString('en-US', { weekday: 'short' });
    const fullDate = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const isToday = isoDate === todayStr;
    const hasFocusActivity =
      logs.some((l) => l.date && l.date.startsWith(isoDate) && (l.totalFocusTime || 0) > 0) ||
      tasks.some((t) => t.completed && t.completedAt && t.completedAt.startsWith(isoDate)) ||
      (Array.isArray(streak.streakHistory) && streak.streakHistory.includes(isoDate));

    return { dateObj: d, isoDate, dayLabel, fullDate, isToday, hasFocusActivity };
  });

  // Calculate live tasks completed count and completed today
  const activeCompletedTasks = tasks.filter((t) => t.completed);
  const completedTodayTasks = tasks.filter((t) => {
    if (!t.completed) return false;
    if (t.completedAt) {
      return t.completedAt.startsWith(todayStr);
    }
    // If no completedAt timestamp but completed, count as today
    return true;
  });

  // Compute metrics per day
  const chartData = past7Days.map(({ isoDate, dayLabel, fullDate, isToday }) => {
    // Focus minutes on this day from logs
    const dayLogs = logs.filter((l) => l.date && l.date.startsWith(isoDate));
    const focusMinutes = dayLogs.reduce(
      (acc, l) => acc + Math.round((l.totalFocusTime || 0) / 60),
      0
    );

    // Tasks completed on this day:
    // Count from tasks marked completed on this date
    const tasksOnThisDay = tasks.filter((t) => {
      if (!t.completed) return false;
      if (t.completedAt) {
        return t.completedAt.startsWith(isoDate);
      }
      // If it's today and completed, include it
      return isToday;
    }).length;

    // Also include task logs recorded for this day if higher (avoiding undercounting archived sessions)
    const loggedTasksCount = dayLogs.reduce((acc, l) => acc + (l.tasksCompleted || 0), 0);
    const tasksCount = Math.max(tasksOnThisDay, loggedTasksCount);

    return {
      day: isToday ? `${dayLabel} (Today)` : dayLabel,
      fullDate,
      minutes: focusMinutes,
      tasks: tasksCount,
    };
  });

  // Total Focus Minutes
  const totalFocusMinutes = logs.reduce(
    (acc, l) => acc + Math.round((l.totalFocusTime || 0) / 60),
    0
  );
  const todayLogs = logs.filter((l) => l.date && l.date.startsWith(todayStr));
  const todayFocusMinutes = todayLogs.reduce(
    (acc, l) => acc + Math.round((l.totalFocusTime || 0) / 60),
    0
  );

  // Total Tasks Completed: live active completed tasks + archived log historical tasks
  const historicalLogsTotal = logs.reduce((acc, l) => acc + (l.tasksCompleted || 0), 0);
  const totalTasksCompleted = Math.max(activeCompletedTasks.length, historicalLogsTotal);
  const totalSessionsCompleted = logs.length;
  const taskCompletionRate =
    tasks.length > 0 ? Math.round((activeCompletedTasks.length / tasks.length) * 100) : 0;

  // Method Breakdown Pie Chart Data
  const methodMap = new Map<string, number>();
  logs.forEach((l) => {
    const key = (l.methodUsed || 'pomodoro').toUpperCase();
    const count = methodMap.get(key) || 0;
    methodMap.set(key, count + 1);
  });

  let pieData = Array.from(methodMap.entries()).map(([name, value]) => ({
    name,
    value,
  }));

  if (pieData.length === 0) {
    pieData = [{ name: 'POMODORO', value: 1 }];
  }

  // Handle Proof Card Copy
  const handleCopyProof = () => {
    const proofText = `🔥 Focus Workspace Proof\n` +
      `Streak: ${streak.currentStreak} Days\n` +
      `Focus Time: ${totalFocusMinutes} Mins\n` +
      `Tasks Done: ${totalTasksCompleted}\n` +
      `Sessions: ${totalSessionsCompleted}\n` +
      `Consistency beats intensity!`;
    navigator.clipboard.writeText(proofText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl max-w-2xl w-full text-slate-100 relative max-h-[88vh] overflow-y-auto custom-scrollbar animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
          <div className="flex items-center gap-3 text-indigo-400">
            <div className="p-3 bg-indigo-500/20 border border-indigo-500/30 rounded-2xl shadow-inner">
              <BarChart2 className="w-6 h-6 text-indigo-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white">Focus Analytics & Streaks</h2>
                <span className="flex items-center gap-1 text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Instant Sync
                </span>
              </div>
              <p className="text-xs text-slate-400">Real-time velocity tracking, task completions & daily streaks</p>
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
          <div className="mb-6 p-6 rounded-3xl bg-gradient-to-br from-indigo-950 via-slate-900 to-purple-950 border border-indigo-500/40 shadow-2xl text-center relative overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="absolute top-0 right-0 w-36 h-36 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
            
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-mono tracking-widest text-indigo-300 uppercase bg-indigo-500/20 border border-indigo-500/30 px-3 py-1 rounded-full">
                Focus Workspace • Daily Velocity
              </span>
              <button
                onClick={handleCopyProof}
                className="px-2.5 py-1 bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs rounded-xl border border-slate-700 flex items-center gap-1 transition"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? 'Copied!' : 'Copy'}</span>
              </button>
            </div>

            <h3 className="text-2xl font-black text-white my-3 flex items-center justify-center gap-2">
              <Flame className="w-7 h-7 text-amber-400 fill-amber-400 animate-bounce" />
              <span>{streak.currentStreak} Day Focus Streak!</span>
            </h3>

            <div className="grid grid-cols-3 gap-3 my-4">
              <div className="bg-slate-900/80 p-3 rounded-2xl border border-white/10 shadow-inner">
                <p className="text-xl font-bold text-indigo-400">{totalFocusMinutes}m</p>
                <p className="text-[10px] text-slate-400">Total Focus Time</p>
              </div>
              <div className="bg-slate-900/80 p-3 rounded-2xl border border-white/10 shadow-inner">
                <p className="text-xl font-bold text-emerald-400">{totalTasksCompleted}</p>
                <p className="text-[10px] text-slate-400">Tasks Completed</p>
              </div>
              <div className="bg-slate-900/80 p-3 rounded-2xl border border-white/10 shadow-inner">
                <p className="text-xl font-bold text-amber-400">{totalSessionsCompleted}</p>
                <p className="text-[10px] text-slate-400">Sessions Finished</p>
              </div>
            </div>

            <p className="text-xs text-slate-400 font-mono">
              "Consistency beats intensity." • Verified Instant Sync
            </p>
          </div>
        )}

        {/* 2. Key Metrics 4-Column Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          
          {/* Streak Card */}
          <div className="bg-slate-950/70 p-3.5 rounded-2xl border border-amber-500/30 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div className="p-2 bg-amber-500/20 text-amber-400 rounded-xl">
                <Flame className="w-4 h-4 fill-amber-400" />
              </div>
              <span className="text-[10px] font-mono text-amber-400/90 font-bold bg-amber-500/10 px-1.5 py-0.5 rounded">
                🔥 Active
              </span>
            </div>
            <div className="mt-2">
              <p className="text-xl font-black text-white">{streak.currentStreak} <span className="text-xs font-normal text-amber-300">Days</span></p>
              <p className="text-[10px] text-slate-400">Best: {streak.longestStreak || streak.currentStreak}d streak</p>
            </div>
          </div>

          {/* Tasks Completed Card (Instantly Updated) */}
          <div className="bg-slate-950/70 p-3.5 rounded-2xl border border-emerald-500/30 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-mono text-emerald-300 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded">
                {activeCompletedTasks.length}/{tasks.length} active
              </span>
            </div>
            <div className="mt-2">
              <p className="text-xl font-black text-emerald-400">{totalTasksCompleted} <span className="text-xs font-normal text-emerald-300">Done</span></p>
              <p className="text-[10px] text-slate-400">{completedTodayTasks.length} completed today</p>
            </div>
          </div>

          {/* Focus Time Card */}
          <div className="bg-slate-950/70 p-3.5 rounded-2xl border border-indigo-500/30 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-xl">
                <Clock className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-mono text-indigo-300 font-bold bg-indigo-500/10 px-1.5 py-0.5 rounded">
                {todayFocusMinutes}m today
              </span>
            </div>
            <div className="mt-2">
              <p className="text-xl font-black text-indigo-400">{totalFocusMinutes} <span className="text-xs font-normal text-indigo-300">Mins</span></p>
              <p className="text-[10px] text-slate-400">Total deep focus</p>
            </div>
          </div>

          {/* Completion Velocity */}
          <div className="bg-slate-950/70 p-3.5 rounded-2xl border border-purple-500/30 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div className="p-2 bg-purple-500/20 text-purple-400 rounded-xl">
                <Target className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-mono text-purple-300 font-bold bg-purple-500/10 px-1.5 py-0.5 rounded">
                Velocity
              </span>
            </div>
            <div className="mt-2">
              <p className="text-xl font-black text-purple-400">{taskCompletionRate}%</p>
              <p className="text-[10px] text-slate-400">{totalSessionsCompleted} total sessions</p>
            </div>
          </div>

        </div>

        {/* 3. Weekly Focus & Tasks Velocity Chart (Synchronizes instantly!) */}
        <div className="bg-slate-950/70 p-5 rounded-3xl border border-slate-800 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Calendar className="w-4 h-4 text-indigo-400" />
                <span>Last 7 Days Activity & Task Velocity</span>
              </h3>
              <p className="text-[11px] text-slate-400">Every task checked and focus cycle completed syncs in real-time</p>
            </div>

            {/* Filter Toggle */}
            <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setChartMetric('all')}
                className={`px-2.5 py-1 rounded-lg font-medium transition ${
                  chartMetric === 'all' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                All Metrics
              </button>
              <button
                type="button"
                onClick={() => setChartMetric('focus')}
                className={`px-2.5 py-1 rounded-lg font-medium transition ${
                  chartMetric === 'focus' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Focus (Mins)
              </button>
              <button
                type="button"
                onClick={() => setChartMetric('tasks')}
                className={`px-2.5 py-1 rounded-lg font-medium transition ${
                  chartMetric === 'tasks' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Tasks Done
              </button>
            </div>
          </div>

          <div className="h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis
                  dataKey="day"
                  stroke="#64748b"
                  fontSize={11}
                  tickLine={false}
                />
                <YAxis
                  stroke="#64748b"
                  fontSize={11}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#090d16',
                    borderColor: '#1e293b',
                    borderRadius: '16px',
                    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
                    padding: '10px 14px',
                  }}
                  itemStyle={{ fontSize: '12px', fontWeight: 600 }}
                  labelStyle={{ color: '#e2e8f0', fontWeight: 'bold', marginBottom: '4px' }}
                  formatter={(value: any, name: string) => {
                    if (name === 'Focus Minutes' || name === 'minutes') {
                      return [`${value} mins`, 'Focus Duration'];
                    }
                    if (name === 'Tasks Completed' || name === 'tasks') {
                      return [`${value} tasks`, 'Tasks Done'];
                    }
                    return [value, name];
                  }}
                />
                {(chartMetric === 'all' || chartMetric === 'focus') && (
                  <Bar
                    dataKey="minutes"
                    name="Focus Minutes"
                    fill="#6366f1"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={32}
                  />
                )}
                {(chartMetric === 'all' || chartMetric === 'tasks') && (
                  <Bar
                    dataKey="tasks"
                    name="Tasks Completed"
                    fill="#10b981"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={32}
                  />
                )}
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Chart Legend Bar */}
          <div className="flex items-center justify-center gap-6 mt-3 pt-3 border-t border-slate-900 text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-indigo-500" />
              <span>Focus Duration (Minutes)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-emerald-500" />
              <span>Tasks Marked Complete</span>
            </div>
          </div>
        </div>

        {/* 4. Bottom Grid: Method Breakdown & Completed Tasks Timeline */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          
          {/* Method Breakdown */}
          <div className="bg-slate-950/70 p-4 rounded-3xl border border-slate-800">
            <h3 className="text-xs font-bold text-slate-300 mb-2 flex items-center gap-2">
              <Zap className="w-3.5 h-3.5 text-indigo-400" /> Focus Techniques Breakdown
            </h3>
            <div className="h-36 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={30}
                    outerRadius={55}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={PIE_COLORS[index % PIE_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#090d16',
                      borderColor: '#1e293b',
                      borderRadius: '12px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap gap-2 justify-center mt-1">
              {pieData.map((d, i) => (
                <span
                  key={d.name}
                  className="text-[10px] flex items-center gap-1 font-medium text-slate-300"
                >
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}
                  />
                  {d.name} ({d.value})
                </span>
              ))}
            </div>
          </div>

          {/* Active / Completed Tasks List */}
          <div className="bg-slate-950/70 p-4 rounded-3xl border border-slate-800 flex flex-col">
            <h3 className="text-xs font-bold text-slate-300 mb-2 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Completed Tasks Log
              </span>
              <span className="text-[10px] font-mono text-emerald-400">
                {activeCompletedTasks.length} Total
              </span>
            </h3>

            <div className="flex-1 overflow-y-auto max-h-36 space-y-1.5 pr-1 custom-scrollbar">
              {activeCompletedTasks.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-3 text-slate-500 text-xs">
                  <CheckCircle2 className="w-6 h-6 mb-1 opacity-40 text-slate-600" />
                  <p>No tasks completed yet.</p>
                  <p className="text-[10px] text-slate-600">Mark a task done in the sidebar to see it sync live here!</p>
                </div>
              ) : (
                activeCompletedTasks.map((t) => (
                  <div
                    key={t.id}
                    className="p-2 rounded-xl bg-slate-900/90 border border-slate-800/80 flex items-center justify-between gap-2 text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span className="truncate text-slate-300 line-through opacity-80">{t.title}</span>
                    </div>
                    <span className="text-[9px] font-mono text-slate-500 shrink-0">
                      {t.completedAt
                        ? new Date(t.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        : 'Done'}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

        {/* 5. 7-Day Streak Activity Trail */}
        <div className="bg-slate-950/70 p-4 rounded-3xl border border-slate-800 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold text-slate-300 flex items-center gap-2">
              <Flame className="w-4 h-4 text-amber-400 fill-amber-400" />
              <span>7-Day Streak Trail</span>
            </h3>
            <span className="text-[10px] font-mono text-slate-400">
              Total Active Days: <strong className="text-amber-300 font-bold">{streak.totalFocusDays || streak.currentStreak}</strong>
            </span>
          </div>

          <div className="grid grid-cols-7 gap-2">
            {past7Days.map((day) => (
              <div
                key={day.isoDate}
                className={`p-2.5 rounded-2xl border text-center transition flex flex-col items-center justify-center gap-1 ${
                  day.hasFocusActivity
                    ? 'bg-gradient-to-b from-amber-500/20 to-orange-500/10 border-amber-500/40 text-amber-300 shadow-md shadow-amber-950/30'
                    : day.isToday
                    ? 'bg-slate-900 border-indigo-500/50 text-indigo-300 ring-1 ring-indigo-500/30'
                    : 'bg-slate-900/40 border-slate-800/80 text-slate-500'
                }`}
              >
                <span className="text-[10px] font-bold">{day.dayLabel}</span>
                {day.hasFocusActivity ? (
                  <Flame className="w-5 h-5 text-amber-400 fill-amber-400 animate-pulse" />
                ) : (
                  <div className={`w-2.5 h-2.5 rounded-full ${day.isToday ? 'bg-indigo-400 animate-ping' : 'bg-slate-700'}`} />
                )}
                <span className="text-[9px] font-mono opacity-80">
                  {day.hasFocusActivity ? 'Done' : day.isToday ? 'Today' : 'Rest'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* 6. Streak Milestones Badges */}
        <div className="bg-slate-950/70 p-4 rounded-3xl border border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold text-slate-300 flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-400" /> Focus Streak Milestones
            </h3>
            {userEmail && (
              <div className="flex items-center gap-1.5 text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                <span>Saved in Firestore ({userEmail})</span>
              </div>
            )}
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {[3, 7, 14, 30, 60, 100].map((m) => {
              const achieved =
                streak.currentStreak >= m ||
                (streak.longestStreak && streak.longestStreak >= m) ||
                (streak.unlockedMilestones && streak.unlockedMilestones.includes(m)) ||
                (streak.milestones && streak.milestones.includes(m) && streak.currentStreak >= m);
              return (
                <div
                  key={m}
                  className={`p-2.5 rounded-2xl border text-center transition ${
                    achieved
                      ? 'bg-amber-500/10 border-amber-500/40 text-amber-300 shadow-lg shadow-amber-950/20'
                      : 'bg-slate-900/40 border-slate-800 text-slate-600'
                  }`}
                >
                  <Award
                    className={`w-4 h-4 mx-auto mb-1 ${
                      achieved ? 'text-amber-400 animate-pulse' : 'text-slate-600'
                    }`}
                  />
                  <p className="text-xs font-bold">{m} Days</p>
                  <p className="text-[9px] font-mono opacity-80">{achieved ? '✓ Unlocked' : 'Locked'}</p>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
};
