# Jarvis AI Desktop Assistant

A local desktop assistant with a React dashboard and a Node/Express API. It can chat, launch
websites and apps, take screenshots, manage files, and keep reminders.

Everything runs on your own machine. There is no cloud account and no API key.

---

## Features

### Assistant
- Conversational: greetings, small talk, thanks, help and capability listing
- Answers about the time, date, system status and uptime
- Creates reminders ("remind me to call Sam") and lists existing ones
- Lists what is stored in the files area
- Launches Chrome, VS Code or Calculator, and opens websites
- Offers example prompts instead of a dead end when it does not understand
- Conversation history kept in the browser, with one-click **Clear** on the History and
  Settings pages

### Interface
- Responsive dashboard with sidebar navigation and a top bar that shows live API status
- Views: Overview, Automation, Files, Reminders, History, Settings, and a 404 page
- Shared design system (cards, buttons, inputs, alerts, empty states, SVG icons)
- Keyboard focus states and a mobile navigation bar

### Desktop automation
- Open a website (http/https only) in your default browser
- Launch Chrome, VS Code or Calculator
- Capture a screenshot, preview it in the app, and open the full image
- Screenshots are pruned automatically, keeping the newest 20

### File management
- Create folders and files (nested paths allowed)
- Rename and delete entries
- Browse the storage folder from the UI
- Writes are confined to `server/storage`

### Reminders
- Create and delete reminders
- Reminders persist to `server/storage/reminders.json`

### System info
- Platform, CPU cores, memory and uptime shown on the Overview page

---

## Tech stack

### Frontend
- React 19, Vite, React Router
- Tailwind CSS v4

### Backend
- Node.js (>= 20.11), Express 5, ES modules

---

## Project structure

```
jarvis-ai-desktop-assistant/
├── client/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Chat/
│   │   │   ├── Navbar/
│   │   │   ├── Sidebar/
│   │   │   ├── SystemInfo/
│   │   │   └── ui/
│   │   ├── layouts/
│   │   ├── pages/
│   │   │   ├── Automation/
│   │   │   ├── Files/
│   │   │   ├── History/
│   │   │   ├── Home/
│   │   │   ├── NotFound/
│   │   │   ├── Reminders/
│   │   │   └── Settings/
│   │   ├── services/
│   │   ├── utils/
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── package.json
│   └── vite.config.js
└── server/
    ├── controllers/
    ├── middlewares/
    ├── routes/
    ├── services/
    ├── tests/
    ├── utils/
    ├── app.js
    ├── server.js
    └── package.json
```

---

## Prerequisites

- Node.js 20.11 or newer
- npm

---

## Getting started

```bash
git clone https://github.com/Ppoloju/jarvis-ai-desktop-assistant.git
cd jarvis-ai-desktop-assistant

cd server && npm install
cd ../client && npm install
```

### Run the app

Backend (http://localhost:5000):

```bash
cd server
npm run dev
```

Frontend (http://localhost:5173):

```bash
cd client
npm run dev
```

The Vite dev server proxies `/api` and `/screenshots` to the backend, so the browser talks to
one origin in development.

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

### Configuration

Copy `server/.env.example` to `server/.env` if you want to change the port or allowed origins.

| Variable | Default | Purpose |
|----------|---------|---------|
| `PORT` | `5000` | API port |
| `CORS_ORIGINS` | `http://localhost:5173,http://127.0.0.1:5173,...` | Browser origins allowed to call the API |

`client/.env.example` documents `VITE_API_TARGET` (proxy target) and `VITE_API_BASE` (only needed
when the frontend is served from a different origin than the API).

---

## API

### Service
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Health message |
| GET | `/api` | Index of available endpoints |

### Automation
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/automation/open-website` | Open an http/https url |
| POST | `/api/automation/open-app` | Launch chrome, vscode or calculator |
| POST | `/api/automation/screenshot` | Capture the screen |

### System
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/system/info` | Platform, CPU, memory, uptime |

### Files
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/files` | List storage entries |
| POST | `/api/files/create-folder` | Create a folder |
| POST | `/api/files/create-file` | Create a file |
| PATCH | `/api/files/rename-file` | Rename an entry |
| DELETE | `/api/files/delete-file` | Delete an entry |

### Reminders
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/reminders` | List reminders |
| POST | `/api/reminders` | Create a reminder |
| DELETE | `/api/reminders/:id` | Delete a reminder |

### Chat
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/chat` | Ask the local assistant |

### Screenshots
Captured images are served from `/screenshots/<file>`.

Errors use real HTTP status codes: `400` invalid input, `403` disallowed origin, `404` missing
resource, `409` conflict, `500` unexpected failure. Internal paths are never returned to clients.

---

## Storage

`server/storage` (files and reminders) and `server/screenshots` are created on demand and are
git-ignored.

---

## Docker (low-CPU setup)

The container setup serves a static production build through nginx, so there is no Vite dev server
and no nodemon. Idle CPU stays close to zero.

```bash
docker compose up -d --build   # build and start
docker compose ps              # status
docker compose stop            # free the resources when idle
docker compose down            # remove containers, keep the data volume
docker compose down -v         # remove containers and stored data
```

- App: http://localhost:8081
- API: http://localhost:5000

Resource caps from `docker-compose.yml`: api 0.50 CPU / 256 MB, web 0.25 CPU / 64 MB.
Files and reminders live in the `jarvis-data` volume mounted at `/data`.

### Known limitations inside Docker

Some features need your real desktop and cannot work in a Linux container:

- **Screenshot**, **open website** and **open app** return `503 ... no desktop display was found` instead of failing silently
- **System info** reports the container's platform and memory, not your laptop's

To keep those features, run the API on the host and containerise only the frontend:

```bash
cd server && npm start
cd .. && API_UPSTREAM=host.docker.internal:5000 docker compose up -d --no-deps web
```

On Linux add `extra_hosts: ["host.docker.internal:host-gateway"]` to the web service.

---

## License

MIT
