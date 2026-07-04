# Hermes OS

A self-hosted agent dashboard for running an AI chief of staff on your own VPS. Built with React + Vite on the frontend, Express on the backend, deployed via Docker behind Traefik.

---

## What it does

Hermes OS is the command interface for a personal AI agent stack. It surfaces:

- **Daily briefing** — proxied from an n8n webhook that pulls Gmail + Google Calendar
- **Agent topology** — live D3 force graph of your agent, models, automation, and infrastructure
- **Mission control** — per-agent status cards with extended metadata and quick links
- **Kanban board** — task tracking for the current build phase
- **Code graph** — auto-generated import dependency map of the source tree
- **n8n workflow graph** — pulls live workflow data from your n8n API

Authentication is JWT-based with a single passphrase login. Tokens expire after 30 days.

---

## Stack

| Layer | Tech |
|---|---|
| Frontend | React 18, Vite, D3 |
| Backend | Node.js, Express |
| Auth | JWT (jsonwebtoken) |
| Deployment | Docker, Traefik (SSL via Let's Encrypt) |
| Automation | n8n (external, self-hosted) |

---

## Local dev

```bash
git clone https://github.com/chent1101-jpg/skynet-caffeine-free-os.git
cd skynet-caffeine-free-os
npm install
cp .env.example .env   # fill in values
npm run dev
```

Vite dev server → `http://localhost:5173`  
Express API → `http://localhost:3001`

---

## Environment variables

Copy `.env.example` to `.env` and fill in:

| Variable | Description |
|---|---|
| `HERMES_PASSWORD` | Login passphrase |
| `JWT_SECRET` | JWT signing secret — generate with `openssl rand -hex 32` |
| `N8N_BASE_URL` | Base URL of your n8n instance |
| `N8N_BRIEFING_URL` | Full webhook URL for the briefing endpoint |
| `N8N_API_KEY` | n8n API key (for workflow graph panel) |
| `HERMES_DOMAIN` | Public domain for Traefik routing |
| `PORT` | Server port (default: `3001` dev, `3000` Docker) |

---

## Deploy

See [DEPLOY.md](./DEPLOY.md) for the full VPS setup walkthrough — includes Traefik config, n8n webhook setup, and useful Docker commands.

---

## Project structure

```
hermes-os/
├── src/
│   ├── components/
│   │   ├── BriefingPanel.jsx     # Gmail + calendar feed
│   │   ├── GraphPanel.jsx        # D3 agent topology / code graph / n8n graph
│   │   ├── MissionControl.jsx    # Agent status cards
│   │   ├── KanbanBoard.jsx       # Task board
│   │   ├── Dashboard.jsx         # Main layout
│   │   └── ...
│   ├── App.jsx
│   └── main.jsx
├── server.js                     # Express API + JWT auth
├── Dockerfile
├── docker-compose.yml
└── .env.example
```

---

## License

MIT
