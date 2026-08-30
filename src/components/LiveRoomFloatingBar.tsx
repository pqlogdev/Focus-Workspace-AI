import React, { useState } from 'react';
import { RoomState, TimerStatus } from '../types';
import { Radio, Users, MessageSquare, LogOut, Clock, ChevronRight, Smile, Flame } from 'lucide-react';

interface LiveRoomFloatingBarProps {
  roomState: RoomState | null;
  onOpenRoomModal: () => void;
  onLeaveRoom: () => void;
  onSendReaction: (emoji: string) => void;
}

const QUICK_EMOJIS = ['🔥', '👏', '☕', '💪', '🧠', '✨', '🚀'];

export const LiveRoomFloatingBar: React.FC<LiveRoomFloatingBarProps> = ({
  roomState,
  onOpenRoomModal,
  onLeaveRoom,
  onSendReaction,
}) => {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  if (!roomState) return null;

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const myParticipant = roomState.participants?.find((p: any) => p.id === localStorage.getItem('focus_participant_id') || p.displayName === 'Focus Focuser');
  const myStatus = myParticipant?.status || 'active';

  let dotColor = 'bg-emerald-500';
  let pingColor = 'bg-emerald-400';
  
  if (myStatus === 'idle') {
    dotColor = 'bg-amber-500';
    pingColor = 'bg-amber-400';
  } else if (myStatus === 'break') {
    dotColor = 'bg-blue-500';
    pingColor = 'bg-blue-400';
  }

  return (
    <div className="fixed top-5 left-6 z-40 flex items-center gap-2 pointer-events-auto select-none animate-in fade-in slide-in-from-top-4 duration-300">
      
      {/* Main Room Hub Pill */}
      <div className="flex items-center gap-2.5 p-1.5 pl-3 pr-2 rounded-2xl bg-slate-950/80 hover:bg-slate-950/95 border border-indigo-500/40 text-slate-200 backdrop-blur-xl shadow-2xl transition">
        
        {/* Live Pulse Indicator */}
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5" title={`Status: ${myStatus}`}>
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${pingColor} opacity-75`} />
            <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${dotColor}`} />
          </span>
          <span className="font-mono font-bold text-xs text-indigo-300 tracking-wider">
            {roomState.code}
          </span>
        </div>

        {/* Separator */}
        <span className="text-slate-700">|</span>

        {/* Member Count */}
        <button
          onClick={onOpenRoomModal}
          className="flex items-center gap-1 text-xs text-slate-300 hover:text-white transition"
          title="Open Room Participants"
        >
          <Users className="w-3.5 h-3.5 text-indigo-400" />
          <span className="font-semibold">{roomState.participants?.length || 1}</span>
        </button>

        {/* Synced Timer */}
        <button
          onClick={onOpenRoomModal}
          className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-mono font-bold hover:bg-indigo-500/20 transition"
          title="Synced Room Timer"
        >
          <Clock className="w-3 h-3 text-indigo-400" />
          <span>{formatSeconds(roomState.timerState?.remainingSeconds || 1500)}</span>
          <span className="text-[9px] uppercase font-sans text-indigo-400 font-medium">
            {roomState.timerState?.status || 'FOCUS'}
          </span>
        </button>

        {/* Open Room Hub Button */}
        <button
          onClick={onOpenRoomModal}
          className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 shadow-sm"
        >
          <span>Room Hub</span>
          <ChevronRight className="w-3 h-3" />
        </button>

        {/* Quick Emoji Reaction Trigger */}
        <div className="relative">
          <button
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="p-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white rounded-xl transition"
            title="Send Quick Reaction"
          >
            <Smile className="w-3.5 h-3.5 text-amber-400" />
          </button>

          {/* Emoji Popover */}
          {showEmojiPicker && (
            <div className="absolute top-full mt-2 left-0 bg-slate-950/95 border border-slate-800 rounded-2xl p-2 shadow-2xl flex items-center gap-1 z-50 animate-in fade-in zoom-in-95 duration-150">
              {QUICK_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => {
                    onSendReaction(emoji);
                    setShowEmojiPicker(false);
                  }}
                  className="p-1.5 hover:scale-125 text-base transition transform active:scale-90"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Quick Leave Room Button */}
        <button
          onClick={onLeaveRoom}
          className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 rounded-xl transition"
          title="Leave Room"
        >
          <LogOut className="w-3.5 h-3.5" />
        </button>

      </div>
    </div>
  );
};
