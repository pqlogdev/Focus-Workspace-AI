import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RoomState, Task, TimerStatus, WorkspaceConfig, Participant, RoomChatMessage, StickyNote } from '../types';
import {
  Users,
  Plus,
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  Smile,
  Copy,
  Check,
  X,
  Radio,
  MessageSquare,
  FileText,
  ListTodo,
  Sparkles,
  Send,
  Sliders,
  Flame,
  Volume2,
  Image,
  LogOut,
  Clock,
  Edit3,
  CheckCircle2,
  Trash2,
  Share2,
  ExternalLink,
  Lock,
  Unlock,
  Move,
  Layout,
} from 'lucide-react';

interface RealtimeRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomState: RoomState | null;
  onRoomStateChange: (room: RoomState | null) => void;
  currentTimerStatus: TimerStatus;
  currentUser: { uid: string; displayName?: string | null; email?: string | null; photoURL?: string | null } | null;
  currentConfig: WorkspaceConfig;
  currentStickyNotes?: StickyNote[];
  onApplyAtmosphere?: (config: WorkspaceConfig, sharedNotes?: StickyNote[]) => void;
  onSendReaction?: (emoji: string) => void;
}

type TabType = 'timer' | 'tasks' | 'scratchpad' | 'chat' | 'members';

const EMOJIS = ['🔥', '👏', '☕', '💪', '🧠', '✨', '🚀', '🎉', '🧘', '💡'];

export const RealtimeRoomModal: React.FC<RealtimeRoomModalProps> = ({
  isOpen,
  onClose,
  roomState,
  onRoomStateChange,
  currentTimerStatus,
  currentUser,
  currentConfig,
  currentStickyNotes = [],
  onApplyAtmosphere,
  onSendReaction,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('timer');
  const [inputCode, setInputCode] = useState('');
  const [roomNameInput, setRoomNameInput] = useState('');
  const [userGoalInput, setUserGoalInput] = useState('Deep Focus');
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Chat message input
  const [chatInput, setChatInput] = useState('');
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Task creation input
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<'low' | 'medium' | 'high'>('medium');

  // Scratchpad local state with debouncing
  const [scratchpadText, setScratchpadText] = useState('');
  const scratchpadDebounceRef = useRef<NodeJS.Timeout | null>(null);

  // WebSocket reference
  const wsRef = useRef<WebSocket | null>(null);

  // Derive participant ID & Name
  const myParticipantId = useRef<string>(
    currentUser?.uid || 
    localStorage.getItem('focus_participant_id') || 
    `user-${Date.now()}`
  ).current;

  useEffect(() => {
    if (!currentUser?.uid) {
      localStorage.setItem('focus_participant_id', myParticipantId);
    }
  }, [currentUser?.uid, myParticipantId]);

  const myDisplayName = currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Focus Focuser';

  // Send WS message helper (declared early so hooks can use it)
  const sendWs = (payload: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(payload));
    }
  };

  // Listen for window events to send through room WebSocket
  useEffect(() => {
    const handleSendRoomWs = (e: any) => {
      if (e.detail && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify(e.detail));
      }
    };
    window.addEventListener('send-room-ws' as any, handleSendRoomWs);
    return () => {
      window.removeEventListener('send-room-ws' as any, handleSendRoomWs);
    };
  }, []);

  // Sync scratchpad when roomState updates from server
  useEffect(() => {
    if (roomState && roomState.sharedScratchpad !== undefined) {
      setScratchpadText(roomState.sharedScratchpad);
    }
  }, [roomState?.sharedScratchpad]);

  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Record<string, string>>({});
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Connect WebSocket when room is active
  useEffect(() => {
    if (!roomState?.code) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/api/ws`;
    let reconnectAttempts = 0;
    let reconnectTimeoutId: NodeJS.Timeout;
    let socket: WebSocket | null = null;
    let isIntentionalClose = false;

    const connect = () => {
      socket = new WebSocket(wsUrl);
      wsRef.current = socket;

      socket.onopen = () => {
        reconnectAttempts = 0;
        // Join room
        socket?.send(
          JSON.stringify({
            type: 'JOIN_ROOM',
            roomCode: roomState.code,
            participant: {
              id: myParticipantId,
              displayName: myDisplayName,
              photoURL: currentUser?.photoURL || undefined,
              currentTask: userGoalInput,
              status: 'active',
              isHost: roomState.hostId === myParticipantId,
            },
          })
        );
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'ROOM_UPDATE' && data.room) {
            onRoomStateChange(data.room);

            // If atmosphere or entire workspace was synced
            if ((data.room.syncAtmosphere || data.room.syncWorkspace) && data.room.config && onApplyAtmosphere) {
              onApplyAtmosphere(data.room.config, data.room.sharedNotes);
            }
          } else if (data.type === 'WIDGET_POSITION_UPDATE' && data.widget && data.position) {
            window.dispatchEvent(new CustomEvent('sync-remote-widget-position', {
              detail: { widget: data.widget, position: data.position }
            }));
          } else if (data.type === 'EMOJI_REACTION' && onSendReaction) {
            onSendReaction(data.emoji);
          } else if (data.type === 'TYPING_START') {
            setTypingUsers(prev => ({ ...prev, [data.participantId]: data.displayName }));
          } else if (data.type === 'TYPING_STOP') {
            setTypingUsers(prev => {
              const newTyping = { ...prev };
              delete newTyping[data.participantId];
              return newTyping;
            });
          }
        } catch (err) {
          console.error('WS Parse Error:', err);
        }
      };

      socket.onclose = () => {
        if (!isIntentionalClose) {
          const delay = Math.min(1000 * Math.pow(1.5, reconnectAttempts), 15000);
          console.warn(`WS Room Connection Disconnected. Reconnecting in ${delay}ms...`);
          reconnectTimeoutId = setTimeout(() => {
            reconnectAttempts++;
            connect();
          }, delay);
        }
      };
      
      socket.onerror = () => {
        // Will trigger onclose
      };
    };

    connect();

    return () => {
      isIntentionalClose = true;
      clearTimeout(reconnectTimeoutId);
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.close();
      }
    };
  }, [roomState?.code, myParticipantId, myDisplayName, currentUser?.photoURL]);

  // Auto-scroll chat
  useEffect(() => {
    if (activeTab === 'chat') {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [roomState?.chatMessages?.length, activeTab]);

  if (!isOpen) return null;

  const isHost = roomState?.hostId === myParticipantId;

  // 1. Create Room
  const handleCreateRoom = () => {
    setErrorMessage(null);
    const name = roomNameInput.trim() || `${myDisplayName}'s Study Room`;

    fetch('/api/rooms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        hostId: myParticipantId,
        hostName: myDisplayName,
        hostPhoto: currentUser?.photoURL || undefined,
        currentGoal: userGoalInput,
        timerStatus: currentTimerStatus,
        config: currentConfig,
        sharedNotes: currentStickyNotes,
        allowMemberCustomization: true,
        initialTasks: [
          { id: `st-${Date.now()}-1`, title: '🎯 Complete 1st Pomodoro focus session', completed: false, priority: 'high' },
          { id: `st-${Date.now()}-2`, title: '📝 Sync key notes & questions in scratchpad', completed: false, priority: 'medium' },
        ],
      }),
    })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to create room');
        return res.json();
      })
      .then((data: RoomState) => {
        onRoomStateChange(data);
        setActiveTab('timer');
      })
      .catch((err) => {
        console.error('Create room failed:', err);
        setErrorMessage('Unable to create room. Please try again.');
      });
  };

  // 2. Join Room
  const handleJoinRoom = () => {
    if (!inputCode.trim()) return;
    const code = inputCode.trim().toUpperCase();
    setErrorMessage(null);

    fetch(`/api/rooms/${code}`)
      .then((res) => {
        if (!res.ok) throw new Error('Room not found');
        return res.json();
      })
      .then((data: RoomState) => {
        onRoomStateChange(data);
        setActiveTab('timer');
      })
      .catch(() => {
        setErrorMessage('Room code not found. Please double-check the 6-character code.');
      });
  };

  // 3. Leave Room
  const handleLeaveRoom = () => {
    if (roomState) {
      sendWs({
        type: 'LEAVE_ROOM',
        participantId: myParticipantId,
      });
      onRoomStateChange(null);
      onClose();
    }
  };

  // 4. Send Chat Message
  const handleSendChat = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!chatInput.trim() || !roomState) return;

    const message: RoomChatMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      senderId: myParticipantId,
      senderName: myDisplayName,
      senderPhoto: currentUser?.photoURL || undefined,
      text: chatInput.trim(),
      timestamp: new Date().toISOString(),
      isSystem: false,
    };

    sendWs({
      type: 'SEND_CHAT',
      roomCode: roomState.code,
      message,
    });

    setChatInput('');
  };

  // 5. Send Emoji Reaction
  const handleEmojiReaction = (emoji: string) => {
    if (!roomState) return;
    sendWs({
      type: 'EMOJI_REACTION',
      roomCode: roomState.code,
      emoji,
      senderId: myParticipantId,
      senderName: myDisplayName,
    });
    if (onSendReaction) onSendReaction(emoji);
  };

  // 6. Host Timer Control
  const handleToggleTimer = () => {
    if (!roomState || !isHost) return;
    const isRunning = !roomState.timerState.isRunning;
    sendWs({
      type: 'UPDATE_TIMER',
      roomCode: roomState.code,
      timerState: {
        ...roomState.timerState,
        isRunning,
        lastUpdated: Date.now(),
      },
    });
  };

  const handleResetTimer = () => {
    if (!roomState || !isHost) return;
    sendWs({
      type: 'UPDATE_TIMER',
      roomCode: roomState.code,
      timerState: {
        status: 'FOCUS',
        remainingSeconds: 1500,
        currentCycle: 1,
        isRunning: false,
        lastUpdated: Date.now(),
      },
    });
  };

  const handleSetTimerStatus = (status: TimerStatus, seconds: number) => {
    if (!roomState || !isHost) return;
    sendWs({
      type: 'UPDATE_TIMER',
      roomCode: roomState.code,
      timerState: {
        status,
        remainingSeconds: seconds,
        isRunning: true,
        lastUpdated: Date.now(),
      },
    });
  };

  // 7. Add Shared Task
  const handleAddSharedTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim() || !roomState) return;

    const newTask: Task = {
      id: `st-${Date.now()}`,
      title: newTaskTitle.trim(),
      completed: false,
      priority: newTaskPriority,
      createdAt: new Date().toISOString(),
    };

    sendWs({
      type: 'ADD_TASK',
      roomCode: roomState.code,
      task: newTask,
    });

    setNewTaskTitle('');
  };

  // 8. Toggle Shared Task
  const handleToggleTask = (taskId: string) => {
    if (!roomState) return;
    sendWs({
      type: 'TOGGLE_TASK',
      roomCode: roomState.code,
      taskId,
      actorName: myDisplayName,
    });
  };

  // 9. Update Scratchpad
  const handleScratchpadChange = (text: string) => {
    setScratchpadText(text);
    if (scratchpadDebounceRef.current) clearTimeout(scratchpadDebounceRef.current);
    scratchpadDebounceRef.current = setTimeout(() => {
      sendWs({
        type: 'UPDATE_SCRATCHPAD',
        scratchpad: text,
      });
    }, 400);
  };

  // 10. Sync Atmosphere & Workspace (Broadcasts background, audio, appearance & layout)
  const handleBroadcastWorkspace = () => {
    if (!roomState) return;
    if (!isHost && roomState.allowMemberCustomization === false) return;
    sendWs({
      type: 'SYNC_WORKSPACE',
      roomCode: roomState.code,
      participantId: myParticipantId,
      senderName: myDisplayName,
      config: currentConfig,
      sharedNotes: currentStickyNotes,
    });
  };

  const handleToggleMemberCustomization = (allow: boolean) => {
    if (!roomState || !isHost) return;
    sendWs({
      type: 'TOGGLE_MEMBER_CUSTOMIZATION',
      roomCode: roomState.code,
      participantId: myParticipantId,
      allowMemberCustomization: allow,
    });
  };

  // 11. Vote to skip break
  const handleVoteSkipBreak = () => {
    sendWs({
      type: 'VOTE_SKIP',
      participantId: myParticipantId,
    });
  };

  // 12. Update my focus goal
  const handleUpdateGoal = (newGoal: string) => {
    setUserGoalInput(newGoal);
    sendWs({
      type: 'UPDATE_PARTICIPANT',
      participantId: myParticipantId,
      currentTask: newGoal,
    });
  };

  // Copy helpers
  const copyCode = () => {
    if (roomState) {
      navigator.clipboard.writeText(roomState.code).catch(() => {});
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const copyInviteLink = () => {
    if (roomState) {
      const url = `${window.location.origin}?room=${roomState.code}`;
      navigator.clipboard.writeText(url).catch(() => {});
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-xl animate-in fade-in duration-200">
      <div className="bg-slate-900/95 border border-slate-800 rounded-3xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col text-slate-100 overflow-hidden relative">
        
        {/* Top Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-500/20 border border-indigo-500/30 rounded-2xl text-indigo-400">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  {roomState ? roomState.name || 'Live Study Room' : 'Real-Time Focus Rooms'}
                </h2>
                {roomState && (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-[10px] font-semibold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    LIVE
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                {roomState
                  ? `Host: ${roomState.hostName || 'Workspace Host'} · ${roomState.participants?.length || 1} online`
                  : 'Focus together in synchronized rooms with shared timer, tasks, chat & atmosphere.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {roomState && (
              <button
                onClick={handleLeaveRoom}
                className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-semibold rounded-xl transition flex items-center gap-1.5"
                title="Leave Room"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Leave Room</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Error notification */}
        {errorMessage && (
          <div className="p-3 bg-rose-500/20 border-b border-rose-500/30 text-rose-300 text-xs flex items-center justify-between px-5">
            <span>{errorMessage}</span>
            <button onClick={() => setErrorMessage(null)} className="p-1 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Not in a Room: Lobby Screen */}
        {!roomState ? (
          <div className="p-6 sm:p-8 overflow-y-auto space-y-6 flex-1">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Host a New Room */}
              <div className="bg-slate-950/70 border border-slate-800/90 rounded-2xl p-5 sm:p-6 flex flex-col justify-between hover:border-indigo-500/40 transition">
                <div>
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center mb-3">
                    <Users className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold text-white mb-1">Host a Study Room</h3>
                  <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                    Start an interactive session. You will control the synchronized focus timer, broadcast study atmosphere, and manage group goals.
                  </p>

                  <div className="space-y-3 mb-4">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-300 block mb-1">Room Name</label>
                      <input
                        type="text"
                        value={roomNameInput}
                        onChange={(e) => setRoomNameInput(e.target.value)}
                        placeholder={`${myDisplayName}'s Study Room`}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:border-indigo-500 transition"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-300 block mb-1">Your Initial Focus Goal</label>
                      <input
                        type="text"
                        value={userGoalInput}
                        onChange={(e) => setUserGoalInput(e.target.value)}
                        placeholder="e.g. Completing Chapter 4 problems"
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:border-indigo-500 transition"
                      />
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleCreateRoom}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-600/30 transition flex items-center justify-center gap-2 active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create & Launch Room</span>
                </button>
              </div>

              {/* Join Existing Room */}
              <div className="bg-slate-950/70 border border-slate-800/90 rounded-2xl p-5 sm:p-6 flex flex-col justify-between hover:border-emerald-500/40 transition">
                <div>
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-3">
                    <Radio className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold text-white mb-1">Join with Room Code</h3>
                  <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                    Have a code from a study buddy or team leader? Enter the 6-character room code to sync your timers and collaborate.
                  </p>

                  <div className="space-y-3 mb-4">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-300 block mb-1">6-Character Room Code</label>
                      <input
                        type="text"
                        value={inputCode}
                        onChange={(e) => setInputCode(e.target.value)}
                        placeholder="e.g. FOCUS9"
                        maxLength={8}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm uppercase font-mono font-bold tracking-widest text-emerald-400 outline-none focus:border-emerald-500 transition"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-300 block mb-1">Your Focus Goal</label>
                      <input
                        type="text"
                        value={userGoalInput}
                        onChange={(e) => setUserGoalInput(e.target.value)}
                        placeholder="e.g. Coding project sprint"
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:border-emerald-500 transition"
                      />
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleJoinRoom}
                  disabled={!inputCode.trim()}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-600/30 transition flex items-center justify-center gap-2 active:scale-95"
                >
                  <Users className="w-4 h-4" />
                  <span>Join Session</span>
                </button>
              </div>

            </div>

            {/* Feature Highlights */}
            <div className="border-t border-slate-800/80 pt-6">
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Live Collaboration Features</h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-slate-300">
                <div className="p-3 bg-slate-950/40 rounded-xl border border-slate-800 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-indigo-400 shrink-0" />
                  <span>Synced Pomodoro</span>
                </div>
                <div className="p-3 bg-slate-950/40 rounded-xl border border-slate-800 flex items-center gap-2">
                  <ListTodo className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Shared Kanban Tasks</span>
                </div>
                <div className="p-3 bg-slate-950/40 rounded-xl border border-slate-800 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Live Scratchpad</span>
                </div>
                <div className="p-3 bg-slate-950/40 rounded-xl border border-slate-800 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-purple-400 shrink-0" />
                  <span>Group Chat & Emojis</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Active Room Screen */
          <div className="flex flex-col flex-1 overflow-hidden">
            
            {/* Room Info Bar */}
            <div className="px-5 py-3 bg-slate-950/80 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl">
                  <span className="text-[10px] text-slate-400 font-semibold uppercase">Room Code:</span>
                  <span className="font-mono font-bold text-indigo-400 text-sm tracking-wider">{roomState.code}</span>
                  <button
                    onClick={copyCode}
                    className="p-1 hover:text-white text-slate-400 rounded transition"
                    title="Copy Code"
                  >
                    {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>

                <button
                  onClick={copyInviteLink}
                  className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded-xl text-xs flex items-center gap-1.5 transition"
                >
                  <Share2 className="w-3 h-3 text-indigo-400" />
                  <span>{copiedLink ? 'Link Copied!' : 'Copy Invite Link'}</span>
                </button>
              </div>

              {/* Quick Reactions Bar */}
              <div className="flex items-center gap-1 bg-slate-900/90 border border-slate-800 px-2 py-1 rounded-xl">
                <span className="text-[10px] text-slate-400 px-1 font-medium hidden sm:inline">React:</span>
                {EMOJIS.slice(0, 6).map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => handleEmojiReaction(emoji)}
                    className="p-1 hover:scale-125 text-base transition transform active:scale-90"
                    title={`Send ${emoji}`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-slate-800/80 bg-slate-950/40 px-4 text-xs font-semibold">
              <button
                onClick={() => setActiveTab('timer')}
                className={`py-3 px-4 border-b-2 flex items-center gap-2 transition ${
                  activeTab === 'timer'
                    ? 'border-indigo-500 text-indigo-400 bg-indigo-500/10'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Timer & Atmosphere</span>
              </button>

              <button
                onClick={() => setActiveTab('tasks')}
                className={`py-3 px-4 border-b-2 flex items-center gap-2 transition ${
                  activeTab === 'tasks'
                    ? 'border-indigo-500 text-indigo-400 bg-indigo-500/10'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <ListTodo className="w-3.5 h-3.5" />
                <span>Group Tasks ({roomState.sharedTasks?.filter((t) => !t.completed).length || 0})</span>
              </button>

              <button
                onClick={() => setActiveTab('scratchpad')}
                className={`py-3 px-4 border-b-2 flex items-center gap-2 transition ${
                  activeTab === 'scratchpad'
                    ? 'border-indigo-500 text-indigo-400 bg-indigo-500/10'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Shared Scratchpad</span>
              </button>

              <button
                onClick={() => setActiveTab('chat')}
                className={`py-3 px-4 border-b-2 flex items-center gap-2 transition ${
                  activeTab === 'chat'
                    ? 'border-indigo-500 text-indigo-400 bg-indigo-500/10'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Live Chat ({roomState.chatMessages?.length || 0})</span>
              </button>

              <button
                onClick={() => setActiveTab('members')}
                className={`py-3 px-4 border-b-2 flex items-center gap-2 transition ${
                  activeTab === 'members'
                    ? 'border-indigo-500 text-indigo-400 bg-indigo-500/10'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Members ({roomState.participants?.length || 1})</span>
              </button>
            </div>

            {/* Tab Contents */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 bg-slate-900/50">
              
              {/* TAB 1: TIMER & ATMOSPHERE */}
              {activeTab === 'timer' && (
                <div className="space-y-6 max-w-2xl mx-auto">
                  
                  {/* Timer Display */}
                  <div className="p-6 bg-slate-950/80 rounded-3xl border border-slate-800 text-center shadow-xl relative overflow-hidden">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold uppercase tracking-wider mb-2">
                      <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
                      {roomState.timerState.status} CYCLE #{roomState.timerState.currentCycle}
                    </div>

                    <div className="text-5xl sm:text-6xl font-black font-mono tracking-tight text-white my-3">
                      {formatSeconds(roomState.timerState.remainingSeconds)}
                    </div>

                    <div className="text-xs text-slate-400 mb-6">
                      {roomState.timerState.isRunning ? '● Timer is running in sync for all members' : '⏸ Timer paused by host'}
                    </div>

                    {/* Host Timer Controls */}
                    {isHost ? (
                      <div className="space-y-3">
                        <div className="flex items-center justify-center gap-3">
                          <button
                            onClick={handleToggleTimer}
                            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-600/30 transition flex items-center gap-2 active:scale-95"
                          >
                            {roomState.timerState.isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                            <span>{roomState.timerState.isRunning ? 'Pause All Timers' : 'Start Focus Session'}</span>
                          </button>

                          <button
                            onClick={() => handleResetTimer()}
                            className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition"
                            title="Reset Timer to 25m"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Quick Preset Buttons */}
                        <div className="flex justify-center gap-2 pt-2 text-xs">
                          <button
                            onClick={() => handleSetTimerStatus('FOCUS', 1500)}
                            className="px-3 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-slate-300"
                          >
                            25m Pomodoro
                          </button>
                          <button
                            onClick={() => handleSetTimerStatus('FOCUS', 3000)}
                            className="px-3 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-slate-300"
                          >
                            50m Deep Work
                          </button>
                          <button
                            onClick={() => handleSetTimerStatus('BREAK', 300)}
                            className="px-3 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-amber-300"
                          >
                            5m Short Break
                          </button>
                          <button
                            onClick={() => handleSetTimerStatus('BREAK', 900)}
                            className="px-3 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-amber-300"
                          >
                            15m Long Break
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 text-xs text-slate-400">
                        The timer is synchronized to Host ({roomState.hostName}).
                      </div>
                    )}
                  </div>

                  {/* Workspace & Customization Synchronization */}
                  <div className="p-5 bg-slate-950/60 rounded-2xl border border-slate-800 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-gradient-to-tr from-purple-500/20 to-indigo-500/20 text-purple-400 rounded-xl border border-purple-500/30">
                          <Sparkles className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-xs font-bold text-white">Real-Time Workspace Sync</h4>
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                              roomState.allowMemberCustomization !== false
                                ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
                                : 'bg-amber-500/10 text-amber-300 border-amber-500/20'
                            }`}>
                              {roomState.allowMemberCustomization !== false ? '🌟 Collaborative Mode' : '🔒 Host-Only Mode'}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            Syncs wallpapers, ambient soundscapes, timer styles, fonts, and widget positions across the room.
                          </p>
                        </div>
                      </div>

                      {(isHost || roomState.allowMemberCustomization !== false) && (
                        <button
                          onClick={handleBroadcastWorkspace}
                          className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl transition flex items-center gap-1.5 shadow-lg shadow-indigo-600/20 active:scale-95"
                          title="Broadcast your active workspace configuration to all room members"
                        >
                          <Radio className="w-3.5 h-3.5" />
                          <span>Broadcast Workspace</span>
                        </button>
                      )}
                    </div>

                    {/* Host Permission Switch */}
                    {isHost ? (
                      <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Move className="w-3.5 h-3.5 text-indigo-400" />
                          <div>
                            <p className="text-xs font-semibold text-slate-200">Allow Members to Customize & Drag Widgets</p>
                            <p className="text-[10px] text-slate-400">
                              When enabled, any member can change themes, audio, timer appearance, and reposition widgets for everyone in real-time.
                            </p>
                          </div>
                        </div>

                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={roomState.allowMemberCustomization !== false}
                            onChange={(e) => handleToggleMemberCustomization(e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                        </label>
                      </div>
                    ) : (
                      <div className="pt-2 border-t border-slate-800/80 flex items-center gap-2 text-xs">
                        {roomState.allowMemberCustomization !== false ? (
                          <span className="text-emerald-400 flex items-center gap-1.5 text-[11px]">
                            <Unlock className="w-3.5 h-3.5" />
                            Collaborative mode is active. You can customize the workspace and drag widgets in real-time!
                          </span>
                        ) : (
                          <span className="text-amber-400 flex items-center gap-1.5 text-[11px]">
                            <Lock className="w-3.5 h-3.5" />
                            Customization and widget dragging is managed by Host ({roomState.hostName || 'Host'}).
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Vote Skip Break */}
                  {roomState.timerState.status === 'BREAK' && (
                    <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center justify-between">
                      <div>
                        <h4 className="text-xs font-bold text-amber-300">Vote to Skip Break</h4>
                        <p className="text-[11px] text-amber-400/80">
                          {roomState.votesToSkipBreak?.length || 0} / {Math.ceil((roomState.participants?.length || 1) / 2)} votes needed to return to work early.
                        </p>
                      </div>
                      <button
                        onClick={handleVoteSkipBreak}
                        className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-amber-950 font-bold text-xs rounded-xl transition"
                      >
                        Vote Skip Break
                      </button>
                    </div>
                  )}

                </div>
              )}

              {/* TAB 2: GROUP TASKS */}
              {activeTab === 'tasks' && (
                <div className="space-y-4 max-w-2xl mx-auto">
                  
                  {/* Task Creator */}
                  <form onSubmit={handleAddSharedTask} className="flex gap-2">
                    <input
                      type="text"
                      value={newTaskTitle}
                      onChange={(e) => setNewTaskTitle(e.target.value)}
                      placeholder="Add a shared group task or milestone..."
                      className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-200 outline-none focus:border-indigo-500"
                    />
                    <select
                      value={newTaskPriority}
                      onChange={(e) => setNewTaskPriority(e.target.value as any)}
                      className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 outline-none"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                    <button
                      type="submit"
                      disabled={!newTaskTitle.trim()}
                      className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition flex items-center gap-1.5"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add</span>
                    </button>
                  </form>

                  {/* Tasks List */}
                  <div className="space-y-2">
                    {roomState.sharedTasks && roomState.sharedTasks.length > 0 ? (
                      roomState.sharedTasks.map((t) => (
                        <div
                          key={t.id}
                          onClick={() => handleToggleTask(t.id)}
                          className={`p-3 rounded-xl border flex items-center gap-3 cursor-pointer transition select-none ${
                            t.completed
                              ? 'bg-slate-950/30 border-slate-800/50 text-slate-500'
                              : 'bg-slate-950/70 border-slate-800 text-slate-200 hover:border-slate-700'
                          }`}
                        >
                          <div
                            className={`w-5 h-5 rounded-lg border flex items-center justify-center transition ${
                              t.completed ? 'bg-emerald-500 border-emerald-500 text-slate-950' : 'border-slate-600'
                            }`}
                          >
                            {t.completed && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                          </div>

                          <span className={`text-xs flex-1 ${t.completed ? 'line-through' : 'font-medium'}`}>
                            {t.title}
                          </span>

                          <span
                            className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${
                              t.priority === 'high'
                                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                : t.priority === 'medium'
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            {t.priority || 'medium'}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="p-8 text-center text-slate-500 text-xs bg-slate-950/30 rounded-2xl border border-slate-800/50">
                        No shared tasks yet. Add a milestone for the group to work on together!
                      </div>
                    )}
                  </div>

                </div>
              )}

              {/* TAB 3: SHARED SCRATCHPAD */}
              {activeTab === 'scratchpad' && (
                <div className="flex flex-col h-full space-y-3 max-w-3xl mx-auto">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      Live Synchronized Scratchpad
                    </span>
                    <span>Auto-saves across all members in real-time</span>
                  </div>

                  <textarea
                    value={scratchpadText}
                    onChange={(e) => handleScratchpadChange(e.target.value)}
                    placeholder="Type notes, meeting takeaways, code snippets, or useful research links here..."
                    className="w-full flex-1 min-h-[320px] bg-slate-950 border border-slate-800 rounded-2xl p-4 text-xs font-mono text-slate-200 outline-none focus:border-indigo-500 leading-relaxed resize-none"
                  />
                </div>
              )}

              {/* TAB 4: LIVE CHAT */}
              {activeTab === 'chat' && (
                <div className="flex flex-col h-[380px] max-w-2xl mx-auto">
                  
                  {/* Messages Area */}
                  <div className="flex-1 overflow-y-auto space-y-2.5 p-2 pr-3">
                    {roomState.chatMessages?.map((msg) => {
                      if (msg.isSystem) {
                        return (
                          <div key={msg.id} className="text-center my-1.5">
                            <span className="px-3 py-1 bg-slate-950/60 border border-slate-800 text-[10px] text-slate-400 rounded-full">
                              {msg.text}
                            </span>
                          </div>
                        );
                      }

                      const isMe = msg.senderId === myParticipantId;

                      return (
                        <div key={msg.id} className={`flex items-start gap-2.5 ${isMe ? 'flex-row-reverse' : ''}`}>
                          {msg.senderPhoto ? (
                            <img
                              src={msg.senderPhoto}
                              alt={msg.senderName}
                              className="w-6 h-6 rounded-full object-cover shrink-0 ring-1 ring-slate-700"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0">
                              {msg.senderName.charAt(0)}
                            </div>
                          )}

                          <div className={`max-w-[75%] rounded-2xl p-2.5 text-xs ${
                            isMe
                              ? 'bg-indigo-600 text-white rounded-br-none'
                              : 'bg-slate-950 border border-slate-800 text-slate-200 rounded-bl-none'
                          }`}>
                            <div className="flex items-center justify-between gap-2 mb-0.5">
                              <span className="text-[10px] font-bold opacity-80">{msg.senderName}</span>
                              <span className="text-[9px] opacity-60">
                                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <p className="leading-relaxed break-words">{msg.text}</p>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={chatBottomRef} />
                  </div>

                  {/* Chat Input Bar */}
                  {/* Typing Indicator */}
                  {Object.keys(typingUsers).length > 0 && (
                    <div className="px-4 py-2 text-xs text-slate-400 italic animate-pulse">
                      {Object.values(typingUsers).join(', ')} {Object.values(typingUsers).length > 1 ? 'are' : 'is'} typing...
                    </div>
                  )}

                  <form onSubmit={handleSendChat} className="flex gap-2 pt-3 border-t border-slate-800 mt-2">
                    <input
                      type="text"
                      value={chatInput}
                      onChange={(e) => {
                        setChatInput(e.target.value);
                        if (!isTyping) {
                          setIsTyping(true);
                          sendWs({ type: 'TYPING_START', roomCode: roomState.code, participantId: myParticipantId, displayName: myDisplayName });
                        }
                        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
                        typingTimeoutRef.current = setTimeout(() => {
                          setIsTyping(false);
                          sendWs({ type: 'TYPING_STOP', roomCode: roomState.code, participantId: myParticipantId });
                        }, 2000);
                      }}
                      placeholder="Type a message to the group..."
                      className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:border-indigo-500"
                    />
                    <button
                      type="submit"
                      disabled={!chatInput.trim()}
                      className="p-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl transition"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </form>

                </div>
              )}

              {/* TAB 5: MEMBERS */}
              {activeTab === 'members' && (
                <div className="space-y-4 max-w-2xl mx-auto">
                  
                  {/* Edit My Focus Goal */}
                  <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-2xl space-y-2">
                    <label className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
                      <Edit3 className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Update Your Focus Goal (Visible to Peers)</span>
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={userGoalInput}
                        onChange={(e) => setUserGoalInput(e.target.value)}
                        placeholder="What are you working on right now?"
                        className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:border-indigo-500"
                      />
                      <button
                        onClick={() => handleUpdateGoal(userGoalInput)}
                        className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition"
                      >
                        Update
                      </button>
                    </div>
                  </div>

                  {/* Active Members Grid */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Connected Focusers ({roomState.participants?.length || 1})
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <AnimatePresence>
                        {roomState.participants?.map((p) => {
                          let dotColor = 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]';
                          if (p.status === 'idle') dotColor = 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]';
                          if (p.status === 'break') dotColor = 'bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.8)]';
                          
                          return (
                            <motion.div
                              key={p.id}
                              initial={{ opacity: 0, scale: 0.9 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.9 }}
                              transition={{ duration: 0.2 }}
                              className="p-3 bg-slate-950/60 border border-slate-800 rounded-2xl flex items-center gap-3"
                            >
                              {p.photoURL ? (
                                <img
                                  src={p.photoURL}
                                  alt={p.displayName}
                                  className="w-10 h-10 rounded-xl object-cover ring-1 ring-slate-700"
                                  referrerPolicy="no-referrer"
                                />
                              ) : (
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white font-bold text-sm flex items-center justify-center">
                                  {p.displayName.charAt(0)}
                                </div>
                              )}

                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-bold text-xs text-white truncate">{p.displayName}</span>
                                  {p.isHost && (
                                    <span className="text-[9px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-1.5 py-0.2 rounded font-semibold">
                                      Host
                                    </span>
                                  )}
                                </div>
                                <p className="text-[11px] text-indigo-300/90 truncate font-medium mt-0.5">
                                  {p.currentTask || 'Focusing quietly'}
                                </p>
                              </div>

                              <div className={`w-2.5 h-2.5 rounded-full ${dotColor}`} title={`Status: ${p.status}`} />
                            </motion.div>
                          );
                        })}
                      </AnimatePresence>
                    </div>
                  </div>

                </div>
              )}

            </div>

          </div>
        )}

      </div>
    </div>
  );
};
