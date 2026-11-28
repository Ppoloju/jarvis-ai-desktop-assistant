# Orbit Desktop Assistant

A local-first desktop assistant for one person on one computer. A React dashboard talks to a small Node/Express API on loopback that answers questions, launches apps and websites, browses your real Desktop, Documents and Downloads, keeps scratch files and reminders, and takes screenshots. Everything runs and is stored on your machine: there is no account, no telemetry and no cloud sync. Free-form chat stays local too when Ollama is running; an optional AI key is the only thing that can send a message off the computer.

## Features
- Deterministic desktop commands: time, system status, reminders, files, real folders, app/website launching, web search, screenshots
- A safe sandbox for assistant-created files, separate from real user folders
- Read-only browser for Desktop, Documents and Downloads
- Local persistence for reminders, chat memory and preferences, with one-click backups
- Optional free-form chat that prefers a local model and can use a remote provider
- Device help and process introspection: reports what it can actually measure (OS, CPU, memory, disk, uptime, battery, top processes) and keeps the snapshot on the machine

## Tech Stack
- **Language:** JavaScript (ES modules)
- **Frontend:** React 19, Vite 8, React Router 7, Tailwind CSS 4
- **Backend:** Node.js 22.13+, Express 5
- **Database:** SQLite via Node's built-in `node:sqlite` (`DatabaseSync`, WAL)
- **AI:** Ollama at `127.0.0.1:11434` by default (no key); optional remote OpenAI-compatible provider via `AI_API_KEY`
- **Voice:** Browser Web Speech API (Chrome/Edge)

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
3. Optional: copy the environment examples if you need a different port or origin:
   ```bash
   cp server/.env.example server/.env
   cp client/.env.example client/.env
   ```
4. Optional: set up local chat by starting Ollama and pulling a model:
   ```bash
   ollama pull llama3.2
   ```

## Usage
Start the API and the dashboard in two terminals:
```bash
cd server && npm run dev
```
```bash
cd client && npm run dev
```
The dashboard runs at http://localhost:5173 and the API at http://localhost:5000. Vite proxies `/api` and `/screenshots` to the backend during development.

Run the API tests:
```bash
cd server && npm test
```

Run the client linter and build:
```bash
cd client && npm run lint && npm run build
```
