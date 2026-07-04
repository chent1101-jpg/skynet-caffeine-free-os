import { useRef, useEffect } from 'react';

// ── Static geometry (computed once) ──────────────────
const NODE_COUNT  = 180;
const K_NEIGHBORS = 5;    // edges per node
const HUB_EVERY   = 9;    // every Nth node is a hub (larger, brighter)

function fibSphere(n) {
  const phi = Math.PI * (3 - Math.sqrt(5)); // golden angle
  return Array.from({ length: n }, (_, i) => {
    const y = 1 - (i / (n - 1)) * 2;
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    const t = phi * i;
    return [r * Math.cos(t), y, r * Math.sin(t)];
  });
}

function buildEdges(pts, k) {
  const set = new Set();
  for (let i = 0; i < pts.length; i++) {
    const scored = pts
      .map((p, j) => {
        if (j === i) return [j, -2];
        const d = pts[i][0]*p[0] + pts[i][1]*p[1] + pts[i][2]*p[2];
        return [j, d];
      })
      .sort((a, b) => b[1] - a[1])
      .slice(0, k);
    for (const [j] of scored) {
      set.add(i < j ? `${i}:${j}` : `${j}:${i}`);
    }
  }
  return [...set].map(s => s.split(':').map(Number));
}

const NODES = fibSphere(NODE_COUNT);
const EDGES = buildEdges(NODES, K_NEIGHBORS);
const IS_HUB = NODES.map((_, i) => i % HUB_EVERY === 0);

// ── Rotation helpers ──────────────────────────────────
function rotateY(x, y, z, a) {
  const c = Math.cos(a), s = Math.sin(a);
  return [x * c + z * s, y, -x * s + z * c];
}
function rotateX(x, y, z, a) {
  const c = Math.cos(a), s = Math.sin(a);
  return [x, y * c - z * s, y * s + z * c];
}
function project(x, y, z, r, fov, cx, cy) {
  const scale = fov / (fov + z * r);
  return { sx: cx + x * r * scale, sy: cy + y * r * scale, depth: (z + 1) / 2, scale };
}

// ── Signal particles ──────────────────────────────────
const SIGNALS = EDGES
  .filter(() => Math.random() < 0.28)
  .map(edge => ({
    edge,
    t:     Math.random(),
    speed: 0.004 + Math.random() * 0.005,
    color: Math.random() < 0.7 ? '#00c8ff' : '#a78bfa',
  }));

// ── Outer debris particles ────────────────────────────
const DEBRIS = Array.from({ length: 40 }, () => {
  const angle  = Math.random() * Math.PI * 2;
  const elev   = (Math.random() - 0.5) * Math.PI;
  const dist   = 1.15 + Math.random() * 0.5;  // just outside sphere
  return {
    x:     dist * Math.cos(elev) * Math.cos(angle),
    y:     dist * Math.sin(elev),
    z:     dist * Math.cos(elev) * Math.sin(angle),
    size:  0.5 + Math.random() * 1.2,
    alpha: 0.2 + Math.random() * 0.5,
  };
});

// ── Component ─────────────────────────────────────────
export default function NetworkSphere({ style }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx    = canvas.getContext('2d');
    let animId, frame = 0;

    function resize() {
      const dpr      = window.devicePixelRatio || 1;
      canvas.width   = canvas.offsetWidth  * dpr;
      canvas.height  = canvas.offsetHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    function draw() {
      const W = canvas.offsetWidth, H = canvas.offsetHeight;
      const cx = W / 2, cy = H / 2;
      const r  = Math.min(W, H) * 0.37;
      const fov = r * 2.8;

      ctx.clearRect(0, 0, W, H);

      const rotY = frame * 0.0020;
      const rotX = 0.22 * Math.sin(frame * 0.008);

      // Project all nodes
      const P = NODES.map(([nx, ny, nz]) => {
        const [x1, y1, z1] = rotateY(nx, ny, nz, rotY);
        const [x2, y2, z2] = rotateX(x1, y1, z1, rotX);
        return project(x2, y2, z2, r, fov, cx, cy);
      });

      // Project debris
      const PD = DEBRIS.map(({ x, y, z }) => {
        const [x1, y1, z1] = rotateY(x, y, z, rotY);
        const [x2, y2, z2] = rotateX(x1, y1, z1, rotX);
        return project(x2, y2, z2, r, fov, cx, cy);
      });

      // ── Halo ────────────────────────────────────────
      const halo = ctx.createRadialGradient(cx, cy, r * 0.3, cx, cy, r * 1.5);
      halo.addColorStop(0,   'rgba(0, 140, 255, 0.07)');
      halo.addColorStop(0.5, 'rgba(0,  80, 200, 0.04)');
      halo.addColorStop(1,   'rgba(0,   0,   0, 0)');
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(cx, cy, r * 1.5, 0, Math.PI * 2);
      ctx.fill();

      // ── Edges ───────────────────────────────────────
      for (const [i, j] of EDGES) {
        const a = P[i], b = P[j];
        const avgD = (a.depth + b.depth) * 0.5;
        const alpha = Math.max(0, (avgD - 0.08) * 0.65);
        if (alpha < 0.02) continue;

        ctx.save();
        ctx.beginPath();
        ctx.moveTo(a.sx, a.sy);
        ctx.lineTo(b.sx, b.sy);
        ctx.strokeStyle = `rgba(0, 190, 255, ${alpha * 0.55})`;
        ctx.lineWidth   = 0.4 + avgD * 0.5;
        ctx.shadowColor = '#00aaff';
        ctx.shadowBlur  = avgD * 5;
        ctx.stroke();
        ctx.restore();
      }

      // ── Signal particles ─────────────────────────────
      for (const sig of SIGNALS) {
        sig.t = (sig.t + sig.speed) % 1;
        const [i, j] = sig.edge;
        const a = P[i], b = P[j];
        const avgD = (a.depth + b.depth) * 0.5;
        if (avgD < 0.1) continue;

        const sx = a.sx + (b.sx - a.sx) * sig.t;
        const sy = a.sy + (b.sy - a.sy) * sig.t;

        ctx.save();
        ctx.shadowColor = sig.color;
        ctx.shadowBlur  = 10;
        ctx.beginPath();
        ctx.arc(sx, sy, 1.8 * avgD, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${avgD * 0.95})`;
        ctx.fill();
        ctx.restore();
      }

      // ── Debris ───────────────────────────────────────
      for (let d = 0; d < DEBRIS.length; d++) {
        const dp = PD[d];
        if (dp.depth < 0.1) continue;
        ctx.save();
        ctx.shadowColor = '#00c8ff';
        ctx.shadowBlur  = 4;
        ctx.beginPath();
        ctx.arc(dp.sx, dp.sy, DEBRIS[d].size * dp.scale, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(100, 200, 255, ${DEBRIS[d].alpha * dp.depth})`;
        ctx.fill();
        ctx.restore();
      }

      // ── Nodes ───────────────────────────────────────
      for (let i = 0; i < NODES.length; i++) {
        const p   = P[i];
        const hub = IS_HUB[i];

        // Don't draw nodes behind the sphere (fades naturally)
        const alpha = Math.max(0, (p.depth - 0.05) * 1.1);
        if (alpha < 0.04) continue;

        const baseR = hub ? 4.0 : 1.8;
        const nr    = baseR * (0.5 + p.depth * 0.5) * p.scale;

        // Hub pulse
        const pulse = hub ? (0.75 + 0.25 * Math.sin(frame * 0.04 + i)) : 1;

        ctx.save();
        ctx.shadowColor = hub ? '#ffffff' : '#00c8ff';
        ctx.shadowBlur  = hub ? 16 * pulse : 7;

        // Hub outer ring
        if (hub) {
          ctx.beginPath();
          ctx.arc(p.sx, p.sy, nr * 2.8 * pulse, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(0, 200, 255, ${alpha * 0.12 * pulse})`;
          ctx.fill();
          ctx.beginPath();
          ctx.arc(p.sx, p.sy, nr * 1.8 * pulse, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(0, 220, 255, ${alpha * 0.20 * pulse})`;
          ctx.fill();
        }

        // Core
        const grad = ctx.createRadialGradient(p.sx, p.sy, 0, p.sx, p.sy, nr);
        grad.addColorStop(0,   `rgba(255, 255, 255, ${alpha * pulse})`);
        grad.addColorStop(0.3, `rgba(140, 230, 255, ${alpha * 0.9})`);
        grad.addColorStop(1,   `rgba(0,  160, 255, ${alpha * 0.4})`);
        ctx.beginPath();
        ctx.arc(p.sx, p.sy, nr, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();

        ctx.restore();
      }

      frame++;
      animId = requestAnimationFrame(draw);
    }

    draw();
    return () => { cancelAnimationFrame(animId); ro.disconnect(); };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        width:      '100%',
        height:     '100%',
        display:    'block',
        background: 'transparent',
        ...style,
      }}
    />
  );
}
