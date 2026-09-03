# 🌌 Focus-Workspace-AI (Airiser / Focus Atmosphere)
> Ultra-immersive, customizable ambient focus environment combining scientifically backed focus methods, multi-track nature & Lo-Fi soundscapes, Gemini AI study assistance, real-time multiplayer collaborative rooms, and atomic cloud synchronization.

---

## ⚡ Quick Start

### 1. Prerequisites
- **Node.js:** v18.0.0 or higher (v20+ recommended).
- **Gemini API Key:** Obtain from [Google AI Studio](https://aistudio.google.com/).

### 2. Installation & Run
```bash
# 1. Install dependencies
npm install

# 2. Set environment variables
cp .env.example .env.local
# Add your GEMINI_API_KEY to .env.local

# 3. Start local development server (Express + Vite + WebSockets on port 3001)
npm run dev
```
Open [http://localhost:3001](http://localhost:3001) in your browser.

---

## 📚 Master Blueprint & Full Technical Specification

For complete system architecture, data models, WebSocket protocols, sequence diagrams, and UI/UX design specifications, read the master document:

👉 **[PROJECT_DOCUMENTATION.md](PROJECT_DOCUMENTATION.md)**

---

## ✨ Key Features

| Category | Highlights |
| :--- | :--- |
| 🕒 **Adaptive Timer Engine** | Pomodoro (25/5/15), 52/17 Rule, Ultradian 90/20, Flowmodoro (stopwatch), custom intervals, audio chime synthesis (`Zenith`, `Bell`, `Digital`, `Gong`), and draggable 2D coordinates. |
| 🎧 **Multi-Track Audio Mixer** | Self-hosted Lo-Fi beats, 6 layered ambient channels (*Rain, Forest Birds, Waves, Cafe, White Noise, Campfire*), custom audio upload, and **Gemini AI Soundscape Synthesis**. |
| 🖼️ **Dynamic Visual Atmosphere** | 4K live loops, pixel art, anime study rooms, cyberpunk nightscapes, Google Photos / Unsplash media resolvers, and Vignette / Film Grain / Blur visual filters. |
| 📝 **Freeform Sticky Notes** | 60fps/120fps spatial drag-and-drop canvas, note colors, pinning, preset sizing, clipboard image paste (`⌘V`), and canvas-based client-side compression. |
| 📋 **Task Planner & Notepad** | Priority flags (`high`, `medium`, `low`), estimated pomodoro counts, rich markdown notepad with word count and one-click PDF / Markdown export. |
| 🤖 **Gemini AI Study Assistant** | Multimodal study coach (`@google/genai` with model fallbacks), context-aware task breakdown, flashcards, session summarization, and mindfulness reflections. |
| 👥 **Real-Time Focus Rooms** | 6-character room codes, bidirectional WebSocket sync (`/api/ws`), member presence, synced timers, floating emoji reactions, shared task checklists, and live workspace theme synchronization. |
| 📦 **Template System & Market** | Context-aware template creation (Personal vs Room scopes), active template auto-sync, top-bar visualizer badge, and community marketplace. |
| 🔄 **Safe Reset & Version Rollback**| Pre-reset snapshot capture, custom image preservation, and one-click full version rollback. |
| 🛡️ **Atomic Cloud Persistence** | Single-batch atomic Firestore commits (`writeBatch(db)`), 1400ms throttled debouncing to eliminate rate-limit errors, and seamless offline-first caching. |

---

## 🛠️ Tech Stack

- **Frontend:** React 19, TypeScript, Tailwind CSS v4, Motion (Framer Motion), Lucide Icons, Recharts, jsPDF, html2canvas.
- **Backend:** Node.js, Express, `ws` (WebSocket Server), `tsx`, `esbuild`.
- **AI Engine:** Google Gemini SDK (`@google/genai`) with resilient model fallback.
- **Database & Auth:** Firebase Authentication (Google Sign-In + Guest mode), Cloud Firestore with granular Security Rules.

---

## 📜 Available Scripts

| Command | Action |
| :--- | :--- |
| `npm run dev` | Runs the full-stack server (Express backend + Vite client middleware + WebSockets). |
| `npm run build` | Builds client production bundle with Vite and server with esbuild. |
| `npm start` | Runs the compiled production server (`dist/server.cjs`). |
| `npm run lint` | Runs TypeScript static type analysis (`tsc --noEmit`). |

---

## 📄 License & Attribution

Designed and engineered for focused creators. Powered by Google Gemini & Firebase.