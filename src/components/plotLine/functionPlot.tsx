import React, { useCallback, useEffect, useRef } from "react";
import "../../scss/common.scss";
import useChartContext from "../../context/chartContext";
import usePlotable from "../../hooks/usePlottable";

interface FunctionPlotProps {
	func: (x: number) => number;
	color?: string;
	lineWidth?: number;
	resolution?: number; // Points per unit on x-axis
}

export function FunctionPlot({
	func,
	color = "#dc26ac",
	lineWidth = 1,
	resolution = 10, // Default resolution
}: FunctionPlotProps) {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const { state } = useChartContext();
	const { resizeCanvas, clearCanvas } = usePlotable();

	// Track matrix for render optimization
	const lastMatrixRef = useRef<string | null>(null);
	// Track animation frame to avoid multiple renders
	const animationFrameRef = useRef<number | null>(null);

	const draw = useCallback(() => {
		if (!canvasRef.current) {
			return;
		}

		// Cancel any pending animation frame
		if (animationFrameRef.current !== null) {
			cancelAnimationFrame(animationFrameRef.current);
			animationFrameRef.current = null;
		}

		// Schedule drawing in the next animation frame
		animationFrameRef.current = requestAnimationFrame(() => {
			if (!canvasRef.current) return;

			const canvas = canvasRef.current;

			// Serialize matrix for comparison with high precision
			const currentMatrixString = JSON.stringify([
				Number(state.matrix.a.toFixed(15)),
				Number(state.matrix.b.toFixed(15)),
				Number(state.matrix.c.toFixed(15)),
				Number(state.matrix.d.toFixed(15)),
				Number(state.matrix.e.toFixed(15)),
				Number(state.matrix.f.toFixed(15)),
			]);

			// Skip redraw if matrix hasn't changed
			if (currentMatrixString === lastMatrixRef.current) {
				return;
			}

			// Update last matrix reference
			lastMatrixRef.current = currentMatrixString;

			// Force a resize with the current dimensions - this resets the canvas
			const currentWidth = canvas.width;
			canvas.width = 0;
			canvas.width = currentWidth;

			// Re-apply proper scaling for the device pixel ratio
			resizeCanvas(canvas);

			// Get a fresh context
			const ctx = canvas.getContext("2d");
			if (!ctx) return;

			// Clear again to be absolutely sure (belt and suspenders)
			ctx.clearRect(0, 0, canvas.width, canvas.height);

			// Create a clipping region matching the canvas bounds
			// This ensures we don't render outside the visible area
			ctx.beginPath();
			ctx.rect(0, 0, canvas.width, canvas.height);
			ctx.clip();

			// Calculate visible area in chart space
			const canvasWidth = canvas.width;
			const canvasHeight = canvas.height;

			// Create corner points in screen space
			const topLeft = new DOMPoint(0, 0);
			const topRight = new DOMPoint(canvasWidth, 0);
			const bottomLeft = new DOMPoint(0, canvasHeight);
			const bottomRight = new DOMPoint(canvasWidth, canvasHeight);

			// Transform to chart space using the inverse of the current matrix
			const inverseMatrix = state.matrix.inverse();
			const tlChart = topLeft.matrixTransform(inverseMatrix);
			const trChart = topRight.matrixTransform(inverseMatrix);
			const blChart = bottomLeft.matrixTransform(inverseMatrix);
			const brChart = bottomRight.matrixTransform(inverseMatrix);

			// Find the x-range that's visible with a margin to ensure smooth entry/exit
			const minX = Math.min(tlChart.x, trChart.x, blChart.x, brChart.x);
			const maxX = Math.max(tlChart.x, trChart.x, blChart.x, brChart.x);

			// Add padding to visible range for smoother rendering at edges
			const xPadding = (maxX - minX) * 0.05;
			const paddedMinX = minX - xPadding;
			const paddedMaxX = maxX + xPadding;

			// Determine step size based on resolution and visible range
			// Adaptive resolution based on zoom level for smooth rendering
			const visibleRange = paddedMaxX - paddedMinX;

			// Calculate optimal step size based on current scale factor
			const scaleFactorX = Math.abs(state.matrix.a);
			// More points at higher zoom levels, fewer at lower zoom
			const adaptiveResolution = resolution * Math.max(1, scaleFactorX * 0.5);
			const pointsToPlot = visibleRange * adaptiveResolution;

			// Limit the number of points to prevent performance issues
			// But ensure enough detail for smooth curves
			const step = Math.max(0.1, visibleRange / Math.min(10000, pointsToPlot));

			// Save the initial context state
			ctx.save();

			// Apply transform from chart context
			ctx.setTransform(state.matrix);

			// Calculate scale-invariant line width
			// Division by matrix scale factor keeps line width constant regardless of zoom
			const scaleFactorY = Math.abs(state.matrix.d); // Vertical scale component
			const scaleFactor = Math.min(scaleFactorX, scaleFactorY);
			const adjustedLineWidth =
				scaleFactor > 0 ? lineWidth / scaleFactor : lineWidth;

			// Set line style with scale-invariant width
			ctx.strokeStyle = color;
			ctx.lineWidth = adjustedLineWidth;

			// Improve line quality
			ctx.lineCap = "round";
			ctx.lineJoin = "round";

			// Draw the function
			ctx.beginPath();

			let isFirstPoint = true;
			let lastY = null;
			const yRange = visibleRange * 2; // Estimate y range based on x range
			const maxYStep = yRange * 5; // Detect discontinuities, more forgiving value

			// Start slightly before visible area to ensure smooth entry into view
			for (let x = paddedMinX; x <= paddedMaxX; x += step) {
				try {
					const y = func(x);

					// Skip NaN or infinite values
					if (Number.isNaN(y) || !Number.isFinite(y)) {
						isFirstPoint = true; // Start a new path segment after invalid points
						continue;
					}

					// Detect large jumps (discontinuities) and start a new segment
					if (
						!isFirstPoint &&
						lastY !== null &&
						Math.abs(y - (lastY as number)) > maxYStep
					) {
						ctx.stroke(); // Draw the current segment
						ctx.beginPath(); // Start a new segment
						isFirstPoint = true;
					}

					if (isFirstPoint) {
						ctx.moveTo(x, y);
						isFirstPoint = false;
					} else {
						ctx.lineTo(x, y);
					}

					lastY = y;
				} catch (err) {
					// Skip errors in function evaluation
					isFirstPoint = true; // Start a new path segment after errors
					console.error("Error evaluating function at x =", x, err);
				}
			}

			// Actually draw the function on the canvas
			ctx.stroke();

			// Restore the context state
			ctx.restore();

			// Clear the animation frame reference
			animationFrameRef.current = null;
		});
	}, [state.matrix, func, color, lineWidth, resolution, resizeCanvas]);

	// Trigger redraw when dependencies change
	useEffect(() => {
		draw();
	}, [draw]);

	// Set up cleanup on unmount
	useEffect(() => {
		return () => {
			if (animationFrameRef.current !== null) {
				cancelAnimationFrame(animationFrameRef.current);
			}
			if (canvasRef.current) {
				const ctx = canvasRef.current.getContext("2d");
				if (ctx) {
					ctx.clearRect(
						0,
						0,
						canvasRef.current.width,
						canvasRef.current.height,
					);
				}
			}
		};
	}, []);

	// Add CSS to ensure plot is visible above grid
	useEffect(() => {
		if (canvasRef.current) {
			canvasRef.current.style.zIndex = "10";
		}
	}, []);

	return <canvas className="function-plot" ref={canvasRef} />;
}

export default FunctionPlot;
