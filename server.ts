import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const app = express();
const PORT = 3001;
const server = createServer(app);

// Increase JSON and urlencoded limits for base64 media uploads
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));

// Ensure public/uploads directory exists
const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Serve uploaded media statically
app.use('/uploads', express.static(uploadsDir));

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

// Helper function for resilient Gemini calls with model fallback
async function generateGeminiContentWithFallback(params: {
  contents: any;
  config?: any;
  primaryModel?: string;
  fallbackModel?: string;
}) {
  const primary = params.primaryModel || 'gemini-3.7-flash';
  const fallback = params.fallbackModel || 'gemini-3.1-flash-lite';

  try {
    return await ai.models.generateContent({
      model: primary,
      contents: params.contents,
      config: params.config,
    });
  } catch (err: any) {
    // If rate limit (429) or temporary error, attempt fallback model
    const isRateLimit = err?.status === 429 || err?.message?.includes('429') || err?.message?.includes('RESOURCE_EXHAUSTED') || err?.message?.includes('quota');
    console.warn(`Primary Gemini model (${primary}) failed (RateLimit: ${isRateLimit}). Trying fallback (${fallback})...`);
    
    return await ai.models.generateContent({
      model: fallback,
      contents: params.contents,
      config: params.config,
    });
  }
}

// 1. AI Break Reflection Prompt
app.post('/api/gemini/reflection', async (req, res) => {
  try {
    const { tasks, focusMethod } = req.body;
    const taskSummary = tasks && tasks.length > 0
      ? tasks.map((t: any) => `- ${t.title} (${t.completed ? 'Done' : 'In Progress'})`).join('\n')
      : 'General deep focus session';

    const response = await generateGeminiContentWithFallback({
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

    const response = await generateGeminiContentWithFallback({
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

    const response = await generateGeminiContentWithFallback({
      contents: fullPrompt,
      config,
    });

    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    res.json({ text: response.text, groundingChunks });
  } catch (error: any) {
    console.error('Gemini Chat API error:', error);
    const isRateLimit = error?.status === 429 || error?.message?.includes('429') || error?.message?.includes('RESOURCE_EXHAUSTED') || error?.message?.includes('quota');
    if (isRateLimit) {
      res.status(429).json({
        error: 'Quota rate limit reached. Please wait a moment before sending another request, or check your API key in Settings > Secrets.',
        isRateLimit: true,
      });
    } else {
      res.status(500).json({ error: 'Failed to generate response. Please try again.' });
    }
  }
});

// 4. AI Workspace Recommendation
app.post('/api/gemini/recommendation', async (req, res) => {
  try {
    const { mood, taskType } = req.body;
    const response = await generateGeminiContentWithFallback({
      contents: `Recommend the ideal lofi atmosphere and ambient sound combo for a user feeling "${mood || 'focused'}" working on "${taskType || 'studying'}". Return a 2-sentence recommendation.`,
    });

    res.json({ recommendation: response.text });
  } catch (error: any) {
    res.json({ recommendation: 'Try a Tokyo Neon Rain background paired with gentle rain sound and lofi study beats for maximum flow state.' });
  }
});

// 4b. AI Ambient Soundscape Generator (Tasks & Notes grounded)
app.post('/api/gemini/soundscape', async (req, res) => {
  try {
    const { tasks, notes, mood, focusMethod } = req.body;

    const taskSummary = Array.isArray(tasks) && tasks.length > 0
      ? tasks.map((t: any) => `- [${t.completed ? 'x' : ' '}] ${t.title} (Priority: ${t.priority || 'medium'})`).join('\n')
      : 'No explicit tasks entered.';

    const notesSummary = notes && typeof notes === 'string' && notes.trim()
      ? notes.slice(0, 800)
      : 'No notes entered.';

    const prompt = `You are AI Riser's Master Acoustic Sound Architect and Neuro-Acoustic Productivity Specialist.
Analyze the user's current cognitive workload, focus method, tasks, notes, and mood intention, and generate an optimal multi-layered ambient soundscape & binaural frequency prescription.

User Workload Details:
- Active Focus Method: ${focusMethod || 'Pomodoro'}
- User Mood / Style Intention: ${mood || 'Auto-detect from tasks'}
- Current Active Tasks:
${taskSummary}
- Recent Focus Notes & Thoughts:
${notesSummary}

Ambient Sound Catalog available:
- rain (Gentle soothing rainfall)
- thunder (Distant rolling thunder)
- fireplace (Warm crackling hearth & brown noise)
- cafe (Tokyo coffee shop murmur & gentle cup clinks)
- forest (Pine forest breeze & distant birds)
- waves (Slow rhythmic ocean surf swells)
- crickets (Serene midnight summer crickets)
- whitenoise (Analog tape hiss & pink noise)

Binaural Brainwave Frequencies:
- Gamma (38 - 45 Hz): High-intensity analytical coding, complex problem solving, math
- Beta (14 - 24 Hz): Active alertness, task execution, fast typing, sprint hustle
- Alpha (8 - 12 Hz): Creative writing, calm flow state, research, studying
- Theta (4 - 7 Hz): Deep mindfulness, reflection, stress relief, reading

Return a strictly valid JSON object with the following schema:
{
  "title": "A short, atmospheric title for this soundscape (e.g. 'Midnight Rainstorm Laboratory')",
  "moodTag": "Short 2-3 word tag (e.g. 'Deep Analytical Flow')",
  "reasoning": "2 concise sentences explaining why this acoustic combination balances the user's current tasks and notes without causing fatigue",
  "binauralBeat": {
    "enabled": true or false,
    "frequencyHz": integer number between 4 and 45,
    "waveType": "gamma" | "beta" | "alpha" | "theta",
    "label": "e.g. 40Hz Gamma Focus",
    "volume": float between 0.15 and 0.50
  },
  "ambientTracks": [
    {
      "type": "rain" | "thunder" | "fireplace" | "cafe" | "forest" | "waves" | "crickets" | "whitenoise",
      "name": "Display name",
      "volume": float between 0.1 and 0.8,
      "active": true or false (activate 2 to 4 complementary sounds)
    }
  ],
  "suggestedMusicGenre": "Lofi Chill" | "Cyberpunk Synthwave" | "Minimalist Piano" | "Nature Ambient" | "Binaural Drone",
  "suggestedMusicTrackIndex": integer 0 to 3,
  "musicVolume": float between 0.3 and 0.8,
  "masterAmbientVolume": float between 0.4 and 0.8
}`;

    const response = await generateGeminiContentWithFallback({
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    let soundscape;
    try {
      soundscape = JSON.parse(response.text || '{}');
    } catch {
      soundscape = null;
    }

    if (!soundscape || !soundscape.title) {
      throw new Error('Invalid soundscape JSON output');
    }

    res.json({ soundscape });
  } catch (error: any) {
    console.warn('Gemini soundscape generation error, returning fallback:', error);
    // Dynamic contextual fallback soundscape
    res.json({
      soundscape: {
        title: 'Deep Obsidian Flow',
        moodTag: 'Cognitive Shield',
        reasoning: 'Calibrated acoustic layers combine gentle rain with warm brown crackle and 40Hz gamma frequency to mask outside noise and center your focus.',
        binauralBeat: {
          enabled: true,
          frequencyHz: 40,
          waveType: 'gamma',
          label: '40Hz Gamma Focus',
          volume: 0.3,
        },
        ambientTracks: [
          { type: 'rain', name: 'Gentle Rain', volume: 0.65, active: true },
          { type: 'thunder', name: 'Thunderstorm', volume: 0.35, active: true },
          { type: 'fireplace', name: 'Cozy Fireplace', volume: 0.4, active: false },
          { type: 'cafe', name: 'Tokyo Cafe', volume: 0.3, active: false },
          { type: 'forest', name: 'Forest Birds & Wind', volume: 0.4, active: false },
          { type: 'waves', name: 'Ocean Surf Waves', volume: 0.4, active: false },
          { type: 'crickets', name: 'Summer Night Crickets', volume: 0.3, active: false },
          { type: 'whitenoise', name: 'Analog White Noise', volume: 0.25, active: true },
        ],
        suggestedMusicGenre: 'Lofi Chill',
        suggestedMusicTrackIndex: 0,
        musicVolume: 0.6,
        masterAmbientVolume: 0.6,
      },
    });
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
  const hostId = req.body.hostId || `user-${Date.now()}`;
  const hostName = req.body.hostName || 'Workspace Host';
  const hostPhoto = req.body.hostPhoto || undefined;
  const roomName = req.body.name || `${hostName}'s Study Room`;

  const room: any = {
    id: `room-${Date.now()}`,
    code: roomCode,
    name: roomName,
    hostId: hostId,
    hostName: hostName,
    participants: [{
      id: hostId,
      displayName: hostName,
      photoURL: hostPhoto,
      currentTask: req.body.currentGoal || 'Deep Focus',
      status: 'active',
      isHost: true,
      joinedAt: new Date().toISOString(),
    }],
    sharedTasks: req.body.initialTasks || [
      { id: `st-${Date.now()}-1`, title: '🚀 Group Goal: Finish pomodoro cycle', completed: false, priority: 'high' },
      { id: `st-${Date.now()}-2`, title: '📝 Document session key takeaways', completed: false, priority: 'medium' },
    ],
    sharedScratchpad: req.body.initialScratchpad || 'Welcome to our collaborative focus room!\nUse this shared scratchpad for group notes, links, and meeting minutes.',
    chatMessages: [
      {
        id: `msg-${Date.now()}`,
        senderId: 'system',
        senderName: 'Focus Room Bot',
        text: `Room "${roomName}" created by ${hostName}. Share code ${roomCode} with your peers!`,
        timestamp: new Date().toISOString(),
        isSystem: true,
      },
    ],
    timerState: {
      status: req.body.timerStatus || 'FOCUS',
      remainingSeconds: req.body.remainingSeconds || 1500,
      currentCycle: 1,
      isRunning: false,
      lastUpdated: Date.now(),
    },
    votesToSkipBreak: [],
    syncAtmosphere: false,
    config: req.body.config || undefined,
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

// 7. Custom Wallpaper & Media Resolvers

/**
 * Resolve Google Photos, Google Drive, Dropbox, or web media links into direct streamable URLs
 */
app.post('/api/media/resolve-url', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'URL is required' });
    }

    const trimmedUrl = url.trim();

    // 1. Google Photos Link (photos.app.goo.gl or photos.google.com)
    if (trimmedUrl.includes('photos.app.goo.gl') || trimmedUrl.includes('photos.google.com')) {
      try {
        const response = await fetch(trimmedUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          },
          redirect: 'follow',
        });

        const html = await response.text();

        // Extract og:video or og:image
        const ogVideoMatch = html.match(/property="og:video" content="([^"]+)"/) || html.match(/name="twitter:player:stream" content="([^"]+)"/);
        const ogImageMatch = html.match(/property="og:image" content="([^"]+)"/) || html.match(/name="twitter:image" content="([^"]+)"/);

        let directUrl = '';
        let isVideo = false;

        if (ogVideoMatch && ogVideoMatch[1]) {
          directUrl = ogVideoMatch[1];
          isVideo = true;
        } else if (ogImageMatch && ogImageMatch[1]) {
          directUrl = ogImageMatch[1];
          // Upgrade Google Photos thumbnail size parameter to high-res 4K/2K wallpaper
          if (directUrl.includes('googleusercontent.com')) {
            directUrl = directUrl.replace(/=w\d+-h\d+[^"]*/, '=w2560-h1440-no');
          }
        } else {
          // Fallback regex to search for lh3.googleusercontent.com
          const lh3Match = html.match(/(https:\/\/lh3\.googleusercontent\.com\/[a-zA-Z0-9_\-]+)/);
          if (lh3Match && lh3Match[1]) {
            directUrl = `${lh3Match[1]}=w2560-h1440-no`;
          }
        }

        if (directUrl) {
          return res.json({
            success: true,
            directUrl,
            thumbnailUrl: directUrl,
            type: isVideo ? 'video' : 'image',
            title: 'Google Photos Wallpaper',
            source: 'google_photos',
          });
        }
      } catch (gPhotosErr) {
        console.warn('Google Photos fetch resolution error:', gPhotosErr);
      }
    }

    // 2. Google Drive Links (drive.google.com/file/d/ID/view or open?id=ID)
    const driveMatch = trimmedUrl.match(/drive\.google\.com\/(?:file\/d\/|open\?id=)([a-zA-Z0-9_-]+)/);
    if (driveMatch && driveMatch[1]) {
      const fileId = driveMatch[1];
      const directUrl = `https://lh3.googleusercontent.com/u/0/d/${fileId}=w2560-h1440-no`;
      return res.json({
        success: true,
        directUrl,
        thumbnailUrl: directUrl,
        type: 'image',
        title: 'Google Drive Wallpaper',
        source: 'google_drive',
      });
    }

    // 3. Dropbox Links (dropbox.com/... ?dl=0 -> raw=1)
    if (trimmedUrl.includes('dropbox.com')) {
      const directUrl = trimmedUrl.replace('?dl=0', '?raw=1').replace('&dl=0', '&raw=1');
      const isVideo = directUrl.includes('.mp4') || directUrl.includes('.webm') || directUrl.includes('.mov');
      return res.json({
        success: true,
        directUrl,
        thumbnailUrl: isVideo ? undefined : directUrl,
        type: isVideo ? 'video' : 'image',
        title: 'Dropbox Wallpaper',
        source: 'dropbox',
      });
    }

    // 4. Direct video URL extensions
    const isDirectVideo = /\.(mp4|webm|mov|m4v|ogv)(\?.*)?$/i.test(trimmedUrl);
    if (isDirectVideo) {
      return res.json({
        success: true,
        directUrl: trimmedUrl,
        type: 'video',
        title: 'Custom Video Wallpaper',
        source: 'custom_url',
      });
    }

    // 5. Direct image URL or generic web URL
    return res.json({
      success: true,
      directUrl: trimmedUrl,
      thumbnailUrl: trimmedUrl,
      type: 'image',
      title: 'Custom Image Wallpaper',
      source: 'custom_url',
    });
  } catch (error: any) {
    console.error('Media resolve error:', error);
    res.status(500).json({ error: error.message || 'Failed to resolve media URL' });
  }
});

/**
 * Upload Image or Video directly and save to storage
 */
app.post('/api/media/upload', async (req, res) => {
  try {
    const { fileData, fileName, fileType } = req.body;

    if (!fileData) {
      return res.status(400).json({ error: 'fileData (base64) is required' });
    }

    // Extract mime type and base64 payload
    let mimeType = fileType || 'image/jpeg';
    let base64Content = fileData;

    const dataUrlMatch = fileData.match(/^data:([^;]+);base64,(.+)$/);
    if (dataUrlMatch) {
      mimeType = dataUrlMatch[1];
      base64Content = dataUrlMatch[2];
    }

    const isVideo = mimeType.startsWith('video/') || /\.(mp4|webm|mov|m4v)$/i.test(fileName || '');
    const isImage = mimeType.startsWith('image/') || /\.(png|jpg|jpeg|webp|gif|svg|avif)$/i.test(fileName || '');

    if (!isVideo && !isImage) {
      return res.status(400).json({ error: 'Only image and video files are supported' });
    }

    const buffer = Buffer.from(base64Content, 'base64');
    const timestamp = Date.now();
    const cleanName = (fileName || 'wallpaper').replace(/[^a-zA-Z0-9.-]/g, '_');
    const finalFileName = `${timestamp}-${cleanName}`;
    const filePath = path.join(uploadsDir, finalFileName);

    await fs.promises.writeFile(filePath, buffer);

    const publicUrl = `/uploads/${finalFileName}`;

    res.json({
      success: true,
      url: publicUrl,
      thumbnailUrl: isVideo ? undefined : publicUrl,
      title: fileName || (isVideo ? 'Uploaded Video Wallpaper' : 'Uploaded Image Wallpaper'),
      type: isVideo ? 'video' : 'image',
      size: buffer.length,
      mimeType,
      source: 'upload',
      createdAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Media upload error:', error);
    res.status(500).json({ error: error.message || 'Failed to upload media file' });
  }
});

/**
 * Proxy media streams or images to bypass CORS or referer restrictions
 */
app.get('/api/media/proxy', async (req, res) => {
  try {
    const targetUrl = req.query.url as string;
    if (!targetUrl) {
      return res.status(400).send('Target URL required');
    }

    const fetchRes = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': '*/*',
      },
    });

    if (!fetchRes.ok) {
      return res.status(fetchRes.status).send('Failed to fetch upstream media');
    }

    const contentType = fetchRes.headers.get('content-type') || 'application/octet-stream';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.setHeader('Access-Control-Allow-Origin', '*');

    const arrayBuffer = await fetchRes.arrayBuffer();
    res.send(Buffer.from(arrayBuffer));
  } catch (error: any) {
    console.error('Proxy media error:', error);
    res.status(500).send('Proxy error');
  }
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
const socketMeta = new WeakMap<WebSocket, { roomCode: string; participantId: string }>();
const gracePeriodTimers = new Map<string, ReturnType<typeof setTimeout>>();
const socketAlive = new WeakMap<WebSocket, boolean>();

// 25s ping/pong heartbeat to catch half-open connections
setInterval(() => {
  wss.clients.forEach((ws) => {
    if (socketAlive.get(ws) === false) {
      return ws.terminate();
    }
    socketAlive.set(ws, false);
    ws.ping();
  });
}, 25000);

// 60s interval to check for idle participants and sync break state
setInterval(() => {
  const now = Date.now();
  roomsStore.forEach((room, roomCode) => {
    let changed = false;
    const isBreak = room.timerState?.status === 'BREAK' || room.timerState?.status === 'LONG_BREAK';

    room.participants.forEach((p: any) => {
      const activeTime = p.lastActiveAt ? new Date(p.lastActiveAt).getTime() : now;
      const isIdle = now - activeTime > 3 * 60 * 1000; // 3 minutes

      let targetStatus = p.status;
      if (isBreak) {
        targetStatus = 'break';
      } else if (isIdle) {
        targetStatus = 'idle';
      } else {
        targetStatus = 'active';
      }

      if (p.status !== targetStatus) {
        p.status = targetStatus;
        changed = true;
      }
    });

    if (changed) {
      broadcastRoomUpdate(roomCode);
    }
  });
}, 60000);

function removeParticipant(roomCode: string, participantId: string) {
  const room = roomsStore.get(roomCode);
  if (!room) return;
  const leavingUser = room.participants.find((p: any) => p.id === participantId);
  room.participants = room.participants.filter((p: any) => p.id !== participantId);
  
  if (leavingUser) {
    if (!room.chatMessages) room.chatMessages = [];
    room.chatMessages.push({
      id: `msg-leave-${Date.now()}`,
      senderId: 'system',
      senderName: 'Focus Room Bot',
      text: `${leavingUser.displayName} left the room.`,
      timestamp: new Date().toISOString(),
      isSystem: true,
    });
  }
  
  if (room.participants.length === 0) {
    roomsStore.delete(roomCode);
  } else {
    broadcastRoomUpdate(roomCode);
  }
}

wss.on('connection', (ws: WebSocket) => {
  socketAlive.set(ws, true);

  ws.on('pong', () => {
    socketAlive.set(ws, true);
  });

  ws.on('message', (message: string) => {
    try {
      const data = JSON.parse(message.toString());
      const roomCode = data.roomCode?.toUpperCase() || socketMeta.get(ws)?.roomCode;
      if (!roomCode) return;

      // Update lastActiveAt on any message from a participant
      const pId = data.participant?.id || data.participantId || socketMeta.get(ws)?.participantId;
      if (pId) {
        const room = roomsStore.get(roomCode);
        if (room) {
          const p = room.participants.find((p: any) => p.id === pId);
          if (p) {
            p.lastActiveAt = new Date().toISOString();
            if (p.status === 'idle') {
              p.status = 'active';
              broadcastRoomUpdate(roomCode);
            }
          }
        }
      }

      if (data.type === 'JOIN_ROOM') {
        const participantId = data.participant?.id;
        if (!participantId) return;

        socketMeta.set(ws, { roomCode, participantId });

        if (!roomSockets.has(roomCode)) {
          roomSockets.set(roomCode, new Set());
        }
        roomSockets.get(roomCode)?.add(ws);

        // Cancel grace period if reconnecting
        const timerKey = `${roomCode}:${participantId}`;
        if (gracePeriodTimers.has(timerKey)) {
          clearTimeout(gracePeriodTimers.get(timerKey));
          gracePeriodTimers.delete(timerKey);
        }

        let room = roomsStore.get(roomCode);
        if (room && data.participant) {
          const existingIndex = room.participants.findIndex((p: any) => p.id === participantId);
          if (existingIndex >= 0) {
            room.participants[existingIndex] = {
              ...room.participants[existingIndex],
              ...data.participant,
              status: 'active',
              lastActiveAt: new Date().toISOString(),
            };
          } else {
            room.participants.push({
              ...data.participant,
              status: 'active',
              joinedAt: new Date().toISOString(),
              lastActiveAt: new Date().toISOString(),
            });

            if (!room.chatMessages) room.chatMessages = [];
            room.chatMessages.push({
              id: `msg-join-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
              senderId: 'system',
              senderName: 'Focus Room Bot',
              text: `${data.participant.displayName || 'A participant'} joined the focus room.`,
              timestamp: new Date().toISOString(),
              isSystem: true,
            });
          }
        }
        broadcastRoomUpdate(roomCode);

      } else if (data.type === 'LEAVE_ROOM') {
        const meta = socketMeta.get(ws);
        if (meta) {
          removeParticipant(meta.roomCode, meta.participantId);
          socketMeta.delete(ws);
        }
      } else if (data.type === 'TYPING_START' || data.type === 'TYPING_STOP') {
        broadcastToRoom(roomCode, data, ws);
      } else if (data.type === 'UPDATE_TIMER') {
        let room = roomsStore.get(roomCode);
        if (room) {
          const oldStatus = room.timerState?.status;
          const newStatus = data.timerState?.status;
          
          room.timerState = {
            ...room.timerState,
            ...data.timerState,
            lastUpdated: Date.now(),
          };

          // Break sync
          if (oldStatus !== newStatus && (newStatus === 'BREAK' || newStatus === 'LONG_BREAK' || newStatus === 'FOCUS')) {
            const isBreak = newStatus === 'BREAK' || newStatus === 'LONG_BREAK';
            room.participants.forEach((p: any) => {
               p.status = isBreak ? 'break' : 'active';
               if (!isBreak) p.lastActiveAt = new Date().toISOString();
            });
          }

          broadcastRoomUpdate(roomCode);
        }
      } else if (data.type === 'EMOJI_REACTION') {
        broadcastToRoom(roomCode, {
          type: 'EMOJI_REACTION',
          emoji: data.emoji,
          senderName: data.senderName,
          senderId: data.senderId,
        });
      } else if (data.type === 'SEND_CHAT') {
        let room = roomsStore.get(roomCode);
        if (room && data.message) {
          if (!room.chatMessages) room.chatMessages = [];
          room.chatMessages.push({
            id: data.message.id || `msg-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            senderId: data.message.senderId || 'anon',
            senderName: data.message.senderName || 'Member',
            senderPhoto: data.message.senderPhoto || undefined,
            text: data.message.text || '',
            timestamp: data.message.timestamp || new Date().toISOString(),
            isSystem: false,
          });
          if (room.chatMessages.length > 100) room.chatMessages = room.chatMessages.slice(-100);
          broadcastRoomUpdate(roomCode);
        }
      } else if (data.type === 'UPDATE_TASKS') {
        let room = roomsStore.get(roomCode);
        if (room) {
          room.sharedTasks = data.tasks;
          broadcastRoomUpdate(roomCode);
        }
      } else if (data.type === 'TOGGLE_TASK') {
        let room = roomsStore.get(roomCode);
        if (room && data.taskId) {
          const task = (room.sharedTasks || []).find((t: any) => t.id === data.taskId);
          if (task) {
            task.completed = !task.completed;
            if (data.actorName) {
              if (!room.chatMessages) room.chatMessages = [];
              room.chatMessages.push({
                id: `msg-task-${Date.now()}`,
                senderId: 'system',
                senderName: 'Task Sync',
                text: `${data.actorName} marked "${task.title}" as ${task.completed ? 'completed ✓' : 'in progress'}.`,
                timestamp: new Date().toISOString(),
                isSystem: true,
              });
            }
          }
          broadcastRoomUpdate(roomCode);
        }
      } else if (data.type === 'ADD_TASK') {
        let room = roomsStore.get(roomCode);
        if (room && data.task) {
          if (!room.sharedTasks) room.sharedTasks = [];
          room.sharedTasks.push(data.task);
          broadcastRoomUpdate(roomCode);
        }
      } else if (data.type === 'UPDATE_SCRATCHPAD') {
        let room = roomsStore.get(roomCode);
        if (room) {
          room.sharedScratchpad = data.scratchpad;
          broadcastRoomUpdate(roomCode);
        }
      } else if (data.type === 'UPDATE_PARTICIPANT') {
        let room = roomsStore.get(roomCode);
        if (room && data.participantId) {
          const participant = (room.participants || []).find((p: any) => p.id === data.participantId);
          if (participant) {
            if (data.currentTask !== undefined) participant.currentTask = data.currentTask;
            if (data.status !== undefined) participant.status = data.status;
            if (data.displayName !== undefined) participant.displayName = data.displayName;
          }
          broadcastRoomUpdate(roomCode);
        }
      } else if (data.type === 'SYNC_ATMOSPHERE') {
        let room = roomsStore.get(roomCode);
        if (room && data.config) {
          room.config = data.config;
          room.syncAtmosphere = true;
          if (!room.chatMessages) room.chatMessages = [];
          room.chatMessages.push({
            id: `msg-atmo-${Date.now()}`,
            senderId: 'system',
            senderName: 'Atmosphere Sync',
            text: `Host updated room atmosphere & background.`,
            timestamp: new Date().toISOString(),
            isSystem: true,
          });
          broadcastRoomUpdate(roomCode);
        }
      } else if (data.type === 'VOTE_SKIP') {
        let room = roomsStore.get(roomCode);
        if (room) {
          if (!room.votesToSkipBreak) room.votesToSkipBreak = [];
          if (!room.votesToSkipBreak.includes(data.participantId)) {
            room.votesToSkipBreak.push(data.participantId);
          }
          if (room.votesToSkipBreak.length >= Math.ceil(room.participants.length / 2)) {
            room.timerState.status = 'FOCUS';
            room.timerState.remainingSeconds = 1500;
            room.votesToSkipBreak = [];
            
            room.participants.forEach((p: any) => {
              p.status = 'active';
              p.lastActiveAt = new Date().toISOString();
            });

            if (!room.chatMessages) room.chatMessages = [];
            room.chatMessages.push({
              id: `msg-vote-${Date.now()}`,
              senderId: 'system',
              senderName: 'Focus Room Bot',
              text: `Majority voted to skip break. Returning to FOCUS mode!`,
              timestamp: new Date().toISOString(),
              isSystem: true,
            });
          }
          broadcastRoomUpdate(roomCode);
        }
      }
    } catch (err) {
      console.error('WS Error:', err);
    }
  });

  ws.on('close', () => {
    const meta = socketMeta.get(ws);
    if (meta) {
      const { roomCode, participantId } = meta;
      roomSockets.get(roomCode)?.delete(ws);
      
      const timerKey = `${roomCode}:${participantId}`;
      const timer = setTimeout(() => {
        removeParticipant(roomCode, participantId);
        gracePeriodTimers.delete(timerKey);
      }, 12000); // 12s grace period
      
      gracePeriodTimers.set(timerKey, timer);
    }
  });
});

function broadcastRoomUpdate(code: string) {
  const room = roomsStore.get(code);
  if (!room) return;
  broadcastToRoom(code, { type: 'ROOM_UPDATE', room });
}

function broadcastToRoom(code: string, payload: any, excludeWs?: WebSocket) {
  const sockets = roomSockets.get(code);
  if (!sockets) return;
  const msg = JSON.stringify(payload);
  sockets.forEach((s) => {
    if (s !== excludeWs && s.readyState === WebSocket.OPEN) {
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
