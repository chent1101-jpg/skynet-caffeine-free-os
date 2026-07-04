import { useRef, useEffect } from 'react';

// Wave configs — each layer has its own color, speed, amplitude, vertical offset
const WAVES = [
  // Big slow base waves
  { amp: 110, freq: 0.0055, speed: 0.22, phase: 0.0, yOff:  0.45, color: '#1a4aff', glow: '#1a4aff', opacity: 0.55, width: 1.8, particles: false },
  { amp: 90,  freq: 0.0065, speed: 0.18, phase: 1.8, yOff:  0.52, color: '#6a35d0', glow: '#7c6bea', opacity: 0.50, width: 1.5, particles: false },
  // Mid accent waves
  { amp: 76,  freq: 0.0090, speed: 0.35, phase: 3.2, yOff:  0.48, color: '#00c8ff', glow: '#00c8ff', opacity: 0.70, width: 1.4, particles: true  },
  { amp: 56,  freq: 0.0120, speed: 0.50, phase: 5.5, yOff:  0.55, color: '#a78bfa', glow: '#a78bfa', opacity: 0.55, width: 1.1, particles: true  },
  // Fast thin highlights
  { amp: 36,  freq: 0.0160, speed: 0.70, phase: 1.0, yOff:  0.42, color: '#00d4aa', glow: '#00d4aa', opacity: 0.40, width: 0.9, particles: false },
  { amp: 44,  freq: 0.0100, speed: 0.42, phase: 4.1, yOff:  0.58, color: '#f5a623', glow: '#f5a623', opacity: 0.30, width: 1.0, particles: true  },
  // Subtle wide backdrop
  { amp: 140, freq: 0.0040, speed: 0.12, phase: 2.5, yOff:  0.50, color: '#2a2060', glow: '#3a1a80', opacity: 0.35, width: 3.0, particles: false },
];

// Pre-seeded particles that follow specific waves
function seedParticles(waveIdx, count) {
  return Array.from({ length: count }, (_, i) => ({
    waveIdx,
    x:     Math.random(),        // 0–1 normalised x position
    size:  1 + Math.random() * 2.5,
    alpha: 0.3 + Math.random() * 0.7,
    speed: 0.0002 + Math.random() * 0.0006,  // drift speed
    drift: Math.random() < 0.5 ? 1 : -1,
  }));
}

const ALL_PARTICLES = [
  ...seedParticles(2, 28),
  ...seedParticles(3, 20),
  ...seedParticles(5, 15),
];

function waveY(wave, x, w, h, t) {
  const px = x * w;
  return (
    h * wave.yOff +
    wave.amp * Math.sin(px * wave.freq + t * wave.speed + wave.phase) +
    wave.amp * 0.4 * Math.sin(px * wave.freq * 2.3 + t * wave.speed * 1.5 + wave.phase + 1.1) +
    wave.amp * 0.2 * Math.sin(px * wave.freq * 0.7 + t * wave.speed * 0.6 + wave.phase + 2.3)
  );
}

export default function WaveBackground() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx    = canvas.getContext('2d');
    let animId;
    let t = 0;

    function resize() {
      canvas.width  = canvas.offsetWidth  * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    }
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    function drawWave(wave, t) {
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;

      ctx.save();
      ctx.beginPath();
      ctx.lineWidth   = wave.width;
      ctx.strokeStyle = wave.color;
      ctx.shadowColor = wave.glow;
      ctx.shadowBlur  = 14;
      ctx.globalAlpha = wave.opacity;

      for (let x = 0; x <= w; x += 2) {
        const y = waveY(wave, x / w, w, h, t);
        x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Second pass — brighter thin core line for the "glowing filament" look
      ctx.beginPath();
      ctx.lineWidth   = wave.width * 0.35;
      ctx.strokeStyle = '#ffffff';
      ctx.shadowColor = wave.glow;
      ctx.shadowBlur  = 6;
      ctx.globalAlpha = wave.opacity * 0.45;

      for (let x = 0; x <= w; x += 2) {
        const y = waveY(wave, x / w, w, h, t);
        x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.restore();
    }

    function drawParticles(t) {
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;

      ALL_PARTICLES.forEach(p => {
        // Drift particle along x over time
        p.x = (p.x + p.speed * p.drift + 1) % 1;

        const wave = WAVES[p.waveIdx];
        const px   = p.x * w;
        const py   = waveY(wave, p.x, w, h, t);

        // Pulse alpha slightly
        const pulse = 0.6 + 0.4 * Math.sin(t * 2.1 + p.x * 20);
        const alpha = p.alpha * pulse;

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.shadowColor = wave.glow;
        ctx.shadowBlur  = 10;

        const grad = ctx.createRadialGradient(px, py, 0, px, py, p.size * 2.5);
        grad.addColorStop(0, '#ffffff');
        grad.addColorStop(0.35, wave.color);
        grad.addColorStop(1, 'transparent');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(px, py, p.size * 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });
    }

    function animate() {
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;

      // Slight trailing fade rather than hard clear — gives motion-blur feel
      ctx.fillStyle = 'rgba(8, 10, 18, 0.30)';
      ctx.fillRect(0, 0, w, h);

      t += 0.012;

      // Draw waves back-to-front
      [...WAVES].reverse().forEach(wave => drawWave(wave, t));

      drawParticles(t);

      animId = requestAnimationFrame(animate);
    }

    animate();

    return () => {
      cancelAnimationFrame(animId);
      ro.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position:      'fixed',
        inset:         0,
        width:         '100%',
        height:        '100%',
        pointerEvents: 'none',
        zIndex:        0,
        opacity:       0.55,
        background:    'transparent',
      }}
    />
  );
}
