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
	const { fitToContainer, clearCanvas } = usePlotable();

	useEffect(() => {
		const canvas = ref.current;
		if (!canvas) {
			return;
		}
		fitToContainer(canvas);
	}, [fitToContainer]);

	const draw = useCallback(() => {
		if (!ref.current) {
			return;
		}
		const canvas = ref.current;
		const ctx = clearCanvas(canvas);
		if (!ctx) {
			return;
		}

		const { x: ox, y: oy, width: ow, height: oh } = state.outerBounds;
		const { x, y, width, height } = state.bounds;

		const hRange = width - x;
		const hOrigin = x;
		const hOuterRange = Math.abs(ox - ow);

		if (hOuterRange <= 0 || hRange <= 0) return;

		const { zl, majorTicks } = calculateGridTicks(hRange, hOrigin, hOuterRange);

		console.log("AxisTime majorTicks:", majorTicks, "zl:", zl);

		ctx.fillStyle = "#DDDDDD";
		ctx.font = "10px sans-serif";
		ctx.textAlign = "center";
		ctx.textBaseline = "top";
		const labelPadding = 5;

		for (const value of majorTicks) {
			const point = new DOMPoint(value, 0).matrixTransform(state.matrix_x);

			console.log("AxisTime label point:", point, "value:", value);

			if (point.x >= 0 && point.x <= canvas.width) {
				const label = formatAxisLabel(value, zl);
				ctx.fillText(label, point.x, labelPadding);
			}
		}
	}, [state.outerBounds, state.bounds, state.matrix_x, clearCanvas]);

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
