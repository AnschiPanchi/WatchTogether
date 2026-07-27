import { useEffect, useRef } from 'react';

export default function Particles({
  particleCount = 50,
  particleSpread = 10,
  speed = 0.1,
  particleColors = ['#ff0033', '#ff4d4d', '#ffffff'],
  moveParticlesOnHover = true,
  particleHoverFactor = 1.5,
  alphaParticles = true,
  particleBaseSize = 100,
  sizeRandomness = 1,
  cameraDistance = 20,
  className = '',
}) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    let width = (canvas.width = canvas.offsetWidth);
    let height = (canvas.height = canvas.offsetHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = canvas.offsetWidth;
      height = canvas.height = canvas.offsetHeight;
    };

    window.addEventListener('resize', handleResize);

    const particles = Array.from({ length: particleCount }).map(() => ({
      x: Math.random() * width,
      y: Math.random() * height,
      size: (Math.random() * 3 + 1) * sizeRandomness,
      color: particleColors[Math.floor(Math.random() * particleColors.length)],
      vx: (Math.random() - 0.5) * speed * 2,
      vy: (Math.random() - 0.5) * speed * 2,
      alpha: alphaParticles ? Math.random() * 0.8 + 0.2 : 1,
    }));

    let mouseX = width / 2;
    let mouseY = height / 2;

    const handleMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      mouseX = e.clientX - rect.left;
      mouseY = e.clientY - rect.top;
    };

    if (moveParticlesOnHover) {
      window.addEventListener('mousemove', handleMouseMove);
    }

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        if (moveParticlesOnHover) {
          const dx = mouseX - p.x;
          const dy = mouseY - p.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            p.x -= (dx / dist) * particleHoverFactor;
            p.y -= (dy / dist) * particleHoverFactor;
          }
        }

        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      if (moveParticlesOnHover) window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, [particleCount, speed, particleColors, moveParticlesOnHover, particleHoverFactor, alphaParticles, sizeRandomness]);

  return <canvas ref={canvasRef} className={`reactbits-particles-canvas ${className}`} />;
}
