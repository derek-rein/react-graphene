import { intervalToDuration } from "date-fns";
import type React from "react";
import { useCallback, useEffect, useLayoutEffect, useRef } from "react";
import useResizeObserver from "use-resize-observer";
import useChartContext from "../../context/chartContext";
import usePlotable from "../../hooks/usePlottable";
import { calculateGridTicks, clamp, zoomLevel } from "../../utils";
import { modifyContext } from "../../utils/retina";
// https://stackoverflow.com/questions/47885664/html-canvas-zooming-and-panning-with-limitations

interface IChartBackground {
	color?: string;
}

const Background: React.FC<IChartBackground> = ({ color = "#222222" }) => {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const { state } = useChartContext();

	const { fitToContainer, clearCanvas, retina } = usePlotable();

	const draw = useCallback(() => {
		if (canvasRef.current === null) {
			return;
		}
		const ctx = canvasRef.current.getContext("2d") as CanvasRenderingContext2D;

		if (!ctx) {
			return;
		}
		clearCanvas(canvasRef.current);

		const { x, y, width, height } = state.bounds;
		const { x: ox, y: oy, width: ow, height: oh } = state.outerBounds;

		// Calculate vertical grid info
		const vRange = height - y;
		const vOrigin = y;
		const vOuterRange = Math.abs(oy - oh);
		const vTicks =
			vOuterRange > 0 && vRange > 0
				? calculateGridTicks(vRange, vOrigin, vOuterRange)
				: null;

		// Calculate horizontal grid info
		const hRange = width - x;
		const hOrigin = x;
		const hOuterRange = Math.abs(ox - ow);
		const hTicks =
			hOuterRange > 0 && hRange > 0
				? calculateGridTicks(hRange, hOrigin, hOuterRange)
				: null;

		console.log("Background hTicks:", hTicks);

		ctx.lineWidth = 1;
		ctx.save(); // Save context before applying transform
		ctx.setTransform(state?.matrix);
		ctx.beginPath();

		// Draw Vertical Grid Lines
		if (vTicks) {
			// Minor Vertical Lines (Faded)
			// TODO: Implement fading based on zl_blend if needed.
			// For now, just draw major lines.
			// ctx.strokeStyle = `rgba(0, 10, 255, ${1 - zl_blend})`;
			// Array(Math.max(1, divisions)).fill(undefined).map((_, i) => { ... });

			// Major Vertical Lines
			ctx.strokeStyle = "rgba(200, 200, 200, 0.5)"; // Lighter gray for major grid
			for (const tickValue of vTicks.majorTicks) {
				ctx.moveTo(x, tickValue);
				ctx.lineTo(width, tickValue);
			}
		}

		// Draw Horizontal Grid Lines
		if (hTicks) {
			// Minor Horizontal Lines (Faded)
			// TODO: Implement fading based on zl_blend if needed.
			// ctx.strokeStyle = "rgba(200, 200, 200, 0.2)"; // Lighter gray for minor grid
			// const numMinorDivisions = Math.floor(hTicks.divisions);
			// const startMinorTick = Math.ceil(hOrigin / hTicks.bounce) * hTicks.bounce;
			// for (let i = 0; i < numMinorDivisions + 2; i++) {
			// 	 const tickValue = startMinorTick + hTicks.bounce * i;
			// 	 if (tickValue <= hOrigin + hOuterRange + hTicks.bounce) {
			// 		 // Avoid drawing over major ticks if desired
			// 		 // if (Math.abs(tickValue % hTicks.bounce_major) > Number.EPSILON) {
			// 			 ctx.moveTo(tickValue, y);
			// 			 ctx.lineTo(tickValue, height);
			// 		 // }
			// 	 }
			// }

			// Major Horizontal Lines
			ctx.strokeStyle = "rgba(200, 200, 200, 0.5)"; // Lighter gray for major grid
			for (const tickValue of hTicks.majorTicks) {
				// Log the chart-space coordinates before drawing
				// console.log(`Drawing V Line at chart x: ${tickValue}, y range: ${y} to ${height}`);
				ctx.moveTo(tickValue, y);
				ctx.lineTo(tickValue, height);
			}
		}

		ctx.stroke(); // Draw all lines at once
		ctx.restore(); // Restore context state

		// Log transformed points for debugging vertical lines
		if (hTicks && hTicks.majorTicks.length > 0) {
			const firstTick = hTicks.majorTicks[0];
			const p1 = new DOMPoint(firstTick, y).matrixTransform(state.matrix);
			const p2 = new DOMPoint(firstTick, height).matrixTransform(state.matrix);
			console.log(
				`Transformed V Line endpoints for tick ${firstTick}: P1(${p1.x.toFixed(1)}, ${p1.y.toFixed(1)}), P2(${p2.x.toFixed(1)}, ${p2.y.toFixed(1)})`,
			);
		}

		// Draw Origin Lines (Optional - keep if desired)
		ctx.strokeStyle = "#ff0000";
		ctx.save();
		ctx.setTransform(state?.matrix);
		ctx.beginPath();
		ctx.moveTo(0, y);
		ctx.lineTo(0, height);
		ctx.moveTo(x, 0);
		ctx.lineTo(width, 0);
		ctx.stroke();
		ctx.restore();
	}, [state.bounds, state.outerBounds, state.matrix, clearCanvas]);

	useEffect(() => {
		try {
			draw();
		} catch (err) {
			console.log(err);
		}
	}, [draw]);

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const ctx = canvas.getContext("2d");
		if (!ctx) {
			return;
		}
		if (!canvas) {
			return;
		}
		fitToContainer(canvas);
		draw();
	}, [fitToContainer, draw]);

	return <canvas ref={canvasRef} />;
};

export default Background;
