import type React from "react";
import { useCallback, useEffect, useRef } from "react";
import useChartContext from "../../../context/chartContext";

import usePlotable from "../../../hooks/usePlottable";
import { convertComponentsSpaceToChartSpace, getXY } from "../../../utils";
import {
	YEAR_MONTH_ZOOM_LEVEL,
	type ZoomLevel,
	epochToString,
	zoomLevels,
} from "./functions";

// https://github.com/pyqtgraph/pyqtgraph/blob/master/pyqtgraph/graphicsItems/DateAxisItem.py

interface TimeVariables {
	zoomLevel: ZoomLevel;
	utcOffset: number;
}

export function AxisTime() {
	const ref = useRef<HTMLCanvasElement | null>(null);
	const { state, dispatch, translateView, scaleView, variables, mouse } =
		useChartContext();
	const { fitToContainer, clearCanvas } = usePlotable();

	const { current: timeVar } = useRef<TimeVariables>({
		zoomLevel: YEAR_MONTH_ZOOM_LEVEL,
		utcOffset: 0,
	});

	useEffect(() => {
		const canvas = ref.current;
		const ctx = canvas?.getContext("2d");
		if (!ctx) {
			return;
		}
		if (!canvas) {
			return;
		}
		fitToContainer(canvas);
		// draw()
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

		ctx.strokeStyle = "#26dc57";

		ctx.strokeText(
			`${state?.bounds?.x.toFixed(1)} ${state?.bounds?.width.toFixed(1)}`,
			0,
			10,
		);
		ctx.strokeText(
			`${epochToString(state?.bounds?.x)} ${epochToString(state?.bounds?.x)}`,
			0,
			25,
		);
		ctx.strokeText(
			`${epochToString(state?.bounds?.width)} ${epochToString(state?.bounds?.width)}`,
			canvas.getBoundingClientRect().width - 200,
			25,
		);
	}, [state?.bounds, clearCanvas]);

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
					{ x: 1 - (mouse.clickPos.x - mouse.pos.x) / 250, y: 1 },
					{ x: mouse.realClickPos.x, y: mouse.realClickPos.y },
				);
				break;
			}
			case 1: {
				// middle -- translate
				variables.isDragging = true;
				translateView({ x: mouse.pos.x - mouse.clickPos.x, y: 0 });
				break;
			}
			case 2: // right
				// code block
				break;
			default:

			// code block
		}
	};

	const setZoomLevelForDensity = (density: number) => {
		// """
		// Setting `zoomLevel` and `minSpacing` based on given density of seconds per pixel

		// The display format is adjusted automatically depending on the current time
		// density (seconds/point) on the axis. You can customize the behaviour by
		// overriding this function or setting a different set of zoom levels
		// than the default one. The `zoomLevels` variable is a dictionary with the
		// maximal distance of ticks in seconds which are allowed for each zoom level
		// before the axis switches to the next coarser level. To customize the zoom level
		// selection, override this function.
		// """
		const padding = 10;

		// # Size in pixels a specific tick label will take
		// if self.orientation in ['bottom', 'top']:
		//     def sizeOf(text):
		//         return self.fontMetrics.boundingRect(text).width() + padding
		// else:
		//     def sizeOf(text):
		//         return self.fontMetrics.boundingRect(text).height() + padding

		// # Fallback zoom level: Years/Months

		const size = 10; // TODO

		for (const [maximalSpacing, zoomLevel] of zoomLevels.entries()) {
			console.log(maximalSpacing, zoomLevel);
			// # Test if zoom level is too fine grained
			if (maximalSpacing / size < density) {
				break;
			}
			timeVar.zoomLevel = zoomLevel;

			// # Set up zoomLevel
			timeVar.zoomLevel.utcOffset = timeVar.utcOffset;

			// # Calculate minimal spacing of items on the axis
			// size = sizeOf(self.zoomLevel.exampleText)
			// self.minSpacing = density*size
		}
	};

	useEffect(() => {
		draw();
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
