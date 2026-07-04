import { useRef, useEffect } from 'react';

// ── Geometry constants ────────────────────────────────
const N_NODES    = 423;   // outer sphere nodes (75%)
const N_INNER    = 112;   // inner cluster nodes near orb (25%)
const INNER_R_FRAC = 0.18; // inner cluster radius as fraction of sphere R
const K_NEAR     = 5;     // edges per main node
const EQ_COUNT   = 0;     // dedicated equatorial ring nodes (disabled)
const EQ_K       = 3;     // how many adjacent ring nodes to connect
const SPEED      = 0.0016;
const WOBBLE_AMP = 0.18;
const WOBBLE_SPD = 0.007;

// ── Fibonacci sphere distribution ────────────────────
function fibSphere(n) {
  const phi = Math.PI * (3 - Math.sqrt(5));
  return Array.from({ length: n }, (_, i) => {
    const y = 1 - (i / (n - 1)) * 2;
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    const t = phi * i;
    return [r * Math.cos(t), y, r * Math.sin(t)];
  });
}

// ── Equatorial ring nodes (y ≈ 0) ────────────────────
function equatorialRing(count) {
  return Array.from({ length: count }, (_, i) => {
    const theta = (i / count) * Math.PI * 2;
    return [Math.cos(theta), 0, Math.sin(theta)];
  });
}

// ── Build K-nearest-neighbor edges ───────────────────
function buildEdges(pts, k) {
  const set = new Set();
  for (let i = 0; i < pts.length; i++) {
    const scored = pts
      .map((p, j) => {
        if (j === i) return [j, -2];
        return [j, pts[i][0]*p[0] + pts[i][1]*p[1] + pts[i][2]*p[2]];
      })
      .sort((a, b) => b[1] - a[1])
      .slice(0, k);
    for (const [j] of scored) {
      const key = i < j ? `${i}:${j}` : `${j}:${i}`;
      set.add(key);
    }
  }
  return [...set].map(s => s.split(':').map(Number));
}

// ── Static geometry (computed once at module load) ────
const SPHERE_PTS = fibSphere(N_NODES);
const EQ_PTS     = equatorialRing(EQ_COUNT);
const INNER_PTS  = fibSphere(N_INNER);   // inner cluster near orb

// All nodes: outer sphere → equatorial ring → inner cluster
const ALL_PTS    = [...SPHERE_PTS, ...EQ_PTS, ...INNER_PTS];
const EQ_START   = N_NODES;              // index where equatorial nodes begin
const INNER_START = N_NODES + EQ_COUNT; // index where inner cluster begins

// Sphere-to-sphere edges
const SPHERE_EDGES = buildEdges(SPHERE_PTS, K_NEAR);

// Equatorial ring self-edges (adjacent ring nodes)
const EQ_EDGES = [];
for (let i = 0; i < EQ_COUNT; i++) {
  for (let d = 1; d <= EQ_K; d++) {
    const j = (i + d) % EQ_COUNT;
    EQ_EDGES.push([EQ_START + i, EQ_START + j]);
  }
}

// Cross-edges: connect equatorial ring to nearest sphere nodes
const CROSS_EDGES = [];
for (let ei = 0; ei < EQ_COUNT; ei++) {
  const ep = EQ_PTS[ei];
  const nearest = SPHERE_PTS
    .map((p, si) => [si, ep[0]*p[0] + ep[1]*p[1] + ep[2]*p[2]])
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2);
  for (const [si] of nearest) {
    CROSS_EDGES.push([EQ_START + ei, si]);
  }
}

// Per-node random size scale: 1.0 – 3.0×
const NODE_SCALE = ALL_PTS.map(() => 1.0 + Math.random() * 4.0);

// Per-node pulse offset so they don't all throb together
const NODE_PHASE = ALL_PTS.map(() => Math.random() * Math.PI * 2);

// 10% of nodes are red and pulsate more aggressively
const NODE_RED = ALL_PTS.map(() => Math.random() < 0.10);

// ── Rotation helpers ──────────────────────────────────
function ry(x, y, z, a) {
  const c = Math.cos(a), s = Math.sin(a);
  return [x * c + z * s, y, -x * s + z * c];
}
function rx(x, y, z, a) {
  const c = Math.cos(a), s = Math.sin(a);
  return [x, y * c - z * s, y * s + z * c];
}

// ── Explosion system ──────────────────────────────────
const PULSE_INTERVAL = 110;   // frames between pulse bursts
const PULSE_COLORS   = [
  [0, 200, 255],   // cyan
  [100, 160, 255], // blue-white
  [160, 100, 255], // purple
  [0, 240, 200],   // teal
];

// ── Centre orb color: red 25% of cycle, blue 75% ─────
// Cycle: 0–10% ramp to red, 10–25% hold red, 25–35% ramp to blue, 35–100% hold blue
function orbColor(frame) {
  const period = 420;
  const t = (frame % period) / period;
  let red;
  if      (t < 0.10) red = t / 0.10;               // ramp up
  else if (t < 0.25) red = 1.0;                     // hold red
  else if (t < 0.35) red = 1 - (t - 0.25) / 0.10;  // ramp down
  else               red = 0;                        // hold blue
  // blue anchor: [0, 160, 255]   red anchor: [255, 30, 20]
  return [
    Math.round(red * 255),
    Math.round(red * 30  + (1 - red) * 160),
    Math.round(red * 20  + (1 - red) * 255),
  ];
}

// Distance from (cx,cy) to the screen edge along a given angle
function edgeDist(angle, cx, cy, W, H) {
  const cos = Math.cos(angle), sin = Math.sin(angle);
  let d = Infinity;
  if (cos > 0)  d = Math.min(d, (W - cx) / cos);
  if (cos < 0)  d = Math.min(d, cx / -cos);
  if (sin > 0)  d = Math.min(d, (H - cy) / sin);
  if (sin < 0)  d = Math.min(d, cy / -sin);
  return d;
}

function spawnBurst(cx, cy, W, H, color) {
  color = color || PULSE_COLORS[0];
  const count  = 28 + Math.floor(Math.random() * 18);
  const rays   = [];
  for (let i = 0; i < count; i++) {
    const angle   = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.3;
    const speed   = 7 + Math.random() * 7;          // faster to reach the edge
    const length  = 22 + Math.random() * 50;
    const maxDist = edgeDist(angle, cx, cy, W, H);  // exact screen-edge distance
    rays.push({ angle, speed, length, dist: 0, maxDist });
  }
  // Burst lives until the slowest ray reaches the edge
  const maxLife = Math.max(...rays.map(r => Math.ceil(r.maxDist / (7)))) + 10;
  return { cx, cy, color, rays, life: 0, maxLife };
}

// ── Component ─────────────────────────────────────────
export default function SphereBackground() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx    = canvas.getContext('2d');
    let animId, frame = 0;
    const pulses = [];    // expanding shockwave rings
    const bursts = [];    // ray burst systems

    function resize() {
      const dpr    = window.devicePixelRatio || 1;
      canvas.width  = window.innerWidth  * dpr;
      canvas.height = window.innerHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    window.addEventListener('resize', resize);

    function project(x, y, z, R, fov, cx, cy) {
      const scale = fov / (fov + z * R);
      return {
        sx:    cx + x * R * scale,
        sy:    cy + y * R * scale,
        depth: (z + 1) * 0.5,
        scale,
      };
    }

    function draw() {
      const W  = window.innerWidth, H = window.innerHeight;
      const cx = W * 0.5, cy = H * 0.5;
      // Sphere large enough to nearly fill the smaller axis
      const R  = Math.min(W, H) * 0.44;
      // Tighter FOV → stronger perspective "pinch" at the sides
      const fov = R * 1.6;

      ctx.clearRect(0, 0, W, H);

      const rotY = frame * SPEED;
      const rotX = WOBBLE_AMP * Math.sin(frame * WOBBLE_SPD);

      // Project every node — inner cluster uses a smaller radius
      const P = ALL_PTS.map(([nx, ny, nz], i) => {
        const [x1, y1, z1] = ry(nx, ny, nz, rotY);
        const [x2, y2, z2] = rx(x1, y1, z1, rotX);
        const effectiveR = i >= INNER_START ? R * INNER_R_FRAC : R;
        return project(x2, y2, z2, effectiveR, fov, cx, cy);
      });

      // ── Ambient centre glow ──────────────────────────
      const centreGlow = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 1.1);
      centreGlow.addColorStop(0,   'rgba(0, 80, 200, 0.22)');
      centreGlow.addColorStop(0.4, 'rgba(0, 50, 160, 0.12)');
      centreGlow.addColorStop(1,   'rgba(0,  0,   0, 0)');
      ctx.fillStyle = centreGlow;
      ctx.fillRect(0, 0, W, H);

      // ── Pulsating centre orb ─────────────────────────
      const [cr, cg, cb] = orbColor(frame);
      const orbPulse = 0.72 + 0.28 * Math.sin(frame * 0.07);
      const orbR     = R * 0.11 * orbPulse;

      // Wide ambient bloom
      ctx.save();
      const bloom = ctx.createRadialGradient(cx, cy, 0, cx, cy, orbR * 5);
      bloom.addColorStop(0,   `rgba(${cr},${cg},${cb},0.28)`);
      bloom.addColorStop(0.4, `rgba(${cr},${cg},${cb},0.10)`);
      bloom.addColorStop(1,   'rgba(0,0,0,0)');
      ctx.fillStyle = bloom;
      ctx.beginPath();
      ctx.arc(cx, cy, orbR * 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Mid glow halo
      ctx.save();
      const halo = ctx.createRadialGradient(cx, cy, 0, cx, cy, orbR * 2.2);
      halo.addColorStop(0,   `rgba(${cr},${cg},${cb},0.60)`);
      halo.addColorStop(0.6, `rgba(${cr},${cg},${cb},0.20)`);
      halo.addColorStop(1,   'rgba(0,0,0,0)');
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(cx, cy, orbR * 2.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Core orb
      ctx.save();
      ctx.shadowColor = `rgb(${cr},${cg},${cb})`;
      ctx.shadowBlur  = 40 * orbPulse;
      const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, orbR);
      core.addColorStop(0,   `rgba(255,255,255,0.98)`);
      core.addColorStop(0.25,`rgba(${cr},${cg},${cb},0.95)`);
      core.addColorStop(1,   `rgba(${cr},${cg},${cb},0.40)`);
      ctx.beginPath();
      ctx.arc(cx, cy, orbR, 0, Math.PI * 2);
      ctx.fillStyle = core;
      ctx.fill();
      ctx.restore();

      // ── Nodes ────────────────────────────────────────
      for (let i = 0; i < ALL_PTS.length; i++) {
        const p     = P[i];
        const alpha = Math.max(0, (p.depth - 0.04) * 1.15);
        if (alpha < 0.03) continue;

        // Each node has its own random scale plus a slow personal pulse
        const randScale = NODE_SCALE[i];
        const isRed     = NODE_RED[i];
        // Red nodes pulse more aggressively (faster + wider swing)
        const pulse     = isRed
          ? 0.55 + 0.45 * Math.sin(frame * 0.09 + NODE_PHASE[i])
          : 0.82 + 0.18 * Math.sin(frame * 0.038 + NODE_PHASE[i]);
        const nr        = 1.6 * randScale * (0.45 + p.depth * 0.55) * p.scale * pulse;

        // Larger nodes glow more
        const glowStr = Math.min(24, 6 + randScale * 6);

        ctx.save();

        if (isRed) {
          ctx.shadowColor = '#ff2200';
          ctx.shadowBlur  = glowStr * alpha * 1.4;

          // Red outer halo
          ctx.beginPath();
          ctx.arc(p.sx, p.sy, nr * 2.8, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255, 40, 0, ${alpha * 0.12 * pulse})`;
          ctx.fill();

          // Red core
          const g = ctx.createRadialGradient(p.sx, p.sy, 0, p.sx, p.sy, nr);
          g.addColorStop(0,   `rgba(255, 255, 200, ${alpha * pulse})`);
          g.addColorStop(0.3, `rgba(255,  80,  20, ${alpha * 0.95})`);
          g.addColorStop(1,   `rgba(180,   0,   0, ${alpha * 0.35})`);
          ctx.beginPath();
          ctx.arc(p.sx, p.sy, nr, 0, Math.PI * 2);
          ctx.fillStyle = g;
          ctx.fill();
        } else {
          ctx.shadowColor = randScale > 2 ? '#00ddff' : '#0088ff';
          ctx.shadowBlur  = glowStr * alpha;

          // Outer halo for bigger blue nodes
          if (randScale > 2.5) {
            ctx.beginPath();
            ctx.arc(p.sx, p.sy, nr * 2.4, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(0, 200, 255, ${alpha * 0.10 * (randScale / 5)})`;
            ctx.fill();
          }

          // Blue core
          const g = ctx.createRadialGradient(p.sx, p.sy, 0, p.sx, p.sy, nr);
          g.addColorStop(0,   `rgba(255, 255, 255, ${alpha * pulse})`);
          g.addColorStop(0.3, `rgba(160, 235, 255, ${alpha * 0.95})`);
          g.addColorStop(1,   `rgba(0,   150, 255, ${alpha * 0.35})`);
          ctx.beginPath();
          ctx.arc(p.sx, p.sy, nr, 0, Math.PI * 2);
          ctx.fillStyle = g;
          ctx.fill();
        }
        ctx.restore();
      }

      // ── Spawn burst every N frames ───────────────────
      if (frame % PULSE_INTERVAL === 0) {
        bursts.push(spawnBurst(cx, cy, W, H, orbColor(frame)));
      }

      // ── Ray bursts (shooting to screen edge) ─────────
      for (let bi = bursts.length - 1; bi >= 0; bi--) {
        const burst = bursts[bi];
        burst.life++;
        const [r, g, b] = burst.color;
        if (burst.life >= burst.maxLife) { bursts.splice(bi, 1); continue; }

        for (const ray of burst.rays) {
          ray.dist += ray.speed;
          if (ray.dist > ray.maxDist) continue;

          // Fade: bright at start, dims as it approaches screen edge (-30% visibility)
          const progress = ray.dist / ray.maxDist;
          const alpha    = Math.max(0, 1 - progress * progress) * 0.294;
          if (alpha < 0.02) continue;

          const tx = cx + Math.cos(ray.angle) * ray.dist;
          const ty = cy + Math.sin(ray.angle) * ray.dist;

          ctx.save();
          // Trail runs from orb centre all the way to the current tip
          const grad = ctx.createLinearGradient(cx, cy, tx, ty);
          grad.addColorStop(0,   `rgba(${r},${g},${b},0)`);
          grad.addColorStop(0.15,`rgba(${r},${g},${b},${alpha * 0.25})`);
          grad.addColorStop(1,   `rgba(${r},${g},${b},${alpha})`);
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.lineTo(tx, ty);
          ctx.strokeStyle = grad;
          ctx.lineWidth   = 1.2 + alpha * 1.8;
          ctx.shadowColor = `rgb(${r},${g},${b})`;
          ctx.shadowBlur  = 10 * alpha;
          ctx.stroke();

          // Tip — wide ambient bloom
          const tipR = 2.5 + alpha * 3.5;
          ctx.shadowColor = `rgb(${r},${g},${b})`;
          ctx.shadowBlur  = 0;
          const tipBloom = ctx.createRadialGradient(tx, ty, 0, tx, ty, tipR * 6);
          tipBloom.addColorStop(0,   `rgba(${r},${g},${b},${alpha * 0.55})`);
          tipBloom.addColorStop(0.4, `rgba(${r},${g},${b},${alpha * 0.18})`);
          tipBloom.addColorStop(1,   'rgba(0,0,0,0)');
          ctx.beginPath();
          ctx.arc(tx, ty, tipR * 6, 0, Math.PI * 2);
          ctx.fillStyle = tipBloom;
          ctx.fill();

          // Tip — tight halo
          const tipHalo = ctx.createRadialGradient(tx, ty, 0, tx, ty, tipR * 2.2);
          tipHalo.addColorStop(0,   `rgba(255,255,255,${alpha * 0.90})`);
          tipHalo.addColorStop(0.5, `rgba(${r},${g},${b},${alpha * 0.60})`);
          tipHalo.addColorStop(1,   'rgba(0,0,0,0)');
          ctx.shadowBlur  = 22 * alpha;
          ctx.beginPath();
          ctx.arc(tx, ty, tipR * 2.2, 0, Math.PI * 2);
          ctx.fillStyle = tipHalo;
          ctx.fill();

          // Tip — hot white core
          ctx.shadowBlur  = 30 * alpha;
          ctx.beginPath();
          ctx.arc(tx, ty, tipR, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255,255,255,${alpha})`;
          ctx.fill();
          ctx.restore();
        }
      }

      frame++;
      animId = requestAnimationFrame(draw);
    }

    draw();
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position:      'fixed',
        inset:         0,
        width:         '100vw',
        height:        '100vh',
        pointerEvents: 'none',
        zIndex:        0,
        opacity:       1.0,
        background:    'transparent',
      }}
    />
  );
}
