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
				ctx.fillText(label, canvas.width - labelPadding, point.y);
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
		mouse.clickPos = getXY(ref.current, event);
		mouse.realClickPos = convertComponentsSpaceToChartSpace(
			mouse.clickPos,
			state.matrix,
		);
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
				scaleView(
					{ x: 1, y: 1 - (mouse.clickPos.y - mouse.pos.y) / 250 },
					{ x: mouse.realClickPos.x, y: mouse.realClickPos.y },
				);
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
