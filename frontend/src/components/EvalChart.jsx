import { useRef, useEffect } from 'react';

export default function EvalChart({ evalHistory }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !evalHistory || evalHistory.length < 2) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    const w = rect.width;
    const h = rect.height;

    ctx.clearRect(0, 0, w, h);

    const maxEval = Math.max(3, ...evalHistory.map(Math.abs));
    const points = evalHistory.map((v, i) => ({
      x: (i / (evalHistory.length - 1)) * w,
      y: h / 2 - (v / maxEval) * (h / 2 - 8),
    }));

    ctx.beginPath();
    ctx.strokeStyle = '#d4a543';
    ctx.lineWidth = 2;
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.stroke();

    ctx.fillStyle = 'rgba(212, 165, 67, 0.08)';
    ctx.lineTo(points[points.length - 1].x, h / 2);
    ctx.lineTo(points[0].x, h / 2);
    ctx.closePath();
    ctx.fill();
  }, [evalHistory]);

  if (!evalHistory || evalHistory.length < 2) {
    return (
      <div className="eval-chart-empty">
        <span>Lancez une revue de partie pour voir le graphique</span>
      </div>
    );
  }

  return (
    <div className="eval-chart">
      <canvas ref={canvasRef} style={{ width: '100%', height: 120 }} />
    </div>
  );
}
