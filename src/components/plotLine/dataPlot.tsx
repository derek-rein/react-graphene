import React, { useCallback, useEffect, useRef } from "react";
import "../../scss/common.scss";
import useChartContext from "../../context/chartContext";
import usePlotable from "../../hooks/usePlottable";

interface DataPoint {
	x: number;
	y: number;
}

interface DataPlotProps {
	data: DataPoint[];
	color?: string;
	lineWidth?: number;
}

export function DataPlot({
	data,
	color = "#26dc57",
	lineWidth = 1,
}: DataPlotProps) {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const { state } = useChartContext();
	const { resizeCanvas, clearCanvas } = usePlotable();

	// Track matrix for render optimization
	const lastMatrixRef = useRef<string | null>(null);
	// Track animation frame to avoid multiple renders
	const animationFrameRef = useRef<number | null>(null);

	const draw = useCallback(() => {
		if (!canvasRef.current || !data.length) {
			return;
		}

		// Cancel any pending animation frame
		if (animationFrameRef.current !== null) {
			cancelAnimationFrame(animationFrameRef.current);
			animationFrameRef.current = null;
		}

		// Schedule drawing in the next animation frame
		animationFrameRef.current = requestAnimationFrame(() => {
			if (!canvasRef.current || !data.length) return;

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

			// Save the initial context state
			ctx.save();

			// Create a clipping region matching the canvas bounds
			// This ensures we don't render outside the visible area
			ctx.beginPath();
			ctx.rect(0, 0, canvas.width, canvas.height);
			ctx.clip();

			// Apply transform from chart context
			ctx.setTransform(state.matrix);

			// Calculate scale-invariant line width
			// Division by matrix scale factor keeps line width constant regardless of zoom
			const scaleFactorX = Math.abs(state.matrix.a); // Horizontal scale component
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

			// Calculate visible bounds for culling out-of-view points
			const inv = state.matrix.inverse();
			const topLeft = inv.transformPoint(new DOMPoint(0, 0));
			const bottomRight = inv.transformPoint(
				new DOMPoint(canvas.width, canvas.height),
			);

			// Add padding to prevent edge cutoff
			const visibleMinX = topLeft.x - adjustedLineWidth * 10;
			const visibleMaxX = bottomRight.x + adjustedLineWidth * 10;
			const visibleMinY = topLeft.y - adjustedLineWidth * 10;
			const visibleMaxY = bottomRight.y + adjustedLineWidth * 10;

			// Find the first and last visible points to draw
			let startIdx = 0;
			let endIdx = data.length - 1;

			// Find first visible point - optimization for large datasets
			if (data.length > 1000) {
				for (let i = 0; i < data.length; i++) {
					if (data[i].x >= visibleMinX || i === data.length - 1) {
						startIdx = Math.max(0, i - 1); // Include one point before for continuity
						break;
					}
				}

				// Find last visible point
				for (let i = data.length - 1; i >= 0; i--) {
					if (data[i].x <= visibleMaxX || i === 0) {
						endIdx = Math.min(data.length - 1, i + 1); // Include one point after for continuity
						break;
					}
				}
			}

			// Draw the line, but only the visible portion
			ctx.beginPath();

			// Always start with the first visible point
			ctx.moveTo(data[startIdx].x, data[startIdx].y);

			// Draw lines to subsequent visible points
			for (let i = startIdx + 1; i <= endIdx; i++) {
				ctx.lineTo(data[i].x, data[i].y);
			}

			// Actually draw the line on the canvas
			ctx.stroke();

			// Restore the context state
			ctx.restore();

			// Clear the animation frame reference
			animationFrameRef.current = null;
		});
	}, [state.matrix, data, color, lineWidth, resizeCanvas]);

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

	return <canvas className="data-plot" ref={canvasRef} />;
}

export default DataPlot;
