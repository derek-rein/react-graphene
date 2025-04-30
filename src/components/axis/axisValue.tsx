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
	const ref = useRef<HTMLCanvasElement | null>(null);

	const { state, dispatch, scaleView, translateView, mouse, variables } =
		useChartContext();
	const { resizeCanvas, clearCanvas } = usePlotable();

	// VARIABLES

	const draw = useCallback(() => {
		if (!ref.current) return;
		// Ensure canvas size and DPI scaling are set before drawing
		resizeCanvas(ref.current);

		const canvas = ref.current;
		const ctx = clearCanvas(canvas);
		if (!ctx) return;

		const { x: ox, y: oy, width: ow, height: oh } = state.outerBounds;
		const { x, y, width, height } = state.bounds;

		// Calculate vertical ticks using the utility function
		const vRange = height - y;
		const vOrigin = y;
		const vOuterRange = Math.abs(oy - oh);

		if (vOuterRange <= 0 || vRange <= 0) return;

		const { zl, majorTicks } = calculateGridTicks(vRange, vOrigin, vOuterRange);
		console.log("AxisValue vTicks:", { zl, majorTicks });

		// Draw labels directly in screen space
		ctx.fillStyle = "#DDDDDD";
		ctx.font = "10px sans-serif";
		ctx.textAlign = "right";
		ctx.textBaseline = "middle";
		const labelPadding = 5; // Screen space padding from right edge
		const tickLength = 6; // Length of tick marks

		// First draw all the tick marks
		ctx.beginPath();
		ctx.strokeStyle = "#DDDDDD";
		ctx.lineWidth = 1;

		for (const value of majorTicks) {
			// Transform chart Y coordinate to the correct Y position within this axis canvas
			const point = new DOMPoint(0, value).matrixTransform(state.matrix_y);

			// Only draw ticks vertically within the canvas
			if (point.y >= 0 && point.y <= canvas.height) {
				// Draw tick mark
				ctx.moveTo(canvas.width - tickLength - labelPadding, point.y);
				ctx.lineTo(canvas.width - labelPadding, point.y);
			}
		}
		ctx.stroke();

		// Then draw all the labels
		for (const value of majorTicks) {
			// Transform chart Y coordinate to the correct Y position within this axis canvas
			// using the y-specific matrix (which includes appropriate scale/translation)
			const point = new DOMPoint(0, value).matrixTransform(state.matrix_y); // <-- Use matrix_y

			// Log the transformed point relative to the axis canvas
			console.log(
				`YLabel for ${value}: (${point.x.toFixed(1)}, ${point.y.toFixed(1)})`,
			);

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
	}, [
		state.outerBounds,
		state.bounds,
		state.matrix_y,
		clearCanvas,
		resizeCanvas,
	]); // Removed state.matrix dependency

	useEffect(() => {
		try {
			draw();
		} catch (err) {
			console.log(err);
		}
	}, [draw]);

	const handlePointerDown = (event: React.PointerEvent) => {
		if (ref.current === null) {
			return;
		}
		// Store the initial click position in screen space
		mouse.clickPos = getXY(ref.current, event);

		// Store the initial position in chart space - this will be our fixed reference point
		mouse.realClickPos = convertComponentsSpaceToChartSpace(
			mouse.clickPos,
			state.matrix,
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
		variables.matrix = state.matrix;
		variables.isDragging = false;
	};

	const handlePointerOut = (event: React.PointerEvent) => {
		if (ref.current === null) {
			return;
		}
		mouse.button = null;
	};

	const handlePointerMove = (event: React.PointerEvent) => {
		if (ref.current === null) {
			return;
		}

		mouse.bounds = ref.current.getBoundingClientRect();
		mouse.pos = getXY(ref.current, event);
		mouse.realPos = convertComponentsSpaceToChartSpace(
			mouse.pos,
			variables.matrix,
		);

		switch (mouse.button) {
			case 0: {
				// left -- scale
				variables.isDragging = true;

				// Calculate Y scaling factor based on drag distance
				const sensitivity = 250;
				const deltaY = mouse.pos.y - mouse.clickPos.y;
				const scaleY = 1 - deltaY / sensitivity;
				const safeScaleY = Math.max(0.01, scaleY);

				// Use the initial click position (in chart space) as the origin for scaling
				// This ensures scaling is centered around the position where mouse down happened
				scaleView(
					{ x: 1, y: safeScaleY },
					{ x: mouse.realClickPos.x, y: mouse.realClickPos.y },
				);

				// Only update the Y position, keeping the original real click position
				mouse.clickPos.y = mouse.pos.y;
				break;
			}
			case 1: {
				// middle -- translate
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
