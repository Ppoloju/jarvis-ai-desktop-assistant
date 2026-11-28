# Orbit Desktop Assistant

[![CI](https://github.com/Ppoloju/orbit-ai-desktop-assistant/actions/workflows/ci.yml/badge.svg)](https://github.com/Ppoloju/orbit-ai-desktop-assistant/actions/workflows/ci.yml)

Orbit is a local-first desktop assistant for one person on one computer. A React dashboard talks to
a small Node/Express API on loopback that answers questions, launches apps and websites, browses your
real Desktop, Documents and Downloads, keeps scratch files and reminders, and takes screenshots.
Everything runs and is stored on your machine: there is no account, no telemetry and no cloud sync.
Free-form chat stays local too when Ollama is running; an optional AI key is the only thing that can
send a message off the computer.

Orbit was previously called "Jarvis AI Desktop Assistant". The name is meant to suggest something
that stays close to your machine and quietly handles the small things.

[Report a Bug](https://github.com/Ppoloju/orbit-ai-desktop-assistant/issues)

## What Orbit is

- **A local web app, not a cloud service.** Two processes on `127.0.0.1`: a Vite/React dashboard and
  an Express API. Nothing is deployed and nothing phones home.
- **A command engine first, a model second.** Requests like "open youtube", "find report.pdf" or
  "remind me to stretch in 20 minutes" are matched deterministically and performed against the real
  desktop. Only text that matches no command is sent to a model for a normal answer.
- **A single-user tool.** The API trusts whoever can reach it on loopback. It rejects requests
  addressed to other hostnames, but it is not a multiuser or network service.

### Design principles

- **Deterministic before generative.** Anything the app can do as a command is done as a command, so
  it is predictable and testable — and works with no model installed.
- **Local by default.** Code, data and chat history stay on disk. The remote AI path is optional and
  clearly separated.
- **Read-only means read-only.** Desktop, Documents and Downloads have no write endpoints at all.
  Orbit's own scratch space is a separate, sandboxed folder.
- **Honest about limits.** No pretend actions, no silent fallbacks, no claims that a model is present
  when it is not. The UI states its constraints, including voice in Electron windows.

## What it does

| Area | What it is for |
|------|----------------|
| **Overview** | A command center: voice or typed input, system status (platform, cores, memory, uptime, battery), Desktop/Documents/Downloads counts, open reminders, recent stored files and shortcuts. |
| **Assistant (chat)** | Plain-English or spoken commands for time and date, system status, reminders, stored files, your real folders, launching apps or websites, web search, and finding and opening real files by name. |
| **Automation** | Opens http/https websites, launches Chrome, VS Code or Calculator, launches any app installed on this computer, and captures a screenshot. A small gallery shows recent captures. |
| **Files** | A sandboxed scratch space inside `server/storage`: create folders and text files, rename them, delete them and preview contents. **This is not your real Desktop, Documents or Downloads.** |
| **My computer** | A read-only browser for your real Desktop, Documents and Downloads. It shows names, types, sizes and dates and opens subfolders, but cannot create, rename, move or delete anything there. |
| **Free-form chat** | Anything the command list does not cover goes to a model: Ollama on this computer when it is running (no key, nothing leaves the machine), otherwise a remote OpenAI-compatible provider when `AI_API_KEY` is set. Recent turns are kept as local context, and each model reply is tagged **AI**. |
| **Reminders** | A persisted to-do list with optional due times ("in 20 minutes", "at 5pm", "tomorrow at 9am") and daily or weekly repeats. While the API runs, a background check announces due reminders with a desktop notification, and a command can snooze one. |
| **History** | Conversation history saved in this browser, with a one-click clear action. |
| **Settings** | App information, AI status with a local-model picker, one-click database backups, an "Open data folder" button and conversation-history controls. |

### Voice commands

The chat box accepts spoken commands in Chrome or Edge, where the browser provides speech
recognition. Click the mic, speak, and the transcript is sent automatically; replies are read aloud
with the browser's speech synthesis (the speaker button mutes them). Other browsers fall back to
typing.

- "open youtube" or "open news.ycombinator.com"
- "open spotify" or "launch visual studio code" (an app installed on this computer)
- "find report.pdf", then "open the file" or "open the second one"
- "search the web for espresso"
- "remind me to call Sam", then "mark reminder 1 done"
- "remind me to stretch in 20 minutes" (a desktop notification appears when it comes due)
- "remind me to take pills every day at 9am" or "water the plants every week at 6pm"
- "snooze reminder 1 for 10 minutes" or "snooze the bins reminder for an hour"
- "what's in my downloads", "system info", "what can you do"

Voice input needs a microphone and, in practice, Chrome or Edge. If the dashboard is opened inside an
Electron-based window, the microphone is blocked there and there is no bundled speech service, so the
mic button explains that and typing is the only input. Open the same address in Chrome or Edge to
talk to it. The API only ever receives the recognised text; some browsers send microphone audio to
their own speech service for recognition, so check your browser's privacy settings if that matters.

### Why "Files" exists

Files is deliberately separate from My computer. It gives the assistant a safe place to create and
read its own documents without touching real folders. Every path is resolved and confined to
`server/storage`, so `../` traversal is rejected. A note created there can be read back in the UI or
with chat ("read notes.txt") without opening another application.

### Typical uses

- Keep a local scratchpad: create `notes.txt` in Files, then ask "read notes.txt".
- Look before you share: ask "what's in my downloads" to find an installer, PDF or screenshot.
- Start your working set: open Chrome, VS Code, Calculator and your usual website from one page.
- Capture what is on screen for a bug report or a quick record.
- Track small commitments across restarts, with a notification when one comes due.
- Check platform, CPU count, memory and uptime without leaving the app.
- Chat without an account or a key, using a local model.

## Technology

| Layer | Choice |
|-------|--------|
| **Frontend** | React 19, Vite 8, React Router 7, Tailwind CSS 4 |
| **Backend** | Node.js (>= 22.13), Express 5, ES modules |
| **Database** | SQLite via Node's built-in `node:sqlite` (`DatabaseSync`, WAL) at `server/storage/orbit.db` — tables `reminders`, `chat_turns`, `settings` |
| **AI** | Ollama at `127.0.0.1:11434` through its OpenAI-compatible `/v1/chat/completions` (default, no key); optional remote OpenAI-compatible provider via `fetch` when `AI_API_KEY` is set |
| **OS integration** | `open` for URLs, files and folders; PowerShell for Windows screenshots; `screenshot-desktop` elsewhere; Node child processes |
| **Voice** | Browser Web Speech API (speech recognition and synthesis) in Chrome or Edge |
| **Tooling** | ESLint 10, Node's built-in test runner (`node --test`), GitHub Actions CI |
| **Runtime shape** | Two local processes — Vite for the dashboard, plain Node for the API — on loopback only |

Request flow during development:

```text
Browser (React dashboard, :5173)
   └── /api, /screenshots proxied by Vite
         └── Express API (:5000, 127.0.0.1)
               ├── SQLite (reminders, chat turns, settings)
               ├── filesystem (sandbox, real folders, screenshots)
               ├── OS (open, PowerShell, child processes)
               └── model (Ollama on loopback, or a remote key if set)
```

There is no bundler on the server and no native SQLite dependency: the API runs `node server.js`
directly, and the dashboard is a static Vite build.

## Scope

**In scope — what Orbit is built to do**

- Deterministic desktop commands: time, system status, reminders, files, real folders, app and
  website launching, web search, screenshots.
- A safe sandbox for assistant-created files, separate from real user folders.
- Read-only access to Desktop, Documents and Downloads.
- Local persistence for reminders, chat memory and preferences, with one-click backups.
- Optional free-form chat that prefers a local model and can use a remote provider.
- A small, focused dashboard with no sign-in and no background service.

**Out of scope — deliberately not built**

- Accounts, multiuser access, cloud sync, mobile or hosted web deployment.
- An agent that clicks, types, reads the screen or acts on its own. Orbit only reacts to commands and
  never claims an action it did not perform.
- Background automation on a schedule, integrations with third-party services, or a plugin system.
- A packaged installer, tray icon, autostart or an always-running daemon.
- Analytics, telemetry, crash reporting and remote configuration.

Orbit is for a trusted, single-user machine on loopback. It is not a team tool, a scheduler, a
remote-access service or a general-purpose automation platform.

## Getting Started

### Prerequisites

- Node.js 22.13 or newer (the API uses Node's built-in SQLite)
- npm
- An interactive desktop session, for screenshots and app launching
- Optional: [Ollama](https://ollama.com) for free-form chat without an API key

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/Ppoloju/orbit-ai-desktop-assistant.git
   cd orbit-ai-desktop-assistant
   ```

2. Install both services:

   ```bash
   cd server && npm install
   cd ../client && npm install
   ```

3. Optional: copy the environment examples if you need a different port or origin.

   ```bash
   cp server/.env.example server/.env
   cp client/.env.example client/.env
   ```

4. Optional: set up local chat. Start Ollama, then pull a model:

   ```bash
   ollama pull llama3.2
   ```

   Orbit detects it automatically. Pick a different installed model in **Settings → AI model**.

5. Start the API and the dashboard in two terminals:

   ```bash
   cd server && npm run dev
   ```

   ```bash
   cd client && npm run dev
   ```

   The dashboard runs at http://localhost:5173 and the API at http://localhost:5000. Vite proxies
   `/api` and `/screenshots` to the backend, so the browser uses a single origin during development.
   Use `npm start` in `server` for a plain Node process without nodemon.

### Scripts

| Location | Command | Description |
|----------|---------|-------------|
| server | `npm start` | Run the API |
| server | `npm run dev` | Run the API with nodemon |
| server | `npm test` | Run the API tests |
| server | `npm run lint` | Lint the server |
| client | `npm run dev` | Run the dev server |
| client | `npm run build` | Build for production |
| client | `npm run lint` | Lint the client |
| client | `npm run preview` | Preview the production build |

## Configuration

| Variable | Default | Purpose |
|----------|---------|---------|
| `PORT` | `5000` | API port |
| `HOST` | `127.0.0.1` | Interface the API binds to |
| `CORS_ORIGINS` | localhost dev and preview origins | Browser origins allowed to call the API |
| `ORBIT_DATA_DIR` | `server` | Storage root; files go to `storage/`, screenshots to `screenshots/` |
| `ORBIT_HOME` | the current user's home | Home folder used by the read-only Desktop, Documents and Downloads browser (useful for tests) |
| `ORBIT_APPS_DIR` | the platform's shortcut folders | Shortcut folders scanned for installed apps, separated by the platform path separator (useful for tests) |
| `ORBIT_NO_NOTIFY` | unset | Set to `1` to suppress desktop notifications (used by the tests) |
| `AI_API_KEY` | unset | Key for an OpenAI-compatible chat provider; when set it is used instead of the local model (aliases: `ZAI_API_KEY`, `OPENAI_API_KEY`) |
| `AI_BASE_URL` | `https://api.z.ai/api/paas/v4` | Provider base URL, e.g. `https://api.openai.com/v1` |
| `AI_MODEL` | `glm-4-flash` | Remote model used for free-form answers |
| `OLLAMA_BASE_URL` | `http://127.0.0.1:11434` | Where Orbit looks for a local Ollama server |
| `OLLAMA_MODEL` | first installed model | Default local model, e.g. `llama3.2`; a model picked in Settings overrides it |
| `ORBIT_DISABLE_OLLAMA` | unset | Set to `1` to skip local-model detection (used by the tests) |
| `VITE_API_TARGET` | `http://localhost:5000` | Proxy target for the dev server |
| `VITE_API_BASE` | empty | API origin, only when the client is served from a different origin |

A model chosen in Settings is stored in the database and wins over `OLLAMA_MODEL`. If that model is
later uninstalled, the picker still lists the installed models and marks the saved one "(not
installed)"; choose **Automatic** or another model to resume chat.

## Where the data lives

Orbit keeps everything under `server/storage` (or `$ORBIT_DATA_DIR/storage`):

- `orbit.db` — a SQLite database created on first start. `reminders` holds text, due time and done
  state; `chat_turns` holds the last 24 messages that give the model its context; `settings` holds
  preferences such as the chosen local model.
- Your Files entries, and `screenshots/` next to `storage/` for captures.
- `backups/` next to `storage/` for snapshots taken from Settings.

To back up reminders and memory, open **Settings → Back up now**. It writes a consistent snapshot to
`backups/` without stopping the API, and the result is an ordinary SQLite file you can copy anywhere.
Stopping the API first is only needed if you want to copy `orbit.db` by hand. Older versions kept data
as `reminders.json` and `chat-memory.json`; the first start imports them into the database and keeps
the old files beside it as `*.json.migrated`.

To restore a backup, stop the API, delete `storage/orbit.db-wal` and `storage/orbit.db-shm`, then copy
the chosen file from `backups/` over `storage/orbit.db`.

## Project Structure

```text
orbit-ai-desktop-assistant/
  client/                     React dashboard
    src/
      components/             Chat, Navbar, Sidebar, SystemInfo, ui
      hooks/                  useSpeech
      layouts/
      pages/                  Home, Automation, Files, Computer, Reminders, History, Settings
      services/               API client
      utils/                  history, formatting
  server/                     Express API
    controllers/
    middlewares/              security headers, host check, errors, logging
    routes/                   automation, files, laptop, reminders, system
    services/                 ai, assistant, automation, db, files, laptop, reminders, settings, system
    tests/
    utils/
    app.js                    express app, middleware and routes
    server.js                 entrypoint: dotenv, listen and graceful shutdown
  .github/workflows/ci.yml
  LICENSE
```

## API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Health message |
| GET | `/api` | Index of available endpoints |
| GET | `/api/health` | Status, version, uptime, data-folder writability and AI state |
| POST | `/api/chat` | Ask the local assistant |
| DELETE | `/api/chat/memory` | Forget the remembered conversation |
| GET | `/api/system/info` | Platform, CPU, memory, uptime and battery |
| GET | `/api/system/ai` | AI provider status, installed local models and the saved choice |
| PUT | `/api/system/ai/model` | Choose a local model, or send `""` for Automatic |
| GET | `/api/system/backup` | List database backups |
| POST | `/api/system/backup` | Take a consistent database snapshot |
| POST | `/api/system/open-data-folder` | Open the data folder in the file manager |
| POST | `/api/automation/open-website` | Open an http/https URL |
| POST | `/api/automation/open-app` | Launch a built-in app or one installed on this computer |
| GET | `/api/automation/apps` | List the app shortcuts found on this computer |
| POST | `/api/automation/screenshot` | Capture the screen |
| GET | `/api/automation/screenshots` | List recent captures |
| GET | `/api/files` | List storage entries |
| GET | `/api/files/content?name=...` | Preview a stored text file (max 256 KB) |
| POST | `/api/files/create-folder` | Create a folder |
| POST | `/api/files/create-file` | Create a file |
| PATCH | `/api/files/rename-file` | Rename an entry |
| DELETE | `/api/files/delete-file` | Delete an entry |
| GET | `/api/laptop` | List the Desktop, Documents and Downloads folders |
| GET | `/api/laptop/search?q=...` | Search those folders by file name (read-only) |
| GET | `/api/laptop/:folder?path=...` | List one folder, read-only |
| GET | `/api/reminders` | List reminders |
| POST | `/api/reminders` | Create a reminder; a time phrase in the text sets its due time |
| PATCH | `/api/reminders/:id` | Mark a reminder done or open |
| POST | `/api/reminders/:id/snooze` | Postpone a reminder by `minutes` and make it open again |
| DELETE | `/api/reminders/:id` | Delete a reminder |

Screenshots are served from `/screenshots/<file>`. Errors use real status codes: `400` invalid
input, `403` disallowed origin, `404` missing resource, `409` conflict, `413` payload too large, `415`
not a text file, `503` desktop unavailable.

### Assistant examples

- `what time is it`, `system info`, `what can you do`
- `remind me to call Sam`, `remind me to stretch in 20 minutes`, `list my reminders`
- `remind me to take pills every day at 9am`, `snooze reminder 1 for 10 minutes`
- `list files`, `read notes.txt`
- `what's in my downloads`, `list documents/Projects`
- `open google.com`, `open calculator`, `open spotify`
- `find report.pdf`, then `open the first one`

The assistant is a deterministic intent matcher, not a language model. Its answers come from the same
services the UI uses, so anything it reports can be checked on the corresponding page.

## Limitations

These are known and intentional, not unfinished work:

- **Free-form chat is optional.** Commands are deterministic pattern matching. Unmatched messages go
  to Ollama on `127.0.0.1:11434` when a model is installed, and otherwise to a remote
  OpenAI-compatible provider if `AI_API_KEY` is set; only that remote path leaves this computer.
  Conversation memory is a capped table (`chat_turns`, 24 turns) in the local database.
- **Single user, no authentication.** The API trusts whoever can reach it on loopback, which is why it
  also rejects requests addressed to a non-loopback hostname (DNS rebinding) and sends `no-store`
  along with conservative security headers. Keep it on loopback; do not expose port 5000 to a
  network. CORS limits browsers, not direct HTTP clients.
- **Screenshots need an interactive desktop.** Headless servers, most containers, some Wayland
  sessions and locked screens may fail; the API returns `503` instead of hanging.
- **App launching depends on shortcuts.** Chrome, VS Code and Calculator use fixed commands; anything
  else must have a Start Menu (Windows) or `/Applications` (macOS) shortcut, so portable apps,
  store-only installers and many Linux desktops are not found.
- **The real-folder browser is read-only on purpose.** There is no endpoint to create, rename, move or
  delete in Desktop, Documents or Downloads, and none is planned.
- **Folder listings are capped at 500 entries** with no pagination or sorting controls beyond
  folders-first alphabetical order.
- **File previews are text only and capped at 256 KB.** Binary files return `415`.
- **Timed reminders need the API running.** The due-time check lives in the API process, so a reminder
  only fires while it is up. One that came due while it was off fires at the next start. Recurring
  reminders then move to their next daily or weekly occurrence, skipping ones missed while it was off.
- **History is browser-local.** It lives in `localStorage` (newest 50 messages), is not synced between
  browsers, and clearing it cannot be undone.
- **One API process per data directory.** SQLite handles concurrent readers, but every API instance
  runs its own due-reminder check, so two instances would announce the same reminder twice.
- **Not a packaged desktop app.** There is no installer or tray icon; it runs as a local web app with
  two processes.
- **Windows is the primary test target.** The server tests run on any OS, but screenshots, app
  launching and OneDrive folder discovery were exercised mainly on Windows.
- **No automated UI tests.** The server API has tests; the React pages were checked manually in a
  browser.

## Tests and Continuous Integration

```bash
cd server && npm test     # API, assistant, AI and migration tests
cd client && npm run lint && npm run build
```

`.github/workflows/ci.yml` runs on every push to `main` and on every pull request: `npm ci` in both
packages, `npm run lint` in both, `npm test` for the API, then `npm run build` for the dashboard, on a
matrix of `ubuntu-latest` / `windows-latest` and Node 22 / 24. Windows is in the matrix because
screenshots, OneDrive folder discovery and app launching are Windows-specific paths that a Linux-only
pipeline would never exercise.

## Future Work

Not started, and out of scope for this version:

- Tool calling, so a model can request a deterministic Orbit command instead of only describing it
- A packaged desktop build with a tray icon and autostart
- Full-text search over stored files and conversation memory

## License

Distributed under the MIT License. See [LICENSE](LICENSE) for more information.
