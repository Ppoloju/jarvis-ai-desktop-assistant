# 🤖 Jarvis AI Desktop Assistant

An AI-powered desktop assistant that combines voice interaction, intelligent conversations, and desktop automation to improve productivity and simplify everyday tasks.

---

## 🚀 Overview

Jarvis AI Desktop Assistant is designed to function as a personal productivity companion capable of:

- Understanding voice and text commands
- Answering questions using AI models
- Automating common desktop tasks
- Providing system information
- Improving workflow efficiency through a modern interface

The project follows a modular architecture that allows multiple developers to work simultaneously with minimal merge conflicts.

---

# ✨ Features

## 🎤 Voice Interaction

- Speech-to-Text
- Text-to-Speech
- Voice Command Processing
- Voice-Controlled Navigation
- Future Wake-Word Support

## 💬 AI Assistant

- Natural Language Conversations
- Gemini/OpenAI Integration
- Coding Assistance
- Question Answering
- Text Summarization
- Translation Support

## 💻 Desktop Automation

- Open Applications
- Launch Websites
- Open Folders
- Create Files & Directories
- Screenshot Capture
- Volume Control
- Battery Monitoring
- System Information

## 📊 Productivity Tools

- Study Mode
- Coding Mode
- Smart Reminders
- Dashboard Analytics
- Conversation History

---

# 🏗️ Tech Stack

## Frontend

- React
- Vite
- JavaScript
- Tailwind CSS

## Backend

- Node.js
- Express.js

## AI

- Gemini API
- OpenAI API (Optional)

## Voice

- Web Speech API

## Version Control

- Git
- GitHub

---

# 📂 Project Structure

```text
jarvis-ai-desktop-assistant/

├── client/
│
│   ├── src/
│   │
│   ├── components/
│   │   ├── Chat/
│   │   ├── Voice/
│   │   ├── Navbar/
│   │   ├── Sidebar/
│   │   └── Dashboard/
│   │
│   ├── pages/
│   │   ├── Home/
│   │   ├── Automation/
│   │   ├── History/
│   │   └── Settings/
│   │
│   ├── services/
│   │   ├── api.js
│   │   ├── chat/
│   │   ├── speech/
│   │   └── automation/
│   │
│   ├── hooks/
│   ├── utils/
│   ├── context/
│   └── assets/
│
├── server/
│   ├── routes/
│   ├── controllers/
│   ├── services/
│   ├── middlewares/
│   ├── config/
│   └── server.js
│
├── docs/
├── README.md
├── CONTRIBUTING.md
├── LICENSE
└── .gitignore
```

---

# ⚙️ Prerequisites

Install the following before running the project:

- Git
- Node.js (LTS)
- npm
- VS Code

### Recommended VS Code Extensions

- ESLint
- Prettier
- GitLens
- Error Lens
- Continue

---

# 📥 Installation

## Clone Repository

```bash
git clone https://github.com/Ppoloju/jarvis-ai-desktop-assistant.git

cd jarvis-ai-desktop-assistant
```

---

## Frontend Setup

```bash
cd client

npm install

npm run dev
```

Frontend:

```text
http://localhost:5173
```

---

## Backend Setup

Open another terminal:

```bash
cd server

npm install

npm run dev
```

Backend:

```text
http://localhost:5000
```

---

# 🔐 Environment Variables

Create:

```text
server/.env
```

Example:

```env
PORT=5000

GEMINI_API_KEY=your_api_key_here
```

Never commit:

```text
.env
```

---

# 👥 Team Structure

## Developer 1 – Project Lead & Integration

### Responsibilities

- Project setup
- Routing
- Layouts
- Navbar
- Sidebar
- API Integration
- Documentation
- Git Management
- Deployment
- Final Integration

### Owned Directories

```text
client/src/App.jsx
client/src/main.jsx
client/src/components/Navbar/
client/src/components/Sidebar/
client/src/layouts/
client/src/context/
client/src/services/api.js
client/src/routes/

docs/
README.md
CONTRIBUTING.md
```

---

## Developer 2 – AI & Voice Module

### Responsibilities

- Chat Interface
- Gemini/OpenAI Integration
- Voice Recognition
- Speech Synthesis
- Conversation History

### Owned Directories

```text
client/src/components/Chat/
client/src/components/Voice/
client/src/pages/Home/

client/src/services/chat/
client/src/services/speech/

server/routes/chat/
server/controllers/chat/
server/services/ai/
server/utils/prompts/
```

---

## Developer 3 – Desktop Automation

### Responsibilities

- Desktop Automation
- Dashboard
- File Operations
- Reminders
- Screenshot Service
- System Monitoring

### Owned Directories

```text
client/src/pages/Automation/
client/src/components/Dashboard/

client/src/services/automation/

server/routes/automation/
server/controllers/automation/
server/services/automation/
server/services/system/
server/utils/system/
```

---

# 🌿 Git Workflow

## Step 1: Switch to Develop

```bash
git fetch --all

git checkout develop
```

## Step 2: Create Feature Branch

### Project Setup

```bash
git checkout -b feature/project-setup
```

### AI Module

```bash
git checkout -b feature/ai-chat
```

### Automation Module

```bash
git checkout -b feature/automation
```

## Step 3: Work & Commit

```bash
git status

git add .

git commit -m "feat: implement voice recognition"
```

## Step 4: Push Branch

```bash
git push origin feature/ai-chat
```

## Step 5: Create Pull Request

```text
feature/your-branch
        ↓
     develop
```

Wait for review before merging.

---

# 🚫 Team Rules

### Never Push Directly To

```text
main
```

or

```text
develop
```

### Always

Pull latest changes:

```bash
git checkout develop

git pull origin develop
```

Create a feature branch:

```bash
git checkout -b feature/your-feature
```

Use meaningful commit messages:

```text
feat: add voice recognition

feat: implement screenshot service

fix: resolve sidebar rendering issue

docs: update README
```

---

# 📌 Branch Strategy

```text
                   main
                     ▲
                     │
               Final Release
                     │

                 develop

        ▲            ▲            ▲

feature/project-setup

feature/ai-chat

feature/automation
```

---

# 🛣️ Development Roadmap

## Milestone 1

- Repository Setup
- Folder Structure
- React + Express Setup
- Branch Creation

## Milestone 2

### Developer 1

- Routing
- Layouts

### Developer 2

- Chat UI
- AI Integration

### Developer 3

- Automation Endpoints

## Milestone 3

### Developer 1

- Settings
- Shared Services

### Developer 2

- Voice Features
- History

### Developer 3

- Screenshot Service
- System Information
- Dashboard

## Milestone 4

- Integration
- Testing
- Bug Fixes
- Pull Requests
- Documentation
- Demo Preparation

---

# 🔮 Future Enhancements

- Wake Word Detection
- Local AI Models
- Plugin Architecture
- Calendar Integration
- Email Automation
- OCR Support
- PDF Summarization
- Smart Scheduling
- Multi-Language Support
- AI Document Assistant

---

# 🤝 Contributing

1. Pull latest `develop`
2. Create a feature branch
3. Make changes
4. Commit frequently
5. Push your branch
6. Create a Pull Request
7. Wait for review
8. Merge into `develop`

---

# 📄 License

This project is licensed under the MIT License.

---

# 🎯 Vision

Jarvis AI Desktop Assistant aims to become a practical AI-powered productivity companion that bridges the gap between conversational AI and desktop automation. The long-term goal is to create a modular, scalable, and extensible platform capable of understanding user intent, automating repetitive tasks, and enhancing productivity through natural voice and text interactions.
