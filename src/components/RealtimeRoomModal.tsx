import React, { useEffect, useState } from 'react';
import { RoomState, Task, TimerStatus } from '../types';
import { Users, Plus, Play, Pause, SkipForward, Smile, Copy, Check, X, ShieldAlert } from 'lucide-react';

interface RealtimeRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRoomStateChange: (room: RoomState | null) => void;
  currentTimerStatus: TimerStatus;
}

export const RealtimeRoomModal: React.FC<RealtimeRoomModalProps> = ({
  isOpen,
  onClose,
  onRoomStateChange,
  currentTimerStatus,
}) => {
  const [roomCode, setRoomCode] = useState('');
  const [activeRoom, setActiveRoom] = useState<RoomState | null>(null);
  const [inputCode, setInputCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [liveEmojis, setLiveEmojis] = useState<{ id: string; emoji: string; sender: string }[]>([]);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const createRoom = () => {
    setErrorMessage(null);
    fetch('/api/rooms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hostId: 'user-1', hostName: 'Host Developer' }),
    })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to create room');
        return res.json();
      })
      .then((data: RoomState) => {
        if (data && data.code) {
          setActiveRoom(data);
          setRoomCode(data.code);
          connectWebSocket(data.code);
          onRoomStateChange(data);
        }
      })
      .catch((err) => {
        console.error('Create room error:', err);
        setErrorMessage('Unable to create room right now. Please try again.');
      });
  };

  const joinRoom = () => {
    if (!inputCode.trim()) return;
    const code = inputCode.trim().toUpperCase();
    setErrorMessage(null);

    fetch(`/api/rooms/${code}`)
      .then((res) => {
        if (!res.ok) throw new Error('Room not found');
        return res.json();
      })
      .then((data: RoomState) => {
        if (data && data.code) {
          setActiveRoom(data);
          setRoomCode(data.code);
          connectWebSocket(data.code);
          onRoomStateChange(data);
        }
      })
      .catch(() => {
        setErrorMessage('Room not found. Check the 6-character code.');
      });
  };

  const connectWebSocket = (code: string) => {
    try {
      const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
      const socket = new WebSocket(`${protocol}//${location.host}/api/ws`);

      socket.onerror = () => {
        // Graceful handling if ws is disconnected
      };

      socket.onopen = () => {
        try {
          socket.send(
            JSON.stringify({
              type: 'JOIN_ROOM',
              roomCode: code,
              participant: {
                id: `user-${Date.now()}`,
                displayName: 'Focus Member',
                status: 'active',
                isHost: false,
              },
            })
          );
        } catch {}
      };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'ROOM_UPDATE' && data.room) {
          setActiveRoom(data.room);
          onRoomStateChange(data.room);
        } else if (data.type === 'EMOJI_REACTION') {
          const newReaction = {
            id: `emoji-${Date.now()}`,
            emoji: data.emoji,
            sender: data.senderName || 'Member',
          };
          setLiveEmojis((prev) => [...prev, newReaction]);
          setTimeout(() => {
            setLiveEmojis((prev) => prev.filter((e) => e.id !== newReaction.id));
          }, 3000);
        }
      } catch (err) {
        console.error('WS client parse error:', err);
      }
    };

    setWs(socket);
    } catch (err) {
      console.error('WS connection error:', err);
    }
  };

  const sendEmojiReaction = (emoji: string) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(
          JSON.stringify({
            type: 'EMOJI_REACTION',
            emoji,
            senderName: 'Focus Member',
          })
        );
      } catch {}
    }
  };

  const voteSkipBreak = () => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(
          JSON.stringify({
            type: 'VOTE_SKIP',
            participantId: 'user-1',
          })
        );
      } catch {}
    }
  };

  const copyRoomCode = () => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(roomCode).catch(() => {});
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl max-w-xl w-full text-slate-100 relative animate-in fade-in zoom-in-95 duration-200">
        
        {/* Error notification banner */}
        {errorMessage && (
          <div className="mb-4 p-3 bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs rounded-xl flex items-center justify-between">
            <span>{errorMessage}</span>
            <button onClick={() => setErrorMessage(null)} className="p-1 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
        
        {/* Floating live emojis */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 flex gap-2 pointer-events-none z-50">
          {liveEmojis.map((item) => (
            <div
              key={item.id}
              className="bg-slate-800/90 border border-slate-700 px-3 py-1 rounded-full text-lg shadow-xl animate-bounce flex items-center gap-1 text-xs"
            >
              <span>{item.emoji}</span>
              <span className="text-[10px] text-slate-400">{item.sender}</span>
            </div>
          ))}
        </div>

        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
          <div className="flex items-center gap-3 text-indigo-400">
            <div className="p-3 bg-indigo-500/20 border border-indigo-500/30 rounded-2xl">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Real-Time Study Room</h2>
              <p className="text-xs text-slate-400">Focus together with shared timers, tasks & reactions</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {!activeRoom ? (
          /* Room Setup Options */
          <div className="space-y-6">
            <div className="bg-slate-950/60 p-5 rounded-2xl border border-slate-800 text-center">
              <h3 className="font-bold text-sm text-slate-100 mb-2">Host a New Study Room</h3>
              <p className="text-xs text-slate-400 mb-4">
                Create a room code and invite friends to sync focus sessions, tasks & breaks.
              </p>
              <button
                onClick={createRoom}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg transition"
              >
                Create Room
              </button>
            </div>

            <div className="bg-slate-950/60 p-5 rounded-2xl border border-slate-800">
              <h3 className="font-bold text-sm text-slate-100 mb-2">Join Existing Room</h3>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={inputCode}
                  onChange={(e) => setInputCode(e.target.value)}
                  placeholder="Enter 6-character room code..."
                  className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs uppercase text-slate-200 outline-none focus:border-indigo-500"
                />
                <button
                  onClick={joinRoom}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition"
                >
                  Join
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Active Room Screen */
          <div className="space-y-5">
            <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800 flex items-center justify-between">
              <div>
                <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Room Code</p>
                <p className="text-xl font-extrabold font-mono text-indigo-400">{activeRoom.code}</p>
              </div>
              <button
                onClick={copyRoomCode}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-xl transition flex items-center gap-1.5"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy Code'}</span>
              </button>
            </div>

            {/* Participants */}
            <div>
              <h4 className="text-xs font-semibold text-slate-300 mb-2 flex items-center justify-between">
                <span>Active Participants ({activeRoom.participants?.length || 1})</span>
                <span className="text-[10px] text-emerald-400">● Live Synced</span>
              </h4>

              <div className="grid grid-cols-2 gap-2">
                {activeRoom.participants?.map((p) => (
                  <div key={p.id} className="flex items-center gap-2 p-2 bg-slate-950/40 border border-slate-800 rounded-xl text-xs">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    <span className="font-medium text-slate-200 truncate">{p.displayName}</span>
                    {p.isHost && <span className="text-[9px] bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded ml-auto">Host</span>}
                  </div>
                ))}
              </div>
            </div>

            {/* Emoji Reactions Bar */}
            <div className="border-t border-slate-800 pt-4">
              <p className="text-[11px] font-medium text-slate-400 mb-2">Send Live Encouragement Emoji:</p>
              <div className="flex items-center gap-2">
                {['🔥', '👏', '☕', '💪', '🧠', '✨'].map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => sendEmojiReaction(emoji)}
                    className="p-2.5 bg-slate-800/80 hover:bg-slate-700 rounded-xl text-lg transition transform active:scale-95"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            {/* Vote to Skip Break */}
            {currentTimerStatus === 'BREAK' && (
              <div className="bg-amber-500/10 border border-amber-500/30 p-3 rounded-2xl flex items-center justify-between">
                <span className="text-xs text-amber-300 font-medium">Vote to Skip Break & Return to Work</span>
                <button
                  onClick={voteSkipBreak}
                  className="px-3 py-1.5 bg-amber-500 text-amber-950 font-bold text-xs rounded-xl hover:bg-amber-400 transition"
                >
                  Vote Skip
                </button>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
};
