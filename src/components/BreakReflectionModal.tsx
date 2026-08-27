import React, { useEffect, useState } from 'react';
import { Task } from '../types';
import { Coffee, Sparkles, CheckCircle, ArrowRight, X } from 'lucide-react';

interface BreakReflectionModalProps {
  isOpen: boolean;
  tasks: Task[];
  onClose: () => void;
  onSaveBreakNote: (note: string) => void;
}

export const BreakReflectionModal: React.FC<BreakReflectionModalProps> = ({
  isOpen,
  tasks,
  onClose,
  onSaveBreakNote,
}) => {
  const [reflectionPrompt, setReflectionPrompt] = useState<string>('Loading AI reflection prompt...');
  const [breakNote, setBreakNote] = useState('');

  useEffect(() => {
    if (!isOpen) return;

    // Fetch AI reflection prompt
    fetch('/api/gemini/reflection', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tasks, focusMethod: 'Pomodoro' }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.reflectionPrompt) {
          setReflectionPrompt(data.reflectionPrompt);
        }
      })
      .catch(() => {
        setReflectionPrompt('Step away from your desk, hydrate, stretch your arms, and let your mind rest before the next focus cycle.');
      });
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSaveAndClose = () => {
    if (breakNote.trim()) {
      onSaveBreakNote(breakNote.trim());
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl max-w-lg w-full text-slate-100 relative animate-in fade-in zoom-in-95 duration-200">
        
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 text-amber-400 mb-4">
          <div className="p-3 bg-amber-500/20 border border-amber-500/30 rounded-2xl">
            <Coffee className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold">Time for a Refresh Break!</h2>
            <p className="text-xs text-slate-400">Step away from the screen & recharge</p>
          </div>
        </div>

        {/* AI Reflection Prompt Box */}
        <div className="bg-slate-950/60 border border-amber-500/20 rounded-2xl p-4 mb-5 flex gap-3 text-slate-200">
          <Sparkles className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <p className="text-xs leading-relaxed italic text-slate-300">
            "{reflectionPrompt}"
          </p>
        </div>

        {/* Quick Break Note Input */}
        <div className="mb-6">
          <label className="block text-xs font-semibold text-slate-300 mb-2">
            Quick Break Reflection or Idea (Optional)
          </label>
          <textarea
            value={breakNote}
            onChange={(e) => setBreakNote(e.target.value)}
            placeholder="Jot down a quick thought or breakthrough idea before stepping away..."
            className="w-full h-24 bg-slate-950 border border-slate-800 rounded-2xl p-3 text-xs outline-none focus:border-amber-500 transition text-slate-200 resize-none"
          />
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-xs font-medium text-slate-400 hover:text-slate-200 transition"
          >
            Skip Note
          </button>
          <button
            onClick={handleSaveAndClose}
            className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-amber-950 font-bold text-xs transition flex items-center gap-2 shadow-lg"
          >
            <span>Save Note & Enjoy Break</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

      </div>
    </div>
  );
};
