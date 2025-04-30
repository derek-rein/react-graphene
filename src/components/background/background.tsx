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
	gridLineColor?: string;
	gridLineWidth?: number;
}

const Background: React.FC<IChartBackground> = ({
	color = "#222222",
	gridLineColor = "#555555",
	gridLineWidth = 1,
}) => {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const { state } = useChartContext();

	// Use resizeCanvas for Retina support
	const { resizeCanvas, clearCanvas } = usePlotable();

	const draw = useCallback(() => {
		if (canvasRef.current === null) return;
		// Ensure canvas size and DPI scaling are set before drawing
		resizeCanvas(canvasRef.current);

		const ctx = canvasRef.current.getContext("2d") as CanvasRenderingContext2D;
		if (!ctx) return;

		clearCanvas(canvasRef.current);

		const { x, y, width, height } = state.bounds;
		const { x: ox, y: oy, width: ow, height: oh } = state.outerBounds;

		// Calculate vertical grid info (lines are horizontal)
		const vRange = height - y;
		const vOrigin = y;
		const vOuterRange = Math.abs(oy - oh);
		const vTicks =
			vOuterRange > 0 && vRange > 0
				? calculateGridTicks(vRange, vOrigin, vOuterRange)
				: null;

		// Calculate horizontal grid info (lines are vertical)
		const hRange = width - x;
		const hOrigin = x;
		const hOuterRange = Math.abs(ox - ow);
		const hTicks =
			hOuterRange > 0 && hRange > 0
				? calculateGridTicks(hRange, hOrigin, hOuterRange)
				: null;

		console.log("Background state.bounds:", state.bounds);
		console.log("Background vTicks:", vTicks);
		console.log("Background hTicks:", hTicks);

		// Draw grid lines directly in screen space
		ctx.beginPath();
		ctx.strokeStyle = gridLineColor; // Use the provided grid line color
		ctx.lineWidth = gridLineWidth; // Use the provided line width

		// --- Draw Horizontal Lines (from Vertical Ticks) ---
		if (vTicks) {
			for (const tickValue of vTicks.majorTicks) {
				const p1 = new DOMPoint(x, tickValue).matrixTransform(state.matrix);
				const p2 = new DOMPoint(width, tickValue).matrixTransform(state.matrix);
				console.log(
					`HLine for ${tickValue}: (${p1.x.toFixed(1)}, ${p1.y.toFixed(1)}) -> (${p2.x.toFixed(1)}, ${p2.y.toFixed(1)})`,
				);
				ctx.moveTo(p1.x, p1.y);
				ctx.lineTo(p2.x, p2.y);
			}
		}

		// --- Draw Vertical Lines (from Horizontal Ticks) ---
		if (hTicks) {
			for (const tickValue of hTicks.majorTicks) {
				const p1 = new DOMPoint(tickValue, y).matrixTransform(state.matrix);
				const p2 = new DOMPoint(tickValue, height).matrixTransform(
					state.matrix,
				);
				console.log(
					`VLine for ${tickValue}: (${p1.x.toFixed(1)}, ${p1.y.toFixed(1)}) -> (${p2.x.toFixed(1)}, ${p2.y.toFixed(1)})`,
				);
				ctx.moveTo(p1.x, p1.y);
				ctx.lineTo(p2.x, p2.y);
			}
		}

		ctx.stroke(); // Draw all collected lines

		// --- Origin Lines (also draw in screen space) ---
		ctx.beginPath();
		ctx.strokeStyle = "#ff0000";
		ctx.lineWidth = 1; // Use a fixed screen-space line width
		// Transform origin lines
		const originYStart = new DOMPoint(0, y).matrixTransform(state.matrix);
		const originYEnd = new DOMPoint(0, height).matrixTransform(state.matrix);
		const originXStart = new DOMPoint(x, 0).matrixTransform(state.matrix);
		const originXEnd = new DOMPoint(width, 0).matrixTransform(state.matrix);
		// Draw vertical origin line
		ctx.moveTo(originYStart.x, originYStart.y);
		ctx.lineTo(originYEnd.x, originYEnd.y);
		// Draw horizontal origin line
		ctx.moveTo(originXStart.x, originXStart.y);
		ctx.lineTo(originXEnd.x, originXEnd.y);
		ctx.stroke();
	}, [
		state.bounds,
		state.outerBounds,
		state.matrix,
		clearCanvas,
		resizeCanvas,
		gridLineColor,
		gridLineWidth,
	]);

	useEffect(() => {
		try {
			draw();
		} catch (err) {
			console.log(err);
		}
	}, [draw]);

	return <canvas ref={canvasRef} />;
};

export default Background;
