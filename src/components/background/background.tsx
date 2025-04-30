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

	// Track animation frame to avoid multiple renders
	const animationFrameRef = useRef<number | null>(null);
	// Track matrix for change detection
	const lastMatrixRef = useRef<string | null>(null);
	// Track props for change detection
	const propsRef = useRef<string | null>(null);

	// Use resizeCanvas for Retina support
	const { resizeCanvas, clearCanvas } = usePlotable();

	// Force redraw when props change
	useEffect(() => {
		const currentPropsString = JSON.stringify([
			color,
			gridLineColor,
			gridLineWidth,
		]);
		if (currentPropsString !== propsRef.current) {
			propsRef.current = currentPropsString;
			draw();
		}
	}, [color, gridLineColor, gridLineWidth]);

	const draw = useCallback(() => {
		if (canvasRef.current === null) return;

		// Cancel any pending animation frame
		if (animationFrameRef.current !== null) {
			cancelAnimationFrame(animationFrameRef.current);
			animationFrameRef.current = null;
		}

		// Schedule drawing in the next animation frame
		animationFrameRef.current = requestAnimationFrame(() => {
			if (canvasRef.current === null) return;

			// Get current matrix as string for comparison - use main matrix since we check for any changes
			const currentMatrixString = JSON.stringify([
				state.matrix.a,
				state.matrix.b,
				state.matrix.c,
				state.matrix.d,
				state.matrix.e,
				state.matrix.f,
			]);

			// Get current props string for comparison
			const currentPropsString = JSON.stringify([
				color,
				gridLineColor,
				gridLineWidth,
			]);

			// Check if matrix or props have changed
			const matrixChanged = currentMatrixString !== lastMatrixRef.current;
			const propsChanged = currentPropsString !== propsRef.current;

			// Update refs
			lastMatrixRef.current = currentMatrixString;
			propsRef.current = currentPropsString;

			// Only redraw if something has changed
			if (!matrixChanged && !propsChanged) return;

			// Ensure canvas size and DPI scaling are set before drawing
			resizeCanvas(canvasRef.current);

			// Force a resize with the current dimensions - this resets the canvas
			const canvas = canvasRef.current;
			const currentWidth = canvas.width;
			canvas.width = 0;
			canvas.width = currentWidth;

			const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
			if (!ctx) return;

			clearCanvas(canvasRef.current);

			const { x, y, width, height } = state.bounds;
			const { x: ox, y: oy, width: ow, height: oh } = state.outerBounds;

			// Calculate visible area in chart space for extended grid coverage
			const canvasWidth = canvas.width;
			const canvasHeight = canvas.height;

			// Create corner points in screen space with padding
			const padding = 100; // Extra padding for grid lines beyond visible area
			const topLeft = new DOMPoint(-padding, -padding);
			const bottomRight = new DOMPoint(
				canvasWidth + padding,
				canvasHeight + padding,
			);

			// Transform to chart space using the inverse matrix
			const inverseMatrix = state.matrix.inverse();
			const tlChart = topLeft.matrixTransform(inverseMatrix);
			const brChart = bottomRight.matrixTransform(inverseMatrix);

			// Use these extended bounds for grid calculations
			const extendedMinX = Math.min(tlChart.x, brChart.x);
			const extendedMaxX = Math.max(tlChart.x, brChart.x);
			const extendedMinY = Math.min(tlChart.y, brChart.y);
			const extendedMaxY = Math.max(tlChart.y, brChart.y);

			// Calculate vertical grid info (lines are horizontal) with extended range
			const vRange = extendedMaxY - extendedMinY;
			const vOrigin = extendedMinY;
			const vOuterRange = vRange * 1.5; // Add extra padding
			const vTicks =
				vOuterRange > 0 && vRange > 0
					? calculateGridTicks(vRange, vOrigin, vOuterRange, 1.5) // Increase density factor
					: null;

			// Calculate horizontal grid info (lines are vertical) with extended range
			const hRange = extendedMaxX - extendedMinX;
			const hOrigin = extendedMinX;
			const hOuterRange = hRange * 1.5; // Add extra padding
			const hTicks =
				hOuterRange > 0 && hRange > 0
					? calculateGridTicks(hRange, hOrigin, hOuterRange, 1.5) // Increase density factor
					: null;

			// Draw grid lines directly in screen space
			ctx.beginPath();
			ctx.strokeStyle = gridLineColor; // Use the provided grid line color
			ctx.lineWidth = gridLineWidth;

			// --- Draw Horizontal Lines (from Vertical Ticks) ---
			if (vTicks) {
				for (const tickValue of vTicks.majorTicks) {
					// Use matrix_y for vertical values to match Y-axis behavior
					const p1 = new DOMPoint(extendedMinX, tickValue).matrixTransform(
						state.matrix_y,
					);
					// Extend the line across the entire canvas with padding
					ctx.moveTo(-padding, p1.y);
					ctx.lineTo(canvas.width + padding, p1.y);
				}

				// Draw minor ticks for finer grid if zoomed in enough
				if (Math.abs(state.matrix.a) > 0.5 && Math.abs(state.matrix.d) > 0.5) {
					ctx.globalAlpha = 0.3; // More transparent for minor grid lines
					for (const tickValue of vTicks.minorTicks || []) {
						const p1 = new DOMPoint(extendedMinX, tickValue).matrixTransform(
							state.matrix_y,
						);
						ctx.moveTo(-padding, p1.y);
						ctx.lineTo(canvas.width + padding, p1.y);
					}
					ctx.globalAlpha = 1.0;
				}
			}

			// --- Draw Vertical Lines (from Horizontal Ticks) ---
			if (hTicks) {
				for (const tickValue of hTicks.majorTicks) {
					// Use matrix_x for horizontal values to match X-axis behavior
					const p1 = new DOMPoint(tickValue, extendedMinY).matrixTransform(
						state.matrix_x,
					);
					// Extend the line across the entire canvas with padding
					ctx.moveTo(p1.x, -padding);
					ctx.lineTo(p1.x, canvas.height + padding);
				}

				// Draw minor ticks for finer grid if zoomed in enough
				if (Math.abs(state.matrix.a) > 0.5 && Math.abs(state.matrix.d) > 0.5) {
					ctx.globalAlpha = 0.3; // More transparent for minor grid lines
					for (const tickValue of hTicks.minorTicks || []) {
						const p1 = new DOMPoint(tickValue, extendedMinY).matrixTransform(
							state.matrix_x,
						);
						ctx.moveTo(p1.x, -padding);
						ctx.lineTo(p1.x, canvas.height + padding);
					}
					ctx.globalAlpha = 1.0;
				}
			}

			ctx.stroke(); // Draw all collected lines

			// --- Origin Lines (also draw in screen space) ---
			ctx.beginPath();
			ctx.strokeStyle = "#ff0000";
			ctx.lineWidth = 1; // Use a fixed screen-space line width

			// Transform origin lines using appropriate matrices for each direction
			// For X=0 vertical line, use matrix_x for consistent X transformation
			const originYStart = new DOMPoint(0, extendedMinY).matrixTransform(
				state.matrix_x,
			);
			const originYEnd = new DOMPoint(0, extendedMaxY).matrixTransform(
				state.matrix_x,
			);

			// For Y=0 horizontal line, use matrix_y for consistent Y transformation
			const originXStart = new DOMPoint(extendedMinX, 0).matrixTransform(
				state.matrix_y,
			);
			const originXEnd = new DOMPoint(extendedMaxX, 0).matrixTransform(
				state.matrix_y,
			);

			// Draw vertical origin line (X=0)
			ctx.moveTo(originYStart.x, -padding);
			ctx.lineTo(originYStart.x, canvas.height + padding);

			// Draw horizontal origin line (Y=0)
			ctx.moveTo(-padding, originXStart.y);
			ctx.lineTo(canvas.width + padding, originXStart.y);

			ctx.stroke();

			// Clear the animation frame reference
			animationFrameRef.current = null;
		});
	}, [
		state.bounds,
		state.outerBounds,
		state.matrix,
		state.matrix_x,
		state.matrix_y,
		clearCanvas,
		resizeCanvas,
		color,
		gridLineColor,
		gridLineWidth,
	]);

	// Force redraw when matrix changes
	useEffect(() => {
		draw();
	}, [draw]);

	// Clean up animation frame on unmount
	useEffect(() => {
		return () => {
			if (animationFrameRef.current !== null) {
				cancelAnimationFrame(animationFrameRef.current);
			}
		};
	}, []);

	return (
		<canvas
			className="background"
			ref={canvasRef}
			style={{ backgroundColor: color }}
		/>
	);
};

export default Background;
