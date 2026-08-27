import express from 'express';
import path from 'path';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const app = express();
const PORT = 3000;
const server = createServer(app);

app.use(express.json());

// Initialize Gemini SDK with telemetry header
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// In-memory templates store
let templatesStore = [
  {
    id: 'template-tokyo-rain',
    creatorId: 'official-ai-riser',
    creatorName: 'AI Riser Curated',
    name: 'Tokyo Rainy Cafe Lofi',
    description: 'Immerse in Tokyo neon rain with gentle rain sound, lofi beats, and 25/5 Pomodoro focus cycles.',
    tags: ['Lofi', 'Rain', 'Pomodoro', 'Tokyo'],
    thumbnail: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=400&q=80',
    isPublic: true,
    price: 0,
    downloadCount: 1420,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'template-deep-work-cyberpunk',
    creatorId: 'official-ai-riser',
    creatorName: 'AI Riser Curated',
    name: 'Cyberpunk Deep Work Lab (90 min)',
    description: 'Designed for coders & writers. 90-minute unbroken flow blocks with ambient synth & white noise background.',
    tags: ['Deep Work', 'Coding', 'Cyberpunk', '90min'],
    thumbnail: 'https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&w=400&q=80',
    isPublic: true,
    price: 0,
    downloadCount: 980,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'template-cozy-winter-cabin',
    creatorId: 'official-ai-riser',
    creatorName: 'Lofi Community',
    name: 'Cozy Winter Cabin & Crackling Fire',
    description: 'Crackling hearth sound, soft piano chords, and 52/17 rhythm for balanced reading and studying.',
    tags: ['Cozy', 'Fireplace', 'Piano', '52/17'],
    thumbnail: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=400&q=80',
    isPublic: true,
    price: 0,
    downloadCount: 2310,
    createdAt: new Date().toISOString(),
  }
];

// In-memory collaborative rooms store
const roomsStore = new Map<string, any>();

// API Routes

// 1. AI Break Reflection Prompt
app.post('/api/gemini/reflection', async (req, res) => {
  try {
    const { tasks, focusMethod } = req.body;
    const taskSummary = tasks && tasks.length > 0
      ? tasks.map((t: any) => `- ${t.title} (${t.completed ? 'Done' : 'In Progress'})`).join('\n')
      : 'General deep focus session';

    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: `You are AI Riser, an encouraging focus & mindfulness guide. 
The user is taking a break during a focus session (${focusMethod || 'Pomodoro'}).
Current session tasks:
${taskSummary}

Generate a short, calming 2-sentence break reflection prompt (under 35 words). Encourage them to step away, rest their eyes, stretch, or reflect on one small win.`,
    });

    res.json({ reflectionPrompt: response.text || 'Take a deep breath, hydrate, and stretch your shoulders before the next focus block!' });
  } catch (error: any) {
    console.error('Gemini Reflection API error:', error);
    res.json({ reflectionPrompt: 'Great work so far! Step away from the screen, take 3 deep breaths, and let your eyes rest.' });
  }
});

// 2. AI Session Summarizer
app.post('/api/gemini/summary', async (req, res) => {
  try {
    const { tasks, focusDurationMinutes, notes } = req.body;
    const prompt = `Summarize this focus session in a clean, inspiring bulleted breakdown:
Focus Duration: ${focusDurationMinutes} minutes
Tasks Worked On:
${JSON.stringify(tasks, null, 2)}
Notes Recorded: ${notes || 'None'}

Provide:
1. Short Praise / Achievement Summary (1 sentence)
2. Bullet points of completed milestones
3. 2 Suggested tasks for the next focus session.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: prompt,
    });

    res.json({ summary: response.text });
  } catch (error: any) {
    console.error('Gemini Summary API error:', error);
    res.json({
      summary: `### Focus Session Complete!
- **Total Focus**: ${req.body.focusDurationMinutes || 25} minutes logged.
- **Tasks Completed**: ${req.body.tasks?.filter((t: any) => t.completed)?.length || 0} tasks finished.
- **Next Steps**: Continue current tasks or review notes in the next session.`
    });
  }
});

// 3. AI Research & Study Assistant Chat (with search grounding option)
app.post('/api/gemini/chat', async (req, res) => {
  try {
    const { message, context, useSearch } = req.body;
    const config: any = {
      systemInstruction: 'You are AI Riser Assistant, a supportive, concise study and productivity assistant. Help answer questions, explain concepts, or brainstorm ideas during study breaks or focus sessions. Keep answers clear, structured, and easy to digest.',
    };

    if (useSearch) {
      config.tools = [{ googleSearch: {} }];
    }

    const fullPrompt = context
      ? `Session Context (Tasks being worked on): ${JSON.stringify(context)}\nUser Question: ${message}`
      : message;

    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: fullPrompt,
      config,
    });

    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    res.json({ text: response.text, groundingChunks });
  } catch (error: any) {
    console.error('Gemini Chat API error:', error);
    res.status(500).json({ error: 'Failed to generate response. Please try again.' });
  }
});

// 4. AI Workspace Recommendation
app.post('/api/gemini/recommendation', async (req, res) => {
  try {
    const { mood, taskType } = req.body;
    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: `Recommend the ideal lofi atmosphere and ambient sound combo for a user feeling "${mood || 'focused'}" working on "${taskType || 'studying'}". Return a 2-sentence recommendation.`,
    });

    res.json({ recommendation: response.text });
  } catch (error: any) {
    res.json({ recommendation: 'Try a Tokyo Neon Rain background paired with gentle rain sound and lofi study beats for maximum flow state.' });
  }
});

// 5. Template Management Endpoints
app.get('/api/templates', (req, res) => {
  res.json(templatesStore);
});

app.post('/api/templates', (req, res) => {
  const newTemplate = {
    id: `template-${Date.now()}`,
    createdAt: new Date().toISOString(),
    downloadCount: 0,
    isPublic: true,
    ...req.body,
  };
  templatesStore.unshift(newTemplate);
  res.json(newTemplate);
});

// 6. Realtime Rooms API HTTP Endpoints (Fallback / REST)
app.post('/api/rooms', (req, res) => {
  const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
  const room = {
    id: `room-${Date.now()}`,
    code: roomCode,
    hostId: req.body.hostId || 'host-1',
    participants: [{
      id: req.body.hostId || 'host-1',
      displayName: req.body.hostName || 'Workspace Host',
      status: 'active',
      isHost: true,
    }],
    sharedTasks: [],
    sharedNotes: [],
    timerState: {
      status: 'FOCUS',
      remainingSeconds: 1500,
      currentCycle: 1,
      isRunning: false,
    },
    votesToSkipBreak: [],
    createdAt: new Date().toISOString(),
  };

  roomsStore.set(roomCode, room);
  res.json(room);
});

app.get('/api/rooms/:code', (req, res) => {
  const code = req.params.code.toUpperCase();
  const room = roomsStore.get(code);
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }
  res.json(room);
});

// Setup WebSocket for Realtime Synchronization
const wss = new WebSocketServer({ noServer: true });

server.on('upgrade', (request, socket, head) => {
  if (request.url?.startsWith('/api/ws')) {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  }
});

const roomSockets = new Map<string, Set<WebSocket>>();

wss.on('connection', (ws: WebSocket) => {
  let currentRoomCode: string | null = null;

  ws.on('message', (message: string) => {
    try {
      const data = JSON.parse(message.toString());

      if (data.type === 'JOIN_ROOM') {
        currentRoomCode = data.roomCode.toUpperCase();
        if (!roomSockets.has(currentRoomCode)) {
          roomSockets.set(currentRoomCode, new Set());
        }
        roomSockets.get(currentRoomCode)?.add(ws);

        let room = roomsStore.get(currentRoomCode);
        if (room && data.participant) {
          const exists = room.participants.some((p: any) => p.id === data.participant.id);
          if (!exists) {
            room.participants.push(data.participant);
          }
        }

        // Broadcast room update
        broadcastRoomUpdate(currentRoomCode);
      } else if (data.type === 'UPDATE_TIMER' && currentRoomCode) {
        let room = roomsStore.get(currentRoomCode);
        if (room) {
          room.timerState = { ...room.timerState, ...data.timerState };
          broadcastRoomUpdate(currentRoomCode);
        }
      } else if (data.type === 'EMOJI_REACTION' && currentRoomCode) {
        broadcastToRoom(currentRoomCode, {
          type: 'EMOJI_REACTION',
          emoji: data.emoji,
          senderName: data.senderName,
        });
      } else if (data.type === 'UPDATE_TASKS' && currentRoomCode) {
        let room = roomsStore.get(currentRoomCode);
        if (room) {
          room.sharedTasks = data.tasks;
          broadcastRoomUpdate(currentRoomCode);
        }
      } else if (data.type === 'VOTE_SKIP' && currentRoomCode) {
        let room = roomsStore.get(currentRoomCode);
        if (room) {
          if (!room.votesToSkipBreak.includes(data.participantId)) {
            room.votesToSkipBreak.push(data.participantId);
          }
          if (room.votesToSkipBreak.length >= Math.ceil(room.participants.length / 2)) {
            room.timerState.status = 'FOCUS';
            room.votesToSkipBreak = [];
          }
          broadcastRoomUpdate(currentRoomCode);
        }
      }
    } catch (err) {
      console.error('WS Error:', err);
    }
  });

  ws.on('close', () => {
    if (currentRoomCode && roomSockets.has(currentRoomCode)) {
      roomSockets.get(currentRoomCode)?.delete(ws);
    }
  });
});

function broadcastRoomUpdate(code: string) {
  const room = roomsStore.get(code);
  if (!room) return;
  broadcastToRoom(code, { type: 'ROOM_UPDATE', room });
}

function broadcastToRoom(code: string, payload: any) {
  const sockets = roomSockets.get(code);
  if (!sockets) return;
  const msg = JSON.stringify(payload);
  sockets.forEach((s) => {
    if (s.readyState === WebSocket.OPEN) {
      s.send(msg);
    }
  });
}

// Vite middleware in development or static serving in production
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
