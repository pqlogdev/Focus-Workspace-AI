import React, { useEffect, useState, useRef } from 'react';
import { BackgroundConfig, MediaItem, TimerStatus, WorkspaceAppearanceConfig } from '../types';

interface BackgroundLayerProps {
  backgroundConfig?: BackgroundConfig;
  config?: BackgroundConfig;
  appearance?: WorkspaceAppearanceConfig;
  timerStatus: TimerStatus;
}

export const BackgroundLayer: React.FC<BackgroundLayerProps> = ({
  backgroundConfig,
  config,
  appearance,
  timerStatus,
}) => {
  const bgConfig = backgroundConfig || config || {
    mode: 'fixed',
    workItems: [],
    breakItems: [],
  };

  const brightness = appearance?.backgroundBrightness ?? 0.8;
  const blurAmount = appearance?.backgroundBlur ?? 0;
  const vignetteTint = appearance?.vignetteTint ?? 'dark';

  const isBreak = timerStatus === 'BREAK' || timerStatus === 'LONG_BREAK';
  const workItems = bgConfig.workItems || [];
  const breakItems = bgConfig.breakItems || [];
  const activeItems = isBreak && breakItems.length > 0 ? breakItems : workItems;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [nextIndex, setNextIndex] = useState(1);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Fallback item if no items configured
  const currentItem: MediaItem = activeItems[currentIndex] || {
    id: 'default',
    title: 'Rainy Studio',
    type: 'image',
    url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1920&q=80',
    duration: 1800,
  };

  const nextItem: MediaItem | undefined = activeItems.length > 1 ? activeItems[nextIndex] : undefined;

  // Auto-advance playlist items based on duration
  useEffect(() => {
    if (activeItems.length <= 1 || bgConfig.mode === 'fixed') return;

    const itemDurationMs = (currentItem.duration || 1800) * 1000;

    timerRef.current = setTimeout(() => {
      triggerAdvance();
    }, itemDurationMs);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [currentIndex, activeItems, bgConfig.mode]);

  const triggerAdvance = () => {
    if (activeItems.length <= 1) return;
    setIsTransitioning(true);

    setTimeout(() => {
      let targetNext: number;
      if (bgConfig.mode === 'shuffle') {
        targetNext = Math.floor(Math.random() * activeItems.length);
      } else {
        targetNext = (currentIndex + 1) % activeItems.length;
      }
      setCurrentIndex(targetNext);
      setNextIndex((targetNext + 1) % activeItems.length);
      setIsTransitioning(false);
    }, 1000); // 1s transition duration
  };

  // Reset index when active items change (e.g. work vs break)
  useEffect(() => {
    setCurrentIndex(0);
    setNextIndex(activeItems.length > 1 ? 1 : 0);
  }, [isBreak]);

  const getTransitionClass = () => {
    const effect = bgConfig.transition?.effect || 'crossfade';
    if (effect === 'slide') {
      return isTransitioning ? 'translate-x-full opacity-0' : 'translate-x-0 opacity-100';
    }
    if (effect === 'zoom') {
      return isTransitioning ? 'scale-110 opacity-0' : 'scale-100 opacity-100';
    }
    if (effect === 'cut') {
      return 'opacity-100';
    }
    // crossfade
    return isTransitioning ? 'opacity-0' : 'opacity-100';
  };

  const getVignetteClass = () => {
    if (vignetteTint === 'amber') {
      return 'bg-gradient-to-t from-amber-950/80 via-slate-950/30 to-amber-950/40';
    }
    if (vignetteTint === 'blue') {
      return 'bg-gradient-to-t from-slate-950/90 via-sky-950/30 to-slate-950/50';
    }
    if (vignetteTint === 'none') {
      return 'bg-slate-950/20';
    }
    // 'dark' default
    return 'bg-gradient-to-t from-slate-950/80 via-slate-950/25 to-slate-950/45';
  };

  const mediaStyle: React.CSSProperties = {
    filter: `brightness(${brightness}) contrast(1.05) blur(${blurAmount}px)`,
    transform: blurAmount > 0 ? 'scale(1.04)' : undefined, // prevent white edges when blurred
  };

  return (
    <div className="fixed inset-0 z-0 overflow-hidden bg-slate-950 pointer-events-none select-none">
      {/* Current Active Background Item */}
      <div className={`absolute inset-0 transition-all duration-1000 ease-in-out ${getTransitionClass()}`}>
        {currentItem.type === 'video' ? (
          <video
            src={currentItem.url}
            autoPlay
            loop
            muted
            playsInline
            style={mediaStyle}
            className="w-full h-full object-cover transition-all duration-300"
          />
        ) : (
          <img
            src={currentItem.url}
            alt={currentItem.title}
            style={mediaStyle}
            className="w-full h-full object-cover transition-all duration-300"
          />
        )}
      </div>

      {/* Preloading / Next Item Layer for smooth crossfade */}
      {nextItem && isTransitioning && (
        <div className="absolute inset-0 transition-opacity duration-1000 opacity-100">
          {nextItem.type === 'video' ? (
            <video
              src={nextItem.url}
              autoPlay
              loop
              muted
              playsInline
              style={mediaStyle}
              className="w-full h-full object-cover"
            />
          ) : (
            <img
              src={nextItem.url}
              alt={nextItem.title}
              style={mediaStyle}
              className="w-full h-full object-cover"
            />
          )}
        </div>
      )}

      {/* Ambient Vignette & Mood Overlay */}
      <div className={`absolute inset-0 ${getVignetteClass()} pointer-events-none transition-colors duration-500`} />

      {/* Custom Atmosphere Canvas Tint & Gradient Overlay */}
      {appearance?.canvasTint && appearance.canvasTint !== '#000000' && (
        <div
          className="absolute inset-0 pointer-events-none transition-all duration-500"
          style={{
            background: appearance.canvasTint.includes('gradient')
              ? appearance.canvasTint
              : undefined,
            backgroundColor: !appearance.canvasTint.includes('gradient')
              ? appearance.canvasTint
              : undefined,
            opacity: 0.35,
            mixBlendMode: 'color',
          }}
        />
      )}
    </div>
  );
};
