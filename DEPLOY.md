# Hermes OS — VPS Deploy Guide

## Prerequisites
- Domain pointed at your VPS (add DNS A record)
- Traefik already running as `traefik-traefik-1` on the `traefik_default` Docker network

---

## 1. Copy project to VPS

From your local machine:
```bash
scp -r ./hermes-os root@YOUR_VPS_IP:/opt/data/hermes-os
```

---

## 2. Create .env on VPS

```bash
ssh root@YOUR_VPS_IP
cd /opt/data/hermes-os
cp .env.example .env
nano .env
```

Fill in:
```
HERMES_PASSWORD=your_strong_passphrase
JWT_SECRET=$(openssl rand -hex 32)
N8N_BRIEFING_URL=https://your-n8n-instance.example.com/webhook/hermes-briefing
NODE_ENV=production
PORT=3000
```

---

## 3. Confirm Traefik network name

```bash
docker network ls | grep traefik
```

If the network name is not `traefik_default`, edit `docker-compose.yml` and change:
```yaml
networks:
  traefik_default:   # ← change this to match
    external: true
```
and the `networks:` entry under `hermes-os:`.

---

## 4. Build and start

```bash
cd /opt/data/hermes-os
docker compose up -d --build
```

App will be live at **https://your-hermes-domain.example.com** once Traefik issues the SSL cert (~30s).

---

## 5. Set up n8n briefing webhook

In n8n, create a new workflow:
- **Trigger**: Webhook node → GET `/webhook/hermes-briefing`
- **Gmail node**: Get threads, `is:unread in:inbox newer_than:1d`, limit 15
- **Calendar node**: List events, today start → end
- **Code node**: Format response:
```javascript
return [{
  json: {
    emails: $('Gmail').all().map(i => ({
      id:      i.json.id,
      from:    i.json.from,
      subject: i.json.subject,
      snippet: i.json.snippet,
    })),
    events: $('Google Calendar').all().map(i => ({
      id:       i.json.id,
      summary:  i.json.summary,
      start:    i.json.start,
      htmlLink: i.json.htmlLink,
    })),
  }
}];
```
- **Respond to Webhook**: Return last node data
- Activate the workflow

---

## 6. Local dev

```bash
cd hermes-os
npm install
cp .env.example .env   # set PORT=3001
npm run dev
```

Vite → http://localhost:5173  
Express API → http://localhost:3001

---

## Useful commands

```bash
# Logs
docker logs hermes-os -f

# Restart
docker compose -f /opt/data/hermes-os/docker-compose.yml restart hermes-os

# Rebuild after code change
docker compose -f /opt/data/hermes-os/docker-compose.yml up -d --build

# Shell into container
docker exec -it hermes-os sh
```
