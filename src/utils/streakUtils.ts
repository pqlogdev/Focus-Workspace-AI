import { Streak } from '../types';

/**
 * Returns a date string in YYYY-MM-DD format using local time.
 * This prevents UTC-offset bugs where nighttime local visits jump to tomorrow in UTC.
 */
export function getLocalDateString(date: Date | string | number = new Date()): string {
  const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  if (isNaN(d.getTime())) {
    const fallback = new Date();
    const year = fallback.getFullYear();
    const month = String(fallback.getMonth() + 1).padStart(2, '0');
    const day = String(fallback.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Calculates calendar day difference between two YYYY-MM-DD date strings.
 * Using UTC midnight representations eliminates DST shifts and timezone variations.
 * Returns:
 *   0 if same calendar day
 *   1 if dateStr1 is the day immediately following dateStr2 (consecutive day)
 *  >1 if there is a gap of 2 or more days
 */
export function getCalendarDayDifference(dateStr1: string, dateStr2: string): number {
  if (!dateStr1 || !dateStr2) return 999;
  try {
    const parts1 = dateStr1.split('T')[0].split('-').map(Number);
    const parts2 = dateStr2.split('T')[0].split('-').map(Number);
    if (parts1.length < 3 || parts2.length < 3) return 999;
    const [y1, m1, d1] = parts1;
    const [y2, m2, d2] = parts2;
    const utc1 = Date.UTC(y1, m1 - 1, d1);
    const utc2 = Date.UTC(y2, m2 - 1, d2);
    return Math.round((utc1 - utc2) / (1000 * 60 * 60 * 24));
  } catch {
    return 999;
  }
}

export interface StreakEvaluationResult {
  streak: Streak;
  toast?: {
    message: string;
    days: number;
    isMilestone?: boolean;
  };
  hasAdvanced: boolean;
}

/**
 * Evaluates and advances user streak based on local calendar dates and focus/visit activity.
 */
export function evaluateStreak(
  prevStreak: Streak | null | undefined,
  options: { isUserAction?: boolean } = {}
): StreakEvaluationResult {
  const now = new Date();
  const todayStr = getLocalDateString(now);

  const baseStreak: Streak = prevStreak || {
    currentStreak: 1,
    longestStreak: 1,
    lastFocusDate: now.toISOString(),
    milestones: [3, 7, 14, 30, 60, 100],
    totalFocusDays: 1,
    streakHistory: [todayStr],
    freezeDaysAvailable: 1,
    unlockedMilestones: [1],
    updatedAt: now.toISOString(),
  };

  const lastDateStr = baseStreak.lastFocusDate
    ? getLocalDateString(new Date(baseStreak.lastFocusDate))
    : '';

  const history = Array.isArray(baseStreak.streakHistory) ? [...baseStreak.streakHistory] : [];
  if (!history.includes(todayStr)) {
    history.push(todayStr);
  }
  const trimmedHistory = history.slice(-60);

  // Case 1: First ever activity/visit
  if (!lastDateStr) {
    const newStreak: Streak = {
      ...baseStreak,
      currentStreak: 1,
      longestStreak: Math.max(1, baseStreak.longestStreak || 1),
      lastFocusDate: now.toISOString(),
      totalFocusDays: 1,
      streakHistory: trimmedHistory,
      freezeDaysAvailable: baseStreak.freezeDaysAvailable ?? 1,
      unlockedMilestones: [1],
      updatedAt: now.toISOString(),
    };
    return {
      streak: newStreak,
      toast: { message: '🔥 Focus streak started! Day 1 active.', days: 1 },
      hasAdvanced: true,
    };
  }

  // Calculate day difference between today and last recorded activity
  const diffDays = getCalendarDayDifference(todayStr, lastDateStr);

  // Case 2: Same calendar day (already checked in / active today)
  if (diffDays === 0) {
    const updatedStreak: Streak = {
      ...baseStreak,
      lastFocusDate: now.toISOString(),
      streakHistory: trimmedHistory,
      totalFocusDays: Math.max(trimmedHistory.length, baseStreak.totalFocusDays || 1),
      updatedAt: now.toISOString(),
    };
    return {
      streak: updatedStreak,
      hasAdvanced: false,
    };
  }

  // Case 3: Exactly 1 calendar day gap (Consecutive Day => Day 2, Day 3, etc.)
  if (diffDays === 1) {
    const newCurrent = Math.max(1, (baseStreak.currentStreak || 0) + 1);
    const newLongest = Math.max(baseStreak.longestStreak || 0, newCurrent);
    const allMilestones = baseStreak.milestones || [3, 7, 14, 30, 60, 100];
    const newlyUnlocked = allMilestones.filter(
      (m) => newCurrent >= m && !(baseStreak.unlockedMilestones || []).includes(m)
    );
    const unlockedMilestones = Array.from(
      new Set([...(baseStreak.unlockedMilestones || []), ...newlyUnlocked, ...(newCurrent >= 1 ? [1] : [])])
    );

    const isMilestone = newlyUnlocked.length > 0;
    const newTotalDays = Math.max(trimmedHistory.length, (baseStreak.totalFocusDays || 0) + 1);

    const updatedStreak: Streak = {
      ...baseStreak,
      currentStreak: newCurrent,
      longestStreak: newLongest,
      lastFocusDate: now.toISOString(),
      totalFocusDays: newTotalDays,
      streakHistory: trimmedHistory,
      unlockedMilestones,
      updatedAt: now.toISOString(),
    };

    return {
      streak: updatedStreak,
      toast: {
        message: isMilestone
          ? `🎉 Milestone Unlocked! 🔥 ${newCurrent}-Day Focus Streak!`
          : `🔥 Streak Advanced! Day ${newCurrent} achieved! Welcome back!`,
        days: newCurrent,
        isMilestone,
      },
      hasAdvanced: true,
    };
  }

  // Case 4: 2 Days gap with Freeze Protection available
  if (diffDays === 2 && (baseStreak.freezeDaysAvailable || 0) > 0) {
    const remainingFreezes = Math.max(0, (baseStreak.freezeDaysAvailable || 1) - 1);
    const newCurrent = Math.max(1, (baseStreak.currentStreak || 0) + 1);
    const newLongest = Math.max(baseStreak.longestStreak || 0, newCurrent);

    const updatedStreak: Streak = {
      ...baseStreak,
      currentStreak: newCurrent,
      longestStreak: newLongest,
      freezeDaysAvailable: remainingFreezes,
      lastFocusDate: now.toISOString(),
      totalFocusDays: Math.max(trimmedHistory.length, (baseStreak.totalFocusDays || 0) + 1),
      streakHistory: trimmedHistory,
      updatedAt: now.toISOString(),
    };

    return {
      streak: updatedStreak,
      toast: {
        message: `❄️ Streak Freeze Activated! Your ${newCurrent}-Day focus streak was saved!`,
        days: newCurrent,
      },
      hasAdvanced: true,
    };
  }

  // Case 5: 2+ Days gap without freeze protection => Streak resets to Day 1
  const resetStreak: Streak = {
    ...baseStreak,
    currentStreak: 1,
    longestStreak: Math.max(baseStreak.longestStreak || 1, 1),
    lastFocusDate: now.toISOString(),
    totalFocusDays: Math.max(trimmedHistory.length, (baseStreak.totalFocusDays || 0) + 1),
    streakHistory: trimmedHistory,
    freezeDaysAvailable: baseStreak.freezeDaysAvailable ?? 1,
    updatedAt: now.toISOString(),
  };

  return {
    streak: resetStreak,
    toast: {
      message: `🔥 New Streak Started! Day 1 recorded. Let's build momentum!`,
      days: 1,
    },
    hasAdvanced: true,
  };
}
