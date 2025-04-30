import type React from "react";
import { useCallback, useEffect, useRef } from "react";
import useChartContext from "../../../context/chartContext";

import usePlotable from "../../../hooks/usePlottable";
import {
	calculateGridTicks,
	convertComponentsSpaceToChartSpace,
	formatAxisLabel,
	getXY,
} from "../../../utils";

// https://github.com/pyqtgraph/pyqtgraph/blob/master/pyqtgraph/graphicsItems/DateAxisItem.py

export function AxisTime() {
	const ref = useRef<HTMLCanvasElement>(null);
	const { state, dispatch, translateView, scaleView, variables, mouse } =
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

			// Get current matrix as string for comparison - use matrix_x for x-axis
			const currentMatrixString = JSON.stringify([
				state.matrix_x.a,
				state.matrix_x.b,
				state.matrix_x.c,
				state.matrix_x.d,
				state.matrix_x.e,
				state.matrix_x.f,
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
			const topLeft = new DOMPoint(-padding, 0);
			const bottomRight = new DOMPoint(canvasWidth + padding, 0);

			// Transform to chart space using the inverse matrix
			const inverseMatrix = state.matrix_x.inverse();
			const tlChart = topLeft.matrixTransform(inverseMatrix);
			const brChart = bottomRight.matrixTransform(inverseMatrix);

			// Use these extended bounds for tick calculations
			const extendedMinX = Math.min(tlChart.x, brChart.x);
			const extendedMaxX = Math.max(tlChart.x, brChart.x);
			const hRange = extendedMaxX - extendedMinX;
			const hOrigin = extendedMinX;
			const hOuterRange = hRange * 1.5; // Add extra padding

			if (hOuterRange <= 0 || hRange <= 0) return;

			const { zl, majorTicks, minorTicks } = calculateGridTicks(
				hRange,
				hOrigin,
				hOuterRange,
				1.5, // Increase density factor
			);

			// Save initial state
			ctx.save();

			// Draw labels directly in screen space
			ctx.fillStyle = "#DDDDDD";
			ctx.font = "10px sans-serif";
			ctx.textAlign = "center";
			ctx.textBaseline = "top";
			const labelPadding = 5; // Screen space padding from top edge
			const tickLength = 6; // Length of tick marks
			const minorTickLength = 3; // Length of minor tick marks

			// First draw all the minor tick marks
			if (minorTicks && minorTicks.length > 0) {
				ctx.beginPath();
				ctx.strokeStyle = "#888888"; // Lighter color for minor ticks
				ctx.lineWidth = 0.5; // Thinner line for minor ticks

				for (const value of minorTicks) {
					// Use the x-axis matrix for transformations to ensure consistency with the chart
					const screenPoint = new DOMPoint(value, 0).matrixTransform(
						state.matrix_x,
					);

					// Only draw ticks horizontally within the canvas
					if (screenPoint.x >= 0 && screenPoint.x <= canvas.width) {
						// Draw tick mark
						ctx.moveTo(screenPoint.x, 0);
						ctx.lineTo(screenPoint.x, minorTickLength);
					}
				}
				ctx.stroke();
			}

			// Then draw all the major tick marks
			ctx.beginPath();
			ctx.strokeStyle = "#DDDDDD";
			ctx.lineWidth = 1;

			for (const value of majorTicks) {
				// Use the x-axis matrix for transformations to ensure consistency with the chart
				const screenPoint = new DOMPoint(value, 0).matrixTransform(
					state.matrix_x,
				);

				// Only draw ticks horizontally within the canvas
				if (screenPoint.x >= 0 && screenPoint.x <= canvas.width) {
					// Draw tick mark
					ctx.moveTo(screenPoint.x, 0);
					ctx.lineTo(screenPoint.x, tickLength);
				}
			}
			ctx.stroke();

			// Then draw all the labels for major ticks
			for (const value of majorTicks) {
				// Use the x-axis matrix for transformations to ensure consistency with the chart
				const screenPoint = new DOMPoint(value, 0).matrixTransform(
					state.matrix_x,
				);

				// Only draw labels horizontally within the canvas
				if (screenPoint.x >= 0 && screenPoint.x <= canvas.width) {
					const label = formatAxisLabel(value, zl);
					// Draw at transformed screen X, fixed screen Y
					ctx.fillText(label, screenPoint.x, tickLength + labelPadding);
				}
			}

			// Restore context state
			ctx.restore();

			// Clear the animation frame reference
			animationFrameRef.current = null;
		});
	}, [state.matrix_x, resizeCanvas]);

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
		// Store the initial click position in screen space
		mouse.clickPos = getXY(ref.current, event);

		// Store the initial position in chart space - this will be our fixed reference point
		mouse.realClickPos = convertComponentsSpaceToChartSpace(
			mouse.clickPos,
			state.matrix, // Keep using the main matrix for coordinate conversions
		);

		// Store a copy of the initial position for reference (used to center scaling)
		mouse.initialScreenClickPos = { ...mouse.clickPos };

		mouse.button = event.button;
		variables.matrix = state.matrix;
	};

	const handlePointerUp = (event: React.PointerEvent) => {
		if (ref.current === null) {
			return;
		}
		mouse.button = null;
		variables.isDragging = false;
	};

	const handlePointerOut = (event: React.PointerEvent) => {
		if (ref.current === null) {
			return;
		}
		mouse.button = null;
		variables.isDragging = false;
	};

	const handlePointerMove = (event: React.PointerEvent) => {
		if (ref.current === null || mouse.button === null) {
			return;
		}

		variables.isDragging = true;
		mouse.bounds = ref.current.getBoundingClientRect();
		mouse.pos = getXY(ref.current, event);

		switch (mouse.button) {
			case 0: {
				// Create a new reference point from the initial click position
				// Use this fixed reference point for all scaling operations
				// This ensures the scaling is centered around where the mouse down happened
				const sensitivity = 500;
				const deltaX = mouse.pos.x - mouse.clickPos.x;
				const scaleX = 1 + deltaX / sensitivity;
				const safeScaleX = Math.max(0.01, scaleX);

				// Use the real click position (in chart space) as the origin for scaling
				// This ensures scaling is centered around the position where mouse down happened
				scaleView(
					{ x: safeScaleX, y: 1 },
					{ x: mouse.realClickPos.x, y: mouse.realClickPos.y },
				);

				// Only update the X position, keeping the original Y position
				mouse.clickPos.x = mouse.pos.x;
				break;
			}
			case 1: {
				const deltaX = mouse.pos.x - mouse.clickPos.x;
				translateView({ x: deltaX, y: 0 });
				mouse.clickPos.x = mouse.pos.x;
				break;
			}
			default:
				break;
		}
	};

	return (
		<canvas
			ref={ref}
			className="x-axis axis rg-chart-axis-time"
			onPointerDown={handlePointerDown}
			onPointerUp={handlePointerUp}
			onPointerMove={handlePointerMove}
			onPointerOut={handlePointerOut}
		/>
	);
}
