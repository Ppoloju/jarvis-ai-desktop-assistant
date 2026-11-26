# Orbit Desktop Assistant

A local-first desktop assistant. A React dashboard talks to a small Node/Express API that answers
questions, launches apps and websites, captures screenshots, manages scratch files and keeps
reminders. There is no cloud account, API key or external service: everything runs on your machine
and is stored on disk.

Orbit is the new name for this project (it was previously called "Jarvis AI Desktop Assistant").
"Orbit" is meant to suggest something that stays close to your machine and quietly handles the
small things, without pretending to be a person in the cloud.

[Report a Bug](https://github.com/Ppoloju/orbit-desktop-assistant/issues)

## About the Project

Most assistants are cloud services: they need an account, an API key and an internet connection, and
they see everything you type. Orbit explores the opposite approach. The intent engine is
deterministic and runs locally, automation uses the host desktop directly, and all data stays on
disk. Building it meant solving practical problems around filesystem confinement, cross-platform
folder discovery, a CORS allowlist, predictable error responses and packaging a two-service app in
containers that stay idle-cheap.

## What Each Feature Does

| Area | What it is for |
|------|----------------|
| **Overview** | System status, quick links to the other pages and the chat box. |
| **Assistant (chat)** | Plain-English commands for time and date, system status, reminders, stored files, your real Desktop/Documents/Downloads, and launching apps or websites. |
| **Automation** | Opens http/https websites, launches Chrome, VS Code or Calculator, and captures a screenshot. The newest 20 captures are kept and shown in a small gallery. |
| **Files** | A sandboxed workspace for scratch text files inside the app's own storage folder (`server/storage`). You can create folders and files, rename them, delete them, and preview text contents. **This is not your real Desktop, Documents or Downloads.** |
| **My computer** | A read-only browser for your real Desktop, Documents and Downloads. It lists names, types, sizes and dates and lets you open subfolders, but it cannot create, rename, move or delete anything there. |
| **Reminders** | A small persisted to-do list. Reminders can be added, marked done or reopened, and deleted. |
| **History** | Conversation history saved in this browser, with a one-click clear action. |
| **Settings** | App information and conversation-history controls. |

### Why "Files" exists

Files is deliberately separate from My computer. It gives the assistant a safe place to create and
read its own documents without ever touching your real folders. Every path is resolved and confined
to `server/storage`, so `../` traversal is rejected. Since the feature now supports previews, a file
you create there can be read back in the UI or with chat ("read notes.txt") without opening another
application.

## Built With

- **Frontend:** React 19, Vite, React Router, Tailwind CSS v4
- **Backend:** Node.js (>= 20.11), Express 5, ES modules
- **Storage:** local files and JSON under `server/storage` (no database)
- **Automation:** `open`, PowerShell (Windows screenshots), `screenshot-desktop` (other desktops),
  Node child processes
- **Tooling:** ESLint, Node's built-in test runner
- **Deployment:** Docker Compose (nginx for the static build, Node for the API)

## Getting Started

### Prerequisites

- Node.js 20.11 or newer
- npm
- Docker Desktop, only if you want the container setup
- An interactive desktop session, for screenshots and app launching

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/Ppoloju/orbit-desktop-assistant.git
   cd orbit-desktop-assistant
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

4. Start the API and the dashboard in two terminals:

   ```bash
   cd server && npm run dev
   ```

   ```bash
   cd client && npm run dev
   ```

   The dashboard runs at http://localhost:5173 and the API at http://localhost:5000. Vite proxies
   `/api` and `/screenshots` to the backend, so the browser uses a single origin during development.

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
| `CORS_ORIGINS` | localhost dev and preview origins | Browser origins allowed to call the API |
| `ORBIT_DATA_DIR` | `server` | Storage root; files go to `storage/` and screenshots to `screenshots/` |
| `ORBIT_HOME` | the current user's home | Home folder used by the read-only Desktop, Documents and Downloads browser (useful for tests) |
| `VITE_API_TARGET` | `http://localhost:5000` | Proxy target for the dev server |
| `VITE_API_BASE` | empty | API origin, only when the client is served from a different origin |

## Project Structure

```text
orbit-desktop-assistant/
  client/                     React dashboard
    nginx/                    nginx template for the container build
    src/
      components/             Chat, Navbar, Sidebar, SystemInfo, ui
      layouts/
      pages/                  Home, Automation, Files, Computer, Reminders, History, Settings
      services/
      utils/
  server/                     Express API
    controllers/
    middlewares/
    routes/
    services/                 assistant, automation, files, laptop, reminders, system
    tests/
    utils/
    app.js                    express app, middleware and routes
    server.js                 entrypoint: dotenv, listen and graceful shutdown
  docker-compose.yml
  LICENSE
```

## API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Health message |
| GET | `/api` | Index of available endpoints |
| POST | `/api/chat` | Ask the local assistant |
| GET | `/api/system/info` | Platform, CPU, memory and uptime |
| POST | `/api/automation/open-website` | Open an http/https URL |
| POST | `/api/automation/open-app` | Launch Chrome, VS Code or Calculator |
| POST | `/api/automation/screenshot` | Capture the screen |
| GET | `/api/automation/screenshots` | List the newest captures |
| GET | `/api/files` | List storage entries |
| GET | `/api/files/content?name=...` | Preview a stored text file (max 256 KB) |
| POST | `/api/files/create-folder` | Create a folder |
| POST | `/api/files/create-file` | Create a file |
| PATCH | `/api/files/rename-file` | Rename an entry |
| DELETE | `/api/files/delete-file` | Delete an entry |
| GET | `/api/laptop` | List the Desktop, Documents and Downloads folders |
| GET | `/api/laptop/:folder?path=...` | List one folder, read-only |
| GET | `/api/reminders` | List reminders |
| POST | `/api/reminders` | Create a reminder |
| PATCH | `/api/reminders/:id` | Mark a reminder done or open |
| DELETE | `/api/reminders/:id` | Delete a reminder |

Screenshots are served from `/screenshots/<file>`. Errors use real status codes: `400` invalid
input, `403` disallowed origin, `404` missing resource, `409` conflict, `413` preview too large,
`415` not a text file, `503` desktop unavailable.

### Assistant examples

- `what time is it`, `system info`, `what can you do`
- `remind me to call Sam`, `list my reminders`
- `list files`, `read notes.txt`
- `what's in my downloads`, `list documents/Projects`
- `open google.com`, `open calculator`

The assistant is a deterministic intent matcher, not a language model. Its answers come from the same
services the UI uses, so anything it reports can be checked on the corresponding page.

## Docker

The container setup serves a static production build through nginx, so there is no Vite dev server
and no nodemon.

```bash
docker compose up -d --build   # build and start
docker compose ps              # status
docker compose stop            # free the resources when idle
docker compose down            # remove containers, keep the data volume
docker compose down -v         # remove containers and stored data
```

- App: http://localhost:8081
- API: http://localhost:5000

Both ports are bound to loopback, and resources are capped in `docker-compose.yml` at 0.50 CPU /
256 MB for the API and 0.25 CPU / 64 MB for the web container. Files and reminders live in the
`orbit-data` volume mounted at `/data`.

### Limitations inside Docker

Some features need your real desktop and cannot work in a Linux container:

- Screenshot, open website and open app return `503` with a "no desktop display" message instead of
  failing silently.
- System info reports the container's platform and memory, not your machine's.
- Desktop, Documents and Downloads are the container user's home, not yours.

To keep those features, run the API on the host and containerise only the frontend:

```bash
cd server && npm start
cd .. && API_UPSTREAM=host.docker.internal:5000 docker compose up -d --no-deps web
```

On Linux, add `extra_hosts: ["host.docker.internal:host-gateway"]` to the web service.

## Challenges

- **Filesystem safety:** user-supplied paths could escape the storage folder. Every path is resolved
  and checked against the storage root before any read or write, and internal entries such as the
  reminders file are filtered out of listings. File previews add another read path, so they reuse the
  same resolver and refuse folders, binary data and oversized files.
- **Making read-only mean read-only:** the real-folder browser is implemented as a separate service
  with no create, rename, move or delete functions at all. Its routes are GET-only, so a stray POST
  or DELETE cannot reach those folders. Symlinks are skipped and paths are resolved with `realpath`
  so a link cannot quietly point outside the selected folder.
- **Finding the right folders:** on Windows, Desktop and Documents often live under OneDrive. The
  service prefers the normal location and falls back to `OneDrive\...`, marking a folder as missing
  instead of failing when neither exists.
- **Screenshots across platforms:** the packaged screenshot dependency does not work reliably on
  Windows, so Windows captures go through a small PowerShell script while other desktops use a
  worker process. Without a display the API returns an explicit `503` instead of hanging or crashing.
- **Predictable errors:** controllers shared ad-hoc error handling. A single error middleware plus an
  `assert` helper now produces consistent JSON responses and keeps internal paths out of them.
  Invalid JSON is also reported as a clean `400`.
- **Ambiguous chat input:** a phrase like "remind me to time my run" matches both the time intent and
  the reminder intent. Reminder creation now runs before the simpler time/date/system checks, and
  laptop browsing requires both a folder word and a browse word.
- **Persistent state without a database:** reminders are rewritten through a temporary file so a
  crash cannot truncate the list. The trade-off is that the list lives in the API process, so only
  one API instance should use a data directory at a time.
- **Cheap idle containers:** a Vite dev server and nodemon keep CPU busy. Serving a static build and
  running plain Node instead brings idle usage close to zero.
- **Small UI consistency problems:** counts are pluralised in one place, async pages avoid setting
  state during render, and destructive actions ask for confirmation before deleting anything.

## Limitations

These are known and intentional, not unfinished work:

- **No AI model.** Understanding is deterministic pattern matching. Unknown or very varied phrasing
  gets a suggestion list rather than an answer. There is no local LLM backend.
- **Single user, no authentication.** The API trusts whoever can reach it. Keep it on loopback; do
  not expose port 5000 to a network. CORS limits browsers, not direct HTTP clients.
- **App launching is a small allowlist.** Only Chrome, VS Code and Calculator are supported. Commands
  differ by platform and fail with a `503` when the app is not installed or not on `PATH`.
- **Screenshots need an interactive desktop.** Headless servers, most containers, some Wayland
  sessions and locked screens may fail or capture nothing useful.
- **The real-folder browser is read-only on purpose.** There is no endpoint to create, rename, move
  or delete in Desktop, Documents or Downloads, and none is planned.
- **Folder listings are capped at 500 entries** with no pagination, search or sorting controls beyond
  folders-first alphabetical order.
- **File previews are text only and capped at 256 KB.** Binary files return `415`.
- **Reminders are a list, not a scheduler.** There are no due dates, alarms, notifications or
  background checks. "Done" only records a flag.
- **History is browser-local.** It is stored in `localStorage` (newest 50 messages), is not synced
  between browsers, and clearing it cannot be undone.
- **One API process per data directory.** The reminder list is held in memory and written back on
  change; two API instances pointed at the same folder could overwrite each other.
- **Docker loses desktop features** and reports container system information.
- **Not a packaged desktop app.** There is no installer or tray icon; it runs as a local web app with
  two processes.
- **Windows is the primary test target.** The server tests run on any OS, but screenshots, app
  launching and OneDrive folder discovery were exercised mainly on Windows.
- **No automated UI tests.** The server API has tests; the React pages were checked manually in a
  browser.

## Tests

```bash
cd server && npm test     # API and assistant tests
cd client && npm run lint && npm run build
```

## Future Work

Not started, and out of scope for this version:

- Optional local model backend for free-form answers
- Reminder scheduling with desktop notifications
- Packaged desktop build with a tray icon

## License

Distributed under the MIT License. See [LICENSE](LICENSE) for more information.
