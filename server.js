import express from 'express';
import jwt from 'jsonwebtoken';
import { fileURLToPath } from 'url';
import { dirname, join, relative, resolve, basename, extname } from 'path';
import { readdir, readFile } from 'fs/promises';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Config ───────────────────────────────────────
const PORT          = parseInt(process.env.PORT || '3001');
const JWT_SECRET    = process.env.JWT_SECRET    || 'dev-secret-change-in-production';
const PASSWORD      = process.env.HERMES_PASSWORD || 'hermes';
const N8N_URL       = process.env.N8N_BRIEFING_URL || '';
const N8N_BASE_URL  = process.env.N8N_BASE_URL     || '';
const IS_PROD       = process.env.NODE_ENV === 'production';

// ── App ──────────────────────────────────────────
const app = express();
app.use(express.json());

// ── Briefing cache (5 min) ───────────────────────
let cache = { data: null, ts: 0 };
const CACHE_TTL = 5 * 60 * 1000;

// ── Auth middleware ──────────────────────────────
function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    req.user = jwt.verify(header.slice(7), JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Token invalid or expired' });
  }
}

// ── Routes ───────────────────────────────────────

// POST /api/auth/login
app.post('/api/auth/login', (req, res) => {
  const { password } = req.body || {};
  if (!password || password !== PASSWORD) {
    return res.status(401).json({ error: 'Invalid passphrase' });
  }
  const token = jwt.sign({ user: 'tim' }, JWT_SECRET, { expiresIn: '30d' });
  res.json({ token });
});

// GET /api/briefing  — proxies n8n, caches 5 min
app.get('/api/briefing', requireAuth, async (req, res) => {
  const now   = Date.now();
  const force = req.query.force === '1';

  // Return cached data if fresh
  if (!force && cache.data && now - cache.ts < CACHE_TTL) {
    return res.json({ ...cache.data, cached: true, age: Math.round((now - cache.ts) / 1000) });
  }

  if (!N8N_URL) {
    return res.json({ emails: [], events: [], error: 'N8N_BRIEFING_URL not set in .env' });
  }

  try {
    const r = await fetch(N8N_URL, { signal: AbortSignal.timeout(15000) });
    if (!r.ok) throw new Error(`n8n responded with ${r.status}`);
    const data = await r.json();
    cache = { data, ts: now };
    res.json({ ...data, cached: false });
  } catch (err) {
    // Serve stale cache rather than a blank screen
    if (cache.data) {
      return res.json({ ...cache.data, cached: true, stale: true, age: Math.round((now - cache.ts) / 1000) });
    }
    res.status(502).json({ error: err.message, emails: [], events: [] });
  }
});

// GET /api/health
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', ts: Date.now(), cached: !!cache.data });
});

// GET /api/agents  — health-check external services
app.get('/api/agents', requireAuth, async (_req, res) => {
  async function ping(url) {
    try {
      await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(4000) });
      return true;
    } catch { return false; }
  }

  const [n8nOnline] = await Promise.all([
    N8N_BASE_URL ? ping(N8N_BASE_URL) : Promise.resolve(null),
  ]);

  const [claudeOnline, orOnline] = await Promise.all([
    ping('https://api.anthropic.com'),
    ping('https://openrouter.ai'),
  ]);

  res.json([
    { id: 'hermes',     name: 'Hermes Agent', description: 'VPS · DeepSeek V4 Flash',  online: true        },
    { id: 'n8n',        name: 'n8n',          description: 'Workflow automation',       online: n8nOnline   },
    { id: 'telegram',   name: 'Telegram',     description: 'Bot gateway · active',      online: true        },
    { id: 'openrouter', name: 'OpenRouter',   description: 'API routing · active',      online: orOnline    },
    { id: 'claude',     name: 'Claude',       description: 'Anthropic · Sonnet 4.6',   online: claudeOnline },
    { id: 'deepseek',   name: 'DeepSeek',     description: 'V4 Flash / V4 Pro',        online: orOnline    },
  ]);
});

// GET /api/openrouter-usage  — fetch key stats from OpenRouter
app.get('/api/openrouter-usage', requireAuth, async (_req, res) => {
  const key = process.env.OPENROUTER_API_KEY || '';
  if (!key) return res.json({ error: 'OPENROUTER_API_KEY not set in .env', data: null });
  try {
    const r = await fetch('https://openrouter.ai/api/v1/auth/key', {
      headers: { Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(6000),
    });
    if (!r.ok) throw new Error(`OpenRouter ${r.status}`);
    const data = await r.json();
    res.json(data);
  } catch (err) {
    res.status(502).json({ error: err.message, data: null });
  }
});

// GET /api/codegraph  — parse src/ imports into nodes + links
app.get('/api/codegraph', requireAuth, async (_req, res) => {
  async function walk(dir) {
    let out = [];
    const entries = await readdir(dir, { withFileTypes: true });
    for (const e of entries) {
      const full = join(dir, e.name);
      if (e.isDirectory() && !['node_modules', '.git', 'dist', 'public'].includes(e.name)) {
        out = out.concat(await walk(full));
      } else if (e.isFile() && /\.(jsx?|tsx?)$/.test(e.name)) {
        out.push(full);
      }
    }
    return out;
  }

  try {
    const srcDir = join(__dirname, 'src');
    const files  = await walk(srcDir);

    const DIR_COLORS = {
      components: '#00c8ff',
      hooks:      '#f5a623',
      utils:      '#00d4aa',
      '.':        '#a78bfa',
    };

    // Build node list
    const nodes = files.map(f => {
      const rel  = relative(srcDir, f);
      const dir  = dirname(rel);
      const name = basename(f, extname(f));
      return {
        id:    rel,
        label: name,
        type:  'file',
        color: DIR_COLORS[dir] || '#6a959d',
        r:     10,
        links: 0,
        meta:  { path: rel, dir: dir === '.' ? 'root' : dir },
      };
    });

    // Maps for resolving imports
    const byFullPath = {};
    const byNoExt    = {};
    nodes.forEach(n => {
      const full = join(srcDir, n.id);
      byFullPath[full] = n;
      byNoExt[full.replace(/\.(jsx?|tsx?)$/, '')] = n;
    });

    const links = [];
    for (const f of files) {
      const content = await readFile(f, 'utf8');
      const srcId   = relative(srcDir, f);
      const imports = [...content.matchAll(/from\s+['"](\.[^'"]+)['"]/g)].map(m => m[1]);

      for (const imp of imports) {
        const abs = resolve(dirname(f), imp);
        const tgt = byFullPath[abs] || byNoExt[abs]
          || byNoExt[join(abs, 'index')];
        if (tgt && tgt.id !== srcId) {
          links.push({ source: srcId, target: tgt.id });
          tgt.links++;
          tgt.r = Math.min(22, 10 + tgt.links * 2.5);
        }
      }
    }

    res.json({ nodes, links });
  } catch (err) {
    res.status(500).json({ error: err.message, nodes: [], links: [] });
  }
});

// GET /api/n8ngraph  — fetch workflows from n8n API
app.get('/api/n8ngraph', requireAuth, async (_req, res) => {
  const apiKey = process.env.N8N_API_KEY || '';
  if (!apiKey) {
    return res.json({ error: 'N8N_API_KEY not set in .env', nodes: [], links: [] });
  }
  try {
    if (!N8N_BASE_URL) {
      return res.json({ error: 'N8N_BASE_URL not set in .env', nodes: [], links: [] });
    }
    const r = await fetch(`${N8N_BASE_URL}/api/v1/workflows?limit=50`, {
      headers: { 'X-N8N-API-KEY': apiKey },
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) throw new Error(`n8n API ${r.status}`);
    const { data: workflows } = await r.json();

    const root = { id: 'n8n-root', label: 'n8n', type: 'root', color: '#f5a623', r: 24,
      meta: { Instance: N8N_BASE_URL || 'n8n', Workflows: workflows.length } };
    const nodes = [root, ...workflows.map(wf => ({
      id:    `wf-${wf.id}`,
      label: wf.name,
      type:  wf.active ? 'active' : 'inactive',
      color: wf.active ? '#f5a623' : '#3a5060',
      r:     Math.min(18, 10 + (wf.nodes?.length || 0)),
      meta:  {
        Active:  wf.active ? 'Yes' : 'No',
        Nodes:   wf.nodes?.length || 0,
        Created: wf.createdAt?.split('T')[0] || '—',
      },
    }))];
    const links = nodes.slice(1).map(n => ({ source: 'n8n-root', target: n.id }));
    res.json({ nodes, links });
  } catch (err) {
    res.status(502).json({ error: err.message, nodes: [], links: [] });
  }
});

// GET /api/gtmgraph  — placeholder until GTM API key is configured
app.get('/api/gtmgraph', requireAuth, (_req, res) => {
  const apiKey = process.env.GTM_API_KEY || '';
  if (!apiKey) {
    return res.json({ error: 'GTM_API_KEY not set in .env', nodes: [], links: [] });
  }
  // Future: call GTM API and return tag/trigger/variable graph
  res.json({ nodes: [], links: [], error: 'GTM graph coming soon' });
});

// ── Static files (production only) ──────────────
if (IS_PROD) {
  const dist = join(__dirname, 'dist');
  app.use(express.static(dist));
  app.get('*', (_req, res) => res.sendFile(join(dist, 'index.html')));
}

// ── Start ────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`[hermes-os] server :${PORT}  env=${process.env.NODE_ENV || 'development'}`);
  if (!N8N_URL) console.warn('[hermes-os] WARNING: N8N_BRIEFING_URL not set — briefing panel will be empty');
});
