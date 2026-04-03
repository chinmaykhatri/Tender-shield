'use client';

import { useEffect, useRef } from 'react';

// ═══════════════════════════════════════════════
// NetworkHero — Animated Blockchain Network Canvas
// Particles represent tenders/orgs, connections = blockchain links
// Tricolor theme: Saffron → Indigo → Green
// ═══════════════════════════════════════════════

interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  radius: number;
  color: string;
  alpha: number;
  pulse: number;
  pulseSpeed: number;
}

interface FlowParticle {
  fromIdx: number; toIdx: number;
  progress: number;
  speed: number;
  color: string;
  size: number;
}

const COLORS = [
  '#FF9933',   // Saffron
  '#6366f1',   // Indigo
  '#138808',   // Green
  '#818cf8',   // Light indigo
  '#f59e0b',   // Amber
  '#22c55e',   // Emerald
  '#4ade80',   // Light green
  '#c084fc',   // Purple
];

export default function NetworkHero() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const particlesRef = useRef<Particle[]>([]);
  const flowsRef = useRef<FlowParticle[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Size to parent
    const resize = () => {
      const parent = canvas.parentElement;
      if (parent) {
        canvas.width = parent.offsetWidth;
        canvas.height = parent.offsetHeight;
      }
    };
    resize();
    window.addEventListener('resize', resize);

    // Initialize particles (nodes in the network)
    const initParticles = () => {
      const w = canvas.width;
      const h = canvas.height;
      const count = 35;
      const particles: Particle[] = [];

      for (let i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * w,
          y: Math.random() * h,
          vx: (Math.random() - 0.5) * 0.4,
          vy: (Math.random() - 0.5) * 0.4,
          radius: 2 + Math.random() * 3,
          color: COLORS[i % COLORS.length],
          alpha: 0.3 + Math.random() * 0.5,
          pulse: Math.random() * Math.PI * 2,
          pulseSpeed: 0.01 + Math.random() * 0.02,
        });
      }

      // Central "shield" node — bigger and brighter
      particles.push({
        x: w * 0.35, y: h * 0.5,
        vx: 0, vy: 0,
        radius: 6,
        color: '#FF9933',
        alpha: 0.9,
        pulse: 0,
        pulseSpeed: 0.03,
      });

      particlesRef.current = particles;
    };

    initParticles();

    // Data flow particles (flowing along connections)
    const spawnFlow = () => {
      const particles = particlesRef.current;
      if (particles.length < 2) return;
      const fromIdx = Math.floor(Math.random() * (particles.length - 1));
      let toIdx = Math.floor(Math.random() * particles.length);
      if (toIdx === fromIdx) toIdx = particles.length - 1; // Always have center as one end

      flowsRef.current.push({
        fromIdx, toIdx,
        progress: 0,
        speed: 0.005 + Math.random() * 0.01,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        size: 1.5 + Math.random() * 2,
      });
    };

    // Spawn flows periodically
    const flowInterval = setInterval(spawnFlow, 300);

    // Animation loop
    const animate = () => {
      const w = canvas.width;
      const h = canvas.height;
      if (w === 0 || h === 0) { animRef.current = requestAnimationFrame(animate); return; }

      ctx.clearRect(0, 0, w, h);

      const particles = particlesRef.current;

      // Move particles
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.pulse += p.pulseSpeed;

        // Bounce off edges with padding
        if (p.x < 20 || p.x > w - 20) p.vx *= -1;
        if (p.y < 20 || p.y > h - 20) p.vy *= -1;
        p.x = Math.max(10, Math.min(w - 10, p.x));
        p.y = Math.max(10, Math.min(h - 10, p.y));
      }

      // Draw connections between nearby particles
      const maxDist = 180;
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < maxDist) {
            const alpha = (1 - dist / maxDist) * 0.12;
            ctx.strokeStyle = `rgba(99, 102, 241, ${alpha})`;
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }

      // Draw particles (nodes)
      for (const p of particles) {
        const pulseRadius = p.radius + Math.sin(p.pulse) * 1.5;

        // Outer glow
        const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, pulseRadius * 4);
        gradient.addColorStop(0, p.color + '30');
        gradient.addColorStop(1, p.color + '00');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(p.x, p.y, pulseRadius * 4, 0, Math.PI * 2);
        ctx.fill();

        // Core dot
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.beginPath();
        ctx.arc(p.x, p.y, pulseRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      // Draw flow particles (data moving along connections)
      const flows = flowsRef.current;
      for (let i = flows.length - 1; i >= 0; i--) {
        const f = flows[i];
        f.progress += f.speed;
        if (f.progress >= 1) {
          flows.splice(i, 1);
          continue;
        }
        const from = particles[f.fromIdx];
        const to = particles[f.toIdx];
        if (!from || !to) { flows.splice(i, 1); continue; }

        const x = from.x + (to.x - from.x) * f.progress;
        const y = from.y + (to.y - from.y) * f.progress;
        const alpha = f.progress < 0.1 ? f.progress / 0.1 : f.progress > 0.9 ? (1 - f.progress) / 0.1 : 1;

        ctx.fillStyle = f.color;
        ctx.globalAlpha = alpha * 0.8;
        ctx.beginPath();
        ctx.arc(x, y, f.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      animRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animRef.current);
      clearInterval(flowInterval);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        top: 0, left: 0,
        width: '100%', height: '100%',
        pointerEvents: 'none',
        opacity: 0.7,
      }}
    />
  );
}
