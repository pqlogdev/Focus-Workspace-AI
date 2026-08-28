import React, { useEffect, useState, useRef, useCallback } from 'react';
import { BackgroundConfig, MediaItem, TimerStatus, WorkspaceAppearanceConfig } from '../types';

interface BackgroundLayerProps {
  backgroundConfig?: BackgroundConfig;
  config?: BackgroundConfig;
  appearance?: WorkspaceAppearanceConfig;
  timerStatus: TimerStatus;
}

const DEFAULT_FALLBACK_URL = 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1920&q=80';

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
  const [resolvedUrls, setResolvedUrls] = useState<Record<string, string>>({
    'https://photos.app.goo.gl/AAVkdPZWQFaP8PRUA': 'https://lh3.googleusercontent.com/pw/AP1GczM5H0E3L1CW4IGLZfYuOWxBpUqox7SNzq5ZNgQGOENz7z_5sWDAGlV7P7ZG3RHD6el3trwJEHZVKu7w-SeYdqylqIOo6xCvXpUkFdl7GKR87JDn_Es=w2560-h1440-no',
  });
  const [proxyFallbackUrls, setProxyFallbackUrls] = useState<Set<string>>(new Set());
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Fallback item if no items configured
  const currentItem: MediaItem = activeItems[currentIndex] || activeItems[0] || {
    id: 'default',
    title: 'Rainy Studio',
    type: 'image',
    url: DEFAULT_FALLBACK_URL,
    duration: 1800,
  };

  const nextItem: MediaItem | undefined = activeItems.length > 1 ? activeItems[nextIndex] : undefined;

  // Resolve external or shared URLs (Google Photos, Google Drive, Dropbox, etc.)
  const resolveUrlIfNeeded = useCallback(async (rawUrl: string) => {
    if (!rawUrl) return;
    if (resolvedUrls[rawUrl]) return;

    // Check if it's a shared link needing server resolution
    const isSpecialLink =
      rawUrl.includes('photos.app.goo.gl') ||
      rawUrl.includes('photos.google.com') ||
      rawUrl.includes('drive.google.com') ||
      rawUrl.includes('dropbox.com');

    if (isSpecialLink) {
      try {
        const res = await fetch('/api/media/resolve-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: rawUrl }),
        });
        const data = await res.json();
        if (data && data.directUrl) {
          setResolvedUrls((prev) => ({ ...prev, [rawUrl]: data.directUrl }));
        }
      } catch (err) {
        console.warn('Could not auto-resolve special URL:', rawUrl, err);
      }
    }
  }, [resolvedUrls]);

  // Synchronize index and auto-resolve whenever active items change
  useEffect(() => {
    setCurrentIndex(0);
    setNextIndex(activeItems.length > 1 ? 1 : 0);

    if (currentItem?.url) {
      resolveUrlIfNeeded(currentItem.url);
    }
    if (nextItem?.url) {
      resolveUrlIfNeeded(nextItem.url);
    }
  }, [activeItems[0]?.id, activeItems[0]?.url, activeItems.length, isBreak, resolveUrlIfNeeded]);

  const getMediaRenderUrl = (rawUrl: string) => {
    if (!rawUrl) return DEFAULT_FALLBACK_URL;

    // 1. Check resolved URLs map (for Google Photos / Drive)
    const directUrl = resolvedUrls[rawUrl] || rawUrl;

    // 2. If it previously failed direct loading in browser, route via proxy
    if (proxyFallbackUrls.has(directUrl) && (directUrl.startsWith('http://') || directUrl.startsWith('https://'))) {
      return `/api/media/proxy?url=${encodeURIComponent(directUrl)}`;
    }

    return directUrl;
  };

  const handleMediaError = (rawUrl: string) => {
    const directUrl = resolvedUrls[rawUrl] || rawUrl;
    if (!proxyFallbackUrls.has(directUrl)) {
      // First try proxying
      setProxyFallbackUrls((prev) => new Set([...prev, directUrl]));
    }
  };

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
  }, [currentIndex, activeItems, bgConfig.mode, currentItem.duration]);

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
    }, 1000);
  };

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
    return 'bg-gradient-to-t from-slate-950/80 via-slate-950/25 to-slate-950/45';
  };

  const mediaStyle: React.CSSProperties = {
    filter: `brightness(${brightness}) contrast(1.05) blur(${blurAmount}px)`,
    transform: blurAmount > 0 ? 'scale(1.04)' : undefined,
  };

  const currentRenderUrl = getMediaRenderUrl(currentItem.url);
  const nextRenderUrl = nextItem ? getMediaRenderUrl(nextItem.url) : '';

  return (
    <div className="fixed inset-0 z-0 overflow-hidden bg-slate-950 pointer-events-none select-none">
      {/* Current Active Background Item */}
      <div className={`absolute inset-0 transition-all duration-1000 ease-in-out ${getTransitionClass()}`}>
        {currentItem.type === 'video' ? (
          <video
            key={currentRenderUrl}
            src={currentRenderUrl}
            autoPlay
            loop
            muted
            playsInline
            onError={() => handleMediaError(currentItem.url)}
            style={mediaStyle}
            className="w-full h-full object-cover transition-all duration-300"
          />
        ) : (
          <img
            key={currentRenderUrl}
            src={currentRenderUrl}
            alt={currentItem.title || 'Workspace Background'}
            referrerPolicy="no-referrer"
            onError={() => handleMediaError(currentItem.url)}
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
              key={nextRenderUrl}
              src={nextRenderUrl}
              autoPlay
              loop
              muted
              playsInline
              onError={() => handleMediaError(nextItem.url)}
              style={mediaStyle}
              className="w-full h-full object-cover"
            />
          ) : (
            <img
              key={nextRenderUrl}
              src={nextRenderUrl}
              alt={nextItem.title || 'Next Background'}
              referrerPolicy="no-referrer"
              onError={() => handleMediaError(nextItem.url)}
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

