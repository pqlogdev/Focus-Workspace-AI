import React, { useEffect, useState, useRef } from 'react';
import {
  FocusMethodConfig,
  TimerStatus,
  ViewMode,
  WorkspaceAppearanceConfig,
  ClockStyle,
  FontTheme,
  WidgetSize,
  WidgetBorder,
  WidgetRadius,
  AccentColor,
} from '../types';
import { audioSynth } from '../utils/audioSynth';
import { getFirstColor, isGradient } from '../utils/colorUtils';
import { ColorPickerControl } from './ColorPickerControl';
import {
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  Maximize,
  Maximize2,
  Minimize2,
  EyeOff,
  Settings,
  GripHorizontal,
  Move,
  Flame,
  Sparkles,
  Palette,
  Check,
  Zap,
  Sliders,
  Radio,
  Layers,
  ChevronDown,
  ShieldCheck,
  ShieldAlert,
  Clock,
  X,
  Activity,
  AlertCircle
} from 'lucide-react';

interface TimerWidgetProps {
  methodConfig: FocusMethodConfig;
  status: TimerStatus;
  onStatusChange: (newStatus: TimerStatus) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  onCompleteCycle: () => void;
  onAccrueFocusTime?: (seconds: number) => void;
  onOpenMethodCustomizer: () => void;
  appearance?: WorkspaceAppearanceConfig;
  onUpdateAppearance?: (changes: Partial<WorkspaceAppearanceConfig>) => void;
  isHighlighted?: boolean;
}

export const TimerWidget: React.FC<TimerWidgetProps> = ({
  methodConfig,
  status,
  onStatusChange,
  viewMode,
  onViewModeChange,
  onCompleteCycle,
  onAccrueFocusTime,
  onOpenMethodCustomizer,
  appearance,
  onUpdateAppearance,
  isHighlighted = false,
}) => {
  const isFlowtime = methodConfig.type === 'flowtime';

  const [remainingSeconds, setRemainingSeconds] = useState<number>(() => {
    const saved = localStorage.getItem('airiser_timer_remaining_seconds');
    if (saved !== null) {
      const val = parseInt(saved, 10);
      if (!isNaN(val) && val >= 0) return val;
    }
    return isFlowtime ? 0 : methodConfig.workDuration;
  });
  const [isRunning, setIsRunning] = useState<boolean>(() => {
    return localStorage.getItem('airiser_timer_is_running') === 'true';
  });
  const [currentCycle, setCurrentCycle] = useState<number>(() => {
    const saved = localStorage.getItem('airiser_timer_cycle');
    if (saved !== null) {
      const val = parseInt(saved, 10);
      if (!isNaN(val) && val >= 1) return val;
    }
    return 1;
  });
  const [isQuickHidden, setIsQuickHidden] = useState(false);
  const [showQuickStyleMenu, setShowQuickStyleMenu] = useState(false);
  const [showAutoPauseSettings, setShowAutoPauseSettings] = useState(false);

  // Auto-Pause Configuration
  const autoPauseOnTabSwitch =
    appearance?.autoPauseOnTabSwitch ?? methodConfig.autoPauseOnTabSwitch ?? true;
  const autoPauseOnIdle =
    appearance?.autoPauseOnIdle ?? methodConfig.autoPauseOnIdle ?? true;
  const idleTimeoutMinutes =
    appearance?.idleTimeoutMinutes ?? methodConfig.idleTimeoutMinutes ?? 5;

  // Auto-pause notification state
  const [autoPauseNotice, setAutoPauseNotice] = useState<{
    reason: 'tab_switch' | 'idle';
    timestamp: number;
    message: string;
    details: string;
  } | null>(null);

  // Activity tracking and state synchronization refs
  const isRunningRef = useRef(isRunning);
  const statusRef = useRef(status);
  const lastActivityRef = useRef<number>(Date.now());
  const autoPauseTabRef = useRef(autoPauseOnTabSwitch);
  const autoPauseIdleRef = useRef(autoPauseOnIdle);
  const idleTimeoutRef = useRef(idleTimeoutMinutes);

  useEffect(() => {
    isRunningRef.current = isRunning;
    localStorage.setItem('airiser_timer_is_running', isRunning.toString());
    localStorage.setItem('airiser_timer_last_timestamp', Date.now().toString());
  }, [isRunning]);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  useEffect(() => {
    autoPauseTabRef.current = autoPauseOnTabSwitch;
  }, [autoPauseOnTabSwitch]);

  useEffect(() => {
    autoPauseIdleRef.current = autoPauseOnIdle;
  }, [autoPauseOnIdle]);

  useEffect(() => {
    idleTimeoutRef.current = idleTimeoutMinutes;
  }, [idleTimeoutMinutes]);

  // Position state for draggable timer
  const [position, setPosition] = useState<{ x: number; y: number } | null>(() => {
    const saved = localStorage.getItem('airiser_timer_position');
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

  // Custom resizable width state
  const [customWidth, setCustomWidth] = useState<number | null>(() => {
    const saved = localStorage.getItem('airiser_timer_custom_width');
    if (saved) {
      const val = parseInt(saved, 10);
      if (!isNaN(val) && val >= 240 && val <= 1100) return val;
    }
    return null;
  });
  const [isResizing, setIsResizing] = useState(false);

  const cardRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
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
    width: 400,
    height: 400,
    rafId: null,
    pendingX: 0,
    pendingY: 0,
  });

  const resizeRef = useRef<{
    startX: number;
    startY: number;
    initWidth: number;
    direction: 'se' | 'sw' | 'ne' | 'nw';
    rafId: number | null;
    pendingWidth: number;
  }>({
    startX: 0,
    startY: 0,
    initWidth: 420,
    direction: 'se',
    rafId: null,
    pendingWidth: 420,
  });

  // Save position, size, countdown and cycle to localStorage
  useEffect(() => {
    if (position) {
      localStorage.setItem('airiser_timer_position', JSON.stringify(position));
    } else {
      localStorage.removeItem('airiser_timer_position');
    }
  }, [position]);

  useEffect(() => {
    if (customWidth !== null) {
      localStorage.setItem('airiser_timer_custom_width', customWidth.toString());
    } else {
      localStorage.removeItem('airiser_timer_custom_width');
    }
  }, [customWidth]);

  useEffect(() => {
    localStorage.setItem('airiser_timer_remaining_seconds', remainingSeconds.toString());
  }, [remainingSeconds]);

  useEffect(() => {
    localStorage.setItem('airiser_timer_cycle', currentCycle.toString());
  }, [currentCycle]);

  // Clean up any pending animation frame on unmount & listen for expand/reset events
  const handleExpandFullTimer = () => {
    setIsQuickHidden(false);
    setPosition(null);
    setCustomWidth(null);
    localStorage.removeItem('airiser_timer_position');
    localStorage.removeItem('airiser_timer_custom_width');
    if (onUpdateAppearance) {
      onUpdateAppearance({
        clockStyle: 'digital',
        timerSize: 'normal',
        timerTransparentGhost: false,
      });
    }
  };

  useEffect(() => {
    const handleResetAll = () => {
      handleExpandFullTimer();
    };

    window.addEventListener('reset-all-positions', handleResetAll);
    window.addEventListener('reset-timer-position', handleResetAll);
    window.addEventListener('expand-timer', handleResetAll);
    return () => {
      window.removeEventListener('reset-all-positions', handleResetAll);
      window.removeEventListener('reset-timer-position', handleResetAll);
      window.removeEventListener('expand-timer', handleResetAll);
      if (dragRef.current.rafId !== null) {
        cancelAnimationFrame(dragRef.current.rafId);
      }
      if (resizeRef.current.rafId !== null) {
        cancelAnimationFrame(resizeRef.current.rafId);
      }
    };
  }, [onUpdateAppearance]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (
      (e.target as HTMLElement).tagName === 'BUTTON' ||
      (e.target as HTMLElement).closest('button') ||
      (e.target as HTMLElement).tagName === 'INPUT' ||
      (e.target as HTMLElement).tagName === 'SELECT'
    ) {
      return;
    }

    e.preventDefault();
    const card = cardRef.current;
    const rect = card
      ? card.getBoundingClientRect()
      : { left: window.innerWidth / 2 - 200, top: 150, width: 400, height: 400 };

    const initX = position ? position.x : rect.left;
    const initY = position ? position.y : rect.top;

    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initX,
      initY,
      width: rect.width || 400,
      height: rect.height || 400,
      rafId: null,
      pendingX: initX,
      pendingY: initY,
    };

    setIsDragging(true);

    const handlePointerMove = (moveEv: PointerEvent) => {
      const { startX, startY, initX, initY, width } = dragRef.current;
      const deltaX = moveEv.clientX - startX;
      const deltaY = moveEv.clientY - startY;

      const nextX = Math.max(0, Math.min(window.innerWidth - width, initX + deltaX));
      const nextY = Math.max(0, Math.min(window.innerHeight - 50, initY + deltaY));

      dragRef.current.pendingX = nextX;
      dragRef.current.pendingY = nextY;

      if (cardRef.current) {
        cardRef.current.style.left = `${nextX}px`;
        cardRef.current.style.top = `${nextY}px`;
      }
    };

    const handlePointerUp = () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);

      const finalY = dragRef.current.pendingY < 45 ? 12 : dragRef.current.pendingY;
      setPosition({
        x: dragRef.current.pendingX,
        y: finalY,
      });
      setIsDragging(false);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
  };

  // Timer Corner Resize Pointer Handlers
  const handleResizePointerDown = (
    e: React.PointerEvent<HTMLDivElement>,
    direction: 'se' | 'sw' | 'ne' | 'nw' = 'se'
  ) => {
    e.preventDefault();
    e.stopPropagation();

    const card = cardRef.current;
    const rect = card ? card.getBoundingClientRect() : { width: effectiveWidth };

    resizeRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initWidth: rect.width || effectiveWidth,
      direction,
      rafId: null,
      pendingWidth: rect.width || effectiveWidth,
    };

    setIsResizing(true);

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
  };

  const handleResizePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isResizing) return;

    const { startX, initWidth, direction } = resizeRef.current;
    const deltaX = e.clientX - startX;

    const minW = 260;
    const maxW = Math.min(1000, window.innerWidth - 30);

    // Expand symmetrically (if centered) or unidirectionally (if positioned/docked)
    const scaleFactor = position ? 1 : 2;
    let nextWidth = initWidth;
    if (direction === 'se' || direction === 'ne') {
      nextWidth = Math.max(minW, Math.min(maxW, initWidth + deltaX * scaleFactor));
    } else if (direction === 'sw' || direction === 'nw') {
      nextWidth = Math.max(minW, Math.min(maxW, initWidth - deltaX * scaleFactor));
    }

    resizeRef.current.pendingWidth = nextWidth;

    if (resizeRef.current.rafId === null) {
      resizeRef.current.rafId = requestAnimationFrame(() => {
        setCustomWidth(Math.round(resizeRef.current.pendingWidth));
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
      const finalW = Math.round(resizeRef.current.pendingWidth);
      setCustomWidth(finalW);
      setIsResizing(false);
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {}
    }
  };

  // Track previous status and config to prevent initial mount from clobbering restored remainingSeconds
  const prevStatusRef = useRef(status);
  const prevMethodConfigRef = useRef(methodConfig);
  const isInitialMount = useRef(true);

  // 1. Recover elapsed time if page was refreshed / reloaded while running
  useEffect(() => {
    const wasRunning = localStorage.getItem('airiser_timer_is_running') === 'true';
    const lastTimestampStr = localStorage.getItem('airiser_timer_last_timestamp');

    if (wasRunning && lastTimestampStr) {
      const lastTimestamp = parseInt(lastTimestampStr, 10);
      if (!isNaN(lastTimestamp) && lastTimestamp > 0) {
        const now = Date.now();
        const elapsedSec = Math.floor((now - lastTimestamp) / 1000);

        // If refresh happened while running, credit elapsed focus time and adjust timer
        if (elapsedSec > 0 && elapsedSec < 43200) {
          if (status === 'FOCUS') {
            if (isFlowtime) {
              setRemainingSeconds((prev) => prev + elapsedSec);
              onAccrueFocusTime?.(elapsedSec);
            } else {
              setRemainingSeconds((prev) => {
                if (elapsedSec >= prev) {
                  onAccrueFocusTime?.(prev);
                  setTimeout(() => handleCycleComplete(), 100);
                  return 0;
                } else {
                  onAccrueFocusTime?.(elapsedSec);
                  return prev - elapsedSec;
                }
              });
            }
          } else if (status === 'BREAK' || status === 'LONG_BREAK') {
            setRemainingSeconds((prev) => Math.max(0, prev - elapsedSec));
          }
        }
      }
    }
    localStorage.setItem('airiser_timer_last_timestamp', Date.now().toString());

    const handleBeforeUnload = () => {
      localStorage.setItem('airiser_timer_is_running', isRunningRef.current.toString());
      localStorage.setItem('airiser_timer_last_timestamp', Date.now().toString());
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  // 2. Sync state changes with durations ONLY on genuine state/config change (not on mount)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      prevStatusRef.current = status;
      prevMethodConfigRef.current = methodConfig;
      return;
    }

    const statusChanged = prevStatusRef.current !== status;
    const configDurationChanged =
      prevMethodConfigRef.current.workDuration !== methodConfig.workDuration ||
      prevMethodConfigRef.current.breakDuration !== methodConfig.breakDuration ||
      prevMethodConfigRef.current.longBreakDuration !== methodConfig.longBreakDuration ||
      prevMethodConfigRef.current.type !== methodConfig.type;

    prevStatusRef.current = status;
    prevMethodConfigRef.current = methodConfig;

    if (statusChanged || configDurationChanged) {
      if (!isFlowtime) {
        if (status === 'FOCUS') {
          setRemainingSeconds(methodConfig.workDuration);
        } else if (status === 'BREAK') {
          setRemainingSeconds(methodConfig.breakDuration);
        } else if (status === 'LONG_BREAK') {
          setRemainingSeconds(methodConfig.longBreakDuration);
        }
      } else if (status === 'FOCUS' && statusChanged) {
        setRemainingSeconds(0);
      }
    }
  }, [status, methodConfig, isFlowtime]);

  // Main countdown / countup tick loop with real-time focus accrual
  useEffect(() => {
    if (isRunning) {
      localStorage.setItem('airiser_timer_last_timestamp', Date.now().toString());
      timerRef.current = setInterval(() => {
        localStorage.setItem('airiser_timer_last_timestamp', Date.now().toString());

        if (status === 'FOCUS') {
          onAccrueFocusTime?.(1);
        }

        setRemainingSeconds((prev) => {
          if (isFlowtime && status === 'FOCUS') {
            return prev + 1; // Stopwatch mode
          }

          if (prev <= 1) {
            handleCycleComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning, status, currentCycle, isFlowtime, onAccrueFocusTime]);

  // 1. Auto-pause when switching browser tabs (document hidden)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (isRunningRef.current && autoPauseTabRef.current) {
          setIsRunning(false);
          setAutoPauseNotice({
            reason: 'tab_switch',
            timestamp: Date.now(),
            message: 'Auto-paused on tab switch',
            details: 'Session paused while you were in another tab to keep focus metrics accurate.',
          });
          try {
            audioSynth.playClick('switch');
          } catch (e) {}
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // 2. Auto-pause on idle inactivity (> 5 minutes or configured limit)
  useEffect(() => {
    const activityEvents = [
      'mousemove',
      'mousedown',
      'keydown',
      'touchstart',
      'scroll',
      'wheel',
      'pointerdown',
    ];

    const handleUserActivity = () => {
      lastActivityRef.current = Date.now();
    };

    activityEvents.forEach((evt) => {
      window.addEventListener(evt, handleUserActivity, { passive: true });
    });

    const idleInterval = setInterval(() => {
      if (!isRunningRef.current) return;
      if (!autoPauseIdleRef.current) return;

      const idleLimitMs = (idleTimeoutRef.current || 5) * 60 * 1000;
      const elapsedIdle = Date.now() - lastActivityRef.current;

      if (elapsedIdle >= idleLimitMs) {
        setIsRunning(false);
        setAutoPauseNotice({
          reason: 'idle',
          timestamp: Date.now(),
          message: `Auto-paused: Idle for >${idleTimeoutRef.current || 5}m`,
          details: `No mouse or keyboard input detected for ${idleTimeoutRef.current || 5} minutes. Focus session auto-paused to ensure clean logs.`,
        });
        try {
          audioSynth.playClick('switch');
        } catch (e) {}
      }
    }, 1000);

    return () => {
      activityEvents.forEach((evt) => {
        window.removeEventListener(evt, handleUserActivity);
      });
      clearInterval(idleInterval);
    };
  }, []);

  // Keyboard Hotkeys Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.code === 'Space') {
        e.preventDefault();
        togglePlayPause();
      } else if (e.shiftKey && e.code === 'KeyS') {
        e.preventDefault();
        skipState();
      } else if (e.code === 'KeyH') {
        e.preventDefault();
        setIsQuickHidden((prev) => !prev);
      } else if (e.code === 'KeyZ') {
        e.preventDefault();
        onViewModeChange(viewMode === 'zen' ? 'fullscreen' : 'zen');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isRunning, status, viewMode]);

  const handleResumeFocus = () => {
    setAutoPauseNotice(null);
    lastActivityRef.current = Date.now();
    if (status === 'PENDING') {
      onStatusChange('FOCUS');
    }
    setIsRunning(true);
  };

  const togglePlayPause = () => {
    setAutoPauseNotice(null);
    lastActivityRef.current = Date.now();
    if (status === 'PENDING') {
      onStatusChange('FOCUS');
    }
    setIsRunning((prev) => !prev);
  };

  const handleCycleComplete = () => {
    setAutoPauseNotice(null);
    setIsRunning(false);
    const chimeChoice = appearance?.chimeSound || 'zen-bell';

    if (status === 'FOCUS') {
      audioSynth.playChime(chimeChoice as any);
      onCompleteCycle();

      if (currentCycle % methodConfig.cyclesBeforeLongBreak === 0) {
        onStatusChange('LONG_BREAK');
      } else {
        onStatusChange('BREAK');
      }
    } else if (status === 'BREAK' || status === 'LONG_BREAK') {
      audioSynth.playChime(chimeChoice as any);
      setCurrentCycle((c) => c + 1);
      onStatusChange('FOCUS');
    }
  };

  const skipState = () => {
    setAutoPauseNotice(null);
    if (status === 'FOCUS') {
      onStatusChange('BREAK');
    } else {
      onStatusChange('FOCUS');
    }
  };

  const resetTimer = () => {
    setAutoPauseNotice(null);
    setIsRunning(false);
    localStorage.setItem('airiser_timer_is_running', 'false');
    localStorage.setItem('airiser_timer_last_timestamp', Date.now().toString());

    if (isFlowtime && status === 'FOCUS') {
      setRemainingSeconds(0);
      localStorage.setItem('airiser_timer_remaining_seconds', '0');
      return;
    }
    if (status === 'FOCUS') {
      setRemainingSeconds(methodConfig.workDuration);
      localStorage.setItem('airiser_timer_remaining_seconds', methodConfig.workDuration.toString());
    }
    if (status === 'BREAK') {
      setRemainingSeconds(methodConfig.breakDuration);
      localStorage.setItem('airiser_timer_remaining_seconds', methodConfig.breakDuration.toString());
    }
    if (status === 'LONG_BREAK') {
      setRemainingSeconds(methodConfig.longBreakDuration);
      localStorage.setItem('airiser_timer_remaining_seconds', methodConfig.longBreakDuration.toString());
    }
  };

  const showSeconds = appearance?.showSeconds ?? true;

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    if (!showSeconds) {
      return `${m.toString().padStart(2, '0')}m`;
    }
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const getStatusLabel = () => {
    if (status === 'FOCUS') return methodConfig.stateLabels?.focus || 'Deep Focus';
    if (status === 'BREAK') return methodConfig.stateLabels?.break || 'Refresh Break';
    if (status === 'LONG_BREAK') return methodConfig.stateLabels?.longBreak || 'Long Rest';
    if (status === 'END') return methodConfig.stateLabels?.end || 'Completed';
    return 'Ready to Focus';
  };

  // Typography Class Resolver
  const getFontClass = (theme?: FontTheme) => {
    switch (theme) {
      case 'mono': return 'font-mono-custom';
      case 'serif': return 'font-serif-custom';
      case 'digital': return 'font-digital-custom';
      case 'cyber': return 'font-cyber-custom';
      case 'sans':
      default: return 'font-sans-custom';
    }
  };

  const fontClass = getFontClass(appearance?.fontStyle);
  const clockStyle = appearance?.clockStyle || 'digital';
  const timerSize = appearance?.timerSize || 'normal';
  const timerBorder = appearance?.timerBorder || 'subtle';
  const timerRadius = appearance?.timerRadius || 'super';
  const timerAccentColor = appearance?.timerAccentColor || 'dynamic';
  const isGhost = appearance?.timerTransparentGhost ?? false;
  const cardOpacity = isGhost ? 0 : (appearance?.cardOpacity ?? 0.85);
  const showProgressBar = appearance?.showProgressBar ?? true;
  const showHotkeyHints = appearance?.showHotkeyHints ?? true;

  // Glass blur intensity
  const getBlurClass = () => {
    const blur = appearance?.timerGlassBlur || 'high';
    switch (blur) {
      case 'none': return 'backdrop-blur-none';
      case 'low': return 'backdrop-blur-sm';
      case 'medium': return 'backdrop-blur-md';
      case 'high': return 'backdrop-blur-2xl';
      case 'ultra': return 'backdrop-blur-3xl';
      default: return 'backdrop-blur-2xl';
    }
  };

  // Active Accent Color
  const resolveAccent = () => {
    if (timerAccentColor === 'dynamic') {
      return status === 'FOCUS' ? 'indigo' : 'emerald';
    }
    return timerAccentColor;
  };

  const currentAccent = resolveAccent();

  const getAccentStyles = () => {
    const customColor = appearance?.timerCustomColor;
    const customGlow = appearance?.timerGlowIntensity ?? 50;

    if (customColor) {
      const primaryHex = getFirstColor(customColor, '#6366f1');
      return {
        primaryText: 'text-white',
        gradientText: isGradient(customColor) ? '' : undefined,
        customBackground: customColor,
        primaryHex,
        bgGlow: `bg-[${primaryHex}]`,
        borderGlow: `border-white/40 ring-1 ring-white/30 shadow-[0_0_${Math.round(customGlow * 0.45)}px_${primaryHex}88]`,
        btnPrimary: 'text-white font-bold shadow-lg',
        progressBg: isGradient(customColor) ? '' : `bg-[${primaryHex}]`,
        ringStroke: primaryHex,
        dotColor: 'bg-white',
        glowClass: '',
        customGlowStyle: customGlow > 0 ? `0 0 ${Math.round(customGlow * 0.4)}px ${primaryHex}` : undefined,
      };
    }

    switch (currentAccent) {
      case 'emerald':
        return {
          primaryText: 'text-emerald-400',
          gradientText: 'from-emerald-300 via-teal-100 to-emerald-400',
          bgGlow: 'bg-emerald-500',
          borderGlow: 'border-emerald-500/60 shadow-[0_0_30px_rgba(16,185,129,0.25)] ring-1 ring-emerald-400/40',
          btnPrimary: 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-emerald-500/25',
          progressBg: 'bg-gradient-to-r from-emerald-400 to-teal-400',
          ringStroke: '#34d399',
          dotColor: 'bg-emerald-400',
          glowClass: 'accent-glow-emerald',
        };
      case 'cyan':
        return {
          primaryText: 'text-cyan-400',
          gradientText: 'from-cyan-300 via-sky-100 to-cyan-400',
          bgGlow: 'bg-cyan-500',
          borderGlow: 'border-cyan-500/60 shadow-[0_0_30px_rgba(6,182,212,0.25)] ring-1 ring-cyan-400/40',
          btnPrimary: 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 shadow-cyan-500/25',
          progressBg: 'bg-gradient-to-r from-cyan-400 to-blue-400',
          ringStroke: '#22d3ee',
          dotColor: 'bg-cyan-400',
          glowClass: 'accent-glow-cyan',
        };
      case 'amber':
        return {
          primaryText: 'text-amber-400',
          gradientText: 'from-amber-300 via-yellow-100 to-amber-400',
          bgGlow: 'bg-amber-500',
          borderGlow: 'border-amber-500/60 shadow-[0_0_30px_rgba(245,158,11,0.25)] ring-1 ring-amber-400/40',
          btnPrimary: 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 shadow-amber-500/25',
          progressBg: 'bg-gradient-to-r from-amber-400 to-orange-400',
          ringStroke: '#fbbf24',
          dotColor: 'bg-amber-400',
          glowClass: 'accent-glow-amber',
        };
      case 'rose':
        return {
          primaryText: 'text-rose-400',
          gradientText: 'from-rose-300 via-pink-100 to-rose-400',
          bgGlow: 'bg-rose-500',
          borderGlow: 'border-rose-500/60 shadow-[0_0_30px_rgba(244,63,94,0.25)] ring-1 ring-rose-400/40',
          btnPrimary: 'bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 shadow-rose-500/25',
          progressBg: 'bg-gradient-to-r from-rose-400 to-pink-400',
          ringStroke: '#fb7185',
          dotColor: 'bg-rose-400',
          glowClass: 'accent-glow-rose',
        };
      case 'monochrome':
        return {
          primaryText: 'text-slate-200',
          gradientText: 'from-white via-slate-100 to-slate-300',
          bgGlow: 'bg-white',
          borderGlow: 'border-white/50 shadow-[0_0_20px_rgba(255,255,255,0.15)] ring-1 ring-white/30',
          btnPrimary: 'bg-gradient-to-r from-slate-200 to-white hover:bg-white text-slate-900 shadow-white/10 font-bold',
          progressBg: 'bg-gradient-to-r from-slate-200 to-white',
          ringStroke: '#ffffff',
          dotColor: 'bg-white',
          glowClass: 'accent-glow-mono',
        };
      case 'indigo':
      default:
        return {
          primaryText: 'text-indigo-400',
          gradientText: 'from-indigo-300 via-purple-100 to-indigo-400',
          bgGlow: 'bg-indigo-500',
          borderGlow: 'border-indigo-500/60 shadow-[0_0_30px_rgba(99,102,241,0.25)] ring-1 ring-indigo-400/40',
          btnPrimary: 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 shadow-indigo-500/25',
          progressBg: 'bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-400',
          ringStroke: '#818cf8',
          dotColor: 'bg-indigo-500',
          glowClass: 'accent-glow-indigo',
        };
    }
  };

  const accentStyles = getAccentStyles();

  // Effective width determination
  const getBaseWidthForPreset = (size: WidgetSize) => {
    switch (size) {
      case 'compact': return 320;
      case 'large': return 540;
      case 'hero': return 680;
      case 'normal':
      default: return 420;
    }
  };

  const effectiveWidth = customWidth ?? getBaseWidthForPreset(timerSize);

  // Size Constraints & Paddings
  const getSizeStyles = () => {
    if (customWidth !== null) {
      const w = customWidth;
      const ringRadius = Math.round(Math.max(65, Math.min(185, w * 0.25)));
      const ringBoxPx = ringRadius * 2 + 48;

      let headingSizeClass = 'text-7xl sm:text-8xl';
      if (w < 300) headingSizeClass = 'text-4xl sm:text-5xl';
      else if (w < 370) headingSizeClass = 'text-5xl sm:text-6xl';
      else if (w < 480) headingSizeClass = 'text-6xl sm:text-7xl';
      else if (w < 600) headingSizeClass = 'text-7xl sm:text-8xl';
      else if (w < 740) headingSizeClass = 'text-8xl sm:text-9xl';
      else headingSizeClass = 'text-9xl sm:text-[10rem]';

      return {
        container: 'p-5 sm:p-7',
        headingSize: headingSizeClass,
        ringRadius,
        ringBoxPx,
        btnPadding: w < 320 ? 'px-4 py-2 text-xs' : w > 580 ? 'px-10 py-4 text-base' : 'px-8 py-3.5 text-sm',
        iconBtnPadding: w < 320 ? 'p-2' : w > 580 ? 'p-4' : 'p-3.5',
      };
    }

    switch (timerSize) {
      case 'compact':
        return {
          container: 'max-w-xs sm:max-w-sm p-4 sm:p-5',
          headingSize: 'text-5xl sm:text-6xl',
          ringRadius: 80,
          ringBoxPx: 192,
          btnPadding: 'px-5 py-2.5 text-xs',
          iconBtnPadding: 'p-2.5',
        };
      case 'large':
        return {
          container: 'max-w-md sm:max-w-lg p-8 sm:p-9',
          headingSize: 'text-8xl sm:text-9xl',
          ringRadius: 130,
          ringBoxPx: 288,
          btnPadding: 'px-10 py-4 text-base',
          iconBtnPadding: 'p-4',
        };
      case 'hero':
        return {
          container: 'max-w-lg sm:max-w-2xl p-10 sm:p-12',
          headingSize: 'text-9xl sm:text-[10rem]',
          ringRadius: 150,
          ringBoxPx: 320,
          btnPadding: 'px-12 py-5 text-lg',
          iconBtnPadding: 'p-5',
        };
      case 'normal':
      default:
        return {
          container: 'max-w-sm sm:max-w-md p-7',
          headingSize: 'text-7xl sm:text-8xl',
          ringRadius: 110,
          ringBoxPx: 256,
          btnPadding: 'px-8 py-3.5 text-sm',
          iconBtnPadding: 'p-3.5',
        };
    }
  };

  const sizeStyles = getSizeStyles();

  // Border Style
  const getBorderStyles = () => {
    switch (timerBorder) {
      case 'none':
        return 'border-0';
      case 'glow':
        return `${accentStyles.borderGlow}`;
      case 'double':
        return 'border-2 border-slate-700/90 ring-4 ring-slate-900/50 shadow-2xl';
      case 'dashed':
        return 'border-2 border-dashed border-slate-700/80 shadow-2xl';
      case 'subtle':
      default:
        return 'border border-slate-800/80 shadow-2xl';
    }
  };

  // Radius Style
  const getRadiusStyles = () => {
    switch (timerRadius) {
      case 'sharp': return 'rounded-none';
      case 'rounded': return 'rounded-2xl';
      case 'pill': return 'rounded-[2.5rem]';
      case 'super':
      default: return 'rounded-3xl';
    }
  };

  // 1. Quick Hidden Pill Mode
  if (isQuickHidden) {
    return (
      <div
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          handleExpandFullTimer();
        }}
        className={`fixed bottom-6 left-6 z-[999] pointer-events-auto bg-slate-900/95 hover:bg-slate-900 backdrop-blur-xl border ${
          autoPauseNotice ? 'border-amber-500/70 shadow-[0_0_20px_rgba(245,158,11,0.3)]' : 'border-indigo-500/50 hover:border-indigo-400'
        } rounded-full px-4 py-2.5 shadow-2xl flex items-center gap-3 text-slate-100 animate-in fade-in cursor-pointer transition-all hover:scale-105 select-none`}
        title="Click anywhere to expand full timer (Hotkey: H)"
      >
        <span className={`w-2.5 h-2.5 rounded-full ${autoPauseNotice ? 'bg-amber-400' : accentStyles.dotColor} animate-pulse`} />
        <span className={`text-sm font-bold tracking-wider ${fontClass}`}>{formatTime(remainingSeconds)}</span>
        <span className="text-xs text-slate-400 font-medium">{getStatusLabel()}</span>
        {autoPauseNotice && (
          <span className="text-[10px] bg-amber-500/30 text-amber-200 px-2 py-0.5 rounded-full font-bold border border-amber-500/40 animate-pulse flex items-center gap-1">
            <EyeOff className="w-2.5 h-2.5" />
            Auto-Paused
          </span>
        )}
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            handleExpandFullTimer();
          }}
          className="p-1 bg-indigo-600/40 hover:bg-indigo-600 text-indigo-200 hover:text-white rounded-full transition ml-1 pointer-events-auto"
          title="Expand Full Timer (H)"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  // 2. Zen Mode (Subtle clean floating typography)
  if (viewMode === 'zen') {
    return (
      <div className="fixed inset-0 z-40 flex flex-col items-center justify-center pointer-events-none select-none text-slate-100">
        <div className="bg-slate-950/40 backdrop-blur-xl px-12 py-10 rounded-3xl border border-white/10 text-center pointer-events-auto shadow-2xl">
          {autoPauseNotice && (
            <div className="mb-4 px-4 py-1.5 bg-amber-500/20 border border-amber-500/40 rounded-full text-amber-200 text-xs font-semibold flex items-center justify-center gap-2">
              <EyeOff className="w-3.5 h-3.5 text-amber-400" />
              <span>{autoPauseNotice.message} (Focus Protected)</span>
            </div>
          )}
          <p className="text-xs font-semibold tracking-widest text-slate-400 uppercase mb-3">{getStatusLabel()}</p>
          <h1 className={`text-8xl sm:text-9xl font-black tracking-tight text-white drop-shadow-2xl mb-8 ${fontClass} ${accentStyles.glowClass}`}>
            {formatTime(remainingSeconds)}
          </h1>
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={togglePlayPause}
              className="px-8 py-3 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-md text-white font-semibold transition active:scale-95 shadow-lg"
            >
              {isRunning ? 'Pause' : 'Start'}
            </button>
            <button
              onClick={() => onViewModeChange('fullscreen')}
              className="px-5 py-3 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 text-xs font-medium transition"
            >
              Exit Zen (Z)
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Calculate Progress Percent
  const targetDuration = status === 'FOCUS' ? methodConfig.workDuration : methodConfig.breakDuration;
  const progressPercent = isFlowtime
    ? 100
    : targetDuration > 0
    ? ((targetDuration - remainingSeconds) / targetDuration) * 100
    : 0;

  // SVG Ring calculation
  const ringRadius = sizeStyles.ringRadius;
  const circumference = 2 * Math.PI * ringRadius;
  const strokeDashoffset = circumference - (Math.min(100, Math.max(0, progressPercent)) / 100) * circumference;

  return (
    <div
      ref={cardRef}
      style={{
        position: position ? 'fixed' : undefined,
        left: position ? `${position.x}px` : undefined,
        top: position ? `${position.y}px` : undefined,
        width: customWidth ? `${customWidth}px` : undefined,
        maxWidth: customWidth ? `${customWidth}px` : undefined,
        zIndex: isDragging || isResizing ? 100 : position ? 45 : 30,
        margin: position ? 0 : undefined,
        backgroundColor: appearance?.timerBgTint || `rgba(15, 23, 42, ${cardOpacity})`,
        boxShadow: (accentStyles as any).customGlowStyle,
        willChange: isDragging ? 'left, top' : isResizing ? 'width' : 'auto',
      }}
      className={`group/timer relative pointer-events-auto ${getBlurClass()} ${getBorderStyles()} ${getRadiusStyles()} ${sizeStyles.container} text-center text-slate-100 w-full mx-auto ${
        isHighlighted
          ? 'ring-4 ring-indigo-400 ring-offset-4 ring-offset-slate-950 shadow-[0_0_60px_rgba(99,102,241,0.6)] scale-[1.01] transition-all duration-300'
          : ''
      } ${
        isDragging
          ? 'shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)] ring-2 ring-indigo-500/70 scale-[1.015] select-none transition-none cursor-grabbing'
          : isResizing
          ? 'shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)] ring-2 ring-indigo-500/80 select-none transition-none'
          : 'transition-[box-shadow,background-color,border-color,opacity,border-radius] duration-200'
      }`}
    >
      {/* Live Customization Highlight Badge */}
      {isHighlighted && (
        <div className="absolute -top-7 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white font-bold text-[10px] tracking-wider rounded-full shadow-2xl flex items-center gap-1.5 z-40 uppercase ring-2 ring-white animate-bounce pointer-events-none">
          <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-spin" />
          <span>Customizing Timer Live</span>
        </div>
      )}

      {/* Live Dimension Indicator during resize */}
      {isResizing && (
        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-[11px] font-mono px-3 py-1 rounded-full shadow-lg pointer-events-none z-50 animate-in fade-in zoom-in-95 flex items-center gap-1.5">
          <span>Width: {effectiveWidth}px</span>
          {customWidth !== null && <span className="opacity-75">• Custom</span>}
        </div>
      )}

      {/* Top Header & Status Badge */}
      <div
        onPointerDown={handlePointerDown}
        style={{ touchAction: 'none' }}
        onDoubleClick={(e) => {
          e.stopPropagation();
          handleExpandFullTimer();
        }}
        className="flex items-center justify-between mb-4 cursor-grab active:cursor-grabbing select-none pb-2.5 border-b border-slate-800/40"
        title="Drag timer anywhere • Double-click to center"
      >
        <div className="flex items-center gap-2">
          <span title="Drag Timer" className="flex items-center">
            <GripHorizontal className="w-4 h-4 text-slate-500 hover:text-slate-300 transition-colors" />
          </span>
          <span
            className={`w-2.5 h-2.5 rounded-full ${accentStyles.dotColor} ${isRunning ? 'animate-pulse shadow-lg' : ''}`}
          />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-200">{getStatusLabel()}</span>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Quick Expand & Re-center Button when docked / compact / custom */}
          {(position || customWidth !== null || timerSize === 'compact' || clockStyle === 'compact' || isGhost) && (
            <button
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                handleExpandFullTimer();
              }}
              className="p-1.5 text-xs text-indigo-300 hover:text-white bg-indigo-600/30 hover:bg-indigo-600 border border-indigo-500/40 rounded-xl transition flex items-center gap-1 font-semibold shadow-sm"
              title="Expand & Center Timer"
            >
              <Maximize2 className="w-3.5 h-3.5 text-indigo-200" />
              <span className="hidden sm:inline text-[10px]">Center</span>
            </button>
          )}

          {/* Auto-Pause Protection Shield Indicator & Flyout */}
          <div className="relative">
            <button
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                setShowAutoPauseSettings((prev) => !prev);
              }}
              className={`p-1.5 transition rounded-xl flex items-center gap-1 text-xs ${
                autoPauseOnTabSwitch || autoPauseOnIdle
                  ? 'text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 shadow-sm'
                  : 'text-slate-500 hover:text-slate-400 hover:bg-slate-800/80 border border-transparent'
              }`}
              title={
                autoPauseOnTabSwitch || autoPauseOnIdle
                  ? 'Auto-Pause Active: Tab switch & idle detection protect your focus logs'
                  : 'Auto-Pause Disabled: Click to configure'
              }
            >
              <ShieldCheck className="w-4 h-4" />
              <span className="text-[10px] hidden sm:inline font-semibold">
                {autoPauseOnTabSwitch && autoPauseOnIdle ? 'Protected' : 'Auto-Pause'}
              </span>
            </button>

            {/* Quick Auto-Pause Settings Popover */}
            {showAutoPauseSettings && (
              <div
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
                className="absolute right-0 top-9 w-64 p-3.5 bg-slate-950/95 backdrop-blur-2xl border border-slate-700/80 rounded-2xl shadow-2xl z-50 text-left text-slate-200 animate-in fade-in zoom-in-95 duration-150"
              >
                <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-slate-800">
                  <span className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    Focus Accuracy Guard
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowAutoPauseSettings(false)}
                    className="text-slate-400 hover:text-slate-200 p-0.5 rounded hover:bg-slate-800"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-3 text-xs">
                  {/* Toggle 1: Tab Switch */}
                  <label className="flex items-start justify-between gap-2 cursor-pointer group select-none">
                    <div>
                      <p className="font-semibold text-slate-200 group-hover:text-white">Tab Switch Pause</p>
                      <p className="text-[10px] text-slate-400 leading-tight">Auto-pause when switching tabs</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={autoPauseOnTabSwitch}
                      onChange={(e) => {
                        if (onUpdateAppearance) {
                          onUpdateAppearance({ autoPauseOnTabSwitch: e.target.checked });
                        }
                      }}
                      className="mt-0.5 w-4 h-4 rounded accent-emerald-500 cursor-pointer"
                    />
                  </label>

                  {/* Toggle 2: Idle Activity */}
                  <label className="flex items-start justify-between gap-2 cursor-pointer group select-none">
                    <div>
                      <p className="font-semibold text-slate-200 group-hover:text-white">Idle Activity Pause</p>
                      <p className="text-[10px] text-slate-400 leading-tight">Pause on inactive mouse/keyboard</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={autoPauseOnIdle}
                      onChange={(e) => {
                        if (onUpdateAppearance) {
                          onUpdateAppearance({ autoPauseOnIdle: e.target.checked });
                        }
                      }}
                      className="mt-0.5 w-4 h-4 rounded accent-emerald-500 cursor-pointer"
                    />
                  </label>

                  {/* Idle Timeout Threshold Selector */}
                  {autoPauseOnIdle && (
                    <div className="pt-2 border-t border-slate-800/80">
                      <div className="flex justify-between text-[11px] text-slate-300 mb-1.5">
                        <span>Inactivity Threshold</span>
                        <span className="font-mono text-emerald-400 font-bold">{idleTimeoutMinutes} min</span>
                      </div>
                      <div className="flex gap-1.5">
                        {[2, 5, 10, 15].map((mins) => (
                          <button
                            key={mins}
                            type="button"
                            onClick={() => {
                              if (onUpdateAppearance) {
                                onUpdateAppearance({ idleTimeoutMinutes: mins });
                              }
                            }}
                            className={`flex-1 py-1 text-[10px] font-semibold rounded-lg border transition ${
                              idleTimeoutMinutes === mins
                                ? 'bg-emerald-500/20 border-emerald-500/60 text-emerald-300'
                                : 'bg-slate-800/60 border-slate-700/50 text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            {mins}m
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Settings / Focus Customizer Drawer */}
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onOpenMethodCustomizer();
            }}
            className="p-1.5 text-slate-400 hover:text-slate-200 transition rounded-xl hover:bg-slate-800/80"
            title="Focus Settings & Customization"
          >
            <Settings className="w-4 h-4" />
          </button>

          {/* Zen / Fullscreen Mode Toggle */}
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onViewModeChange(viewMode === 'fullscreen' ? 'compact' : 'fullscreen');
            }}
            className="p-1.5 text-slate-400 hover:text-slate-200 transition rounded-xl hover:bg-slate-800/80"
            title={viewMode === 'fullscreen' ? 'Compact Mode' : 'Fullscreen Mode'}
          >
            <Maximize className="w-4 h-4" />
          </button>

          {/* Minimize to bottom pill dock (H) */}
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              setIsQuickHidden(true);
            }}
            className="p-1.5 text-slate-400 hover:text-slate-200 transition rounded-xl hover:bg-slate-800/80"
            title="Minimize Timer (H)"
          >
            <Minimize2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* CLOCK STYLE 1: Radial Ring Progress */}
      {clockStyle === 'ring' ? (
        <div className="relative my-3 flex items-center justify-center">
          <svg
            style={{ width: `${sizeStyles.ringBoxPx}px`, height: `${sizeStyles.ringBoxPx}px` }}
            className="transform -rotate-90"
          >
            {/* Track */}
            <circle
              cx="50%"
              cy="50%"
              r={ringRadius}
              stroke="currentColor"
              strokeWidth="6"
              className="text-slate-800/80"
              fill="transparent"
            />
            {/* Progress */}
            <circle
              cx="50%"
              cy="50%"
              r={ringRadius}
              stroke={accentStyles.ringStroke}
              strokeWidth="7"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              fill="transparent"
              className="transition-all duration-1000 ease-linear"
            />
          </svg>

          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <h1 className={`${sizeStyles.headingSize} font-black tracking-tight text-white drop-shadow-md ${fontClass} ${accentStyles.glowClass}`}>
              {formatTime(remainingSeconds)}
            </h1>
            <p className="text-[11px] font-medium text-slate-400 uppercase tracking-widest mt-1">
              Cycle {currentCycle} / {methodConfig.cyclesBeforeLongBreak}
            </p>
          </div>
        </div>
      ) : clockStyle === 'minimal' ? (
        /* CLOCK STYLE 2: Minimalist Large Typographic Layout */
        <div className="my-5 py-2">
          <h1 className={`${sizeStyles.headingSize} font-black tracking-tighter text-white drop-shadow-lg ${fontClass} ${accentStyles.glowClass}`}>
            {formatTime(remainingSeconds)}
          </h1>
          <p className="text-xs text-slate-400 font-medium tracking-wider uppercase mt-2">
            Cycle {currentCycle} • {methodConfig.type}
          </p>
        </div>
      ) : clockStyle === 'lcd' ? (
        /* CLOCK STYLE 3: Retro Cyber LCD / Flip Segment */
        <div className="relative my-4 p-5 rounded-2xl bg-slate-950 border border-slate-800/90 shadow-inner lcd-scanline">
          <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono mb-2">
            <span>TIMER://{status}</span>
            <span className="text-emerald-400 font-bold">{Math.round(progressPercent)}%</span>
          </div>
          <h1 className={`${sizeStyles.headingSize} font-black tracking-wider text-emerald-400 font-digital-custom drop-shadow-[0_0_15px_rgba(52,211,153,0.6)]`}>
            {formatTime(remainingSeconds)}
          </h1>
          <div className="flex justify-center gap-1.5 mt-3">
            {Array.from({ length: methodConfig.cyclesBeforeLongBreak }).map((_, idx) => (
              <span
                key={idx}
                className={`w-3 h-1.5 rounded-sm transition-all ${
                  idx + 1 <= currentCycle ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]' : 'bg-slate-800'
                }`}
              />
            ))}
          </div>
        </div>
      ) : clockStyle === 'hud' ? (
        /* CLOCK STYLE 4: Sci-Fi Cyberdeck HUD Layout */
        <div className="relative my-4 p-5 rounded-xl bg-slate-950/90 border border-cyan-500/40 shadow-[0_0_20px_rgba(6,182,212,0.15)] hud-bracket">
          <div className="flex items-center justify-between text-[10px] font-cyber-custom tracking-widest text-cyan-400 mb-1">
            <span>[ SYSTEM: {status} ]</span>
            <span>CYCLE: {currentCycle}/{methodConfig.cyclesBeforeLongBreak}</span>
          </div>
          <h1 className={`${sizeStyles.headingSize} font-black tracking-tight text-white font-cyber-custom drop-shadow-[0_0_20px_rgba(6,182,212,0.6)]`}>
            {formatTime(remainingSeconds)}
          </h1>
          {/* Cyber Meter */}
          <div className="w-full bg-slate-900 h-1.5 rounded-none mt-4 overflow-hidden border border-cyan-500/30">
            <div
              className="h-full bg-cyan-400 shadow-[0_0_10px_#22d3ee] transition-all duration-1000"
              style={{ width: `${Math.min(100, Math.max(0, progressPercent))}%` }}
            />
          </div>
        </div>
      ) : clockStyle === 'compact' ? (
        /* CLOCK STYLE 5: Micro Bar Compact Horizontal */
        <div className="flex items-center justify-between gap-3 my-3 py-1 px-1">
          <div className="flex items-center gap-3">
            <h1 className={`text-4xl sm:text-5xl font-black tracking-tight text-white ${fontClass} ${accentStyles.glowClass}`}>
              {formatTime(remainingSeconds)}
            </h1>
            <div className="text-left border-l border-slate-800 pl-3">
              <p className="text-xs font-bold text-slate-200">{getStatusLabel()}</p>
              <p className="text-[10px] text-slate-400">Cycle {currentCycle} / {methodConfig.cyclesBeforeLongBreak}</p>
            </div>
          </div>
          {onUpdateAppearance && (
            <button
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                handleExpandFullTimer();
              }}
              className="p-2 bg-indigo-600/30 hover:bg-indigo-600 border border-indigo-500/40 text-indigo-200 hover:text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition shadow"
              title="Expand to Full Digital Display"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span>Expand Display</span>
            </button>
          )}
        </div>
      ) : (
        /* CLOCK STYLE 6: Digital Classic Mode */
        <div className="relative my-4 py-2">
          <h1 className={`${sizeStyles.headingSize} font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-br ${accentStyles.gradientText} drop-shadow-md ${fontClass} ${accentStyles.glowClass}`}>
            {formatTime(remainingSeconds)}
          </h1>

          {/* Linear Progress Bar */}
          {showProgressBar && (
            <div className="w-full bg-slate-800/90 h-2 rounded-full overflow-hidden mt-5 border border-slate-700/40">
              <div
                className={`h-full transition-all duration-1000 ${accentStyles.progressBg}`}
                style={{
                  width: `${Math.min(100, Math.max(0, progressPercent))}%`,
                  background: (accentStyles as any).customBackground || undefined,
                }}
              />
            </div>
          )}
        </div>
      )}

      {/* Cycle Indicator for non-ring / non-lcd / non-compact */}
      {clockStyle !== 'ring' && clockStyle !== 'lcd' && clockStyle !== 'hud' && clockStyle !== 'compact' && (
        <div className="flex items-center justify-between text-xs text-slate-400 mb-5 font-medium px-2">
          <span>Cycle {currentCycle} / {methodConfig.cyclesBeforeLongBreak}</span>
          <span className="uppercase tracking-wider text-[11px] bg-slate-800/60 px-2 py-0.5 rounded-full">
            {methodConfig.type}
          </span>
        </div>
      )}

      {/* Auto-Pause Notification Banner */}
      {autoPauseNotice && (
        <div className="my-3.5 p-3.5 bg-amber-500/15 border border-amber-500/40 rounded-2xl backdrop-blur-md text-left text-amber-200 animate-in fade-in slide-in-from-top-2 duration-300 shadow-xl relative">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-amber-500/25 rounded-xl text-amber-300 shrink-0 mt-0.5 animate-pulse">
              {autoPauseNotice.reason === 'tab_switch' ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Clock className="w-4 h-4" />
              )}
            </div>
            <div className="flex-1 min-w-0 pr-4">
              <div className="flex items-center gap-1.5 flex-wrap">
                <p className="text-xs font-bold text-amber-100">{autoPauseNotice.message}</p>
                <span className="text-[9px] bg-amber-500/30 text-amber-200 px-1.5 py-0.5 rounded font-mono font-bold uppercase tracking-wider">
                  Accuracy Guard
                </span>
              </div>
              <p className="text-[11px] text-amber-200/80 leading-relaxed mt-1">
                {autoPauseNotice.details}
              </p>
              <div className="flex items-center gap-2 mt-2.5">
                <button
                  type="button"
                  onClick={handleResumeFocus}
                  className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-md transition active:scale-95 flex items-center gap-1.5 cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Resume Focus</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAutoPauseNotice(null)}
                  className="px-3 py-1.5 text-xs text-amber-300 hover:text-amber-100 hover:bg-amber-500/20 rounded-xl transition font-medium cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setAutoPauseNotice(null)}
              className="absolute top-3 right-3 text-amber-400/80 hover:text-amber-200 p-1 rounded-lg hover:bg-amber-500/20 transition cursor-pointer"
              title="Dismiss alert"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Primary Action Buttons */}
      <div className="flex items-center justify-center gap-3">
        <button
          onClick={resetTimer}
          className={`${sizeStyles.iconBtnPadding} rounded-2xl bg-slate-800/70 hover:bg-slate-700/80 text-slate-300 transition active:scale-95 border border-slate-700/50 hover:text-white`}
          title="Reset Timer"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        <button
          onClick={togglePlayPause}
          style={{
            background: (accentStyles as any).customBackground || undefined,
          }}
          className={`${sizeStyles.btnPadding} rounded-2xl text-white font-bold shadow-xl transition transform active:scale-95 flex items-center gap-2.5 ${accentStyles.btnPrimary} ring-1 ring-white/10`}
        >
          {isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
          <span>{isRunning ? 'Pause' : status === 'FOCUS' ? 'Start Focus' : 'Start Break'}</span>
        </button>

        <button
          onClick={skipState}
          className={`${sizeStyles.iconBtnPadding} rounded-2xl bg-slate-800/70 hover:bg-slate-700/80 text-slate-300 transition active:scale-95 border border-slate-700/50 hover:text-white`}
          title="Skip State (Shift + S)"
        >
          <SkipForward className="w-4 h-4" />
        </button>
      </div>

      {/* Hotkey hint footer */}
      {showHotkeyHints && timerSize !== 'compact' && (
        <p className="text-[11px] text-slate-400 mt-5 font-mono">
          <span className="text-slate-300 border border-slate-700 px-1 py-0.5 rounded">Space</span> start • <span className="text-slate-300 border border-slate-700 px-1 py-0.5 rounded">Shift+S</span> skip • <span className="text-slate-300 border border-slate-700 px-1 py-0.5 rounded">Z</span> zen
        </p>
      )}

      {/* Corner Resize Handles for all 4 corners */}
      {/* Top-Right Handle */}
      <div
        onPointerDown={(e) => handleResizePointerDown(e, 'ne')}
        onPointerMove={handleResizePointerMove}
        onPointerUp={handleResizePointerUp}
        onPointerCancel={handleResizePointerUp}
        onDoubleClick={(e) => {
          e.stopPropagation();
          setCustomWidth(null);
        }}
        title="Drag corner to resize • Double-click to reset size"
        style={{ touchAction: 'none' }}
        className="absolute top-1 right-1 w-6 h-6 cursor-ne-resize flex items-center justify-center opacity-40 hover:opacity-100 group-hover/timer:opacity-80 transition-opacity z-30 text-slate-400 hover:text-indigo-400 select-none"
      >
        <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current transform rotate-90">
          <path d="M22 22H20V20H22V22ZM22 16H20V18H22V16ZM18 20H16V22H18V20ZM22 12H20V14H22V12ZM14 20H12V22H14V20ZM18 16H16V18H18V16Z" />
        </svg>
      </div>

      {/* Top-Left Handle */}
      <div
        onPointerDown={(e) => handleResizePointerDown(e, 'nw')}
        onPointerMove={handleResizePointerMove}
        onPointerUp={handleResizePointerUp}
        onPointerCancel={handleResizePointerUp}
        onDoubleClick={(e) => {
          e.stopPropagation();
          setCustomWidth(null);
        }}
        title="Drag corner to resize • Double-click to reset size"
        style={{ touchAction: 'none' }}
        className="absolute top-1 left-1 w-6 h-6 cursor-nw-resize flex items-center justify-center opacity-40 hover:opacity-100 group-hover/timer:opacity-80 transition-opacity z-30 text-slate-400 hover:text-indigo-400 select-none"
      >
        <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current transform rotate-180">
          <path d="M22 22H20V20H22V22ZM22 16H20V18H22V16ZM18 20H16V22H18V20ZM22 12H20V14H22V12ZM14 20H12V22H14V20ZM18 16H16V18H18V16Z" />
        </svg>
      </div>

      {/* Bottom-Right Handle */}
      <div
        onPointerDown={(e) => handleResizePointerDown(e, 'se')}
        onPointerMove={handleResizePointerMove}
        onPointerUp={handleResizePointerUp}
        onPointerCancel={handleResizePointerUp}
        onDoubleClick={(e) => {
          e.stopPropagation();
          setCustomWidth(null);
        }}
        title="Drag corner to resize • Double-click to reset size"
        style={{ touchAction: 'none' }}
        className="absolute bottom-1 right-1 w-6 h-6 cursor-se-resize flex items-center justify-center opacity-40 hover:opacity-100 group-hover/timer:opacity-80 transition-opacity z-30 text-slate-400 hover:text-indigo-400 select-none"
      >
        <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current">
          <path d="M22 22H20V20H22V22ZM22 16H20V18H22V16ZM18 20H16V22H18V20ZM22 12H20V14H22V12ZM14 20H12V22H14V20ZM18 16H16V18H18V16Z" />
        </svg>
      </div>

      {/* Bottom-Left Handle */}
      <div
        onPointerDown={(e) => handleResizePointerDown(e, 'sw')}
        onPointerMove={handleResizePointerMove}
        onPointerUp={handleResizePointerUp}
        onPointerCancel={handleResizePointerUp}
        onDoubleClick={(e) => {
          e.stopPropagation();
          setCustomWidth(null);
        }}
        title="Drag corner to resize • Double-click to reset size"
        style={{ touchAction: 'none' }}
        className="absolute bottom-1 left-1 w-6 h-6 cursor-sw-resize flex items-center justify-center opacity-40 hover:opacity-100 group-hover/timer:opacity-80 transition-opacity z-30 text-slate-400 hover:text-indigo-400 select-none"
      >
        <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current transform scale-x-[-1]">
          <path d="M22 22H20V20H22V22ZM22 16H20V18H22V16ZM18 20H16V22H18V20ZM22 12H20V14H22V12ZM14 20H12V22H14V20ZM18 16H16V18H18V16Z" />
        </svg>
      </div>

    </div>
  );
};
