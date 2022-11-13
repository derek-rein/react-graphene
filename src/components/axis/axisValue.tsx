import React, { useEffect, useRef } from 'react';
import {
  convertComponentsSpaceToChartSpace, getXY, zoomLevel,
} from '../../utils';
import { usePlotable } from '../hooks/usePlottable';
import useChartContext from '../hooks/chartContext';

// const convdict = {
//   0: '⁰',
//   1: '¹',
//   2: '²',
//   3: '³',
//   4: '⁴',
//   5: '⁵',
//   6: '⁶',
//   7: '⁷',
//   8: '⁸',
//   9: '⁹',
// };

export function AxisValue() {
  const ref = useRef<HTMLCanvasElement | null>(null);

  const {
    state, dispatch, scaleView, translateView, mouse, variables,
  } = useChartContext();
  const { fitToContainer, clearCanvas } = usePlotable();

  // VARIABLES

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas!.getContext('2d');
    if (!ctx) { return; }
    if (!canvas) { return; }
    fitToContainer(canvas);
    // draw()
  }, []);

  const draw = () => {
    if (!ref.current) { return; }
    const canvas = ref.current;
    const ctx = clearCanvas(canvas);
    if (!ctx) { return; }

    const {
      x: ox, y: oy, width: ow, height: oh,
    } = state?.outerBounds;
    const {
      x, y, width, height,
    } = state?.bounds;

    // vertical

    const zl = zoomLevel(height - y);
    const zl_blend = (height - y) / 10 ** zl;
    const zl_blend_major = (height - y) / 10 ** zl;

    const outerDist = Math.abs(oy - oh);
    const v_space = outerDist / 10;

    const bounce = 10 ** (zl - 2);
    const bounce_major = 10 ** (zl - 1);

    const divisions_major = Math.abs(oy - oh) / bounce_major;

    ctx.strokeText(oy.toFixed(), 0, 10);
    ctx.strokeText(y.toFixed(), 0, 20);
    ctx.strokeText(state?.bounds?.height.toFixed(), 0, canvas.getBoundingClientRect().height - 20);
    ctx.strokeText(oh.toFixed(), 0, canvas.getBoundingClientRect().height - 10);

    // MAJOR GRID
    ctx.strokeStyle = `rgba(0, 10, 255, ${1})`;// `#00a6ff${convertAlpha(1 - zl_blend)}`
    // ctx.strokeStyle = `#00a6ffff`
    // grid lines
    Array(Math.max(1, divisions_major)).fill(undefined).map((_, i) => {
      const value = oy + (bounce_major * i);
      const point = new DOMPoint(0, value).matrixTransform(state.matrix_y);
      ctx.fillText(`${value}`, point.x, point.y);
      // ctx.moveTo(x, oy + (bounce_major * i))
      // ctx.lineTo(width, oy + (bounce_major * i))
    });
  };

  useEffect(() => {
    try {
      draw();
    } catch (err) {
      console.log(err);
    }
  }, [state?.matrix_y]);

  const handlePointerDown = (event: React.PointerEvent) => {
    if (ref.current === null) { return; }
    mouse.clickPos = getXY(ref.current, event);
    mouse.realClickPos = convertComponentsSpaceToChartSpace(mouse.clickPos, state.matrix);
    mouse.button = event.button;
    variables.matrix = state.matrix;
  };

  const handlePointerUp = (event: React.PointerEvent) => {
    if (ref.current === null) { return; }
    mouse.button = null;
    variables.matrix = state.matrix;
    variables.isDragging = false;
  };

  const handlePointerOut = (event: React.PointerEvent) => {
    if (ref.current === null) { return; }
    mouse.button = null;
  };

  const handlePointerMove = (event: React.PointerEvent) => {
    if (ref.current === null) { return; }

    mouse.bounds = ref.current.getBoundingClientRect();
    mouse.pos = getXY(ref.current, event);
    mouse.realPos = convertComponentsSpaceToChartSpace(mouse.pos, variables.matrix);

    switch (mouse.button) {
      case 0: { // left -- scale
        variables.isDragging = true;
        scaleView(
          { x: 1, y: 1 - ((mouse.clickPos.y - mouse.pos.y) / 250) },
          { x: mouse.realClickPos.x, y: mouse.realClickPos.y },
        );
        break;
      }
      case 1: { // middle -- translate
        variables.isDragging = true;
        translateView({ x: 0, y: mouse.pos.y - mouse.clickPos.y });
        break;
      }
      case 2: // right
        // code block
        break;
      default:

      // code block
    }
  };

  return (
    <canvas
      className="axis axis-value rg-chart-axis-value"
      ref={ref}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerMove={handlePointerMove}
      onPointerOut={handlePointerOut}
    />

  );
}
