# Jarvis AI Desktop Assistant

A desktop assistant that runs entirely on your own machine. A React dashboard talks to a local
Node/Express API that answers questions, launches apps and websites, captures screenshots, manages
files and keeps reminders, with no cloud account, API key or external service.

[Report a Bug](https://github.com/Ppoloju/jarvis-ai-desktop-assistant/issues)

## About the Project

Most assistants are cloud services: they need an account, an API key and an internet connection, and
they see everything you type. This project explores the opposite approach. The intent engine is
deterministic and runs locally, automation uses the host desktop directly, and all data stays on
disk. Building it meant solving practical problems around filesystem confinement, a CORS allowlist,
predictable error responses and packaging a two-service app in containers that stay idle-cheap.

## Built With

- **Frontend:** React 19, Vite, React Router, Tailwind CSS v4
- **Backend:** Node.js (>= 20.11), Express 5, ES modules
- **Storage:** local files and JSON under `server/storage` (no database)
- **Automation:** `open`, `screenshot-desktop`, Node child processes
- **Tooling:** ESLint, Node's built-in test runner
- **Deployment:** Docker Compose (nginx for the static build, Node for the API)

## Key Features

- **Local assistant:** greetings and small talk, time and date, system status, reminder creation and
  listing, file listing, desktop folder lookups, app and website launching, and helpful suggestions
  for unknown input.
- **Desktop automation:** open an http/https site, launch Chrome, VS Code or Calculator, and capture
  a screenshot that is previewed in the app. Old screenshots are pruned automatically.
- **File management:** create, rename and delete files and folders, browsable from the UI. Every
  path is resolved and confined to `server/storage`, so traversal attempts are rejected.
- **Your real folders (read-only):** browse Desktop, Documents and Downloads from the My computer
  page or by asking the chat, for example "what's in my downloads". The API exposes listing routes
  only; no endpoint can create, rename, move or delete anything in those folders.
- **Reminders:** create and delete reminders, persisted to `server/storage/reminders.json`.
- **Responsive dashboard:** sidebar navigation, a top bar with live API status, a shared design
  system, keyboard focus states and a mobile navigation bar.
- **Conversation history:** kept in the browser, with a one-click clear action.
- **Hardened API:** origin allowlist, real HTTP status codes, and no internal paths in responses.
- **Cheap containers:** the production build is served statically, with explicit CPU and memory
  caps, so idle usage stays near zero.

## Getting Started

### Prerequisites

- Node.js 20.11 or newer
- npm
- Docker Desktop, only if you want the container setup
- A desktop session, for screenshots and app launching

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/Ppoloju/jarvis-ai-desktop-assistant.git
   cd jarvis-ai-desktop-assistant
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

### Configuration

| Variable | Default | Purpose |
|----------|---------|---------|
| `PORT` | `5000` | API port |
| `CORS_ORIGINS` | localhost dev and preview origins | Browser origins allowed to call the API |
| `JARVIS_DATA_DIR` | `server/storage` | Storage root for files and reminders |
| `JARVIS_HOME` | the current user's home | Home folder used by the read-only Desktop, Documents and Downloads browser (useful for tests) |
| `VITE_API_TARGET` | `http://localhost:5000` | Proxy target for the dev server |
| `VITE_API_BASE` | empty | API origin, only when the client is served from a different origin |

## Project Structure

```text
jarvis-ai-desktop-assistant/
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
    server.js                 entrypoint: dotenv and listen
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
| GET | `/api/files` | List storage entries |
| POST | `/api/files/create-folder` | Create a folder |
| POST | `/api/files/create-file` | Create a file |
| PATCH | `/api/files/rename-file` | Rename an entry |
| DELETE | `/api/files/delete-file` | Delete an entry |
| GET | `/api/laptop` | List the Desktop, Documents and Downloads folders |
| GET | `/api/laptop/:folder?path=...` | List one folder, read-only |
| GET | `/api/reminders` | List reminders |
| POST | `/api/reminders` | Create a reminder |
| DELETE | `/api/reminders/:id` | Delete a reminder |

Screenshots are served from `/screenshots/<file>`. Errors use real status codes: `400` invalid
input, `403` disallowed origin, `404` missing resource, `409` conflict, `500` unexpected failure.

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
`jarvis-data` volume mounted at `/data`.

### Limitations inside Docker

Some features need your real desktop and cannot work in a Linux container:

- Screenshot, open website and open app return `503` with a "no desktop display" message instead of
  failing silently.
- System info reports the container's platform and memory, not your machine's.

To keep those features, run the API on the host and containerise only the frontend:

```bash
cd server && npm start
cd .. && API_UPSTREAM=host.docker.internal:5000 docker compose up -d --no-deps web
```

On Linux, add `extra_hosts: ["host.docker.internal:host-gateway"]` to the web service.

## Lessons Learned and Challenges

- **Filesystem safety:** user-supplied paths could escape the storage folder. Every path is now
  resolved and checked against the storage root before any read or write, and internal entries such
  as the reminders file are filtered out of listings.
- **Desktop automation in containers:** GUI calls fail without a display. Rather than letting them
  hang or crash the API, screenshot work runs in a separate process and returns an explicit `503`.
- **Predictable errors:** controllers shared ad-hoc error handling. A single error middleware plus
  an `assert` helper now produces consistent JSON responses and keeps internal paths out of them.
- **Cheap idle containers:** a Vite dev server and nodemon keep CPU busy. Serving a static build and
  running plain Node instead brings idle usage close to zero.

## Roadmap

- [x] Local assistant with a deterministic intent engine
- [x] Desktop automation, file management and reminders
- [x] Container setup with resource caps
- [ ] Optional local model backend for free-form answers
- [ ] Reminder scheduling with desktop notifications
- [ ] Packaged desktop build

## License

Distributed under the MIT License. See [LICENSE](LICENSE) for more information.
