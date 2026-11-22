# Jarvis AI Desktop Assistant - client

React 19 + Vite + Tailwind CSS v4 frontend for the Jarvis desktop assistant.

## Commands

```bash
npm install
npm run dev     # http://localhost:5173
npm run build   # production build in dist/
npm run lint
npm run preview
```

The dev server proxies `/api` and `/screenshots` to the backend (`http://localhost:5000` by
default). Override the target with `VITE_API_TARGET`, and set `VITE_API_BASE` only when the
frontend is served from a different origin than the API. See `.env.example`.

The backend lives in `../server`; see the repository README for the full setup.
