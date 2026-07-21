# ?? Jarvis AI Desktop Assistant

An AI-powered desktop assistant with a modern UI that combines intelligent conversations, desktop automation, and productivity tools to simplify everyday tasks.

---

## ? Features

### ?? AI Chat
- Natural language conversations with Jarvis
- Real-time chat interface with modern design
- Error handling and loading states
- Beautiful message bubbles with user/bot distinction

### ? Desktop Automation
- Open websites (e.g., Google, YouTube)
- Launch applications (Chrome, VS Code, Calculator)
- Capture screenshots
- System information monitoring

### ?? File Management
- Create folders and files
- Rename files
- Delete files

### ?? Reminders
- Create and manage reminders
- Delete reminders

### ?? Modern UI
- Beautiful gradient design with Tailwind CSS
- Responsive layout with sidebar navigation
- Smooth transitions and hover effects
- Card-based components
- Dark sidebar with purple accent colors

---

## ?? Tech Stack

### Frontend
- **React** - UI library
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **React Router** - Routing

### Backend
- **Node.js** - Runtime
- **Express.js** - Web framework
- **ES Modules** - Modern JavaScript

---

## ?? Project Structure

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
¦   ¦   +-- main.jsx
¦   +-- package.json
¦   +-- tailwind.config.js
¦   +-- vite.config.js
+-- server/
¦   +-- routes/
¦   ¦   +-- automation/
¦   ¦   +-- files/
¦   ¦   +-- reminders/
¦   +-- controllers/
¦   ¦   +-- automation/
¦   ¦   +-- files/
¦   ¦   +-- reminders/
¦   +-- services/
¦   ¦   +-- automation/
¦   ¦   +-- files/
¦   ¦   +-- reminders/
¦   +-- middlewares/
¦   +-- server.js
¦   +-- package.json
+-- README.md
```

---

## ?? Prerequisites

- **Node.js** (LTS Version)
- **npm** (comes with Node.js)

---

## ?? Getting Started

### 1. Clone Repository

```bash
git clone https://github.com/Ppoloju/jarvis-ai-desktop-assistant.git
cd jarvis-ai-desktop-assistant
```

### 2. Install Dependencies

#### Frontend
```bash
cd client
npm install
```

#### Backend
```bash
cd server
npm install
```

### 3. Run the Application

#### Start Frontend
```bash
cd client
npm run dev
```
Frontend runs on: **http://localhost:5173**

#### Start Backend
```bash
cd server
npm run dev
```
Backend runs on: **http://localhost:5000**

---

## ?? API Endpoints

### Automation
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/automation/open-website` | Open a website |
| POST | `/api/automation/open-app` | Open an application |
| POST | `/api/automation/screenshot` | Capture screenshot |

### System
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/system/info` | Get system information |

### Files
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/files/create-folder` | Create a folder |
| POST | `/api/files/create-file` | Create a file |
| PATCH | `/api/files/rename-file` | Rename a file |
| DELETE | `/api/files/delete-file` | Delete a file |

### Reminders
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/reminders` | Create reminder |
| GET | `/api/reminders` | Get reminders |
| DELETE | `/api/reminders/:id` | Delete reminder |

### Chat
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/chat` | Send message to AI |

---

## ?? Usage

### Chat with Jarvis
1. Navigate to the home page
2. Type your message in the chat input
3. Press Enter or click Send
4. Jarvis will respond with an intelligent reply

### Use Automation Tools
1. Click on "Automation" in the sidebar
2. Use the cards to:
   - Open websites by entering URLs
   - Launch applications (chrome, vscode, calculator)
   - Capture screenshots

---

## ?? License

This project is licensed under the **MIT License**.

---

## ?? Contributing

Contributions, issues, and feature requests are welcome!

---

## ?? Contact

For any questions or suggestions, please open an issue on GitHub.

---

**Built with ?? using React, Node.js, and Tailwind CSS**
