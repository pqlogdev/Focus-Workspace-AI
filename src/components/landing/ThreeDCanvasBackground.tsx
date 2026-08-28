import React, { useEffect, useRef } from 'react';

interface ThreeDCanvasBackgroundProps {
  isPlayingAudio?: boolean;
  intensity?: number;
}

export const ThreeDCanvasBackground: React.FC<ThreeDCanvasBackgroundProps> = ({
  isPlayingAudio = false,
  intensity = 1,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    // Particle Sphere 3D coordinates
    interface Point3D {
      x: number;
      y: number;
      z: number;
      origX: number;
      origY: number;
      origZ: number;
      size: number;
      color: string;
      speed: number;
      phase: number;
    }

    const points: Point3D[] = [];
    const NUM_POINTS = 220;
    const RADIUS = Math.min(width, height) * 0.38;

    const colors = [
      'rgba(99, 102, 241, 0.75)', // Indigo
      'rgba(168, 85, 247, 0.75)', // Purple
      'rgba(236, 72, 153, 0.75)', // Pink
      'rgba(56, 189, 248, 0.75)', // Sky cyan
      'rgba(255, 255, 255, 0.85)', // White star
    ];

    // Generate points on a sphere (Fibonacci sphere distribution)
    const phi = Math.PI * (3 - Math.sqrt(5)); // Golden angle
    for (let i = 0; i < NUM_POINTS; i++) {
      const y = 1 - (i / (NUM_POINTS - 1)) * 2; // y goes from 1 to -1
      const radiusAtY = Math.sqrt(1 - y * y);
      const theta = phi * i;

      const x = Math.cos(theta) * radiusAtY;
      const z = Math.sin(theta) * radiusAtY;

      points.push({
        x: x * RADIUS,
        y: y * RADIUS,
        z: z * RADIUS,
        origX: x * RADIUS,
        origY: y * RADIUS,
        origZ: z * RADIUS,
        size: Math.random() * 2 + 1,
        color: colors[i % colors.length],
        speed: 0.003 + Math.random() * 0.004,
        phase: Math.random() * Math.PI * 2,
      });
    }

    // Floating ambient background dust
    interface DustParticle {
      x: number;
      y: number;
      z: number;
      vx: number;
      vy: number;
      size: number;
      alpha: number;
    }
    const dustParticles: DustParticle[] = Array.from({ length: 60 }, () => ({
      x: (Math.random() - 0.5) * width * 1.5,
      y: (Math.random() - 0.5) * height * 1.5,
      z: Math.random() * 800 - 400,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4 - 0.2,
      size: Math.random() * 2 + 0.5,
      alpha: Math.random() * 0.4 + 0.1,
    }));

    let mouseX = 0;
    let mouseY = 0;
    let targetRotX = 0;
    let targetRotY = 0;
    let rotX = 0;
    let rotY = 0;

    const handleMouseMove = (e: MouseEvent) => {
      const normX = (e.clientX / window.innerWidth) * 2 - 1;
      const normY = (e.clientY / window.innerHeight) * 2 - 1;
      mouseX = normX;
      mouseY = normY;
      targetRotY = normX * 0.6;
      targetRotX = -normY * 0.6;
    };

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('resize', handleResize);

    let time = 0;
    const FOCAL_LENGTH = 450;

    const render = () => {
      time += 0.015;
      ctx.clearRect(0, 0, width, height);

      // Smooth camera rotation
      rotX += (targetRotX - rotX) * 0.05 + 0.001;
      rotY += (targetRotY - rotY) * 0.05 + (isPlayingAudio ? 0.008 : 0.003);

      const cosX = Math.cos(rotX);
      const sinX = Math.sin(rotX);
      const cosY = Math.cos(rotY + time * 0.1);
      const sinY = Math.sin(rotY + time * 0.1);

      const centerX = width * 0.5;
      const centerY = height * 0.42;

      // 1. Draw Subtle Depth Radial Glow behind Orb
      const pulse = isPlayingAudio ? Math.sin(time * 4) * 0.15 + 1.1 : 1;
      const glowGrad = ctx.createRadialGradient(
        centerX,
        centerY,
        10,
        centerX,
        centerY,
        RADIUS * 1.5 * pulse
      );
      glowGrad.addColorStop(0, 'rgba(99, 102, 241, 0.12)');
      glowGrad.addColorStop(0.5, 'rgba(168, 85, 247, 0.06)');
      glowGrad.addColorStop(1, 'rgba(15, 23, 42, 0)');
      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.arc(centerX, centerY, RADIUS * 1.6, 0, Math.PI * 2);
      ctx.fill();

      // 2. Render & Project 3D Sphere Points
      interface ProjectedPoint {
        px: number;
        py: number;
        pz: number;
        scale: number;
        color: string;
        size: number;
        alpha: number;
      }

      const projectedPoints: ProjectedPoint[] = [];

      for (let i = 0; i < points.length; i++) {
        const pt = points[i];

        // Organic audio pulse deformation
        const audioDisplacement = isPlayingAudio
          ? Math.sin(pt.phase + time * 6) * (18 * intensity)
          : Math.sin(pt.phase + time * 2) * 4;

        const currentRadius = 1 + audioDisplacement / RADIUS;
        const curX = pt.origX * currentRadius;
        const curY = pt.origY * currentRadius;
        const curZ = pt.origZ * currentRadius;

        // Rotate Y
        const x1 = curX * cosY - curZ * sinY;
        const z1 = curZ * cosY + curX * sinY;

        // Rotate X
        const y2 = curY * cosX - z1 * sinX;
        const z2 = z1 * cosX + curY * sinX;

        // Perspective Projection
        const distance = FOCAL_LENGTH + z2;
        if (distance <= 10) continue;

        const scale = FOCAL_LENGTH / distance;
        const px = centerX + x1 * scale;
        const py = centerY + y2 * scale;

        const alpha = Math.max(0.1, Math.min(1, (z2 + RADIUS) / (RADIUS * 2)));

        projectedPoints.push({
          px,
          py,
          pz: z2,
          scale,
          color: pt.color,
          size: pt.size * scale * (isPlayingAudio ? 1.3 : 1),
          alpha,
        });
      }

      // Sort by Z depth for correct occlusion
      projectedPoints.sort((a, b) => a.pz - b.pz);

      // Draw constellation connecting lines between nearest neighbours
      ctx.lineWidth = 0.6;
      for (let i = 0; i < projectedPoints.length; i++) {
        const p1 = projectedPoints[i];
        for (let j = i + 1; j < projectedPoints.length; j++) {
          const p2 = projectedPoints[j];
          const dx = p1.px - p2.px;
          const dy = p1.py - p2.py;
          const dist = Math.sqrt(dx * dx + dy * dy);

          const maxDist = 55 * p1.scale;
          if (dist < maxDist) {
            const lineAlpha = (1 - dist / maxDist) * 0.22 * Math.min(p1.alpha, p2.alpha);
            ctx.strokeStyle = `rgba(129, 140, 248, ${lineAlpha})`;
            ctx.beginPath();
            ctx.moveTo(p1.px, p1.py);
            ctx.lineTo(p2.px, p2.py);
            ctx.stroke();
          }
        }
      }

      // Draw particles with glowing halo
      for (const p of projectedPoints) {
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;

        ctx.beginPath();
        ctx.arc(p.px, p.py, Math.max(0.8, p.size), 0, Math.PI * 2);
        ctx.fill();

        // Extra halo for frontmost particles
        if (p.pz > 0) {
          ctx.beginPath();
          ctx.arc(p.px, p.py, p.size * 2.2, 0, Math.PI * 2);
          ctx.fillStyle = p.color.replace('0.75', '0.15');
          ctx.fill();
        }

        ctx.restore();
      }

      // 3. Render Floating Ambient Dust Particles
      for (const d of dustParticles) {
        d.x += d.vx + mouseX * 0.2;
        d.y += d.vy + mouseY * 0.2;

        if (d.x < -width) d.x = width;
        if (d.x > width) d.x = -width;
        if (d.y < -height) d.y = height;
        if (d.y > height) d.y = -height;

        const screenX = centerX + d.x * 0.5;
        const screenY = centerY + d.y * 0.5;

        ctx.fillStyle = `rgba(224, 231, 255, ${d.alpha})`;
        ctx.beginPath();
        ctx.arc(screenX, screenY, d.size, 0, Math.PI * 2);
        ctx.fill();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [isPlayingAudio, intensity]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none z-10 opacity-75 transition-opacity duration-1000"
    />
  );
};
