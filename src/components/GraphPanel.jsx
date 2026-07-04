import { useRef, useEffect, useState } from 'react';
import * as d3 from 'd3';

const MODES = [
  { id: 'agents',   label: 'CYBERNETIC AGENTS',   desc: 'Live cybernetic agent + service topology' },
  { id: 'codebase', label: 'CODEBASE', desc: 'Hermes OS source import graph'  },
  { id: 'n8n',      label: 'N8N',      desc: 'Workflow graph'                 },
  { id: 'gtm',      label: 'GTM',      desc: 'Tag dependency map'             },
];

const AGENT_LEGEND = [
  { color: '#00c8ff', label: 'Cybernetic Agent' },
  { color: '#a78bfa', label: 'API / Model'},
  { color: '#f5a623', label: 'Automation' },
  { color: '#7289da', label: 'Gateway'    },
  { color: '#4a8a6a', label: 'Infra'      },
  { color: '#ea4335', label: 'Google'     },
  { color: '#00d4aa', label: 'Service'    },
];

// ── Agent topology ────────────────────────────────
function buildAgentGraph(statuses) {
  const nodes = [
    { id: 'hermes',     label: 'Hermes',     type: 'agent',      color: '#00c8ff', r: 26,
      meta: { Model: 'DeepSeek V4 Flash', Host: 'VPS', Crons: '2 active', Gateway: 'Telegram' } },
    { id: 'vps',        label: 'VPS',        type: 'infra',       color: '#4a8a6a', r: 18,
      meta: { OS: 'Ubuntu 24.04', Containers: '4 docker' } },
    { id: 'traefik',    label: 'Traefik',    type: 'infra',       color: '#3a6a5a', r: 11,
      meta: { Type: 'Reverse proxy', Host: 'VPS' } },
    { id: 'openrouter', label: 'OpenRouter', type: 'api',         color: '#a78bfa', r: 20,
      meta: { Default: 'V4 Flash', Mid: 'V4 Pro', Agentic: 'Kimi K2.7', Power: 'Sonnet 4.6' } },
    { id: 'deepseek',   label: 'DeepSeek',   type: 'model',       color: '#7c6bea', r: 13,
      meta: { Tiers: 'Flash · Pro', Cost: '$0.09 / $0.44 per M' } },
    { id: 'n8n',        label: 'n8n',        type: 'automation',  color: '#f5a623', r: 20,
      meta: { Instance: 'your-n8n-instance.example.com', Creds: 'Gmail · Calendar · Sheets' } },
    { id: 'telegram',   label: 'Telegram',   type: 'gateway',     color: '#7289da', r: 15,
      meta: { Users: '1 allowlisted', STT: 'Groq (pending)' } },
    { id: 'gmail',      label: 'Gmail',      type: 'google',      color: '#ea4335', r: 12,
      meta: { Account: 'myjobsearchjune2026', Access: 'via n8n only' } },
    { id: 'gcal',       label: 'Calendar',   type: 'google',      color: '#4285f4', r: 12,
      meta: { Account: 'myjobsearchjune2026', Access: 'via n8n only' } },
    { id: 'sheets',     label: 'Sheets',     type: 'google',      color: '#0f9d58', r: 12,
      meta: { Doc: 'Job Tracker', Access: 'via n8n only' } },
    { id: 'drive',      label: 'Drive',      type: 'google',      color: '#fbbc04', r: 11,
      meta: { Doc: 'Job Search Drive', Access: 'via n8n only' } },
    { id: 'stape',      label: 'Stape.io',   type: 'service',     color: '#ff6b6b', r: 13,
      meta: { Client: 'Hinckley Yachts', Type: 'sGTM server-side' } },
    { id: 'statsig',    label: 'Statsig',    type: 'service',     color: '#00d4aa', r: 13,
      meta: { Client: 'Woodmark Hotel', Type: 'Sidecar A/B experiment' } },
    { id: 'tavily',     label: 'Tavily',     type: 'api',         color: '#60a5fa', r: 11,
      meta: { Type: 'Web search API', Status: 'Active' } },
  ];

  const links = [
    { source: 'hermes',     target: 'vps',        label: 'runs on'     },
    { source: 'vps',        target: 'traefik',    label: 'proxy'       },
    { source: 'vps',        target: 'n8n',        label: 'hosts'       },
    { source: 'hermes',     target: 'openrouter', label: 'model calls' },
    { source: 'openrouter', target: 'deepseek',   label: 'routes to'   },
    { source: 'hermes',     target: 'n8n',        label: 'webhook'     },
    { source: 'hermes',     target: 'telegram',   label: 'gateway'     },
    { source: 'hermes',     target: 'tavily',     label: 'web search'  },
    { source: 'n8n',        target: 'gmail',      label: 'reads inbox' },
    { source: 'n8n',        target: 'gcal',       label: 'reads events'},
    { source: 'n8n',        target: 'sheets',     label: 'writes'      },
    { source: 'n8n',        target: 'drive',      label: 'stores docs' },
    { source: 'stape',      target: 'n8n',        label: 'sGTM events' },
    { source: 'statsig',    target: 'hermes',     label: 'A/B client'  },
  ];

  nodes.forEach(n => {
    const s = statuses[n.id];
    n.status = s === true ? 'live' : s === false ? 'down' : null;
  });

  return { nodes, links };
}

// ── D3 Force Graph ────────────────────────────────
function ForceGraph({ nodes, links, onSelect }) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!nodes.length || !containerRef.current) return;
    const el = containerRef.current;
    const W = el.clientWidth  || 700;
    const H = el.clientHeight || 500;

    // Clone — D3 mutates position properties
    const ns = nodes.map(n => ({ ...n }));
    const ls = links.map(l => ({ ...l }));

    const svg = d3.select(el)
      .append('svg')
      .attr('width', '100%')
      .attr('height', '100%')
      .attr('viewBox', `0 0 ${W} ${H}`);

    const g = svg.append('g');

    svg.call(
      d3.zoom().scaleExtent([0.2, 4])
        .on('zoom', e => g.attr('transform', e.transform))
    );

    const sim = d3.forceSimulation(ns)
      .force('link',      d3.forceLink(ls).id(d => d.id).distance(110).strength(0.35))
      .force('charge',    d3.forceManyBody().strength(-420))
      .force('center',    d3.forceCenter(W / 2, H / 2))
      .force('collision', d3.forceCollide(d => (d.r || 10) + 12));

    // Links
    const link = g.append('g').selectAll('line')
      .data(ls).join('line')
      .attr('stroke', 'rgba(0,200,255,0.13)')
      .attr('stroke-width', 1);

    // Node groups
    const node = g.append('g').selectAll('g')
      .data(ns).join('g')
      .attr('cursor', 'pointer')
      .on('click', (e, d) => {
        e.stopPropagation();
        onSelect(nodes.find(n => n.id === d.id) || null);
      })
      .call(
        d3.drag()
          .on('start', (e, d) => { if (!e.active) sim.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
          .on('drag',  (e, d) => { d.fx = e.x; d.fy = e.y; })
          .on('end',   (e, d) => { if (!e.active) sim.alphaTarget(0); d.fx = null; d.fy = null; })
      );

    // Status ring
    node.append('circle')
      .attr('r', d => (d.r || 10) + 5)
      .attr('fill', 'none')
      .attr('stroke', d =>
        d.status === 'live' ? d.color :
        d.status === 'down' ? '#ff4444' : 'transparent')
      .attr('stroke-width', 1)
      .attr('opacity', 0.3);

    // Main circle
    node.append('circle')
      .attr('r', d => d.r || 10)
      .attr('fill', d => (d.color || '#4a6080') + '22')
      .attr('stroke', d => d.color || '#4a6080')
      .attr('stroke-width', 1.5);

    // Initials
    node.append('text')
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'central')
      .attr('font-family', 'SF Mono, Courier New, monospace')
      .attr('font-size', d => Math.max(7, (d.r || 10) * 0.52))
      .attr('fill', d => d.color || '#a0b8be')
      .attr('font-weight', '700')
      .attr('pointer-events', 'none')
      .text(d => d.label.split(/[\s\-.]/).map(w => w[0]).join('').toUpperCase().slice(0, 3));

    // Name label below
    node.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', d => (d.r || 10) + 14)
      .attr('font-family', 'SF Mono, Courier New, monospace')
      .attr('font-size', 8)
      .attr('fill', '#6a8a92')
      .attr('letter-spacing', '0.5px')
      .attr('pointer-events', 'none')
      .text(d => d.label.toUpperCase());

    sim.on('tick', () => {
      link
        .attr('x1', d => d.source.x).attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x).attr('y2', d => d.target.y);
      node.attr('transform', d => `translate(${d.x},${d.y})`);
    });

    svg.on('click', () => onSelect(null));

    return () => {
      sim.stop();
      d3.select(el).selectAll('*').remove();
    };
  }, [nodes, links]);

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />;
}

// ── GraphPanel ────────────────────────────────────
export default function GraphPanel({ token }) {
  const [mode, setMode]           = useState('agents');
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [statuses, setStatuses]   = useState({});
  const [selected, setSelected]   = useState(null);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState(null);

  // Live agent statuses
  useEffect(() => {
    fetch('/api/agents', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(agents => {
        const map = {};
        agents.forEach(a => { map[a.id] = a.online; });
        setStatuses(map);
      }).catch(() => {});
  }, [token]);

  // Load graph for current mode
  useEffect(() => {
    setSelected(null);
    if (mode === 'agents') {
      setGraphData(buildAgentGraph(statuses));
      setLoading(false);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    const ep = { codebase: '/api/codegraph', n8n: '/api/n8ngraph', gtm: '/api/gtmgraph' }[mode];
    fetch(ep, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => {
        setGraphData({ nodes: data.nodes || [], links: data.links || [] });
        setError(data.error || null);
        setLoading(false);
      })
      .catch(e => { setError(e.message); setLoading(false); });
  }, [mode, statuses, token]);

  const cur = MODES.find(m => m.id === mode);

  return (
    <div className="gp-wrap">
      {/* Mode tabs */}
      <div className="gp-tabs">
        {MODES.map(m => (
          <button
            key={m.id}
            className={`gp-tab${mode === m.id ? ' active' : ''}`}
            onClick={() => setMode(m.id)}
          >
            {m.label}
          </button>
        ))}
        <div className="gp-tab-meta">
          {!loading && `${graphData.nodes.length} nodes · ${graphData.links.length} edges`}
        </div>
      </div>

      {/* Body */}
      <div className="gp-body">

        {/* Canvas */}
        <div className="gp-canvas">
          {loading ? (
            <div className="gp-state">RENDERING GRAPH...</div>
          ) : error && !graphData.nodes.length ? (
            <div className="gp-state gp-error">
              <div>⚠ {error}</div>
              {(mode === 'n8n' || mode === 'gtm') && (
                <div className="gp-hint">
                  Add {mode === 'n8n' ? 'N8N_API_KEY' : 'GTM_API_KEY'} to .env to enable
                </div>
              )}
            </div>
          ) : (
            <ForceGraph
              key={`${mode}-${graphData.nodes.length}`}
              nodes={graphData.nodes}
              links={graphData.links}
              onSelect={setSelected}
            />
          )}
          <div className="gp-zoom-hint">scroll to zoom · drag to pan · drag nodes</div>
        </div>

        {/* Detail panel */}
        <div className="gp-detail">
          <div className="gp-detail-head">
            {cur?.label}
            <span className="gp-detail-desc">{cur?.desc}</span>
          </div>

          {selected ? (
            <div className="gp-detail-body">
              <div className="gp-node-name" style={{ color: selected.color }}>
                {selected.label}
              </div>
              <div className="gp-node-type">{selected.type?.toUpperCase()}</div>
              {selected.status && (
                <div className={`gp-node-status status-${selected.status}`}>
                  ● {selected.status.toUpperCase()}
                </div>
              )}
              {selected.meta && (
                <div className="gp-node-meta">
                  {Object.entries(selected.meta).map(([k, v]) => (
                    <div key={k} className="gp-meta-row">
                      <span className="gp-meta-key">{k}</span>
                      <span className="gp-meta-val">{String(v)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="gp-detail-empty">
              Click a node<br />to inspect
            </div>
          )}

          {mode === 'agents' && (
            <div className="gp-legend">
              <div className="gp-legend-head">NODE TYPES</div>
              {AGENT_LEGEND.map(({ color, label }) => (
                <div key={label} className="gp-legend-row">
                  <span className="gp-legend-dot" style={{ background: color }} />
                  <span className="gp-legend-label">{label}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
