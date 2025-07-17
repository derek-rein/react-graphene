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

function calculateOuterBounds(viewRect: DOMRect): DOMRect {
	const w = 1.5 * Math.abs(viewRect.width);
	const h = 1.5 * Math.abs(viewRect.height);
	const x = viewRect.x - w * 0.25;
	const y = viewRect.y - h * 0.25;
	return new DOMRect(x, y, w, h);
}

/**
 * Creates axis-specific matrices that perfectly match the main matrix transformation
 * for consistent scaling and positioning
 */
const createAxisMatrices = (mainMatrix: DOMMatrix) => {
	// Extract components from the main matrix with high precision
	// We use Number directly to ensure maximum precision in JavaScript
	const a = Number(mainMatrix.a.toFixed(15)); // Horizontal scaling
	const b = Number(mainMatrix.b.toFixed(15)); // Vertical skewing
	const c = Number(mainMatrix.c.toFixed(15)); // Horizontal skewing
	const d = Number(mainMatrix.d.toFixed(15)); // Vertical scaling
	const e = Number(mainMatrix.e.toFixed(15)); // Horizontal translation
	const f = Number(mainMatrix.f.toFixed(15)); // Vertical translation

	// Create the X-axis matrix
	// This matrix handles horizontal (X) transformations but keeps Y scale at 1
	// It inherits the a (horizontal scale) and e (horizontal translation) values
	// from the main matrix, but sets other values to identity matrix values
	const matrix_x = new DOMMatrix([
		a, // Use the same horizontal scaling as main matrix
		0, // No vertical skewing
		0, // No horizontal skewing
		1, // Keep vertical scaling at identity
		e, // Use the same horizontal translation as main matrix
		0, // No vertical translation
	]);

	// Create the Y-axis matrix
	// This matrix handles vertical (Y) transformations but keeps X scale at 1
	// It inherits the d (vertical scale) and f (vertical translation) values
	// from the main matrix, but sets other values to identity matrix values
	const matrix_y = new DOMMatrix([
		1, // Keep horizontal scaling at identity
		0, // No vertical skewing
		0, // No horizontal skewing
		d, // Use the same vertical scaling as main matrix
		0, // No horizontal translation
		f, // Use the same vertical translation as main matrix
	]);

	return { matrix_x, matrix_y };
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
			const newMatrix = action.payload.matrix;
			const bounds = calculateBounds(newMatrix, state.canvasSize);
			const outerBounds = calculateOuterBounds(bounds);

			// Create consistent axis matrices
			const { matrix_x, matrix_y } = createAxisMatrices(newMatrix);

			return {
				...state,
				matrix: newMatrix,
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

			// Also update axis matrices to keep everything in sync
			const { matrix_x, matrix_y } = createAxisMatrices(currentMatrix);

			return {
				...state,
				canvasSize: newCanvasSize,
				bounds: newBounds,
				outerBounds: newOuterBounds,
				matrix_x,
				matrix_y,
			};
		}
		default: {
			throw new Error("Unhandled action type");
		}
	}
};
