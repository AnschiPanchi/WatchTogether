import { useEffect, useRef } from 'react';

export default function Aurora({
  colorStops = ['#10b8a8', '#ffd060', '#10b8a8'],
  amplitude = 1.0,
  speed = 0.6,
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

    let step = 0;

    const render = () => {
      ctx.clearRect(0, 0, width, height);
      step += speed * 0.02;

      // Draw flowing aurora wave bands
      for (let i = 0; i < 3; i++) {
        ctx.save();
        const grad = ctx.createLinearGradient(0, 0, width, height);
        grad.addColorStop(0, colorStops[0]);
        grad.addColorStop(0.5, colorStops[1]);
        grad.addColorStop(1, colorStops[2]);

        ctx.fillStyle = grad;
        ctx.globalAlpha = 0.18 - i * 0.04;

        ctx.beginPath();
        ctx.moveTo(0, height);
        for (let x = 0; x <= width; x += 20) {
          const y =
            height * 0.4 +
            Math.sin(x * 0.003 + step + i) * 80 * amplitude +
            Math.cos(x * 0.005 - step) * 50 * amplitude;
          ctx.lineTo(x, y);
        }
        ctx.lineTo(width, height);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [colorStops, amplitude, speed]);

  return <canvas ref={canvasRef} className="reactbits-aurora-canvas" />;
}
