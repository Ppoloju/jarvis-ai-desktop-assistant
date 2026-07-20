# ?? Jarvis AI Desktop Assistant

An AI-powered desktop assistant that combines voice interaction, intelligent conversations, and laptop automation to improve productivity and simplify everyday tasks.

---

## ?? Features

### ?? Voice Interaction
- Voice recognition
- Speech-to-text
- Text-to-speech
- Voice commands

### ?? AI Assistant
- Natural language conversations
- Gemini/OpenAI integration
- Coding assistance
- Question answering
- Text summarization

### ?? Desktop Automation
- Open applications
- Open websites
- Open folders
- Create files/folders
- Screenshot capture
- System information
- Volume control
- Battery monitoring

### ?? Productivity
- Study mode
- Coding mode
- History tracking
- Smart reminders
- Dashboard

---

## ??? Tech Stack

### Frontend
- React
- Vite
- JavaScript
- CSS / Tailwind CSS

### Backend
- Node.js
- Express.js

### AI
- Gemini API / OpenAI API

### Voice
- Web Speech API

---

## ?? Project Structure

```
jarvis-ai-desktop-assistant/
+-- client/
¦   +-- public/
¦   +-- src/
¦   ¦   +-- components/
¦   ¦   +-- pages/
¦   ¦   +-- services/
¦   ¦   +-- hooks/
¦   ¦   +-- utils/
¦   ¦   +-- context/
¦   +-- package.json
+-- server/
¦   +-- routes/
¦   +-- controllers/
¦   +-- services/
¦   +-- middlewares/
¦   +-- utils/
¦   +-- server.js
+-- README.md
+-- LICENSE
+-- .gitignore
```

---

## ?? Prerequisites

- Node.js (LTS Version)
- npm

---

## ?? Clone Repository

```bash
git clone https://github.com/Ppoloju/jarvis-ai-desktop-assistant.git
cd jarvis-ai-desktop-assistant
```

---

## ?? Frontend Setup

```bash
cd client
npm install
npm run dev
```

Frontend runs on: `http://localhost:5173`

---

## ?? Backend Setup

```bash
cd server
npm install
npm run dev
```

Backend runs on: `http://localhost:5000`

---

## ?? Environment Variables

Create `server/.env`:

```env
PORT=5000
GEMINI_API_KEY=your_api_key_here
```

---

## ?? API Endpoints

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

---

## ?? License

This project is licensed under the MIT License.
