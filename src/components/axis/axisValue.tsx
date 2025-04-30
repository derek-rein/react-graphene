import type React from "react";
import { useCallback, useEffect, useRef } from "react";
import useChartContext from "../../context/chartContext";
import usePlotable from "../../hooks/usePlottable";
import {
	calculateGridTicks,
	convertComponentsSpaceToChartSpace,
	formatAxisLabel,
	getXY,
} from "../../utils";

export function AxisValue() {
	const ref = useRef<HTMLCanvasElement>(null);

	const { state, dispatch, scaleView, translateView, mouse, variables } =
		useChartContext();
	const { resizeCanvas, clearCanvas } = usePlotable();

	// Track animation frame to avoid multiple renders
	const animationFrameRef = useRef<number | null>(null);
	// Track matrix for change detection
	const lastMatrixRef = useRef<string | null>(null);

	const draw = useCallback(() => {
		if (!ref.current) return;

		// Cancel any pending animation frame
		if (animationFrameRef.current !== null) {
			cancelAnimationFrame(animationFrameRef.current);
			animationFrameRef.current = null;
		}

		// Schedule drawing in the next animation frame
		animationFrameRef.current = requestAnimationFrame(() => {
			if (!ref.current) return;

			// Get current matrix as string for comparison - use matrix_y for y-axis
			const currentMatrixString = JSON.stringify([
				state.matrix_y.a,
				state.matrix_y.b,
				state.matrix_y.c,
				state.matrix_y.d,
				state.matrix_y.e,
				state.matrix_y.f,
			]);

			// Check if matrix has changed
			const matrixChanged = currentMatrixString !== lastMatrixRef.current;
			lastMatrixRef.current = currentMatrixString;

			// Only redraw if matrix has changed
			if (!matrixChanged) return;

			// Ensure canvas size and DPI scaling are set before drawing
			const canvas = ref.current;

			// Force a resize with the current dimensions - this resets the canvas
			const currentWidth = canvas.width;
			canvas.width = 0;
			canvas.width = currentWidth;

			resizeCanvas(canvas);

			// Get a fresh context
			const ctx = canvas.getContext("2d");
			if (!ctx) return;

			// Clear the canvas explicitly
			ctx.clearRect(0, 0, canvas.width, canvas.height);

			// Calculate visible area in chart space for extended coverage
			// Get canvas dimensions
			const canvasWidth = canvas.width;
			const canvasHeight = canvas.height;

			// Create corner points in screen space with padding
			const padding = 100; // Extra padding for better tick coverage
			const topLeft = new DOMPoint(0, -padding);
			const bottomRight = new DOMPoint(0, canvasHeight + padding);

			// Transform to chart space using the inverse matrix
			const inverseMatrix = state.matrix_y.inverse();
			const tlChart = topLeft.matrixTransform(inverseMatrix);
			const brChart = bottomRight.matrixTransform(inverseMatrix);

			// Use these extended bounds for tick calculations
			const extendedMinY = Math.min(tlChart.y, brChart.y);
			const extendedMaxY = Math.max(tlChart.y, brChart.y);
			const vRange = extendedMaxY - extendedMinY;
			const vOrigin = extendedMinY;
			const vOuterRange = vRange * 1.5; // Add extra padding

			if (vOuterRange <= 0 || vRange <= 0) return;

			const { zl, majorTicks, minorTicks } = calculateGridTicks(
				vRange,
				vOrigin,
				vOuterRange,
				1.5, // Increase density factor
			);

			// Draw labels directly in screen space
			ctx.fillStyle = "#DDDDDD";
			ctx.font = "10px sans-serif";
			ctx.textAlign = "right";
			ctx.textBaseline = "middle";
			const labelPadding = 5; // Screen space padding from right edge
			const tickLength = 6; // Length of tick marks
			const minorTickLength = 3; // Length of minor tick marks

			// Save initial state
			ctx.save();

			// First draw all the minor tick marks
			if (minorTicks && minorTicks.length > 0) {
				ctx.beginPath();
				ctx.strokeStyle = "#888888"; // Lighter color for minor ticks
				ctx.lineWidth = 0.5; // Thinner line for minor ticks

				for (const value of minorTicks) {
					// Use the y-axis matrix to transform y-values consistently with the main chart
					const point = new DOMPoint(0, value).matrixTransform(state.matrix_y);

					// Only draw ticks vertically within the canvas
					if (point.y >= 0 && point.y <= canvas.height) {
						// Draw tick mark
						ctx.moveTo(canvas.width - minorTickLength - labelPadding, point.y);
						ctx.lineTo(canvas.width - labelPadding, point.y);
					}
				}
				ctx.stroke();
			}

			// Then draw all the major tick marks
			ctx.beginPath();
			ctx.strokeStyle = "#DDDDDD";
			ctx.lineWidth = 1;

			for (const value of majorTicks) {
				// Use the y-axis matrix to transform y-values consistently with the main chart
				// This ensures alignment between grid lines and axis ticks
				const point = new DOMPoint(0, value).matrixTransform(state.matrix_y);

				// Only draw ticks vertically within the canvas
				if (point.y >= 0 && point.y <= canvas.height) {
					// Draw tick mark
					ctx.moveTo(canvas.width - tickLength - labelPadding, point.y);
					ctx.lineTo(canvas.width - labelPadding, point.y);
				}
			}
			ctx.stroke();

			// Then draw all the labels for major ticks
			for (const value of majorTicks) {
				// Use the y-axis matrix to transform y-values consistently with the main chart
				const point = new DOMPoint(0, value).matrixTransform(state.matrix_y);

				// Only draw labels vertically within the canvas
				if (point.y >= 0 && point.y <= canvas.height) {
					const label = formatAxisLabel(value, zl);
					// Draw at fixed screen X (relative to axis canvas), transformed Y
					ctx.fillText(
						label,
						canvas.width - tickLength - labelPadding - 2,
						point.y,
					);
				}
			}

			// Restore context state
			ctx.restore();

			// Clear the animation frame reference
			animationFrameRef.current = null;
		});
	}, [state.matrix_y, resizeCanvas]);

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

	const handlePointerDown = (event: React.PointerEvent) => {
		if (ref.current === null) {
			return;
		}
		event.stopPropagation(); // Prevent event bubbling

		// Store the initial click position in screen space
		mouse.clickPos = getXY(ref.current, event);
		mouse.initialScreenClickPos = { ...mouse.clickPos }; // Store screen pos

		// Calculate the initial chart space position using the MAIN matrix
		// This ensures the origin point is consistent across all components
		mouse.realClickPos = convertComponentsSpaceToChartSpace(
			mouse.clickPos,
			state.matrix, // USE MAIN MATRIX HERE
		);

		// Store a snapshot of the MAIN matrix at the start of the drag
		variables.matrix = new DOMMatrix(state.matrix.toString());

		mouse.button = event.button;
	};

	const handlePointerUp = (event: React.PointerEvent) => {
		if (ref.current === null) {
			return;
		}
		event.stopPropagation(); // Prevent event bubbling
		mouse.button = null;
		variables.isDragging = false;
	};

	const handlePointerOut = (event: React.PointerEvent) => {
		if (ref.current === null) {
			return;
		}
		mouse.button = null;
	};

	const handlePointerMove = (event: React.PointerEvent) => {
		if (ref.current === null || mouse.button === null) {
			return;
		}
		event.stopPropagation(); // Prevent event bubbling

		variables.isDragging = true;
		mouse.bounds = ref.current.getBoundingClientRect();
		mouse.pos = getXY(ref.current, event);

		const initialMatrix = variables.matrix;
		const screenOriginStart = mouse.initialScreenClickPos;
		const chartOrigin = mouse.realClickPos;

		if (!initialMatrix || !screenOriginStart || !chartOrigin) {
			console.warn("AxisValue: Missing initial state for drag");
			return;
		}

		switch (mouse.button) {
			case 0: {
				// Left Mouse Button: Scaling Y-Axis
				const sensitivity = 250;
				// Total screen delta from drag start for Y
				const totalDeltaY = mouse.pos.y - screenOriginStart.y;
				const scaleY = Math.exp(-totalDeltaY / sensitivity); // Use negative delta for Y screen coords
				const safeScaleY = Math.max(0.01, scaleY);

				// --- Calculate target matrix for Y-axis scaling ---
				const scaleTransform = new DOMMatrix()
					.translate(chartOrigin.x, chartOrigin.y)
					.scale(1, safeScaleY) // Scale only Y
					.translate(-chartOrigin.x, -chartOrigin.y);

				const scaledMatrix = scaleTransform.multiply(initialMatrix);

				const chartOriginPoint = new DOMPoint(chartOrigin.x, chartOrigin.y);
				const screenOriginAfterScale =
					chartOriginPoint.matrixTransform(scaledMatrix);

				// Apply correction only for Y
				const correctionY = screenOriginStart.y - screenOriginAfterScale.y;

				const targetMatrix = new DOMMatrix([
					scaledMatrix.a,
					scaledMatrix.b,
					scaledMatrix.c,
					scaledMatrix.d,
					scaledMatrix.e, // Keep original X translation
					scaledMatrix.f + correctionY,
				]);

				dispatch({
					type: "setMatrix",
					payload: { matrix: targetMatrix, rect: mouse.bounds },
				});
				break;
			}
			case 1: {
				// Middle Mouse Button: Translate Y-Axis
				// Calculate total screen space delta for Y
				const totalScreenDeltaY = mouse.pos.y - screenOriginStart.y;

				// Get the device pixel ratio
				const dpr = window.devicePixelRatio || 1;

				// Create the target matrix by adding total delta (scaled by DPR)
				// to initial matrix's Y translation
				const targetMatrix = new DOMMatrix([
					initialMatrix.a,
					initialMatrix.b,
					initialMatrix.c,
					initialMatrix.d,
					initialMatrix.e, // X translation remains unchanged
					initialMatrix.f + totalScreenDeltaY * dpr,
				]);

				dispatch({
					type: "setMatrix",
					payload: { matrix: targetMatrix, rect: mouse.bounds },
				});
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
