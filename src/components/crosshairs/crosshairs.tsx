import React, { useEffect, useRef } from 'react';
import { getXY } from '../../utils';
import { usePlotable } from '../hooks/usePlottable';

// https://stackoverflow.com/questions/47885664/html-canvas-zooming-and-panning-with-limitations

function CrossHairs() {
  const { fitToContainer, clearCanvas } = usePlotable();

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const handleMouse = (event: React.MouseEvent) => {
    if (!canvasRef.current) { return; }
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) { return }
    const totalWidth = canvas.width;
    const totalHeight = canvas.height;
    const pos = getXY(canvas, event);

    ctx.strokeStyle = '#FF0000';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.beginPath();
    ctx.moveTo(0, pos.y);
    ctx.lineTo(totalWidth, pos.y);
    ctx.stroke();

    ctx.moveTo(pos.x, 0);
    ctx.lineTo(pos.x, totalHeight);
    ctx.stroke();
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return
    const ctx = canvas!.getContext('2d');
    // ctx.globalAlpha = .5
    fitToContainer(canvas);
  }, []);

  return (
    <canvas onMouseLeave={() => clearCanvas(canvasRef!.current)} onMouseMove={handleMouse} ref={canvasRef} />
  );
}

export default CrossHairs;
