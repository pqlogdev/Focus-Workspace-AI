import React, { useState } from 'react';
import {
  CURATED_GRADIENTS,
  PALETTE_SWATCHES,
  buildGradientString,
  isGradient,
  getFirstColor,
} from '../utils/colorUtils';
import {
  Palette,
  Sparkles,
  Sliders,
  Check,
  RotateCw,
  Copy,
  CheckCheck,
  Eye,
  Pipette,
  Layers,
  Sun,
  Flame,
} from 'lucide-react';

export interface ColorPickerControlProps {
  label?: string;
  description?: string;
  value?: string; // Hex color code or gradient CSS string
  glowIntensity?: number; // 0 to 100
  showGlowControl?: boolean;
  onChange: (colorValue: string, glowIntensity?: number) => void;
  onPreviewHover?: (colorValue: string | null) => void;
  allowGradients?: boolean;
  defaultAngle?: number;
}

export const ColorPickerControl: React.FC<ColorPickerControlProps> = ({
  label,
  description,
  value = '#6366f1',
  glowIntensity = 50,
  showGlowControl = true,
  onChange,
  onPreviewHover,
  allowGradients = true,
  defaultAngle = 135,
}) => {
  const [activeTab, setActiveTab] = useState<'presets' | 'custom_hex' | 'gradient_studio'>(
    isGradient(value) ? 'gradient_studio' : 'presets'
  );

  const [hexInput, setHexInput] = useState(() => getFirstColor(value, '#6366f1'));
  const [copied, setCopied] = useState(false);

  // Gradient Builder States
  const [gradientType, setGradientType] = useState<'linear' | 'radial'>('linear');
  const [gradientAngle, setGradientAngle] = useState(defaultAngle);
  const [stop1, setStop1] = useState('#6366f1');
  const [stop2, setStop2] = useState('#ec4899');
  const [useStop3, setUseStop3] = useState(false);
  const [stop3, setStop3] = useState('#a855f7');
  const [activeGlow, setActiveGlow] = useState(glowIntensity);

  const handleHexChange = (newHex: string) => {
    setHexInput(newHex);
    if (/^#([0-9A-Fa-f]{3}){1,2}$/.test(newHex)) {
      onChange(newHex, activeGlow);
    }
  };

  const handleCopyHex = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleApplyGradient = (s1: string, s2: string, s3?: string, ang = gradientAngle, type = gradientType) => {
    const gradStr = buildGradientString(s1, s2, s3, ang, type);
    onChange(gradStr, activeGlow);
  };

  const handleSwapStops = () => {
    const next1 = stop2;
    const next2 = stop1;
    setStop1(next1);
    setStop2(next2);
    handleApplyGradient(next1, next2, useStop3 ? stop3 : undefined);
  };

  return (
    <div className="bg-slate-950/80 border border-slate-800/90 rounded-2xl p-3.5 space-y-3.5">
      {/* Header Info & Current Color Preview */}
      <div className="flex items-center justify-between gap-2">
        <div>
          {label && <label className="text-xs font-bold text-slate-200 block">{label}</label>}
          {description && <p className="text-[10px] text-slate-400 mt-0.5">{description}</p>}
        </div>

        {/* Live Color / Gradient Preview Pill */}
        <div className="flex items-center gap-2">
          <div
            style={{
              background: value,
              boxShadow:
                activeGlow > 0
                  ? `0 0 ${Math.round(activeGlow * 0.25)}px ${getFirstColor(value)}`
                  : undefined,
            }}
            className="w-7 h-7 rounded-xl border border-white/30 shadow-inner flex-shrink-0 transition-all duration-300"
            title={value}
          />
          <button
            type="button"
            onClick={handleCopyHex}
            className="p-1.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-400 hover:text-white transition"
            title="Copy color code"
          >
            {copied ? <CheckCheck className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Mode Navigation Tabs */}
      <div className="flex rounded-xl bg-slate-900/90 p-0.5 border border-slate-800 text-[11px] font-medium">
        <button
          type="button"
          onClick={() => setActiveTab('presets')}
          className={`flex-1 py-1.5 px-2 rounded-lg flex items-center justify-center gap-1.5 transition ${
            activeTab === 'presets'
              ? 'bg-indigo-600 text-white shadow-sm font-semibold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Palette className="w-3 h-3" />
          <span>Swatches</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('custom_hex')}
          className={`flex-1 py-1.5 px-2 rounded-lg flex items-center justify-center gap-1.5 transition ${
            activeTab === 'custom_hex'
              ? 'bg-indigo-600 text-white shadow-sm font-semibold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Pipette className="w-3 h-3" />
          <span>Full Hex</span>
        </button>

        {allowGradients && (
          <button
            type="button"
            onClick={() => setActiveTab('gradient_studio')}
            className={`flex-1 py-1.5 px-2 rounded-lg flex items-center justify-center gap-1.5 transition ${
              activeTab === 'gradient_studio'
                ? 'bg-indigo-600 text-white shadow-sm font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3 h-3 text-amber-300" />
            <span>Gradients</span>
          </button>
        )}
      </div>

      {/* TAB 1: SWATCHES & QUICK PALETTES */}
      {activeTab === 'presets' && (
        <div className="space-y-3 animate-in fade-in duration-150">
          <div>
            <span className="text-[10px] uppercase font-semibold text-slate-400 block mb-2 tracking-wider">
              Solid Colors
            </span>
            <div className="grid grid-cols-6 sm:grid-cols-9 gap-1.5">
              {PALETTE_SWATCHES.map((hex) => {
                const isSelected = value.toLowerCase() === hex.toLowerCase();
                return (
                  <button
                    key={hex}
                    type="button"
                    onClick={() => {
                      setHexInput(hex);
                      onChange(hex, activeGlow);
                    }}
                    onMouseEnter={() => onPreviewHover?.(hex)}
                    onMouseLeave={() => onPreviewHover?.(null)}
                    style={{ backgroundColor: hex }}
                    className={`h-6 rounded-lg border flex items-center justify-center transition hover:scale-110 active:scale-95 ${
                      isSelected
                        ? 'border-white ring-2 ring-indigo-500 shadow-md scale-105'
                        : 'border-white/20'
                    }`}
                    title={hex}
                  >
                    {isSelected && (
                      <Check
                        className={`w-3.5 h-3.5 ${
                          hex === '#ffffff' || hex === '#eab308' || hex === '#84cc16'
                            ? 'text-slate-900'
                            : 'text-white'
                        }`}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {allowGradients && (
            <div>
              <span className="text-[10px] uppercase font-semibold text-slate-400 block mb-2 tracking-wider">
                Popular Gradients
              </span>
              <div className="grid grid-cols-3 gap-1.5">
                {CURATED_GRADIENTS.slice(0, 6).map((g) => {
                  const isSelected = value === g.css;
                  return (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => {
                        setStop1(g.stop1);
                        setStop2(g.stop2);
                        if (g.stop3) {
                          setUseStop3(true);
                          setStop3(g.stop3);
                        } else {
                          setUseStop3(false);
                        }
                        setGradientAngle(g.angle);
                        onChange(g.css, activeGlow);
                      }}
                      style={{ background: g.css }}
                      className={`py-1.5 px-2 rounded-xl text-left border transition relative overflow-hidden group hover:scale-[1.02] ${
                        isSelected
                          ? 'border-white ring-2 ring-indigo-500 shadow-lg'
                          : 'border-white/20'
                      }`}
                    >
                      <div className="flex items-center justify-between text-white drop-shadow">
                        <span className="text-[10px] font-bold truncate">{g.name}</span>
                        {isSelected && <Check className="w-3 h-3 shrink-0" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: FULL CUSTOM HEX & COLOR PICKER */}
      {activeTab === 'custom_hex' && (
        <div className="space-y-3 animate-in fade-in duration-150">
          <div className="flex items-center gap-2">
            {/* Native Color Eye-dropper Input */}
            <div className="relative w-10 h-10 rounded-xl overflow-hidden border border-slate-700 bg-slate-900 flex-shrink-0 cursor-pointer hover:border-indigo-500 transition">
              <input
                type="color"
                value={hexInput.startsWith('#') && hexInput.length === 7 ? hexInput : '#6366f1'}
                onChange={(e) => handleHexChange(e.target.value)}
                className="absolute -top-2 -left-2 w-14 h-14 cursor-pointer opacity-0"
              />
              <div
                style={{ backgroundColor: hexInput }}
                className="w-full h-full flex items-center justify-center text-white/90"
              >
                <Pipette className="w-4 h-4 drop-shadow" />
              </div>
            </div>

            {/* Direct Hex Text Input */}
            <div className="flex-1 relative">
              <input
                type="text"
                value={hexInput}
                onChange={(e) => handleHexChange(e.target.value)}
                placeholder="#6366F1"
                maxLength={7}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-100 uppercase outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
              />
              <span className="absolute right-2.5 top-2.5 text-[10px] text-slate-500 font-mono">
                HEX
              </span>
            </div>
          </div>

          {/* Quick Swatch Matrix */}
          <div className="grid grid-cols-6 gap-1 pt-1">
            {PALETTE_SWATCHES.slice(0, 12).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => handleHexChange(s)}
                style={{ backgroundColor: s }}
                className="h-5 rounded-lg border border-white/20 hover:scale-110 transition"
                title={s}
              />
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: ADVANCED GRADIENT STUDIO */}
      {activeTab === 'gradient_studio' && (
        <div className="space-y-3.5 animate-in fade-in duration-150">
          {/* Gradient Color Stops Configuration */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[11px] font-semibold text-slate-300">
              <span>Color Stops</span>
              <button
                type="button"
                onClick={handleSwapStops}
                className="text-[10px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 bg-slate-900 px-2 py-0.5 rounded-md border border-slate-800 transition"
              >
                <RotateCw className="w-3 h-3" />
                <span>Swap Colors</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {/* Stop 1 */}
              <div className="flex items-center gap-2 p-2 bg-slate-900 border border-slate-800 rounded-xl">
                <input
                  type="color"
                  value={stop1}
                  onChange={(e) => {
                    const next = e.target.value;
                    setStop1(next);
                    handleApplyGradient(next, stop2, useStop3 ? stop3 : undefined);
                  }}
                  className="w-6 h-6 rounded cursor-pointer border-0 p-0 bg-transparent"
                />
                <div className="flex-1">
                  <span className="text-[9px] text-slate-500 block uppercase">Stop 1</span>
                  <span className="text-[11px] font-mono font-medium text-slate-200">{stop1}</span>
                </div>
              </div>

              {/* Stop 2 */}
              <div className="flex items-center gap-2 p-2 bg-slate-900 border border-slate-800 rounded-xl">
                <input
                  type="color"
                  value={stop2}
                  onChange={(e) => {
                    const next = e.target.value;
                    setStop2(next);
                    handleApplyGradient(stop1, next, useStop3 ? stop3 : undefined);
                  }}
                  className="w-6 h-6 rounded cursor-pointer border-0 p-0 bg-transparent"
                />
                <div className="flex-1">
                  <span className="text-[9px] text-slate-500 block uppercase">Stop 2</span>
                  <span className="text-[11px] font-mono font-medium text-slate-200">{stop2}</span>
                </div>
              </div>
            </div>

            {/* Optional Stop 3 Toggle & Input */}
            <div className="pt-1">
              {useStop3 ? (
                <div className="flex items-center justify-between p-2 bg-slate-900 border border-slate-800 rounded-xl">
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={stop3}
                      onChange={(e) => {
                        const next = e.target.value;
                        setStop3(next);
                        handleApplyGradient(stop1, stop2, next);
                      }}
                      className="w-6 h-6 rounded cursor-pointer border-0 p-0 bg-transparent"
                    />
                    <div>
                      <span className="text-[9px] text-slate-500 block uppercase">Stop 3 (Center)</span>
                      <span className="text-[11px] font-mono font-medium text-slate-200">{stop3}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setUseStop3(false);
                      handleApplyGradient(stop1, stop2, undefined);
                    }}
                    className="text-[10px] text-rose-400 hover:text-rose-300 px-2 py-1 bg-slate-950 rounded-lg border border-slate-800"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setUseStop3(true);
                    handleApplyGradient(stop1, stop2, stop3);
                  }}
                  className="w-full py-1 text-[10px] text-indigo-400 hover:text-indigo-300 bg-slate-900/60 hover:bg-slate-900 border border-dashed border-slate-800 rounded-xl transition"
                >
                  + Add 3rd Mid-Tone Color Stop
                </button>
              )}
            </div>
          </div>

          {/* Gradient Angle & Type Controls */}
          <div className="space-y-2 pt-1 border-t border-slate-800/80">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-400">Angle Direction</span>
              <span className="font-mono text-indigo-300 font-bold">{gradientAngle}°</span>
            </div>

            <input
              type="range"
              min="0"
              max="360"
              step="15"
              value={gradientAngle}
              onChange={(e) => {
                const ang = parseInt(e.target.value, 10);
                setGradientAngle(ang);
                handleApplyGradient(stop1, stop2, useStop3 ? stop3 : undefined, ang);
              }}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
            />

            {/* Quick Angle Direction Pills */}
            <div className="grid grid-cols-6 gap-1">
              {[0, 45, 90, 135, 180, 270].map((deg) => (
                <button
                  key={deg}
                  type="button"
                  onClick={() => {
                    setGradientAngle(deg);
                    handleApplyGradient(stop1, stop2, useStop3 ? stop3 : undefined, deg);
                  }}
                  className={`py-1 rounded-lg text-[9px] font-mono border transition ${
                    gradientAngle === deg
                      ? 'bg-indigo-600 border-indigo-500 text-white'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {deg}°
                </button>
              ))}
            </div>
          </div>

          {/* All Curated Gradient Presets Grid */}
          <div className="space-y-2 pt-1 border-t border-slate-800/80">
            <span className="text-[10px] uppercase font-semibold text-slate-400 block tracking-wider">
              Curated Designer Gradients
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-40 overflow-y-auto custom-scrollbar pr-1">
              {CURATED_GRADIENTS.map((g) => {
                const isSelected = value === g.css;
                return (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => {
                      setStop1(g.stop1);
                      setStop2(g.stop2);
                      if (g.stop3) {
                        setUseStop3(true);
                        setStop3(g.stop3);
                      } else {
                        setUseStop3(false);
                      }
                      setGradientAngle(g.angle);
                      onChange(g.css, activeGlow);
                    }}
                    style={{ background: g.css }}
                    className={`py-2 px-2.5 rounded-xl text-left border transition relative overflow-hidden group hover:scale-[1.02] ${
                      isSelected
                        ? 'border-white ring-2 ring-indigo-500 shadow-lg'
                        : 'border-white/20'
                    }`}
                  >
                    <div className="flex items-center justify-between text-white drop-shadow">
                      <span className="text-[10px] font-bold truncate">{g.name}</span>
                      {isSelected && <Check className="w-3 h-3 shrink-0" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Optional Glow Aura & Intensity Slider */}
      {showGlowControl && (
        <div className="pt-2 border-t border-slate-800/80 space-y-1.5">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-400 flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-amber-400" />
              Neon Glow & Ambient Aura
            </span>
            <span className="font-mono text-amber-300 font-bold">{activeGlow}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            step="5"
            value={activeGlow}
            onChange={(e) => {
              const val = parseInt(e.target.value, 10);
              setActiveGlow(val);
              onChange(value, val);
            }}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
          />
        </div>
      )}
    </div>
  );
};
