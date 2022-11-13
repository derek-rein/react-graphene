import React, { useEffect, useLayoutEffect, useRef } from 'react';
import useResizeObserver from 'use-resize-observer';
import { intervalToDuration } from 'date-fns';
import { modifyContext } from '../../utils/retina';
import { clamp, zoomLevel } from '../../utils';
import useChartContext from '../hooks/chartContext';
import usePlotable from '../hooks/usePlottable';
// https://stackoverflow.com/questions/47885664/html-canvas-zooming-and-panning-with-limitations

interface IChartBackground {
  color?: string
}

const drawAxis = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
  // draw origin
  ctx.moveTo(-100 + x, 0 + y);
  ctx.lineTo(100 + x, 0 + y);
  ctx.moveTo(0 + x, 100 + y);
  ctx.lineTo(0 + x, -100 + y);
};

const DECIMAL = 100000; // 100,000 decimal offset

const toDecimal = (value: number) => value * DECIMAL;

const fromDecimal = (value: number) => value / DECIMAL;

const Background: React.FC<IChartBackground> = ({ color = '#222222' }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const {
    state
  } = useChartContext();

  const { fitToContainer, clearCanvas, retina } = usePlotable();

  const drawVStats = (ctx: CanvasRenderingContext2D) => {
    // vertical
    const {
      x, y, width, height,
    } = state?.bounds;
    const {
      x: ox, y: oy, width: ow, height: oh,
    } = state?.outerBounds;

    const zl = zoomLevel(height - y);
    const zl_blend = (height - y) / 10 ** zl;
    const zl_blend_major = (height - y) / 10 ** zl;

    const outerDist = Math.abs(oy - oh);
    const v_space = outerDist / 10;

    const bounce = 10 ** zl / 100;
    const bounce_major = 10 ** zl / 10;

    const divisions = Math.abs(oy - oh) / bounce;
    const divisions_major = Math.abs(oy - oh) / bounce_major;

    ctx.strokeStyle = '#ff0000';

    ctx.strokeText(`Canvas Height: ${height.toFixed()} ${y.toFixed()}`, 50, 25);
    ctx.strokeText(`Zooom Level: ${zl}`, 50, 50);
    ctx.strokeText(`Divisions: ${divisions}`, 50, 75);
    ctx.strokeText(`Bounce: ${divisions}`, 50, 85);
    ctx.strokeText(`Height: ${(height - y).toFixed()}`, 50, 100);
    ctx.strokeText(`ZL Blend: ${zl_blend.toFixed(2)}`, 50, 125);
  };

  const drawHStats = (ctx: CanvasRenderingContext2D) => {
    ctx.save(); // save context without transformation
    ctx.translate(0, 500);

    const {
      x, y, width, height,
    } = state?.bounds;
    const {
      x: ox, y: oy, width: ow, height: oh,
    } = state?.outerBounds;

    const zl = zoomLevel(width - x);
    const zl_blend = (width - x) / 10 ** zl;
    const zl_blend_major = (width - x) / 10 ** zl;

    const outerDist = Math.abs(ox - ow);
    const v_space = outerDist / 10;

    const bounce = 10 ** zl / 100;
    const bounce_major = 10 ** zl / 10;

    const divisions = Math.abs(ox - ow) / bounce;
    const divisions_major = Math.abs(ox - ow) / bounce_major;

    ctx.strokeStyle = '#ff0000';

    const duration = intervalToDuration({ start: 0, end: (width - x) * 1000 });

    ctx.strokeText(`Canvas Width: ${width.toFixed(2)} ${x.toFixed(2)}`, 50, 25);
    ctx.strokeText(`Zooom Level: ${zl}`, 50, 50);
    ctx.strokeText(`Divisions: ${divisions}`, 50, 75);
    ctx.strokeText(`Bounce: ${divisions}`, 50, 85);
    ctx.strokeText(`Width: ${(width - x).toFixed(5)} ${duration.hours}:${duration.minutes}:${duration.seconds}`, 50, 100);
    ctx.strokeText(`ZL Blend: ${zl_blend.toFixed(2)}`, 50, 125);

    ctx.restore();
  };

  const draw = () => {
    if (canvasRef.current === null) { return; }
    const ctx = canvasRef.current!.getContext('2d') as CanvasRenderingContext2D;

    if (!ctx) { return; }
    clearCanvas(canvasRef.current);

    // vertical
    const {
      x, y, width, height,
    } = state?.bounds;
    const {
      x: ox, y: oy, width: ow, height: oh,
    } = state?.outerBounds;

    const zl = zoomLevel(height - y);
    const zl_blend = (height - y) / 10 ** zl;
    const zl_blend_major = (height - y) / 10 ** zl;

    const outerDist = Math.abs(oy - oh);
    const v_space = outerDist / 10;

    const bounce = 10 ** zl / 100;
    const bounce_major = 10 ** zl / 10;

    const divisions = Math.abs(oy - oh) / bounce;
    const divisions_major = Math.abs(oy - oh) / bounce_major;

    ctx.strokeStyle = '#ff0000';

    drawVStats(ctx);
    drawHStats(ctx);

    // MINOR GRID
    ctx.lineWidth = 1;
    ctx.strokeStyle = `rgba(0, 10, 255, ${1 - zl_blend})`;// `#00a6ff${convertAlpha(1 - zl_blend)}`
    // ctx.strokeStyle = `#00a6ffff`
    // grid lines
    ctx.save(); // save context without transformation
    ctx.setTransform(state?.matrix);
    ctx.beginPath();

    Array(Math.max(1, divisions)).fill(undefined).map((_, i) => {
      ctx.moveTo(x, oy + (bounce * i));
      ctx.lineTo(width, oy + (bounce * i));
    });
    ctx.restore();
    ctx.stroke();

    // MAJOR GRID
    ctx.strokeStyle = `rgba(0, 10, 255, ${1})`;// `#00a6ff${convertAlpha(1 - zl_blend)}`
    // ctx.strokeStyle = `#00a6ffff`
    // grid lines
    ctx.save(); // save context without transformation
    ctx.setTransform(state?.matrix);
    ctx.beginPath();

    Array(Math.max(1, divisions_major)).fill(undefined).map((_, i) => {
      ctx.moveTo(x, oy + (bounce_major * i));
      ctx.lineTo(width, oy + (bounce_major * i));
    });
    ctx.restore();
    ctx.stroke();

    // ORIGIN
    ctx.strokeStyle = '#ff0000';
    ctx.save(); // save context without transformation
    ctx.setTransform(state?.matrix);
    ctx.beginPath();
    // ctx.moveTo(x, 0)
    // ctx.lineTo(width, 0)
    ctx.moveTo(0, y);
    ctx.lineTo(0, height);
    ctx.restore();
    ctx.stroke();

    // vertical
  };

  useEffect(() => {
    try {
      draw();
    } catch (err) {
      console.log(err);
    }
  }, [state?.matrix]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas!.getContext('2d');
    if (!ctx) { return; }
    if (!canvas) { return; }
    fitToContainer(canvas);
    draw();
  }, []);

  return (
    <canvas ref={canvasRef} />
  );
};

export default Background;
