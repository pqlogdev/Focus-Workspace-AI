// Utility functions for full color codes, gradients, rgba parsing, and hex manipulation

export interface GradientConfig {
  type: 'linear' | 'radial';
  angle: number; // 0 - 360
  stop1: string;
  stop2: string;
  stop3?: string;
  opacity?: number; // 0 - 1
}

export interface AdvancedColorValue {
  mode: 'solid' | 'gradient' | 'preset';
  presetName?: string;
  solidHex: string;
  gradient?: GradientConfig;
  glowIntensity?: number; // 0 to 100
  glowColor?: string;
}

export const CURATED_GRADIENTS = [
  {
    id: 'cosmic-aurora',
    name: 'Cosmic Aurora',
    css: 'linear-gradient(135deg, #6366f1 0%, #a855f7 50%, #ec4899 100%)',
    angle: 135,
    stop1: '#6366f1',
    stop2: '#a855f7',
    stop3: '#ec4899',
    category: 'Vibrant',
  },
  {
    id: 'cyber-neon',
    name: 'Cyber Neon',
    css: 'linear-gradient(135deg, #00f2fe 0%, #4facfe 100%)',
    angle: 135,
    stop1: '#00f2fe',
    stop2: '#4facfe',
    category: 'Cyber',
  },
  {
    id: 'emerald-glade',
    name: 'Emerald Glade',
    css: 'linear-gradient(135deg, #10b981 0%, #06b6d4 100%)',
    angle: 135,
    stop1: '#10b981',
    stop2: '#06b6d4',
    category: 'Nature',
  },
  {
    id: 'sunset-blaze',
    name: 'Sunset Blaze',
    css: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 50%, #ec4899 100%)',
    angle: 135,
    stop1: '#f59e0b',
    stop2: '#ef4444',
    stop3: '#ec4899',
    category: 'Warm',
  },
  {
    id: 'electric-violet',
    name: 'Electric Violet',
    css: 'linear-gradient(135deg, #8b5cf6 0%, #d946ef 100%)',
    angle: 135,
    stop1: '#8b5cf6',
    stop2: '#d946ef',
    category: 'Vibrant',
  },
  {
    id: 'golden-hour',
    name: 'Golden Hour',
    css: 'linear-gradient(135deg, #fbbf24 0%, #f97316 100%)',
    angle: 135,
    stop1: '#fbbf24',
    stop2: '#f97316',
    category: 'Warm',
  },
  {
    id: 'arctic-frost',
    name: 'Arctic Frost',
    css: 'linear-gradient(135deg, #38bdf8 0%, #818cf8 100%)',
    angle: 135,
    stop1: '#38bdf8',
    stop2: '#818cf8',
    category: 'Cool',
  },
  {
    id: 'midnight-velvet',
    name: 'Midnight Velvet',
    css: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%)',
    angle: 135,
    stop1: '#1e1b4b',
    stop2: '#312e81',
    stop3: '#4338ca',
    category: 'Dark',
  },
  {
    id: 'matrix-glitch',
    name: 'Matrix Cyber',
    css: 'linear-gradient(135deg, #22c55e 0%, #14b8a6 100%)',
    angle: 135,
    stop1: '#22c55e',
    stop2: '#14b8a6',
    category: 'Cyber',
  },
  {
    id: 'rose-quartz',
    name: 'Rose Quartz',
    css: 'linear-gradient(135deg, #f43f5e 0%, #fb7185 100%)',
    angle: 135,
    stop1: '#f43f5e',
    stop2: '#fb7185',
    category: 'Vibrant',
  },
  {
    id: 'holographic-opal',
    name: 'Holographic Opal',
    css: 'linear-gradient(135deg, #fbcfe8 0%, #bae6fd 50%, #c7d2fe 100%)',
    angle: 135,
    stop1: '#fbcfe8',
    stop2: '#bae6fd',
    stop3: '#c7d2fe',
    category: 'Pastel',
  },
  {
    id: 'dark-obsidian',
    name: 'Dark Obsidian',
    css: 'linear-gradient(135deg, #18181b 0%, #27272a 100%)',
    angle: 135,
    stop1: '#18181b',
    stop2: '#27272a',
    category: 'Dark',
  },
];

export const PALETTE_SWATCHES = [
  '#6366f1', // Indigo
  '#8b5cf6', // Violet
  '#a855f7', // Purple
  '#ec4899', // Pink
  '#f43f5e', // Rose
  '#ef4444', // Red
  '#f97316', // Orange
  '#f59e0b', // Amber
  '#eab308', // Yellow
  '#84cc16', // Lime
  '#10b981', // Emerald
  '#14b8a6', // Teal
  '#06b6d4', // Cyan
  '#0ea5e9', // Sky
  '#3b82f6', // Blue
  '#ffffff', // Pure White
  '#94a3b8', // Slate Light
  '#334155', // Slate Dark
];

/**
 * Generate CSS gradient string from parameters
 */
export function buildGradientString(
  stop1: string,
  stop2: string,
  stop3?: string,
  angle: number = 135,
  type: 'linear' | 'radial' = 'linear'
): string {
  if (type === 'radial') {
    if (stop3) {
      return `radial-gradient(circle at center, ${stop1} 0%, ${stop2} 50%, ${stop3} 100%)`;
    }
    return `radial-gradient(circle at center, ${stop1} 0%, ${stop2} 100%)`;
  }
  if (stop3) {
    return `linear-gradient(${angle}deg, ${stop1} 0%, ${stop2} 50%, ${stop3} 100%)`;
  }
  return `linear-gradient(${angle}deg, ${stop1} 0%, ${stop2} 100%)`;
}

/**
 * Convert hex color to rgba with specific opacity
 */
export function hexToRgba(hex: string, alpha: number = 1): string {
  if (!hex) return `rgba(99, 102, 241, ${alpha})`;
  let cleanHex = hex.replace('#', '');
  if (cleanHex.length === 3) {
    cleanHex = cleanHex
      .split('')
      .map((c) => c + c)
      .join('');
  }
  if (cleanHex.length !== 6) {
    return `rgba(99, 102, 241, ${alpha})`;
  }
  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Check if a color string is a gradient
 */
export function isGradient(color?: string | null): boolean {
  if (!color) return false;
  return color.includes('gradient');
}

/**
 * Determine if text should be light or dark based on background hex
 */
export function getContrastTextColor(hex?: string): string {
  if (!hex || hex.includes('gradient')) return '#ffffff';
  let cleanHex = hex.replace('#', '');
  if (cleanHex.length === 3) {
    cleanHex = cleanHex
      .split('')
      .map((c) => c + c)
      .join('');
  }
  if (cleanHex.length !== 6) return '#ffffff';
  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 150 ? '#0f172a' : '#ffffff';
}

/**
 * Extract primary solid color from a color or gradient string
 */
export function getFirstColor(colorString?: string | null, fallback = '#6366f1'): string {
  if (!colorString) return fallback;
  if (!isGradient(colorString)) return colorString;
  const match = colorString.match(/#(?:[0-9a-fA-F]{3}){1,2}|rgba?\([^)]+\)/);
  return match ? match[0] : fallback;
}
