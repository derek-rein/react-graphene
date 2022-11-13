import React, { useEffect, useRef } from "react";
import { usePlotable } from "../hooks";

// https://stackoverflow.com/questions/47885664/html-canvas-zooming-and-panning-with-limitations


const CrossHairs = () => {
  
  const {fitToContainer, getXY, clearCanvas} = usePlotable()

  const canvasRef = useRef<HTMLCanvasElement | null>(null)




  const handleMouse = (event: React.MouseEvent) => {
    if (!canvasRef) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    let totalWidth = canvas.width;
    let totalHeight = canvas.height;
    let pos = getXY(canvas, event)

    ctx.strokeStyle = "#FF0000";
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

  }

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    // ctx.globalAlpha = .5
    fitToContainer(canvas)
  
  }, [])

  return (
    <canvas onMouseLeave={() => clearCanvas(canvasRef.current)} onMouseMove={handleMouse} ref={canvasRef}></canvas>
  )
}

export default CrossHairs