# Jarvis AI Desktop Assistant

An AI-powered desktop assistant with a modern UI that combines intelligent conversations, desktop automation, and productivity tools to simplify everyday tasks.

## Features

### AI Chat
- Natural language conversations with Jarvis
- Real-time chat interface with modern design
- Error handling and loading states

### Desktop Automation
- Open websites (e.g., Google, YouTube)
- Launch applications (Chrome, VS Code, Calculator)
- Capture screenshots
- System information monitoring

### File Management
- Create folders and files
- Rename files
- Delete files

### Reminders
- Create and manage reminders
- Delete reminders

### Modern UI
- Beautiful gradient design with Tailwind CSS
- Responsive layout with sidebar navigation
- Smooth transitions and hover effects
- Card-based components

## Tech Stack

### Frontend
- React
- Vite
- Tailwind CSS
- React Router

### Backend
- Node.js
- Express.js
- ES Modules

## Project Structure

```
jarvis-ai-desktop-assistant/
+-- client/
¦   +-- public/
¦   +-- src/
¦   ¦   +-- components/
¦   ¦   ¦   +-- Chat/
¦   ¦   ¦   +-- Navbar/
¦   ¦   ¦   +-- Sidebar/
¦   ¦   +-- pages/
¦   ¦   ¦   +-- Automation/
¦   ¦   ¦   +-- Settings/
¦   ¦   +-- services/
¦   ¦   ¦   +-- api.js
¦   ¦   +-- layouts/
¦   ¦   +-- App.jsx
¦   +-- package.json
+-- server/
¦   +-- routes/
¦   +-- controllers/
¦   +-- services/
¦   +-- middlewares/
¦   +-- server.js
+-- README.md
```

## Prerequisites

- Node.js (LTS Version)
- npm

## Clone Repository

```bash
git clone https://github.com/Ppoloju/jarvis-ai-desktop-assistant.git
cd jarvis-ai-desktop-assistant
```

## Frontend Setup

```bash
cd client
npm install
npm run dev
```

Frontend runs on: `http://localhost:5173`

## Backend Setup

```bash
cd server
npm install
npm run dev
```

Backend runs on: `http://localhost:5000`

## API Endpoints

### Automation
- `POST /api/automation/open-website` - Open a website
- `POST /api/automation/open-app` - Open an application
- `POST /api/automation/screenshot` - Capture screenshot

### System
- `GET /api/system/info` - Get system information

### Files
- `POST /api/files/create-folder` - Create a folder
- `POST /api/files/create-file` - Create a file
- `PATCH /api/files/rename-file` - Rename a file
- `DELETE /api/files/delete-file` - Delete a file

### Reminders
- `POST /api/reminders` - Create reminder
- `GET /api/reminders` - Get reminders
- `DELETE /api/reminders/:id` - Delete reminder

### Chat
- `POST /api/chat` - Send message to AI

## License

This project is licensed under the MIT License.
