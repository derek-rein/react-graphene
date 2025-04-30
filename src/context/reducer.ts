import { nearest, roundCeil, roundFloor, roundup, zoomLevel } from "../utils";
import type { StateChart } from "./types";

// transform(a, b, c, d, e, f)
// Copy to Clipboard
// The transformation matrix is described by: [
// a	c	e
// b	d	f
// 0	0	1 ]

// Parameters
// a (m11)
// Horizontal scaling. A value of 1 results in no scaling.
// b (m12)
// Vertical skewing.
// c (m21)
// Horizontal skewing.
// d (m22)
// Vertical scaling. A value of 1 results in no scaling.
// e (dx)
// Horizontal translation (moving).
// f (dy)
// Vertical translation (moving).

const calculateBounds = (matrix: DOMMatrix, canvasSize: DOMRect) => {
	// bounds of the viewport in data space
	const inv = matrix.inverse();
	const top_left_corner = inv.transformPoint(new DOMPoint(0, 0));
	const bottom_right_corner = inv.transformPoint(
		new DOMPoint(canvasSize.width, canvasSize.height),
	);
	const viewRect = new DOMRect(
		top_left_corner.x,
		top_left_corner.y,
		bottom_right_corner.x,
		bottom_right_corner.y,
	);
	return viewRect;
};

const calculateOuterBounds = (bounds: DOMRect) => {
	// Calculate rounded outer bounds for both X and Y axes
	// to ensure ticks/grid lines extend slightly beyond the visible area.

	const xRange = bounds.width - bounds.x;
	const yRange = bounds.height - bounds.y;

	const zl_x = zoomLevel(xRange); // Calculate zoom level for x range
	const zl_y = zoomLevel(yRange); // Calculate zoom level for y range

	const zoom_x = 10 ** zl_x;
	const zoom_y = 10 ** zl_y;

	// Calculate rounded start/end for X and Y based on their respective zoom levels
	// Using floor for start and ceil for end ensures the outer bounds encompass the inner bounds.
	const outerX = roundFloor(bounds.x, zoom_x);
	const outerWidth = roundCeil(bounds.width, zoom_x);
	const outerY = roundFloor(bounds.y, zoom_y);
	const outerHeight = roundCeil(bounds.height, zoom_y);

	// console.log("Bounds:", bounds);
	// console.log("Outer Bounds:", { outerX, outerY, outerWidth, outerHeight });

	return new DOMRect(outerX, outerY, outerWidth - outerX, outerHeight - outerY);
	// Note: DOMRect width/height are calculated relative to x/y.
	// We store the calculated end points (outerWidth, outerHeight) and derive width/height here.
	// However, the original code stored y and height directly. Let's match that for consistency initially,
	// but it might be clearer to store x, y, width, height derived from start/end points.

	// Let's stick to the original structure storing y and height directly for now:
	// return new DOMRect(
	// 	roundFloor(bounds.x, zoom_x), // ox
	// 	roundFloor(bounds.y, zoom_y), // oy
	// 	roundCeil(bounds.width, zoom_x), // ow (end point)
	// 	roundCeil(bounds.height, zoom_y), // oh (end point)
	// );
};

export type Actions =
	| { type: "setMatrix"; payload: { matrix: DOMMatrix; rect: DOMRect } }
	| { type: "setCanvasSize"; payload: { rect: DOMRect } };
//  | { type: 'setScale', payload: Vector }

export const reducer: React.Reducer<StateChart, Actions> = (
	state,
	action,
): StateChart => {
	// function reducer(state: ExtraTradeEditor, action: Action) {
	switch (action.type) {
		case "setMatrix": {
			const bounds = calculateBounds(action.payload.matrix, state.canvasSize);
			const zl = zoomLevel(bounds.y - bounds.height);
			const outerBounds = calculateOuterBounds(bounds);
			const matrix_x = new DOMMatrix([
				action.payload.matrix.a,
				0,
				0,
				1,
				action.payload.matrix.e,
				0,
			]);
			const matrix_y = new DOMMatrix([
				1,
				0,
				0,
				action.payload.matrix.d,
				0,
				action.payload.matrix.f,
			]);
			return {
				...state,
				matrix: action.payload.matrix,
				bounds,
				outerBounds,
				matrix_x,
				matrix_y,
			};
		}

		case "setCanvasSize": {
			// When canvas size changes, immediately recalculate bounds using the new size
			// and the current matrix from state.
			const newCanvasSize = action.payload.rect;
			const currentMatrix = state.matrix;
			const newBounds = calculateBounds(currentMatrix, newCanvasSize);
			const newOuterBounds = calculateOuterBounds(newBounds);
			return {
				...state,
				canvasSize: newCanvasSize,
				bounds: newBounds,
				outerBounds: newOuterBounds,
			};
		}
		default: {
			throw new Error("Unhandled action type");
		}
	}
};
