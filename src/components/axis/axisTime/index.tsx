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
	const ref = useRef<HTMLCanvasElement | null>(null);
	const { state, dispatch, translateView, scaleView, variables, mouse } =
		useChartContext();
	const { resizeCanvas, clearCanvas } = usePlotable();

	const draw = useCallback(() => {
		if (!ref.current) return;
		// Ensure canvas size and DPI scaling are set before drawing
		resizeCanvas(ref.current);

		const canvas = ref.current;
		const ctx = clearCanvas(canvas);
		if (!ctx) return;

		const { x: ox, y: oy, width: ow, height: oh } = state.outerBounds;
		const { x, y, width, height } = state.bounds;

		// Calculate horizontal ticks using the utility function
		const hRange = width - x;
		const hOrigin = x;
		const hOuterRange = Math.abs(ox - ow);

		if (hOuterRange <= 0 || hRange <= 0) return;

		const { zl, majorTicks } = calculateGridTicks(hRange, hOrigin, hOuterRange);
		// console.log("AxisTime majorTicks:", majorTicks);

		// Draw labels directly in screen space
		ctx.fillStyle = "#DDDDDD";
		ctx.font = "10px sans-serif";
		ctx.textAlign = "center";
		ctx.textBaseline = "top";
		const labelPadding = 5; // Screen space padding from top edge

		for (const value of majorTicks) {
			// Transform chart X coordinate to screen space X coordinate
			// Use the *full* matrix to get the final screen position
			// We assume the label is positioned vertically at the top edge (padding)
			const screenPoint = new DOMPoint(value, 0).matrixTransform(state.matrix); // Use full matrix

			// Only draw labels horizontally within the canvas
			if (screenPoint.x >= 0 && screenPoint.x <= canvas.width) {
				const label = formatAxisLabel(value, zl);
				// Draw at transformed screen X, fixed screen Y
				ctx.fillText(label, screenPoint.x, labelPadding);
			}
		}
		// NO ctx.setTransform, NO state.matrix_x needed here anymore
	}, [
		state.outerBounds,
		state.bounds,
		state.matrix,
		clearCanvas,
		resizeCanvas,
	]); // Add resizeCanvas

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
				const sensitivity = 500;
				const deltaX = mouse.pos.x - mouse.clickPos.x;
				const scaleX = 1 + deltaX / sensitivity;
				const safeScaleX = Math.max(0.01, scaleX);
				scaleView({ x: safeScaleX, y: 1 }, mouse.realClickPos);
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

	useEffect(() => {
		try {
			draw();
		} catch (err) {
			console.log(err);
		}
	}, [draw]);

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
